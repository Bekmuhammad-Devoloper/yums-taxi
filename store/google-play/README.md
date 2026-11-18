# YUMS va YUMS Driver — Google Play'ga joylash

Ikkala ilova alohida joylanadi: **YUMS** (`uz.yums.taxi`) va **YUMS Driver** (`uz.yums.driver`). Har biri uchun
quyidagi qadamlar bir xil, farqlar alohida ko'rsatilgan. Shu papkada tayyor fayllar:

| Fayl | Nima uchun |
|---|---|
| `icon-512.png` | Ilova ikonkasi (512×512) — ikkala ilovaga |
| `feature-yums.png`, `feature-yums-driver.png` | «Feature graphic» (1024×500) |
| `../../scripts/store/fit-screenshots.py` | Telefon skrinshotlarini Play o'lchamiga (1080×1920) moslaydi |

## 0. Eng muhimi — vaqt jadvali

Akkauntingiz **shaxsiy (Личный)** va 2023-yil 13-noyabrdan keyin ochilgan. Shuning uchun Google talabi:

- ilova avval **yopiq testda (Closed testing)** kamida **12 ta tester** bilan **14 kun uzluksiz** turishi kerak;
- shundan keyingina «Production»ga chiqarish uchun ariza beriladi (Google ko'rib chiqishi ~7 kungacha).

Demak eng tez yo'l: **yopiq testni bugun-ertaga boshlash**. 12 ta tester — Gmail akkaunti bor 12 ta odam
(xodimlar, tanishlar, haydovchilar). Ular 14 kun davomida testdan chiqib ketmasligi va ilovadan haqiqatda
foydalanishi kerak (Google faollikni ham tekshiradi). 12 tadan ko'proq (15–20) yig'ish xavfsizroq.

## 1. Bir martalik tayyorgarlik (kompyuterda)

### 1.1 Yuklash kaliti — GitHub secret'lari (yums-taxi repo)

Kalit yaratilgan: `C:\Users\user\Documents\YUMS-Play-Keys\`. **Bu papkani darhol zaxiralang** (flesh +
shaxsiy bulut). Kalit yo'qolsa, Google orqali almashtirish mumkin, lekin bir necha kun oladi.

GitHub → `yums-taxi` repo → **Settings → Secrets and variables → Actions → New repository secret**.
Qiymatlar `PAROLLAR.txt` faylida:

| Secret nomi | Qiymat |
|---|---|
| `PLAY_UPLOAD_KEYSTORE_B64` | `yums-upload.jks.base64.txt` faylidagi butun matn |
| `PLAY_UPLOAD_STORE_PASSWORD` | `PAROLLAR.txt` dagi parol |
| `PLAY_UPLOAD_KEY_ALIAS` | `yums-upload` |
| `PLAY_UPLOAD_KEY_PASSWORD` | `PAROLLAR.txt` dagi parol (o'sha parol) |

Kiritib bo'lgach `PAROLLAR.txt`ni parol menejeriga ko'chiring va fayldan o'chiring.

### 1.2 Google tekshiruvchisi uchun kirish — GitHub secret'lari (UUMS-Backend repo)

Google xodimi ilovaga kira olishi shart, aks holda rad etiladi. SMS ularga kelmaydi, shuning uchun bitta
maxsus raqam doimiy kod bilan kiradi (boshqa hech kimga ta'sir qilmaydi, SMS yuborilmaydi):

| Secret nomi | Qiymat |
|---|---|
| `REVIEW_LOGIN_PHONE` | Kompaniyaga tegishli, **hech kim ishlatmaydigan** raqam, masalan `+998XXXXXXXXX` |
| `REVIEW_LOGIN_CODE` | 5 xonali kod, masalan `24680` (tasodifiy tanlang) |

Secret qo'shilgach backend'ni qayta deploy qiling (main'ga istalgan push yoki Actions → Deploy → Re-run).
Keyin shu raqam bilan ikkala ilovaga bir marta kirib, hisobni tayyorlang:

- **YUMS:** ism kiriting, bir-ikkita loyiha/e'lonni ko'rib chiqing — tekshiruvchi bo'sh ekran ko'rmasin.
- **YUMS Driver:** ro'yxatdan o'tib, demo hujjatlarni yuklang va **admin paneldan tasdiqlang** — aks holda
  tekshiruvchi faqat «Hujjatlar tekshirilmoqda» ekranini ko'radi.

### 1.3 AAB yig'ish

GitHub → `yums-taxi` → **Actions → «Google Play AAB» → Run workflow**. ~25 daqiqada tayyor bo'ladi;
yig'ilish sahifasining pastida **Artifacts**: `YUMS.aab` va `YUMS-Driver.aab` (zip ichida). Ularni yuklab oling.

Workflow o'zi tekshiradi: paket nomi, upload key bilan imzolangani, taqiqlangan ruxsatlar yo'qligi.

### 1.4 Skrinshotlar

Har ilova uchun telefonda 4–8 ta skrinshot oling (yorug' rejim, demo ma'lumot bilan, shaxsiy ma'lumot
ko'rinmasin). Keyin:

```
python scripts/store/fit-screenshots.py C:\skrinshotlar\yums
```

`play` papkasida 1080×1920 rasmlar chiqadi. Tepada sarlavha kerak bo'lsa, skrinshotlar yoniga
`captions.txt` qo'ying (har qatorda bitta sarlavha, fayllar alfavit tartibida).

Tavsiya etilgan ekranlar — YUMS: bosh sahifa, taksi buyurtmasi (xarita + tariflar), haydovchi kelmoqda,
loyihalar katalogi, mutaxassis profili / YUMS ID, chat. YUMS Driver: xarita «Liniyada», buyurtma taklifi,
navigator, daromad, hujjatlar.

## 2. Play Console — ilovani yaratish

**Создать приложение** tugmasi:

| Maydon | YUMS | YUMS Driver |
|---|---|---|
| Название приложения | `YUMS — такси и бизнес` | `YUMS Driver` |
| Название пакета | `uz.yums.taxi` | `uz.yums.driver` |
| Язык по умолчанию | Русский – ru-RU | Русский – ru-RU |
| Приложение или игра | Приложение | Приложение |
| Бесплатное или платное | Бесплатное | Бесплатное |

Paket nomini yozgach **«Проверить доступность»**ni bosing — u AAB'dagi bilan aynan bir xil bo'lishi shart va
keyin o'zgartirib bo'lmaydi. Uchala belgini qo'ying (Правила программы, подписание приложений, экспорт США)
→ **Создать приложение**.

O'zbek tili Play do'kon sahifasi tillari ro'yxatida **yo'q**, shuning uchun asosiy til — rus, qo'shimcha — ingliz.
O'zbek tilidagi telefonlarda sahifa ruscha ko'rinadi; ilovaning o'zi esa o'zbekcha ishlaydi.

## 3. «Настройка приложения» (Dashboard'dagi vazifalar)

### 3.1 Политика конфиденциальности

```
https://api.yums.uz/api/v1/legal/privacy
```

### 3.2 Доступ к приложению

«Весь функционал или его часть ограничены» → **Добавить инструкции**:

- Название: `Review account`
- Имя пользователя / телефон: `REVIEW_LOGIN_PHONE` raqami
- Пароль: `REVIEW_LOGIN_CODE` kodi
- Другая информация (inglizcha):

```
Sign-in is by phone number and a one-time code. On the sign-in screen keep the country +998,
type the phone number above (9 digits after +998), tap the button to get the code by SMS
and enter the code above. No SMS is sent to this review number; the code always works.
```

YUMS Driver uchun qo'shimcha qator: `The review account is an approved driver. Ride orders only reach
drivers inside Uzbekistan, so no live order will arrive during review.`

### 3.3 Реклама

- **YUMS:** «Да, есть реклама» (bosh sahifada tasdiqlangan kompaniyalarning bannerlari).
- **YUMS Driver:** «Нет».

### 3.4 Возрастные ограничения (IARC)

E-mail kiriting, kategoriya: **«Все остальные типы приложений»**. Javoblar:

| Savol | Javob |
|---|---|
| Zo'ravonlik, qo'rqinchli kontent, jinsiy kontent, so'kinish, giyohvand moddalar, qimor | Нет |
| Foydalanuvchilar o'zaro muloqot qiladimi yoki kontent almashadimi | **Да** (chat, e'lonlar, sharhlar) |
| Foydalanuvchining joylashuvi boshqa foydalanuvchilarga ko'rsatiladimi | **Да** (safar paytida haydovchi/yo'lovchi) |
| Raqamli tovar sotib olish | Hozircha **Нет** (Play Billing qo'shilganda «Да» qilib yangilaymiz) |
| Web-brauzer / qidiruv tizimi | Нет |

### 3.5 Целевая аудитория

Faqat **18 лет и старше**. «Может ли приложение привлекать детей?» — **Нет**.

### 3.6 Новостное приложение — Нет. Приложение о здоровье — Нет. Госучреждение — Нет.

### 3.7 Финансовые функции

**«Моё приложение не предоставляет финансовых функций»**. YUMS balansi faqat YUMS xizmatlariga
to'lash uchun, o'tkazma va kredit yo'q; haydovchiga to'lov — ko'rsatgan xizmati uchun.

### 3.8 Безопасность данных (Data safety)

Umumiy savollar (ikkala ilova):

| Savol | Javob |
|---|---|
| Собирает или передаёт данные? | Да |
| Все данные шифруются при передаче? | Да |
| Можно запросить удаление? | Да |
| URL удаления аккаунта | `https://api.yums.uz/api/v1/legal/account-deletion` |
| Можно удалить часть данных без удаления аккаунта? | Да (profil, loyiha, e'lon, karta — ilovada o'chiriladi) |

Ma'lumot turlari — hammasi **«собираются»**, **«не передаются»** (xizmat ko'rsatuvchilar — Click, Google,
Eskiz — Google ta'rifi bo'yicha «передача» hisoblanmaydi), **«не обрабатываются эфемерно»**:

