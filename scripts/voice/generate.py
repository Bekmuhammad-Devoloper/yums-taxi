#!/usr/bin/env python3
"""YUMS Driver ovozli yo'riqnomasi uchun audio kliplarni yaratish.

Iboralar: src/driver/lib/voice-phrases.json (5 tilda: uz, ru, en, ar, tg).
Natija:   assets/voice/<til>/<kalit>.mp3 va src/driver/lib/voice-clips.ts (ilova shu fayldan o'qiydi).
Tilda klip bo'lmasa ilova qurilma ovozida, u ham bo'lmasa zaxira tilda gapiradi (src/driver/lib/voice.ts).

Dvigatellar:
  gemini — Google Gemini TTS (gemini-3.8-flash-tts; o'zbek va tojik tilini ham biladi). Standart ovoz: Kore (ayol).
          Kerak: GEMINI_API_KEY muhit o'zgaruvchisi. Kvota tugasa kutib qayta urinadi; --resume bilan
          yaratib bo'lingan kliplar o'tkazib yuboriladi (to'xtagan joydan davom etadi).
  azure — Microsoft Azure neyron ovozlari (tijoriy foydalanish uchun litsenziyalangan). Standart ovozlar:
          uz: uz-UZ-MadinaNeural, ru: ru-RU-SvetlanaNeural, en: en-US-AvaNeural, ar: ar-SA-ZariyahNeural
          (hammasi ayol ovozi; bepul F0 tarifi oyiga 500 ming belgi — bu kliplar ~8 ming).
          Kerak: AZURE_SPEECH_KEY va AZURE_SPEECH_REGION muhit o'zgaruvchilari.
  piper — oflayn neyron ovoz (sherpa-onnx). Masalan, rus tili uchun vits-piper-ru_RU-irina-medium.
          Diqqat: Piper ovozlarining litsenziyasi har xil — do'konga chiqarishdan oldin tekshiring.

Misollar:
  python3 scripts/voice/generate.py --lang uz,tg,en,ar --engine gemini --resume
  python3 scripts/voice/generate.py --lang uz --engine azure
  python3 scripts/voice/generate.py --lang ru --engine piper --model ~/models/vits-piper-ru_RU-irina-medium
  python3 scripts/voice/generate.py --map-only        # faqat voice-clips.ts ni yangilash

Talablar: python3, numpy, ffmpeg (libmp3lame; PATH'da bo'lmasa — pip install imageio-ffmpeg);
piper uchun: pip install "sherpa-onnx<2" (2.x da espeak yo'q)
"""
import argparse
import base64
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import wave
from xml.sax.saxutils import escape

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PHRASES = os.path.join(ROOT, 'src', 'driver', 'lib', 'voice-phrases.json')
ASSETS = os.path.join(ROOT, 'assets', 'voice')
CLIPS_TS = os.path.join(ROOT, 'src', 'driver', 'lib', 'voice-clips.ts')
LANGS = ('uz', 'ru', 'en', 'ar', 'tg')
GEMINI_MODEL = 'gemini-3.8-flash-tts'
GEMINI_LOCALES = {'uz': 'uz-UZ', 'ru': 'ru-RU', 'en': 'en-US', 'ar': 'ar-SA', 'tg': 'tg-TJ'}
AZURE_VOICES = {
    'uz': ('uz-UZ', 'uz-UZ-MadinaNeural'),
    'ru': ('ru-RU', 'ru-RU-SvetlanaNeural'),
    'en': ('en-US', 'en-US-AvaNeural'),
    'ar': ('ar-SA', 'ar-SA-ZariyahNeural'),
}


def ffmpeg():
    """PATH'dagi ffmpeg, bo'lmasa imageio-ffmpeg o'rnatgan nusxa."""
    found = shutil.which('ffmpeg')
    if found:
        return found
    try:
        import imageio_ffmpeg  # noqa: PLC0415 — faqat ffmpeg PATH'da bo'lmaganda kerak
    except ImportError:
        sys.exit('ffmpeg topilmadi: o\'rnating yoki pip install imageio-ffmpeg')
    return imageio_ffmpeg.get_ffmpeg_exe()


def load_phrases():
    with open(PHRASES, encoding='utf-8') as f:
        return json.load(f)['phrases']


# ---------- Sintez ----------

