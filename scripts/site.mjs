// YUMS sayti (landing va admin panel) — vebda ishga tushirish, Windows, macOS va Linux'da bir xil.
// `npm run site` → APP_VARIANT=site bilan `expo start --web` (standart port 8083).
// Jonli ma'lumotlar uchun server ham ishlashi kerak: `npm run dispatch` va EXPO_PUBLIC_DISPATCH_URL=ws://localhost:8787.
// Server manzili berilmasa sayt va admin panel demo rejimida (brauzer ichidagi simulyatsiya bilan) ishlaydi.
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
if (!args.includes('--port')) args.push('--port', '8083');
if (!args.includes('--web')) args.push('--web');

const child = spawn('npx', ['expo', 'start', ...args], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  // EXPO_NO_TYPESCRIPT_SETUP: asosiy ilovaning yo'nalish turlari (.expo/types, tsconfig) ustidan yozilmasin
  env: { ...process.env, APP_VARIANT: 'site', EXPO_NO_TYPESCRIPT_SETUP: '1' },
});
child.on('exit', code => process.exit(code ?? 0));
