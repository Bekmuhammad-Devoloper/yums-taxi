# YUMS Driver ovozli yo'riqnomasi: o'zbek, tojik, ingliz va arab tilidagi ayol ovozi kliplarini yaratish
# (Google Gemini TTS). Gemini API kaliti yashirin so'raladi va faqat shu oyna yopilguncha xotirada turadi,
# hech qanday faylga yozilmaydi. To'xtab qolsa, qayta ishga tushiring: tayyor kliplar o'tkazib yuboriladi.
# Fayl faqat ASCII belgilarda: Windows PowerShell 5.1 BOM'siz faylni ANSI deb o'qiydi.
#
# Ishga tushirish (VS Code terminalida):
#   powershell -ExecutionPolicy Bypass -File scripts/voice/make-voices.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..\..')

python -c "import numpy" 2>$null
if ($LASTEXITCODE -ne 0) { python -m pip install --quiet numpy }
python -c "import imageio_ffmpeg" 2>$null
if ($LASTEXITCODE -ne 0) { python -m pip install --quiet imageio-ffmpeg }

$secure = Read-Host 'Gemini API kalitini kiriting (ekranda ko''rinmaydi)' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $env:GEMINI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    $env:PYTHONIOENCODING = 'utf-8'
    python scripts/voice/generate.py --lang uz,tg,en,ar --engine gemini --resume
    if ($LASTEXITCODE -eq 0) { Write-Host "`nTayyor: kliplar assets/voice/ papkasida. Claude'ga 'tayyor' deb yozing." -ForegroundColor Green }
    else { Write-Host "`nXato bilan to'xtadi: yuqoridagi xabarni ko'ring yoki qayta ishga tushiring." -ForegroundColor Yellow }
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    Remove-Item Env:GEMINI_API_KEY -ErrorAction SilentlyContinue
}
