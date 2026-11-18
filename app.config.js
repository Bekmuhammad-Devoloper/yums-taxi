// YUMS ilovalari konfiguratsiyasi.
// Standart — yo'lovchi va platforma; APP_VARIANT=driver — alohida haydovchi ilovasi.
const VARIANT = process.env.APP_VARIANT;

// iOS ruxsat matni: inglizcha asos, o'zbek va rus tarjimalari locales/driver-*.json da (App Store tekshiruvchisi uchun)
const LOCATION_DRIVER = 'YUMS Driver uses your location while you are online to offer you nearby orders and show passengers where your car is.';

/** expo-router ildiz papkasini almashtirish (qolgan plaginlar o'zgarmaydi) */
const withRouterRoot = (plugins, root, extra) => (plugins ?? []).map(p => {
  const name = Array.isArray(p) ? p[0] : p;
  const opts = Array.isArray(p) ? p[1] ?? {} : {};
  if (name === 'expo-router') return ['expo-router', { ...opts, root }];
  return extra?.(name, opts) ?? p;
});

// Android xaritasi (react-native-maps → Google Maps) uchun kalit: Expo Go o'zinikini ishlatadi, APK esa kalitsiz
// kulrang bo'sh xarita ko'rsatadi. Kalit kodga yozilmaydi — EAS muhit o'zgaruvchisi GOOGLE_MAPS_ANDROID_KEY dan olinadi.
const MAPS_KEY = process.env.GOOGLE_MAPS_ANDROID_KEY;
// Push (FCM): Firebase'dan olingan google-services.json loyiha ildizida bo'lsa ulanadi (gitga kirmaydi;
// GitHub Actions uni GOOGLE_SERVICES_JSON secret'idan yozadi). Fayl ikkala paketni ham o'z ichiga olishi kerak:
// uz.yums.taxi va uz.yums.driver. Bo'lmasa APK push'siz yig'iladi.
const PUSH_FILE = './google-services.json';
const hasPush = require('fs').existsSync(require('path').join(__dirname, PUSH_FILE));
const withMaps = android => {
  const out = MAPS_KEY ? { ...android, config: { ...android?.config, googleMaps: { apiKey: MAPS_KEY } } } : android;
  return hasPush ? { ...out, googleServicesFile: PUSH_FILE } : out;
};

// Yig'ilish raqami (GitHub Actions run raqami): ilova yangilanishni shu raqam bilan solishtiradi, Android esa
// versionCode sifatida ishlatadi — har yangi APK eskisining ustiga yangilanish bo'lib o'rnatiladi.
const BUILD = Number(process.env.APP_BUILD) || 0;
const withBuild = cfg => (BUILD > 0
  ? {
    ...cfg,
    android: { ...cfg.android, versionCode: BUILD },
    // App Store ham har yuklashda kattaroq raqam talab qiladi
    ios: { ...cfg.ios, buildNumber: String(BUILD) },
    extra: { ...cfg.extra, build: BUILD },
  }
  : cfg);

module.exports = ({ config }) => withBuild(configFor(config));

function configFor(config) {
  if (VARIANT === 'driver') {
    return {
      ...config,
      name: 'YUMS Driver',
      slug: 'yums-driver',
      scheme: 'yumsdriver',
      ios: {
        ...config.ios,
        bundleIdentifier: 'uz.yums.driver',
        infoPlist: { ...config.ios?.infoPlist, NSLocationWhenInUseUsageDescription: LOCATION_DRIVER },
      },
      android: withMaps({ ...config.android, package: 'uz.yums.driver' }),
      locales: { uz: './locales/driver-uz.json', ru: './locales/driver-ru.json' },
      plugins: withRouterRoot(config.plugins, './src/driver/app', (name, opts) =>
        (name === 'expo-location' ? ['expo-location', { ...opts, locationWhenInUsePermission: LOCATION_DRIVER }] : undefined)),
      extra: { ...config.extra, appVariant: 'driver' },
    };
  }
  return { ...config, android: withMaps(config.android) };
}
