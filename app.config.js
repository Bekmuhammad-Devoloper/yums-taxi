// YUMS ilovalari konfiguratsiyasi.
// Bitta kod bazasidan ikkita alohida ilova yig'iladi:
//   • YUMS (yo'lovchi va platforma) — standart, marshrutlar src/app
//   • YUMS Driver (haydovchi) — APP_VARIANT=driver, marshrutlar src/driver/app
// Ikkalasi bitta dispetcher serveri (server/dispatch.mjs) orqali real vaqtda bog'lanadi.
const IS_DRIVER = process.env.APP_VARIANT === 'driver';

const LOCATION_DRIVER = "YUMS Driver buyurtmalarni yaqin atrofdan taklif qilish va yo'lovchiga mashinangiz qayerdaligini ko'rsatish uchun joylashuvingizdan foydalanadi.";

module.exports = ({ config }) => {
  if (!IS_DRIVER) return config;
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
    android: { ...config.android, package: 'uz.yums.driver' },
    plugins: (config.plugins ?? []).map(p => {
      const name = Array.isArray(p) ? p[0] : p;
      const opts = Array.isArray(p) ? p[1] ?? {} : {};
      if (name === 'expo-router') return ['expo-router', { ...opts, root: './src/driver/app' }];
      if (name === 'expo-location') return ['expo-location', { ...opts, locationWhenInUsePermission: LOCATION_DRIVER }];
      return p;
    }),
    extra: { ...config.extra, appVariant: 'driver' },
  };
};
