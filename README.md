# YUMS — xalqaro raqamli loyihalar platformasi

Dunyo mamlakatlaridagi loyihalar, kompaniyalar, investorlar, mutaxassislar va xizmatlarni yagona mobil ilovada bog'laydigan platforma (Android / iOS / veb). Ilovaga transport yo'nalishi — **YUMS Taxi** ham kiritilgan.

React Native + Expo (SDK 58), Expo Router, TypeScript.

## Bo'limlar (texnik topshiriq bo'yicha)

| Bo'lim | Ekran | Imkoniyatlar |
| --- | --- | --- |
| YUMS PROJECT | `/projects`, `/project/[id]`, `/project/edit` | Loyiha yaratish, tahrirlash, o'chirish, moderatsiyaga yuborish; sarlavha, tavsif, maqsad, byudjet oralig'i, hudud, muddat, tillar, bosqich, aloqa usuli; fayl va taqdimot biriktirish |
| YUMS BUSINESS | `/business`, `/company/[id]` | Kompaniya profillari, xizmatlar katalogi, B2B takliflar |
| YUMS INVEST | `/invest` | Investorlar katalogi, moliyalashtirish izlayotgan loyihalar, taklif yuborish, litsenziya ogohlantirishi |
| YUMS MARKET | `/market`, `/market/[id]`, `/market/new` | Tovarlar, raqamli mahsulotlar, xizmatlar; e'lon joylashtirish (moderatsiya bilan) |
| YUMS TECHNOLOGY | `/tech`, `/specialist/[id]` | Dasturchi, muhandis, dizayner va boshqa mutaxassislar |
| YUMS CONNECT | `/connect`, `/chat/[id]` | Xabarlar, hamkorlik so'rovlari, onlayn uchrashuvlar, hujjat almashish, bloklash |
| YUMS WORLD | `/world`, `/sectors` | Mamlakat, mintaqa, til, soha, bosqich bo'yicha xalqaro qidiruv va filtrlar |
| YUMS TAXI | `/taxi` va uning ekranlari | Xarita, marshrut, tariflar, to'lov, haydovchi, xavfsizlik |

### Birinchi versiya funksiyalari

- Ro'yxatdan o'tish: telefon (bir nechta mamlakat kodi) yoki email + tasdiqlash kodi; jismoniy shaxs yoki kompaniya profili
- Shaxsiy kabinet (`/profile`): loyihalar, e'lonlar, saqlanganlar, bildirishnomalar, tarif
- Profilni tasdiqlash (`/verify`): hujjat yuklash → moderator tekshiruvi → «Tasdiqlangan» belgisi
- Moderatsiya paneli (`/moderation`): e'lonlar navbati (avto-filtr bilan), shikoyatlar, bloklash, profillarni tasdiqlash
- Shikoyat qilish — loyiha, kompaniya, mutaxassis, e'lon va suhbat sahifalaridan
- Huquqiy hujjatlar (`/legal`): foydalanish shartlari, maxfiylik, cookie, ma'lumotlarni saqlash, moderatsiya qoidalari, investitsiya ogohlantirishi
- Xavfsizlik (`/security`): ruxsat darajalari (foydalanuvchi / moderator / administrator), 2 bosqichli himoya, kirishlar tarixi, ma'lumotlar nusxasini eksport qilish
- Daromad modeli (`/plans`): Free / Pro / Business tariflar, TOPga chiqarish, reklama kampaniyalari, professional xizmatlar, savdo komissiyasi
- 25 ta soha, 28 mamlakat, ko'p tilli interfeys (o'zbek, rus, ingliz), yorug'/qorong'i mavzu

> Taksidan tashqari server qismi hozircha yo'q: ma'lumotlar qurilmada saqlanadi, moderatsiya, javoblar, SMS kod va to'lovlar demo rejimida ishlaydi.

## Ishga tushirish

```bash
npm install
npx expo start
```

Telefonda **Expo Go** ilovasi bilan QR-kodni skanerlang.
Kirish Yandex Go uslubida — yagona oqim:
- Telefon raqami (yoki email) → SMS kod → raqam ro'yxatda bo'lsa darhol ichkariga, yangi bo'lsa «Keling, tanishamiz» (profil) va hisob yaratiladi.
- Qayta kirishda «Hisobni tanlang» — shu qurilmada avval kirgan hisoblar.
- Noto'g'ri kodda xato ko'rsatiladi; 3 ta noto'g'ri urinishdan keyin yangi kod kerak.
- Demo rejimda SMS o'rniga kod ekranda ko'rsatiladi; demo hisob: `+998 90 000 00 00`.

