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
- Haydovchi ilovasida: ro'yxatdan o'tish (telefon, mashina, rang, davlat raqami, tariflar), Liniyada/emas tugmasi, taklif kartasi (narx, masofa, to'lov, izoh, taymer), navigator, qo'ng'iroq, kutish taymeri, daromad (kunlik / 7 kun, komissiya, naqd/karta, diagramma), profil.

Ishga tushirish (uchta terminal, kompyuter IP manzilini qo'ying):

```bash
npm run dispatch                                                   # server: ws://0.0.0.0:8787
EXPO_PUBLIC_DISPATCH_URL=ws://192.168.1.10:8787 npx expo start     # YUMS (yo'lovchi)
EXPO_PUBLIC_DISPATCH_URL=ws://192.168.1.10:8787 npm run driver -- --port 8082   # YUMS Driver
```

`EXPO_PUBLIC_DISPATCH_URL` berilmasa ikkala ilova ham demo rejimda ishlaydi: yo'lovchiga virtual haydovchi, haydovchiga sinov buyurtmalari keladi. Haydovchi ilovasida «Demo harakat» yoqilsa mashina marshrut bo'ylab o'zi yuradi (GPS o'rniga).

EAS build: `npx eas-cli@latest build --profile driver-preview` (yoki `driver-production`). Bu profillarda `APP_VARIANT=driver` o'rnatilgan — `app.config.js` nom, bundle ID, sxema va marshrutlar papkasini (`src/driver/app`) almashtiradi.

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
