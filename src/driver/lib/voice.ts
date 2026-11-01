// Ovozli yo'riqnoma: yangi buyurtma, navigator burilishlari, safar holatlari — ilova tilida (5 til).
// Asosiy yo'l — oldindan yozilgan ayol ovozi kliplari (assets/voice, scripts/voice/generate.py yaratadi):
// har qanday telefonda bir xil chiroyli eshitiladi. Til uchun klip bo'lmasa — qurilmaning (iloji bo'lsa ayol) ovozi,
// u ham bo'lmasa — zaxira tildagi kliplar yoki ovoz (tojikcha → ruscha, arabcha → inglizcha).
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

import type { Lang } from '@/lib/i18n';

import { CLIPS } from './voice-clips';
import PHRASES from './voice-phrases.json';

export type VoiceLang = Lang;
export type PhraseKey = keyof typeof PHRASES.phrases;
/** Qaysi manbadan gapiradi: o'z kliplari, qurilma ovozi yoki boshqa tildagi kliplar */
export type VoiceSource = 'clips' | 'system' | 'fallback';

const LOCALE: Record<VoiceLang, string> = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US', tg: 'tg-TJ', ar: 'ar-SA' };
/** Til uchun ovoz topilmasa — shu tilda gapiradi */
const FALLBACK: Record<VoiceLang, VoiceLang> = { uz: 'ru', ru: 'uz', en: 'ru', tg: 'ru', ar: 'en' };
// Qurilmalardagi ma'lum ayol ovozlari (iOS, Android, Windows/Edge, Chrome)
const FEMALE = /madina|milena|katya|alena|svetlana|dariya|irina|anna|elena|yuliya|tatyana|ekaterina|samantha|karen|serena|zira|jenny|aria|laila|mariam|hoda|salma|zariyah|female|google русский/i;

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

const clipsOf = (l: VoiceLang): Partial<Record<PhraseKey, number>> => CLIPS[l] ?? {};
const hasClips = (l: VoiceLang) => Object.keys(clipsOf(l)).length > 0;

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
  detect(FALLBACK[l]);
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
  const other = FALLBACK[lang];
  const own = clipsOf(lang)[key];
  const sys = systemVoice[lang];
  const otherClip = clipsOf(other)[key];
  const otherSys = systemVoice[other];
  const item: Item = own != null ? { clip: own }
    : sys ? { text: PHRASES.phrases[key][lang], locale: LOCALE[lang], voice: sys }
    : otherClip != null ? { clip: otherClip }
    : otherSys ? { text: PHRASES.phrases[key][other], locale: LOCALE[other], voice: otherSys }
    : { text: PHRASES.phrases[key][lang], locale: LOCALE[lang] };
  queue.push(item);
  pump();
}

// qurilma ovozlari oldindan aniqlanadi (birinchi gapda kechikish bo'lmasin)
detect('uz');
detect('ru');
