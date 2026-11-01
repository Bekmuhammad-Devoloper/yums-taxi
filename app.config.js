// YUMS ilovalari konfiguratsiyasi.
// Bitta kod bazasidan uchta alohida ilova yig'iladi:
//   • YUMS (yo'lovchi va platforma) — standart, marshrutlar src/app
//   • YUMS Driver (haydovchi) — APP_VARIANT=driver, marshrutlar src/driver/app
//   • YUMS sayti (landing + admin panel, veb) — APP_VARIANT=site, marshrutlar src/site/app
// Hammasi bitta dispetcher serveri (server/dispatch.mjs) orqali real vaqtda bog'lanadi.
const VARIANT = process.env.APP_VARIANT;

const LOCATION_DRIVER = "YUMS Driver buyurtmalarni yaqin atrofdan taklif qilish va yo'lovchiga mashinangiz qayerdaligini ko'rsatish uchun joylashuvingizdan foydalanadi.";

/** expo-router ildiz papkasini almashtirish (qolgan plaginlar o'zgarmaydi) */
const withRouterRoot = (plugins, root, extra) => (plugins ?? []).map(p => {
  const name = Array.isArray(p) ? p[0] : p;
  const opts = Array.isArray(p) ? p[1] ?? {} : {};
  if (name === 'expo-router') return ['expo-router', { ...opts, root }];
  return extra?.(name, opts) ?? p;
});

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
      android: { ...config.android, package: 'uz.yums.driver' },
      plugins: withRouterRoot(config.plugins, './src/driver/app', (name, opts) =>
        (name === 'expo-location' ? ['expo-location', { ...opts, locationWhenInUsePermission: LOCATION_DRIVER }] : undefined)),
      extra: { ...config.extra, appVariant: 'driver' },
    };
  }
  if (VARIANT === 'site') {
    // faqat veb: `npm run site` yoki `APP_VARIANT=site npx expo export --platform web`
    return {
      ...config,
      name: 'YUMS',
      slug: 'yums-site',
      scheme: 'yumssite',
      plugins: withRouterRoot(config.plugins, './src/site/app'),
      extra: { ...config.extra, appVariant: 'site' },
    };
  }
  return config;
};
