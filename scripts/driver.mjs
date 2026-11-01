// YUMS Driver ilovasini ishga tushirish — Windows, macOS va Linux'da bir xil ishlaydi.
// `npm run driver` → APP_VARIANT=driver bilan `expo start` (standart port 8082, yo'lovchi ilovasi 8081 da qoladi).
// Qo'shimcha parametrlar expo'ga uzatiladi: `npm run driver -- --web`, `npm run driver -- --tunnel`.
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
if (!args.includes('--port')) args.push('--port', '8082');

const child = spawn('npx', ['expo', 'start', ...args], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  // EXPO_NO_TYPESCRIPT_SETUP: asosiy ilovaning yo'nalish turlari (.expo/types, tsconfig) ustidan yozilmasin
  env: { ...process.env, APP_VARIANT: 'driver', EXPO_NO_TYPESCRIPT_SETUP: '1' },
});
child.on('exit', code => process.exit(code ?? 0));