| Tur | YUMS | YUMS Driver | Majburiymi | Maqsad |
|---|---|---|---|---|
| Местоположение → Точное | ✔ | ✔ | Yo'lovchi: ixtiyoriy · Haydovchi: majburiy | Функциональность |
| Личные данные → Имя | ✔ | ✔ | Majburiy | Функциональность, Управление аккаунтом |
| Личные данные → Телефон | ✔ | ✔ | Ixtiyoriy (email bilan ham kirish mumkin) · Haydovchi: majburiy | Управление аккаунтом, Функциональность |
| Личные данные → E-mail | ✔ | — | Ixtiyoriy | Управление аккаунтом |
| Личные данные → ID пользователя | ✔ | ✔ | Majburiy | Управление аккаунтом |
| Личные данные → Другое (bio, kompaniya, hujjat raqamlari) | ✔ | ✔ | Ixtiyoriy · Haydovchi: majburiy | Функциональность |
| Финансы → Платёжная информация (bank kartasi) | ✔ | ✔ | Ixtiyoriy | Функциональность |
| Финансы → История покупок | ✔ | ✔ | Majburiy | Функциональность |
| Финансы → Другое (daromad, pul yechish) | — | ✔ | Majburiy | Функциональность |
| Сообщения → Другие сообщения в приложении | ✔ | ✔ | Ixtiyoriy | Функциональность |
| Фото и видео → Фото | ✔ | ✔ | Ixtiyoriy · Haydovchi: majburiy (hujjat rasmi) | Функциональность |
| Файлы и документы | ✔ | — | Ixtiyoriy | Функциональность |
| Действия в приложении → Другой контент пользователя (loyiha, e'lon, sharh) | ✔ | — | Ixtiyoriy | Функциональность |
| Идентификаторы устройства (push token) | ✔ | ✔ | Majburiy | Функциональность, Безопасность и защита от мошенничества |

**Belgilamang:** Контакты, SMS, журнал звонков, Аудио, Здоровье, Веб-история, Установленные приложения,
Журналы сбоев (xato hisoboti faqat telefonda qoladi), Рекламный ID.

### 3.9 Категория и контакты (Основная информация → Настройки магазина)

- Категория: **Карты и навигация** (ikkala ilova). Теги: Такси, Поездки.
- E-mail (ommaga ko'rinadi), telefon, sayt `https://yums.uz`.

## 4. Основная страница в Google Play (Store listing)

Grafika: ikonka `icon-512.png`, feature graphic, telefon skrinshotlari (kamida 2, tavsiya 4–8).
Tarjima: **Переводы → Добавить** → `en-US` (asosiy til ru-RU). en-US sahifasidagi nom: `YUMS — Taxi & Business`.

### YUMS — qisqa tavsif (≤80)

- ru: `Вызовите такси, найдите проекты и партнёров — всё в одном приложении.`
- en: `Order a taxi, find projects and partners — all in one app.`

### YUMS — to'liq tavsif

**ru**
```
YUMS — такси и бизнес-платформа в одном приложении.

ТАКСИ
• Укажите адрес — цена видна до заказа
• Тарифы: Старт, Комфорт, Бизнес, Минивэн и Доставка
• Следите за машиной на карте в реальном времени
• Переписывайтесь с водителем прямо в приложении
• Оплата наличными, балансом YUMS или банковской картой
• Оценивайте поездку после завершения

ПЛАТФОРМА
• Каталог проектов: находите стартапы и бизнесы или размещайте свои
• Каталог компаний, специалистов и инвесторов
• Запрос на сотрудничество и безопасный чат — ваш номер не виден
• YUMS ID: цифровая визитка с QR-кодом
• Объявления, встречи и отзывы

БЕЗОПАСНОСТЬ
• Все проекты и объявления проходят модерацию
• Жалобы и блокировка любого контента или пользователя
• Двухэтапный вход, копия ваших данных и удаление аккаунта прямо в приложении

Поддержка 24/7 — в чате приложения.
```

**en**
```
YUMS — a taxi and a business platform in one app.

TAXI
• Enter your destination and see the price before you order
• Classes: Start, Comfort, Business, Minivan and Delivery
• Follow your car on the map in real time
• Message your driver right in the app
• Pay in cash, with your YUMS balance or by bank card
• Rate your trip when it ends

PLATFORM
• A catalog of projects: find startups and businesses or list your own
• Directories of companies, specialists and investors
• Partnership requests and a safe chat — your phone number stays hidden
• YUMS ID: a digital business card with a QR code
• Listings, meetings and reviews

SAFETY
• Every project and listing is moderated
• Report or block any content or user
• Two-step sign-in, a copy of your data and account deletion right in the app

Support 24/7 in the in-app chat.
```

### YUMS Driver — qisqa tavsif

- ru: `Для водителей YUMS: заказы, навигатор и доходы в одном месте.`
- en: `For YUMS drivers: orders, navigation and earnings in one place.`

### YUMS Driver — to'liq tavsif

**ru**
```
YUMS Driver — приложение для водителей такси YUMS.

• Выходите на линию и получайте заказы поблизости
• Голосовое оповещение о новом заказе
• Встроенный навигатор или Яндекс Навигатор / Google Maps
• Чат с пассажиром в приложении
• Доход за день, история поездок и рейтинг
• Баланс и заявки на вывод средств
• Районы с высоким спросом на карте
• Загрузка документов и отслеживание их проверки в приложении
• Кнопка экстренной помощи (SOS)

Для работы нужны водительское удостоверение, документы на автомобиль и подтверждение YUMS.
Местоположение используется только в режиме «На линии», пока приложение открыто.
```

**en**
```
YUMS Driver — the app for YUMS taxi drivers.

• Go online and get orders nearby
• Voice alerts for new orders
• Built-in navigation, or Yandex Navigator / Google Maps
• Chat with your passenger in the app
• Today's earnings, trip history and rating
• Balance and payout requests
• High-demand areas on the map
• Upload your documents and follow their review in the app
• Emergency (SOS) button

Driving requires a driving licence, vehicle documents and approval by YUMS.
Location is used only while you are «Online» with the app open.
```

## 5. Yopiq test (Closed testing) — yuklash

1. **Тестирование → Закрытое тестирование → Alpha → Управление треком**.
2. **Тестировщики:** «Списки адресов e-mail» → yangi ro'yxat → 12+ ta Gmail. «Ссылка для отзывов» —
   e-mail yoki Telegram guruh.
3. **Страны/регионы:** Uzbekistan (va kerak bo'lsa boshqalar).
4. **Создать выпуск** → «Подписание приложений Google Play» (Play App Signing) — **Принять/Продолжить**
   (Google o'z kalitini yaratadi; bizdagi kalit faqat yuklash uchun).
5. `YUMS.aab` ni yuklang. «Название выпуска» avtomatik. «Примечания к выпуску»:
   ```
   <ru-RU>Первая тестовая версия.</ru-RU>
   <en-US>First test release.</en-US>
   ```
6. **Сохранить → Проверить выпуск → Отправить на проверку.** Ko'rib chiqish odatda 1–3 kun.
7. Tasdiqlangach, «Тестировщики» bo'limidagi **havolani** 12 testerga yuboring: har biri havolani ochib
   «Стать тестировщиком» bosadi va ilovani Play'dan o'rnatadi. 14 kunlik hisob shundan boshlanadi.

YUMS Driver uchun xuddi shu (alohida ilova, o'z testerlari — o'sha 12 kishi bo'lishi mumkin).

Testerlar telefonida GitHub'dan o'rnatilgan eski YUMS APK bo'lsa, avval uni o'chirishsin — imzo boshqa,
Play ustidan o'rnata olmaydi.

## 6. Play App Signing'dan keyin — xarita kaliti (MUHIM)

Play'dan o'rnatilgan ilova Google'ning kaliti bilan imzolanadi, shuning uchun xarita kulrang chiqmasligi uchun:

1. Play Console → ilova → **Тестирование и выпуск → Целостность приложения → Подписание приложений** →
   «Сертификат ключа подписи приложения» → **SHA-1** ni nusxalang.
2. Google Cloud Console → **APIs & Services → Credentials** → Android xarita kaliti → «Android apps» →
   **Add**: paket `uz.yums.taxi` + shu SHA-1 (va `uz.yums.driver` + o'zining SHA-1).
3. Upload key SHA-1 ham qo'shing (lokal tekshiruv uchun):
   `BB:3F:DA:C6:F5:30:13:8A:F1:B7:07:96:21:10:A9:D2:2D:78:D2:82`.

Push bildirishnomalar (Firebase) SHA-1 talab qilmaydi.

## 7. 14 kundan keyin — Production

Dashboard → **«Подать заявку на доступ к рабочей версии»**. Savollarga halol va batafsil javob bering
(testerlar nima qildi, qanday xatolar topildi va tuzatildi, ilova kimlar uchun). Tasdiqlangach —
**Рабочая версия → Создать выпуск** → test'dagi AAB'ni ko'chiring → avval 20% foydalanuvchiga, keyin 100%.

## 8. Rad etilmaslik uchun nimalar qilingan

- Ilova o'zini GitHub'dan yangilamaydi (Play versiyasida o'chirilgan) — «Device and Network Abuse».
- Ortiqcha ruxsatlar olib tashlangan: mikrofon, boshqa ilovalar ustida ko'rsatish, fon xizmatlari.
  Joylashuv faqat ilova ochiqligida; fon joylashuvi yo'q — maxsus deklaratsiya va video kerak emas.
- Hisobni o'chirish ikkala ilovada bor; o'chirilganda profil, loyiha, e'lon va hujjatlar ham o'chadi.
- Maxfiylik siyosati va hisobni o'chirish sahifalari ochiq, uch tilda.
- Raqamli xizmatlar (tarif, TOP, reklama) Play versiyasida Play Billing ulanmaguncha sotilmaydi.
- YUMS AI javoblari ustidan ilova ichida shikoyat qilish mumkin (AI kontent qoidasi).
- Foydalanuvchi kontenti: moderatsiya, shikoyat, bloklash — bor (UGC qoidasi).
- Target API 36, 16 KB sahifa mosligi tekshirilgan.

## 9. Keyingi bosqich — Google Play Billing

Tarif, TOP va reklama Play versiyasida Google Play Billing orqali sotiladi (Google 15% oladi). Bunga kerak:

1. Play Console → **Настройка платежного профиля** (merchant). Diqqat: pullik xarid bo'lgan shaxsiy
   akkauntda Google manzilingizni do'kon sahifasida ko'rsatadi.
2. **Монетизация → Товары → Подписки**: `pro_monthly`, `pro_yearly`, `business_monthly`, `business_yearly`;
   **Цифровые товары**: `top_boost_7d`, `ads_50`, `ads_150`, `ads_500`, `ads_1000`.
3. Google Cloud'da service account → Play Console «Пользователи и разрешения»ga qo'shish (xaridlarni
   server tomonda tekshirish uchun).

Ilova va backend qismi yopiq test davomida tayyorlanadi va production'dan oldin chiqariladi.
