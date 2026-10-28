#!/usr/bin/env python3
"""YUMS Driver ovozli yo'riqnomasi uchun audio kliplarni yaratish.

Iboralar: src/driver/lib/voice-phrases.json (o'zbek va rus tilida).
Natija:   assets/voice/<til>/<kalit>.mp3 va src/driver/lib/voice-clips.ts (ilova shu fayldan o'qiydi).

Dvigatellar:
  azure — Microsoft Azure neyron ovozlari (tijoriy foydalanish uchun litsenziyalangan). Standart ovozlar:
          uz: uz-UZ-MadinaNeural (ayol), ru: ru-RU-SvetlanaNeural (ayol).
          Kerak: AZURE_SPEECH_KEY va AZURE_SPEECH_REGION muhit o'zgaruvchilari.
  piper — oflayn neyron ovoz (sherpa-onnx). Masalan, rus tili uchun vits-piper-ru_RU-irina-medium.
          Diqqat: Piper ovozlarining litsenziyasi har xil — do'konga chiqarishdan oldin tekshiring.

Misollar:
  python3 scripts/voice/generate.py --lang uz --engine azure
  python3 scripts/voice/generate.py --lang ru --engine piper --model ~/models/vits-piper-ru_RU-irina-medium
  python3 scripts/voice/generate.py --map-only        # faqat voice-clips.ts ni yangilash

Talablar: python3, numpy, ffmpeg (libmp3lame); piper uchun: pip install "sherpa-onnx<2" (2.x da espeak yo'q)
"""
import argparse
import io
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
import wave
from xml.sax.saxutils import escape

import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PHRASES = os.path.join(ROOT, 'src', 'driver', 'lib', 'voice-phrases.json')
ASSETS = os.path.join(ROOT, 'assets', 'voice')
CLIPS_TS = os.path.join(ROOT, 'src', 'driver', 'lib', 'voice-clips.ts')
LANGS = ('uz', 'ru')
AZURE_VOICES = {'uz': ('uz-UZ', 'uz-UZ-MadinaNeural'), 'ru': ('ru-RU', 'ru-RU-SvetlanaNeural')}


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
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp.name, '-ac', '1', '-ar', '24000',
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
        'export const CLIPS: Record<VoiceLang, Partial<Record<PhraseKey, number>>> = {',
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
    ap.add_argument('--lang', choices=LANGS)
    ap.add_argument('--engine', choices=('azure', 'piper'))
    ap.add_argument('--model', help='piper: sherpa-onnx VITS model papkasi')
    ap.add_argument('--voice', help="azure: boshqa ovoz nomi (masalan ru-RU-DariyaNeural)")
    ap.add_argument('--speed', type=float, default=0.95, help='piper: tezlik (1.0 — oddiy)')
    ap.add_argument('--rate', default='-4%', help="azure: nutq tezligi (masalan -4%%)")
    ap.add_argument('--only', help='faqat shu kalitlar (vergul bilan)')
    ap.add_argument('--map-only', action='store_true')
    a = ap.parse_args()

    phrases = load_phrases()
    if not a.map_only:
        if not a.lang or not a.engine:
            ap.error('--lang va --engine kerak')
        if a.engine == 'piper' and not a.model:
            ap.error('piper uchun --model kerak')
        run = synth_piper(a.model, a.speed) if a.engine == 'piper' else synth_azure(a.voice, a.rate)
        keys = a.only.split(',') if a.only else list(phrases)
        for i, key in enumerate(keys, 1):
            text = phrases[key][a.lang]
            samples, sr = run(text, a.lang)
            write_mp3(polish(samples, sr), sr, os.path.join(ASSETS, a.lang, f'{key}.mp3'))
            print(f'[{i}/{len(keys)}] {a.lang}/{key}.mp3  «{text}»')
    write_map(phrases)
    print('voice-clips.ts yangilandi')


if __name__ == '__main__':
    main()
