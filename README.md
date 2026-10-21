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

> Hozircha server qismi yo'q: barcha ma'lumotlar qurilmada saqlanadi, moderatsiya, javoblar, SMS kod va to'lovlar demo rejimida ishlaydi.

## Ishga tushirish

```bash
npm install
npx expo start
```

Telefonda **Expo Go** ilovasi bilan QR-kodni skanerlang.
Kirish va ro'yxatdan o'tish alohida:
- **Ro'yxatdan o'tish** — istalgan raqam yoki email, kod (istalgan 5 ta raqam), so'ng profil.
- **Kirish** — ro'yxatdan o'tgan raqam bilan; demo hisob: `+998 90 000 00 00` (kod — istalgan 5 ta raqam).

Hisoblar hozircha qurilmada saqlanadi.

Demo ssenariylar:
- Loyiha yaratib «Yuborish»ni bosing — bir necha soniyada avtomatik moderatsiyadan o'tadi. Matnda «kafolatlangan daromad» kabi iboralar bo'lsa, moderator navbatida qoladi.
- Kabinet → Xavfsizlik → Ruxsat darajasi → «Moderator» — moderatsiya paneli ochiladi.
- Investorga «Taklif yuborish» — so'rov bir necha soniyada qabul qilinadi.
- Taksi promokodlari: `YUMS20`, `YANGI30`, `TOSHKENT`.

## Tuzilma

```
src/
  app/
    (tabs)/       Asosiy, Qidiruv (World), Xabarlar (Connect), Kabinet
    project/ company/ specialist/ market/ chat/   platforma sahifalari
    taxi.tsx      YUMS Taxi xaritasi (+ menu, payment, history, … ekranlari)
  components/     UI tizimi, platforma kartalari, xarita, buyurtma panellari
  lib/
    store.tsx         hisob, mavzu, til, taksi holati
    platform.tsx      platforma holati: loyihalar, chatlar, moderatsiya, tariflar
    platform-data.ts  turlar, sohalar, mamlakatlar, namuna ma'lumotlar
    i18n.ts           o'zbek / rus / ingliz matnlari
```

## Tekshiruvlar

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