Ro'yxatdan o'tishda (O'zbekiston):
- **Jismoniy shaxs** — JShShIR (14 xona; tuzilishi va ichidagi tug'ilgan sana tekshiriladi, 18+).
- **Kompaniya** — STIR (9 xona) davlat reyestridan tekshiriladi; kompaniya nomi va mas'ul shaxs (rahbar) reyestrdagi ma'lumot bilan mos kelsagina hisob yaratiladi; mas'ul shaxsning JShShIRi ham so'raladi.
- Reyestr manzili `EXPO_PUBLIC_REGISTRY_API` orqali beriladi (`GET {API}/company/{stir}` → `{ name, director, status }`). Berilmasa demo reyestr ishlaydi: `301234567` — «YUMS DEMO» MChJ, rahbar Karimov Aziz Bahodirovich.
- Xorijiy kompaniyalar hujjatlar orqali tasdiqlanadi.

Hisoblar hozircha qurilmada saqlanadi.

Taksi xaritasi:
- iOS/Android — `react-native-maps` (Apple / Google xaritalari).
- Veb — Leaflet + OpenStreetMap/CARTO plitkalari (© OpenStreetMap, © CARTO). Plitka serveri ochilmasa, xarita avtomatik ravishda o'zi chizadigan sxematik qatlamga o'tadi — surish, kattalashtirish, marshrut va mashinalar ishlashda davom etadi.
- Marshrut OSRM orqali olinadi, javob bo'lmasa — taxminiy egri chiziq.
- Joylashuv: yuqori aniqlikdagi GPS bir necha soniya kuzatiladi (eski, keshlangan nuqta olinmaydi), aniqroq nuqta kelsa xarita va manzil yangilanadi. Vebda foydalanuvchi ko'k nuqta va aniqlik doirasi bilan ko'rsatiladi.
- Manzil (ko'cha, uy): iOS/Android'da qurilma geokoderi, vebda va zaxira sifatida OpenStreetMap Nominatim.

Demo ssenariylar:
- Loyiha yaratib «Yuborish»ni bosing — bir necha soniyada avtomatik moderatsiyadan o'tadi. Matnda «kafolatlangan daromad» kabi iboralar bo'lsa, moderator navbatida qoladi.
- Kabinet → Xavfsizlik → Ruxsat darajasi → «Moderator» — moderatsiya paneli ochiladi.
- Investorga «Taklif yuborish» — so'rov bir necha soniyada qabul qilinadi.
- Taksi promokodlari: `YUMS20`, `YANGI30`, `TOSHKENT`.

## YUMS Driver — haydovchi ilovasi

Haydovchi uchun **alohida ilova** (nomi «YUMS Driver», `uz.yums.driver`, sxema `yumsdriver://`). U shu kod bazasidan yig'iladi va asosiy YUMS ilovasi bilan **dispetcher serveri** orqali real vaqtda bog'lanadi:

```
YUMS (yo'lovchi)  ──order──▶  dispetcher (server/dispatch.mjs)  ──offer──▶  YUMS Driver
                  ◀─accepted / driverPos / arrived / started / finished──  (haydovchi)
                  ──rate (baho, choy puli)──────────────────────────────▶
```

- Yo'lovchi buyurtma beradi → server eng yaqin bo'sh haydovchiga (tarifi mos) 15 soniyalik taklif yuboradi → rad etsa yoki javob bermasa keyingisiga o'tadi.
- Haydovchi qabul qilsa yo'lovchi ilovasida uning ismi, mashinasi, davlat raqami va xaritada jonli harakati ko'rinadi.
- «Yetib keldim», «Safarni boshlash», «Yakunlash» bosqichlari yo'lovchiga darhol yetadi; yo'lovchining bahosi va choy puli haydovchiga qaytadi.
- Yo'lovchi xaritasida liniyadagi haqiqiy bo'sh mashinalar ko'rsatiladi.
- Haydovchi ilovasi (Yandex Pro uslubida):
  - **Talab xaritasi** — olti burchakli kataklar va koeffitsientlar (×1.2 / ×1.4 / ×1.8); yuqori talab hududida buyurtma tezroq va qimmatroq keladi.
  - **Liniyaga chiqish** katta tugmasi va vidjetlar: faollik, bugungi daromad, liniyadagi vaqt, reyting, «Uyga» rejimi (kuniga 2 marta), tariflar.
  - **Buyurtma taklifi** — narx, koeffitsient, mijozgacha va safar vaqti/masofasi, to'lov turi; «Qabul qilish» tugmasi ichida 15 soniyalik taymer.
  - **Faollik** — qabul qilish +2, rad etish / o'tkazib yuborish −5, bekor qilish −10; past faollikda buyurtmalar kamayadi.
  - **Ichki navigator** — keyingi burilish, masofa, yetib borish vaqti; Yandex Navigator yoki Google Maps'da ochish.
  - Surib tasdiqlanadigan tugmalar: «Yetib keldim», «Safarni boshlash», «Yakunlash».
  - **Kutish**: 3 daqiqa bepul, keyin daqiqasiga 500 so'm; taksometr.
  - **Safar yakuni** — «Naqd oling» / «Kartadan to'landi», komissiya va sof daromad, yo'lovchini baholash.
  - **Balans va pul yechish** (karta safarlari tushadi, naqd safarlar komissiyasi yechiladi), daromad (kun / 7 / 30 kun), faollik va reyting, avtomobil va hujjatlar, sozlamalar.
  - **Hujjatlar** — haydovchilik guvohnomasi, texnik pasport, taksi litsenziyasi, OSAGO: raqam, sanalar, old/orqa tomoni rasmi → «Tekshirilmoqda» → «Tasdiqlangan» yoki sabab bilan «Rad etildi» (muddati o'tgan hujjat). Hujjatni bosganda uning o'zi (haqiqiy hujjat dizaynida yoki yuklangan rasm) ochiladi. To'rttasi tasdiqlanmaguncha liniyaga chiqib bo'lmaydi. Hozircha tekshiruvni ilovaning o'zi (demo moderator) bajaradi — real ishda moderator paneli/server kerak.
  - **Tarif talablari** (Yandex Pro kabi): avtomobil katalogdan tanlanadi (sinfi: Ekonom / Komfort / Biznes / Miniven / Yuk) va yili kiritiladi. Start — hujjatlar + 2008 yildan; Komfort — komfort/biznes avtomobil, 2016+, reyting ≥ 4.70, faollik ≥ 50; Biznes — biznes avtomobil, 2019+, reyting ≥ 4.85, 200+ safar, faollik ≥ 70; Miniven — 6+ o'rindiq, 2012+, reyting ≥ 4.70; Yetkazish — yetkazish qoidalarini qabul qilish. Yopiq tarifni bossangiz, qaysi shart bajarilmagani va uni qanday bajarish ko'rsatiladi. Avtomobil almashsa, texnik pasport qayta tekshiriladi.
  - **Yordam markazi** — savol-javoblar (qidiruv bilan), chat (operator javoblari), qo'ng'iroq, Telegram, favqulodda 112.
  - **Zanjir buyurtma** — safar tugashiga 2 km qolganda keyingi buyurtma shu manzil yaqinidan taklif qilinadi; yakunlangach haydovchi darhol keyingi mijozga yo'l oladi (server ham qo'llab-quvvatlaydi).
  - **Mijoz chiqmadi** — pullik kutish boshlangandan 2 daqiqa o'tib, faollik kamaymasdan buyurtmani yopish va kutish uchun kompensatsiya.
  - **Ovozli yo'riqnoma** — ayol ovozi, o'zbek va rus tilida (Sozlamalar → Ovoz tili): yangi buyurtma, burilishlar (200/300/400 m oldin va burilishda), pullik kutish, «naqd pul oling» va h.k. Batafsil — pastda «Ovoz to'plami».
  - Liniyada ekran o'chmaydi (expo-keep-awake), yangi buyurtmada tebranish; boshqa sahifada bo'lsangiz ham taklif xarita ekranida ochiladi.
  - Ilova yopilib qayta ochilsa, faol safar, zanjir va liniyadagi holat tiklanadi.
  - Telefonda navigator kamerasi mashina yo'nalishiga burilib, qiya ko'rinishda ergashadi; GPS ruxsati yo'q yoki aloqa uzilganda ogohlantirish chiqadi.

Ishga tushirish (uchta terminal, kompyuter IP manzilini qo'ying):

```bash
npm run dispatch                                                   # server: ws://0.0.0.0:8787
EXPO_PUBLIC_DISPATCH_URL=ws://192.168.1.10:8787 npx expo start     # YUMS (yo'lovchi)
EXPO_PUBLIC_DISPATCH_URL=ws://192.168.1.10:8787 npm run driver               # YUMS Driver (port 8082)
```

Faqat haydovchi ilovasini demo rejimda ko'rish: `npm run driver` (telefonda Expo Go bilan QR-kodni skanerlang) yoki brauzerda `npm run driver:web`. Windows'da ham shu buyruqlar ishlaydi; `EXPO_PUBLIC_DISPATCH_URL` ni PowerShell'da `$env:EXPO_PUBLIC_DISPATCH_URL="ws://..."` bilan bering.

`EXPO_PUBLIC_DISPATCH_URL` berilmasa ikkala ilova ham demo rejimda ishlaydi: yo'lovchiga virtual haydovchi, haydovchiga sinov buyurtmalari keladi. Haydovchi ilovasida «Demo harakat» yoqilsa mashina marshrut bo'ylab o'zi yuradi (GPS o'rniga).

EAS build: `npx eas-cli@latest build --profile driver-preview` (yoki `driver-production`). Bu profillarda `APP_VARIANT=driver` o'rnatilgan — `app.config.js` nom, bundle ID, sxema va marshrutlar papkasini (`src/driver/app`) almashtiradi.

## Ovoz to'plami (haydovchi ilovasi)

Ovozli yo'riqnoma oldindan yozilgan kliplar bilan ishlaydi — har qanday telefonda bir xil eshitiladi, internet kerak emas:

- Iboralar: `src/driver/lib/voice-phrases.json` (37 ta, o'zbek va rus tilida).
- Kliplar: `assets/voice/<uz|ru>/<kalit>.mp3`, ro'yxati `src/driver/lib/voice-clips.ts` (avtomatik yaratiladi).
- Biror til uchun kliplar bo'lmasa, qurilmaning shu tildagi ayol ovozi, u ham bo'lmasa — ikkinchi tildagi kliplar ishlatiladi.

Kliplarni yaratish — `scripts/voice/generate.py` (python3, numpy, ffmpeg):

```bash
# Tavsiya: Microsoft Azure neyron ovozlari (tijoriy foydalanishga ruxsat; bepul tarif yetadi)
# uz: uz-UZ-MadinaNeural, ru: ru-RU-SvetlanaNeural — ikkalasi ham ayol ovozi
export AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=westeurope
python3 scripts/voice/generate.py --lang uz --engine azure
python3 scripts/voice/generate.py --lang ru --engine azure

# Oflayn (Piper / sherpa-onnx): pip install "sherpa-onnx<2"
python3 scripts/voice/generate.py --lang ru --engine piper --model ./vits-piper-ru_RU-irina-medium
```

Hozirgi holat: rus tili — Piper «Irina» ovozi (oflayn neyron model). **Uning litsenziyasi noma'lum** — demo va sinov uchun; do'konga chiqarishdan oldin Azure ovozi yoki diktor yozuvi bilan almashtiring. O'zbek tili uchun kliplar hali yo'q (Azure kaliti kerak) — hozircha ruscha kliplar ishlatiladi. Diktor yozdirgan fayllarni ham shu nomlar bilan `assets/voice/<til>/` ga qo'yib, `--map-only` bilan ro'yxatni yangilash kifoya.

## Tuzilma

```
src/
  app/
    (tabs)/       Asosiy, Qidiruv (World), Xabarlar (Connect), Kabinet
    project/ company/ specialist/ market/ chat/   platforma sahifalari
    taxi.tsx      YUMS Taxi xaritasi (+ menu, payment, history, … ekranlari)
  components/     UI tizimi, platforma kartalari, xarita, buyurtma panellari
  driver/
    app/          YUMS Driver marshrutlari (alohida ilova): index, register, earnings, profile
    lib/          haydovchi holati (driver-store.tsx)
  lib/
    dispatch.ts       dispetcher protokoli va WebSocket klienti (ikkala ilova uchun)
    store.tsx         hisob, mavzu, til, taksi holati
    platform.tsx      platforma holati: loyihalar, chatlar, moderatsiya, tariflar
    platform-data.ts  turlar, sohalar, mamlakatlar, namuna ma'lumotlar
    i18n.ts           o'zbek / rus / ingliz matnlari
server/
  dispatch.mjs    dispetcher serveri (Node + ws): buyurtmalarni haydovchilarga taqsimlash
```

## Tekshiruvlar

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
