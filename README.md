# YUMS Taxi

Taksi chaqirish uchun mobil ilova (Android / iOS) — YUMS xalqaro raqamli platformasining transport yo'nalishi.

React Native + Expo (SDK 58), Expo Router, TypeScript.

## Imkoniyatlar

- Telefon raqami va SMS kod orqali kirish
- Xarita: GPS joylashuv, pinni surib olish nuqtasini tanlash
- Manzil qidiruvi, Uy/Ish va so'nggi manzillar
- Haqiqiy ko'chalar bo'yicha marshrut (OSRM), masofa va vaqt
- Tariflar: Start, Komfort, Biznes, Miniven, Yetkazish; yuqori talab koeffitsienti
- To'lov: naqd, karta (Uzcard / Humo / Visa), YUMS balans, promokodlar, 3% keshbek
- Istaklar: bolalar o'rindig'i, konditsioner, uy hayvoni, izoh
- Haydovchi qidirish → kelish → kutish → safar → baholash va choy puli
- Xavfsizlik: SOS 112, 102, 103, 101; safarni ulashish
- Safarlar tarixi va takrorlash, yordam, sozlamalar, yorug'/qorong'i mavzu

> Hozircha server qismi yo'q: haydovchilar, SMS kod va to'lovlar demo rejimida, ma'lumotlar qurilmada saqlanadi.

## Ishga tushirish

```bash
npm install
npx expo start
```

Telefonda **Expo Go** ilovasi bilan QR-kodni skanerlang (telefon va kompyuter bitta Wi-Fi'da bo'lishi kerak).
Demo kirish: istalgan 9 xonali raqam, SMS kod — istalgan 4 ta raqam.
Demo promokodlar: `YUMS20`, `YANGI30`, `TOSHKENT`.

## Tuzilma

```
src/
  app/          ekranlar (Expo Router)
  components/   xarita, buyurtma panellari, UI elementlar
  lib/          holat (store), geo-hisoblar, ma'lumotlar, mavzu
```

## Tekshiruvlar

```bash
npx tsc --noEmit
npx eslint src
npx expo-doctor
```
