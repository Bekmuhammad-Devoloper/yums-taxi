# YUMS ilovalarining APK'sini shu kompyuterda yig'ish (Expo bulutisiz).
#
#   powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -Variant passenger
#   powershell -ExecutionPolicy Bypass -File scripts\build-apk.ps1 -Variant driver
#
# Nega nusxada: Windows'da yo'l 260 belgidan oshmasligi kerak, React Native'ning C++ qismlari esa
# loyiha yo'lini ikki marta ichma-ich yozadi. «C:\Users\...\yums taxi\yums-app» bilan chegaradan oshadi,
# shuning uchun loyiha qisqa haqiqiy papkaga (C:\yb\yums-app) sinxronlanib, o'sha yerda yig'iladi.
# (subst/junction yordam bermaydi — Node.js ularni haqiqiy uzun yo'lga qaytaradi.)
#
# Kerak: Java 17 (%LOCALAPPDATA%\Programs\Temurin17), Android SDK (%LOCALAPPDATA%\Android\Sdk).
# Google Maps kaliti: yums-app\.env.local ichida GOOGLE_MAPS_ANDROID_KEY=... (bo'lmasa xarita bo'sh chiqadi).
# Natija: yums-app\dist\YUMS.apk / YUMS-Driver.apk — telefonga to'g'ridan-to'g'ri o'rnatiladi (sinov imzosi).
# ABI, R8 va xato hisoboti plugins/with-android-release.js da (32 va 64 bitli telefonlar uchun);
# virtual telefonda sinash uchun: -Abi x86_64 -Out C:\yb\test
param(
  [ValidateSet('passenger', 'driver')] [string]$Variant = 'passenger',
  # bo'sh — plaginda belgilangan ABI'lar (armeabi-v7a + arm64-v8a)
  [string]$Abi = '',
  [string]$Work = 'C:\yb\yums-app',
  # Natija papkasi (standart — yums-app\dist). Sinov uchun yig'ilgan APK'lar boshqa joyga qo'yiladi
  [string]$Out = ''
)
$ErrorActionPreference = 'Stop'
$src = Split-Path -Parent $PSScriptRoot

$env:JAVA_HOME = "$env:LOCALAPPDATA\Programs\Temurin17"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
if (-not (Test-Path "$env:JAVA_HOME\bin\java.exe")) { throw "Java 17 topilmadi: $env:JAVA_HOME" }
if (-not (Test-Path "$env:ANDROID_HOME\platform-tools")) { throw "Android SDK topilmadi: $env:ANDROID_HOME" }

# 1) Loyihani qisqa papkaga sinxronlash (git, native va yig'ish qoldiqlarisiz; birinchi marta uzoq, keyin tez)
New-Item -ItemType Directory -Force $Work | Out-Null
# Diqqat: /XD da nom yozilsa (masalan «dist», «android») u node_modules ichidagilarga ham ta'sir qiladi va kutubxonalar
# buziladi — shuning uchun loyiha ildizidagilar to'liq yo'l bilan; nom bilan faqat C++ yig'ish qoldig'i (.cxx)
$skip = @('.git', 'android', 'ios', '.expo', 'dist') | ForEach-Object { Join-Path $src $_ }
robocopy $src $Work /MIR /XD @skip .cxx /XF *.log /NFL /NDL /NJH /NJS /NP /R:1 /W:1 | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Nusxa ko'chirishda xato (robocopy $LASTEXITCODE)" }

# 2) Variant uchun native Android loyihasi (CNG: android/ har safar konfiguratsiyadan qayta yaratiladi)
Push-Location $Work
try {
  if ($Variant -eq 'driver') { $env:APP_VARIANT = 'driver' } else { Remove-Item Env:APP_VARIANT -ErrorAction SilentlyContinue }
  npx expo prebuild -p android --clean --no-install
  if ($LASTEXITCODE -ne 0) { throw 'expo prebuild xato berdi' }

  # 3) Release APK
  Push-Location android
  try {
    $abiArg = if ($Abi) { @("-PreactNativeArchitectures=$Abi") } else { @() }
    .\gradlew.bat assembleRelease @abiArg --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'Gradle yig''ishi xato berdi' }
  } finally { Pop-Location }
} finally { Pop-Location }

# 4) Natija loyiha papkasiga
$apk = Join-Path $Work 'android\app\build\outputs\apk\release\app-release.apk'
$name = if ($Variant -eq 'driver') { 'YUMS-Driver.apk' } else { 'YUMS.apk' }
$dest = if ($Out) { $Out } else { Join-Path $src 'dist' }
New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item $apk (Join-Path $dest $name) -Force
Write-Host ("Tayyor: {0} ({1} MB)" -f (Join-Path $dest $name), [math]::Round((Get-Item $apk).Length / 1MB, 1))