def synth_piper(model_dir, speed):
    import sherpa_onnx  # noqa: PLC0415 — faqat piper dvigatelida kerak

    onnx = next(f for f in os.listdir(model_dir) if f.endswith('.onnx'))
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=os.path.join(model_dir, onnx),
                tokens=os.path.join(model_dir, 'tokens.txt'),
                data_dir=os.path.join(model_dir, 'espeak-ng-data'),
                noise_scale=0.6, noise_scale_w=0.7,
            ),
            num_threads=2,
        ),
        max_num_sentences=4,
    )
    tts = sherpa_onnx.OfflineTts(cfg)

    def run(text, _lang):
        audio = tts.generate(text, sid=0, speed=speed)
        return np.asarray(audio.samples, dtype=np.float32), audio.sample_rate

    return run


def synth_azure(voice_override, rate):
    key = os.environ.get('AZURE_SPEECH_KEY')
    region = os.environ.get('AZURE_SPEECH_REGION')
    if not key or not region:
        sys.exit('AZURE_SPEECH_KEY va AZURE_SPEECH_REGION muhit o\'zgaruvchilarini bering')
    url = f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1'

    def run(text, lang):
        locale, voice = AZURE_VOICES[lang]
        voice = voice_override or voice
        ssml = (f"<speak version='1.0' xml:lang='{locale}'><voice name='{voice}'>"
                f"<prosody rate='{rate}'>{escape(text)}</prosody></voice></speak>")
        req = urllib.request.Request(url, data=ssml.encode('utf-8'), headers={
            'Ocp-Apim-Subscription-Key': key,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
            'User-Agent': 'yums-driver-voice',
        })
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        with wave.open(io.BytesIO(data)) as w:
            pcm = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
            return pcm, w.getframerate()

    return run


def synth_gemini(voice, model):
    key = os.environ.get('GEMINI_API_KEY')
    if not key:
        sys.exit('GEMINI_API_KEY muhit o\'zgaruvchisini bering')
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
    # tilni aniq aytish (languageCode) model qabul qilmasa — bir marta tashlab, matndan aniqlashga qo'yamiz
    state = {'locale': True}

    def call(text, lang):
        speech = {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}}
        if state['locale']:
            speech['languageCode'] = GEMINI_LOCALES[lang]
        body = {
            'contents': [{'parts': [{'text': text}]}],
            'generationConfig': {'responseModalities': ['AUDIO'], 'speechConfig': speech},
        }
        req = urllib.request.Request(url, data=json.dumps(body).encode('utf-8'), headers={
            'x-goog-api-key': key,
            'Content-Type': 'application/json',
        })
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)

    def run(text, lang):
        for attempt in range(8):
            try:
                data = call(text, lang)
                break
            except urllib.error.HTTPError as e:
                detail = e.read().decode('utf-8', 'replace')
                if e.code == 400 and state['locale'] and 'language' in detail.lower():
                    state['locale'] = False
                    print('  languageCode qabul qilinmadi — til matndan aniqlanadi')
                    continue
                if e.code in (429, 500, 503) and attempt < 7:
                    # kvota: server aytgan vaqt (retryDelay), bo'lmasa o'sib boruvchi kutish
                    m = re.search(r'"retryDelay":\s*"(\d+)', detail)
                    wait = int(m.group(1)) + 2 if m else min(90, 10 * 2 ** attempt)
                    print(f'  {e.code}: {wait} s kutib qayta urinaman')
                    time.sleep(wait)
                    continue
                sys.exit(f'Gemini xatosi {e.code}: {detail[:400]}')
        part = next(p['inlineData'] for p in data['candidates'][0]['content']['parts'] if 'inlineData' in p)
        rate = int(re.search(r'rate=(\d+)', part['mimeType']).group(1)) if 'rate=' in part['mimeType'] else 24000
        pcm = np.frombuffer(base64.b64decode(part['data']), dtype=np.int16).astype(np.float32) / 32768
        return pcm, rate

    return run


# ---------- Ishlov berish ----------

def polish(samples, sr):
    """Boshi/oxiridagi sukunatni kesish, ovoz balandligini tenglash, boshiga 120 ms sukunat (Bluetooth uchun)."""
    thr = max(1e-4, np.max(np.abs(samples)) * 0.02)
    idx = np.where(np.abs(samples) > thr)[0]
    if len(idx):
        pad = int(sr * 0.04)
        samples = samples[max(0, idx[0] - pad): idx[-1] + pad]
    rms = np.sqrt(np.mean(samples ** 2)) or 1e-6
    samples = samples * min(0.12 / rms, 0.89 / (np.max(np.abs(samples)) or 1))
    fade = int(sr * 0.03)
    if len(samples) > 2 * fade:
        samples[-fade:] *= np.linspace(1, 0, fade)
    return np.concatenate([np.zeros(int(sr * 0.12), dtype=np.float32), samples.astype(np.float32)])


