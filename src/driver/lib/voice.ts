// Ovozli yo'riqnoma: yangi buyurtma, navigator burilishlari, safar holatlari — o'zbek va rus tilida.
// Asosiy yo'l — oldindan yozilgan ayol ovozi kliplari (assets/voice, scripts/voice/generate.py yaratadi):
// har qanday telefonda bir xil chiroyli eshitiladi. Til uchun klip bo'lmasa — qurilmaning ayol ovozi,
// u ham bo'lmasa — ikkinchi tildagi kliplar.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

import { CLIPS } from './voice-clips';
import PHRASES from './voice-phrases.json';

export type VoiceLang = 'uz' | 'ru';
export type PhraseKey = keyof typeof PHRASES.phrases;
/** Qaysi manbadan gapiradi: o'z kliplari, qurilma ovozi yoki boshqa tildagi kliplar */
export type VoiceSource = 'clips' | 'system' | 'fallback';

const LOCALE: Record<VoiceLang, string> = { uz: 'uz-UZ', ru: 'ru-RU' };
// Qurilmalardagi ma'lum ayol ovozlari (iOS, Android, Windows/Edge, Chrome)
const FEMALE = /madina|milena|katya|alena|svetlana|dariya|irina|anna|elena|yuliya|tatyana|ekaterina|female|google русский/i;

let enabled = true;
let lang: VoiceLang = 'uz';
const systemVoice: Partial<Record<VoiceLang, string | null>> = {};

type Item = { clip: number } | { text: string; locale: string; voice?: string };
let queue: Item[] = [];
let busy = false;
/** To'xtatilganda oshadi — eski gapning kechikkan «tugadi» xabari yangisiga xalal bermasin */
let gen = 0;
let guard: ReturnType<typeof setTimeout> | undefined;
let player: AudioPlayer | null = null;

const hasClips = (l: VoiceLang) => Object.keys(CLIPS[l]).length > 0;

function ensurePlayer() {
  if (player) return player;
  // jim rejimda ham eshitiladi; musiqa ustidan (uni to'xtatmasdan) gapiradi
  setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  player = createAudioPlayer(null);
  player.addListener('playbackStatusUpdate', s => { if (s.didJustFinish) next(gen); });
  return player;
}

function next(g: number) {
  if (g !== gen) return;
  clearTimeout(guard);
  busy = false;
  pump();
}

function pump() {
  if (busy) return;
  const item = queue.shift();
  if (!item) return;
  busy = true;
  const g = gen;
  const done = () => next(g);
  // tugash hodisasi kelmay qolsa ham navbat to'xtab qolmasin
  guard = setTimeout(done, 9000);
  try {
    if ('clip' in item) {
      const p = ensurePlayer();
      p.replace(item.clip);
      p.play();
    } else {
      Speech.speak(item.text, { language: item.locale, voice: item.voice, onDone: done, onStopped: done, onError: done });
    }
  } catch {
    done();
  }
}

/** Qurilmada shu til uchun (iloji bo'lsa ayol) ovoz bormi */
async function detect(l: VoiceLang) {
  if (l in systemVoice) return systemVoice[l] ?? null;
  try {
    // ba'zi brauzerlarda ovozlar ro'yxati hech qachon kelmaydi — 1.5 soniyadan keyin «yo'q» deb hisoblaymiz
    const list = await Promise.race([
      Speech.getAvailableVoicesAsync(),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 1500)),
    ]);
    if (!list) return null;
    const all = list.filter(v => v.language.toLowerCase().replace('_', '-').startsWith(l));
    const best = all.find(v => FEMALE.test(v.name) || FEMALE.test(v.identifier)) ?? all[0];
    systemVoice[l] = best?.identifier ?? null;
  } catch {
    systemVoice[l] = null;
  }
  return systemVoice[l] ?? null;
}

/** Tanlangan til qaysi manbadan gapirishi */
export async function voiceSource(l: VoiceLang): Promise<VoiceSource> {
  if (hasClips(l)) return 'clips';
  return (await detect(l)) ? 'system' : 'fallback';
}

export const setVoiceEnabled = (v: boolean) => {
  enabled = v;
  if (!v) stopVoice();
};

export const setVoiceLang = (l: VoiceLang) => {
  lang = l;
  detect(l);
};

export function stopVoice() {
  gen++;
  queue = [];
  clearTimeout(guard);
  busy = false;
  try { player?.pause(); } catch { /* o'yinchi hali tayyor emas */ }
  Speech.stop().catch(() => {});
}

/** Iborani o'qish; muhimi (yangi buyurtma) navbatdagilarni to'xtatib o'qiladi */
export function say(key: PhraseKey, urgent = false) {
  if (!enabled) return;
  if (urgent) stopVoice();
  const other: VoiceLang = lang === 'uz' ? 'ru' : 'uz';
  const own = CLIPS[lang][key];
  const sys = systemVoice[lang];
  const item: Item = own != null ? { clip: own }
    : sys ? { text: PHRASES.phrases[key][lang], locale: LOCALE[lang], voice: sys }
    : CLIPS[other][key] != null ? { clip: CLIPS[other][key] }
    : { text: PHRASES.phrases[key][lang], locale: LOCALE[lang] };
  queue.push(item);
  pump();
}

// qurilma ovozlari oldindan aniqlanadi (birinchi gapda kechikish bo'lmasin)
detect('uz');
detect('ru');
