# YUMS va YUMS Driver — App Store'ga joylash

Ikkala ilova alohida: **YUMS** (`uz.yums.taxi`) va **YUMS Driver** (`uz.yums.driver`). iOS ilovani Windows'da
yig'ib bo'lmaydi — IPA GitHub'ning macOS serverida yig'iladi (`.github/workflows/ios-ipa.yml`).
Grafikalar Play bilan umumiy: `../google-play/` (ikonka App Store uchun 1024×1024 — `assets/images/icon.png`).

## 0. Nima kerak

| Narsa | Izoh |
|---|---|
| **Apple Developer Program** | Yiliga $99. https://developer.apple.com/programs/enroll/ — «Individual» (sotuvchi sifatida ismingiz ko'rinadi) yoki «Organization» (kompaniya nomi; D-U-N-S raqami kerak). Tasdiqlash 1–2 kundan bir necha haftagacha. |
| **Mac** | Shart emas — yig'ish GitHub'da. |
| **iPhone** | Skrinshot va TestFlight sinovi uchun (bo'lmasa — 6-bo'lim). |

Google'dan farqli: App Store'da **14 kunlik yopiq test talabi yo'q** — tekshiruvdan o'tsa darhol chiqadi
(ko'rib chiqish odatda 1–2 kun).

## 1. Apple Developer va App Store Connect

1. Dasturga a'zo bo'lgach: https://developer.apple.com/account → **Membership** → **Team ID** ni yozib oling.
2. https://appstoreconnect.apple.com → **Apps → «+» → New App** (ikki marta):

   | Maydon | YUMS | YUMS Driver |
   |---|---|---|
   | Platforms | iOS | iOS |
   | Name | `YUMS — такси и бизнес` | `YUMS Driver` |
   | Primary Language | Russian | Russian |
   | Bundle ID | `uz.yums.taxi` (ro'yxatda bo'lmasa — «Register a new bundle ID» → Identifiers'da yarating) | `uz.yums.driver` |
   | SKU | `yums-taxi` | `yums-driver` |
   | User Access | Full Access | Full Access |

   O'zbek tili App Store tillari ro'yxatida yo'q — asosiy til rus, qo'shimcha ingliz (Play'dagidek).

3. **API kaliti** (IPA'ni GitHub imzolashi va yuklashi uchun): App Store Connect → **Users and Access →
   Integrations → App Store Connect API → Team Keys → «+»** → nom `GitHub CI`, rol **Admin** → **Generate**.
   `.p8` faylni yuklab oling (faqat bir marta beriladi!), **Key ID** va tepadagi **Issuer ID** ni yozib oling.
   Faylni `C:\Users\user\Documents\YUMS-Play-Keys\` yoniga saqlang, zaxiralang; gitga va chatga yubormang.

## 2. GitHub secret'lari (yums-taxi repo)

Settings → Secrets and variables → Actions → New repository secret:

| Secret | Qiymat |
|---|---|
| `APPSTORE_API_KEY_ID` | Key ID (masalan `2X9R4HXF34`) |
| `APPSTORE_API_ISSUER_ID` | Issuer ID (UUID) |
| `APPSTORE_API_KEY_P8` | `AuthKey_XXXX.p8` faylini Bloknot bilan ochib, **butun matni** (BEGIN/END qatorlari bilan) |
| `APPLE_TEAM_ID` | Team ID (10 belgi) |

## 3. IPA yig'ish va TestFlight

GitHub → **Actions → «iOS IPA» → Run workflow** → «TestFlight'ga yuklash» belgisini qo'ying → **Run**.
~40–60 daqiqa. Natija:

- **Artifacts:** `YUMS-ipa`, `YUMS-Driver-ipa` (imzolangan `.ipa`);
- belgi qo'yilgan bo'lsa — App Store Connect → ilova → **TestFlight** da yangi build (Apple ishlovi 10–30 daqiqa).

Secret'lar bo'lmasa workflow **imzosiz** IPA yig'adi (`*-unsigned.ipa`) — u faqat loyiha macOS'da xatosiz
yig'ilishini ko'rsatadi, iPhone'ga o'rnatilmaydi.

Workflow o'zi tekshiradi: paket nomi; ilova ishlatmaydigan ruxsatlar (mikrofon, «doim» joylashuv, harakat)
yo'qligi; shablon ruxsat matnlari qolmaganligi; `PrivacyInfo.xcprivacy` borligi.

TestFlight'da: **Internal Testing → «+»** → o'zingizni qo'shing → iPhone'da **TestFlight** ilovasi orqali o'rnating
va sinab ko'ring (kirish, xarita, buyurtma, kamera, hisobni o'chirish).

## 4. App Store sahifasi (har ilova uchun)

**App Information:** Category — **Travel** (ikkinchi: **Navigation**). Content Rights — «does not contain
third-party content». Age Rating — 5-bo'lim.

**Pricing and Availability:** Free; mamlakatlar — Uzbekistan (va kerakli boshqalari).

**App Privacy:** Privacy Policy URL — `https://api.yums.uz/api/v1/legal/privacy`. «Get Started» → ma'lumot
yig'iladi → quyidagilar. Hammasi: **Linked to the user — Yes**, **Used for tracking — No**, maqsad —
**App Functionality**:

| Apple turi | YUMS | YUMS Driver |
|---|---|---|
| Contact Info → Name, Email Address, Phone Number | ✔ | Name, Phone ✔ |
| Location → Precise Location | ✔ | ✔ |
| User Content → Photos or Videos | ✔ | ✔ |
| User Content → Customer Support | ✔ | ✔ |
| User Content → Other User Content (loyiha, e'lon, sharh, xabar) | ✔ | Other (xabar) ✔ |
| Financial Info → Payment Info | ✔ | ✔ |
| Financial Info → Other Financial Info (daromad, pul yechish) | — | ✔ |
| Identifiers → User ID, Device ID | ✔ | ✔ |
| Purchases → Purchase History | ✔ | ✔ |

Belgilamang: Health, Contacts, Browsing/Search History, Usage Data, Diagnostics, Sensitive Info, Advertising Data.

**Version (1.0) sahifasi:**

- Screenshots — **iPhone 6.9"** (kamida 3 ta). iPhone'dan olingan skrinshot o'lchami to'g'ri bo'ladi; Android
  skrinshotlaridan — `python scripts/store/fit-screenshots.py --ios <papka>` (1290×2796). iPad shart emas.
- Promotional Text / Description / Keywords — pastda (ru va en).
- Support URL: `https://yums.uz`. Marketing URL: `https://yums.uz`.
- **Build** — TestFlight'dagi buildni tanlang. «Export compliance» so'ralmaydi (ilova faqat HTTPS ishlatadi —
  `ITSAppUsesNonExemptEncryption = NO` ilovada yozilgan).
- **App Review Information:** Sign-in required — ✔; User name — `REVIEW_LOGIN_PHONE` raqami, Password —
  `REVIEW_LOGIN_CODE`. Contact — ismingiz, telefon, e-mail. **Notes** (inglizcha):

```
Sign-in is by phone number and a one-time code. On the sign-in screen keep +998, enter the
review phone number (9 digits after +998) and enter the code above; no SMS is sent to this
number and the code always works.
The account can be deleted in the app: Profile → Security & backup → Deleting your account
(YUMS Driver: Menu → Settings → Deleting your account).
Taxi rides are physical services paid in cash, from the in-app balance or by bank card.
No digital goods are sold in the iOS app.
```

YUMS Driver uchun qo'shing: `The review account is an approved driver. Ride orders only reach drivers inside
Uzbekistan, so no live order will arrive during review.`

**Submit for Review.**

### Tavsiflar

To'liq tavsif — Play'dagisi: `../google-play/README.md` → 4-bo'lim (ru va en). App Store qo'shimcha so'raydi:

| Maydon | YUMS (ru / en) | YUMS Driver (ru / en) |
|---|---|---|
| Subtitle (≤30) | `Такси, проекты и партнёры` / `Taxi, projects and partners` | `Заказы и доходы водителя` / `Driver orders and earnings` |
| Keywords (≤100, vergul bilan) | `такси,поездка,водитель,ташкент,узбекистан,проекты,инвесторы,бизнес,партнёры` / `taxi,ride,driver,tashkent,uzbekistan,projects,investors,business,partners` | `водитель,такси,заказы,доход,навигатор,yums` / `driver,taxi,orders,earnings,navigation,yums` |
| Promotional Text | `Такси и бизнес-платформа YUMS в одном приложении.` / `The YUMS taxi and business platform in one app.` | `Всё для водителей YUMS в одном приложении.` / `Everything YUMS drivers need in one app.` |

## 5. Age Rating (yosh reytingi)

App Store Connect'dagi so'rovnoma: zo'ravonlik, jinsiy kontent, so'kinish, qimor, tibbiyot, alkogol — **None/No**.
«Unrestricted web access» — No. **User-generated content — Yes**, **Messaging and chat — Yes**,
**Advertising — Yes** (YUMS; Driver — No). Ilova shartlariga ko'ra foydalanuvchi 18 yoshdan katta bo'lishi
kerak — so'rovnoma oxirida «Age Rating Override» bo'lsa **18+** ni tanlang.

## 6. iPhone bo'lmasa

TestFlight'ni do'stingiz yoki xodimning iPhone'ida sinash mumkin (Internal Testing → uning Apple ID e-maili).
Skrinshotlar — Android'dan `--ios` bilan moslab. Lekin chiqarishdan oldin kamida bitta haqiqiy iPhone'da sinab
ko'rish qat'iy tavsiya etiladi.

## 7. Hali qilinmaganlar (iOS)

- **Push bildirishnomalar** iOS'da hali yo'q (Android'da bor). Ilova ishlaydi, xabarlar ilova ichidagi
  «Bildirishnomalar»ga tushadi. Ulash uchun Apple Push kaliti (.p8) va backend'da APNs yuborish kerak.
- **Apple In-App Purchase:** tarif, TOP va reklama iOS'da Play'dagidek yashirin — Apple ham raqamli xizmatni
  faqat o'z to'lovi orqali sotishga ruxsat beradi. Play Billing bilan birga qo'shiladi.

## 8. Rad etilmaslik uchun nimalar qilingan

- Ruxsat matnlari aniq (inglizcha + o'zbek/rus tarjima), ishlatilmaydigan ruxsatlar olib tashlangan.
- Privacy manifest (`PrivacyInfo.xcprivacy`) bor, kuzatuv (tracking) yo'q.
- Hisobni o'chirish ilovaning o'zida (5.1.1(v)), maxfiylik siyosati ilovada va sahifada.
- Foydalanuvchi kontenti: moderatsiya, shikoyat, bloklash (1.2); AI javoblari ustidan shikoyat.
- Raqamli xaridlar yo'q (3.1.1): tariflar sahifasida do'kon versiyasida narx va sotib olish ko'rsatilmaydi;
  taksi — jismoniy xizmat, to'lov o'z usullarida.
- Uchinchi tomon orqali kirish yo'q — «Sign in with Apple» talab qilinmaydi.
- Tekshiruvchi uchun ishlaydigan demo hisob.
