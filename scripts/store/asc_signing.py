"""App Store imzosi CI uchun (.github/workflows/ios-ipa.yml): vaqtinchalik distribution sertifikati va App Store
profili App Store Connect API orqali yaratiladi, yig'ilishdan keyin esa bekor qilinadi.

Nega: Xcode'ning avtomatik imzosi arxivlashda development profilini so'raydi, u esa ro'yxatdan o'tgan qurilmasiz
yaratilmaydi; sertifikatni repo'da saqlash ham kerak emas. Do'kondagi va TestFlight'dagi build sertifikat bekor
qilingach ham ishlayveradi (Apple ularni o'zi qayta imzolaydi).

    python asc_signing.py create  --bundle uz.yums.taxi --out DIR   # key.pem, cert.pem, profile.mobileprovision, ids.json
    python asc_signing.py cleanup --ids DIR/ids.json                # profil o'chiriladi, sertifikat bekor qilinadi

Muhit: ASC_KEY_ID, ASC_ISSUER_ID va ASC_KEY_PATH (.p8 fayl). Kerak: pip install pyjwt cryptography
"""
import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import jwt
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

API = 'https://api.appstoreconnect.apple.com/v1'


def fail(message):
    # GitHub Actions bu qatorni yig'ilish xulosasida (annotation) ko'rsatadi
    print(f'::error::{message}', flush=True)
    sys.exit(1)


def token():
    with open(os.environ['ASC_KEY_PATH'], encoding='utf-8') as f:
        key = f.read()
    now = int(time.time())
    payload = {'iss': os.environ['ASC_ISSUER_ID'], 'iat': now, 'exp': now + 15 * 60, 'aud': 'appstoreconnect-v1'}
    return jwt.encode(payload, key, algorithm='ES256', headers={'kid': os.environ['ASC_KEY_ID'], 'typ': 'JWT'})


def call(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method, headers={
        'Authorization': f'Bearer {token()}',
        'Content-Type': 'application/json',
    })
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors='replace')
        fail(f'App Store Connect API {method} {path.split("?")[0]}: {e.code} {detail[:600]}')


def csr_for(key):
    req = x509.CertificateSigningRequestBuilder().subject_name(x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, 'YUMS CI'),
        x509.NameAttribute(NameOID.COUNTRY_NAME, 'UZ'),
    ])).sign(key, hashes.SHA256())
    return req.public_bytes(serialization.Encoding.PEM).decode()


def bundle_id(identifier):
    query = urllib.parse.urlencode({'filter[identifier]': identifier, 'limit': 200})
    for item in call('GET', f'/bundleIds?{query}').get('data', []):
        if item['attributes']['identifier'] == identifier:
            return item['id']
    fail(f"Bundle ID {identifier} Apple Developer'da ro'yxatdan o'tmagan (Certificates, Identifiers & Profiles)")


def save(path, data):
    with open(path, 'wb') as f:
        f.write(data)


def create(args):
    os.makedirs(args.out, exist_ok=True)
    ids_path = os.path.join(args.out, 'ids.json')
    ids = {}
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    cert = call('POST', '/certificates', {'data': {'type': 'certificates', 'attributes': {
        'certificateType': 'DISTRIBUTION', 'csrContent': csr_for(key)}}})['data']
    ids['certificate'] = cert['id']
    # darhol yoziladi — keyingi qadam yiqilsa ham tozalash sertifikatni bekor qiladi
    save(ids_path, json.dumps(ids).encode())
    der = base64.b64decode(cert['attributes']['certificateContent'])
    save(os.path.join(args.out, 'cert.pem'), x509.load_der_x509_certificate(der).public_bytes(serialization.Encoding.PEM))
    save(os.path.join(args.out, 'key.pem'), key.private_bytes(
        serialization.Encoding.PEM, serialization.PrivateFormat.TraditionalOpenSSL, serialization.NoEncryption()))

    name = f"YUMS CI {args.bundle} {os.environ.get('GITHUB_RUN_ID', int(time.time()))}"
    profile = call('POST', '/profiles', {'data': {
        'type': 'profiles',
        'attributes': {'name': name, 'profileType': 'IOS_APP_STORE'},
        'relationships': {
            'bundleId': {'data': {'type': 'bundleIds', 'id': bundle_id(args.bundle)}},
            'certificates': {'data': [{'type': 'certificates', 'id': cert['id']}]},
        },
    }})['data']
    ids.update(profile=profile['id'], profileName=profile['attributes']['name'], uuid=profile['attributes']['uuid'])
    save(ids_path, json.dumps(ids).encode())
    save(os.path.join(args.out, 'profile.mobileprovision'), base64.b64decode(profile['attributes']['profileContent']))
    print(f"Sertifikat {cert['id']}, profil «{ids['profileName']}» ({ids['uuid']})")


def cleanup(args):
    if not os.path.exists(args.ids):
        print("Tozalanadigan narsa yo'q")
        return
    with open(args.ids, encoding='utf-8') as f:
        ids = json.load(f)
    if ids.get('profile'):
        call('DELETE', f"/profiles/{ids['profile']}")
        print("Profil o'chirildi")
    if ids.get('certificate'):
        call('DELETE', f"/certificates/{ids['certificate']}")
        print('Sertifikat bekor qilindi')


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='cmd', required=True)
    c = sub.add_parser('create')
    c.add_argument('--bundle', required=True)
    c.add_argument('--out', required=True)
    d = sub.add_parser('cleanup')
    d.add_argument('--ids', required=True)
    args = parser.parse_args()
    if args.cmd == 'create':
        create(args)
    else:
        cleanup(args)


if __name__ == '__main__':
    main()