def write_mp3(samples, sr, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
        with wave.open(tmp, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes((np.clip(samples, -1, 1) * 32767).astype(np.int16).tobytes())
    try:
        subprocess.run([ffmpeg(), '-y', '-loglevel', 'error', '-i', tmp.name, '-ac', '1', '-ar', '24000',
                        '-codec:a', 'libmp3lame', '-b:a', '48k', path], check=True)
    finally:
        os.unlink(tmp.name)


# ---------- voice-clips.ts ----------

def write_map(phrases):
    lines = [
        '// AVTOMATIK YARATILGAN — qo\'lda tahrirlamang. Yangilash: python3 scripts/voice/generate.py --map-only',
        '// Har bir til uchun mavjud ovozli kliplar (assets/voice/<til>/<kalit>.mp3).',
        "import type { PhraseKey, VoiceLang } from './voice';",
        '',
        'export const CLIPS: Partial<Record<VoiceLang, Partial<Record<PhraseKey, number>>>> = {',
    ]
    for lang in LANGS:
        lines.append(f'  {lang}: {{')
        for key in phrases:
            if os.path.exists(os.path.join(ASSETS, lang, f'{key}.mp3')):
                lines.append(f"    {key}: require('@/assets/voice/{lang}/{key}.mp3'),")
        lines.append('  },')
    lines.append('};')
    with open(CLIPS_TS, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--lang', help=f"til(lar), vergul bilan: {', '.join(LANGS)}")
    ap.add_argument('--engine', choices=('gemini', 'azure', 'piper'))
    ap.add_argument('--model', help=f'piper: sherpa-onnx VITS model papkasi; gemini: model nomi ({GEMINI_MODEL})')
    ap.add_argument('--voice', help="azure: boshqa ovoz nomi (masalan ru-RU-DariyaNeural); gemini: ovoz (Kore)")
    ap.add_argument('--speed', type=float, default=0.95, help='piper: tezlik (1.0 — oddiy)')
    ap.add_argument('--rate', default='-4%', help="azure: nutq tezligi (masalan -4%%)")
    ap.add_argument('--only', help='faqat shu kalitlar (vergul bilan)')
    ap.add_argument('--resume', action='store_true', help='mavjud kliplarni qayta yaratmaslik')
    ap.add_argument('--map-only', action='store_true')
    a = ap.parse_args()

    phrases = load_phrases()
    if not a.map_only:
        if not a.lang or not a.engine:
            ap.error('--lang va --engine kerak')
        langs = [x.strip() for x in a.lang.split(',') if x.strip()]
        unknown = [x for x in langs if x not in LANGS]
        if unknown:
            ap.error(f"noma'lum til: {', '.join(unknown)} (bor: {', '.join(LANGS)})")
        if a.engine == 'piper' and not a.model:
            ap.error('piper uchun --model kerak')
        if a.engine == 'azure' and any(x not in AZURE_VOICES for x in langs):
            ap.error(f"azure'da ovoz bor tillar: {', '.join(AZURE_VOICES)}")
        if a.engine == 'piper':
            run = synth_piper(a.model, a.speed)
        elif a.engine == 'azure':
            run = synth_azure(a.voice, a.rate)
        else:
            run = synth_gemini(a.voice or 'Kore', a.model or GEMINI_MODEL)
        keys = a.only.split(',') if a.only else list(phrases)
        for lang in langs:
            for i, key in enumerate(keys, 1):
                path = os.path.join(ASSETS, lang, f'{key}.mp3')
                if a.resume and os.path.exists(path):
                    continue
                text = phrases[key][lang]
                samples, sr = run(text, lang)
                write_mp3(polish(samples, sr), sr, path)
                print(f'[{i}/{len(keys)}] {lang}/{key}.mp3  «{text}»')
            # har til tugagach xarita yangilanadi — to'xtab qolsa ham tayyorlari ilovaga kiradi
            write_map(phrases)
    write_map(phrases)
    print('voice-clips.ts yangilandi')


if __name__ == '__main__':
    main()
