// YUMS ilovalari konfiguratsiyasi.
// Standart — yo'lovchi va platforma; APP_VARIANT=driver — alohida haydovchi ilovasi.
const VARIANT = process.env.APP_VARIANT;

const LOCATION_DRIVER = "YUMS Driver buyurtmalarni yaqin atrofdan taklif qilish va yo'lovchiga mashinangiz qayerdaligini ko'rsatish uchun joylashuvingizdan foydalanadi.";

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
const withMaps = android => (MAPS_KEY ? { ...android, config: { ...android?.config, googleMaps: { apiKey: MAPS_KEY } } } : android);

module.exports = ({ config }) => {
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
      plugins: withRouterRoot(config.plugins, './src/driver/app', (name, opts) =>
        (name === 'expo-location' ? ['expo-location', { ...opts, locationWhenInUsePermission: LOCATION_DRIVER }] : undefined)),
      extra: { ...config.extra, appVariant: 'driver' },
    };
  }
  return { ...config, android: withMaps(config.android) };
};
