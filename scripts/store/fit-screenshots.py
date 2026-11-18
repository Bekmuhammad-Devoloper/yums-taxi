"""Telefon skrinshotlarini do'kon talabiga moslash: Google Play — 1080x1920 (9:16), App Store — 1290x2796 (--ios).

Play qoidasi: uzun tomon qisqa tomondan 2 barobardan oshmasligi kerak. Zamonaviy telefon skrinshoti
(masalan 1080x2400, 20:9) bunga sig'maydi — rad etiladi. Skript har bir rasmni YUMS fonida, yumaloq
burchaklar bilan 1080x1920 kadrga joylaydi; ixtiyoriy sarlavha tepada yoziladi.

Ishlatish:
    python scripts/store/fit-screenshots.py <skrinshotlar papkasi> [chiqish papkasi]
    python scripts/store/fit-screenshots.py --ios <skrinshotlar papkasi> [chiqish papkasi]   # iPhone 6.7"

Sarlavhalar (ixtiyoriy): papkadagi captions.txt — har qatorda bitta, fayllar alfavit tartibida.
Kerak: pip install pillow
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
BG = (11, 15, 26)
ACCENT = (255, 200, 0)
FONT = 'C:/Windows/Fonts/segoeuib.ttf'


def font(size):
    try:
        return ImageFont.truetype(FONT, size)
    except OSError:
        return ImageFont.load_default()


def rounded(img, radius):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width, img.height), radius=radius, fill=255)
    out = img.convert('RGBA')
    out.putalpha(mask)
    return out


def wrap(draw, text, fnt, width):
    lines, line = [], ''
    for word in text.split():
        trial = f'{line} {word}'.strip()
        if draw.textlength(trial, font=fnt) <= width:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def fit(src, dst, caption=None, size=(W, H)):
    W, H = size
    shot = Image.open(src).convert('RGB')
    canvas = Image.new('RGB', (W, H), BG)
    draw = ImageDraw.Draw(canvas)
    top = 60
    if caption:
        fnt = font(64)
        lines = wrap(draw, caption, fnt, W - 140)[:2]
        y = 70
        for line in lines:
            draw.text(((W - draw.textlength(line, font=fnt)) / 2, y), line, font=fnt, fill=(255, 255, 255))
            y += 80
        draw.rounded_rectangle((W / 2 - 50, y + 14, W / 2 + 50, y + 22), radius=4, fill=ACCENT)
        top = y + 60
    room_w, room_h = W - 120, H - top - 60
    scale = min(room_w / shot.width, room_h / shot.height)
    dims = (round(shot.width * scale), round(shot.height * scale))
    phone = rounded(shot.resize(dims, Image.LANCZOS), 44)
    canvas.paste(phone, ((W - dims[0]) // 2, top + (room_h - dims[1]) // 2), phone)
    canvas.save(dst, optimize=True)


def main():
    args = sys.argv[1:]
    ios = '--ios' in args
    args = [a for a in args if a != '--ios']
    if not args:
        print(__doc__)
        sys.exit(1)
    size = (1290, 2796) if ios else (W, H)
    src = Path(args[0])
    out = Path(args[1]) if len(args) > 1 else src / ('app-store' if ios else 'play')
    out.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp'))
    captions_file = src / 'captions.txt'
    captions = captions_file.read_text(encoding='utf-8').splitlines() if captions_file.exists() else []
    for i, path in enumerate(files):
        caption = captions[i].strip() if i < len(captions) and captions[i].strip() else None
        dst = out / f'{path.stem}.png'
        fit(path, dst, caption, size)
        print(f'{path.name} -> {dst}')
    print(f"Tayyor: {len(files)} ta rasm, {size[0]}x{size[1]} — do'konga shu papkadan yuklang: {out}")


if __name__ == '__main__':
    main()
