// Ichki navigator: marshrut bo'ylab keyingi burilish, ko'cha nomi, unga masofa va qolgan yo'l.
// Asosiy manba — serverdagi OSRM ko'rsatmalari (NavPlan); ular kelmaguncha yoki server eski bo'lsa —
// burilishlar yo'l chizig'ining burchaklaridan topiladi (nextManeuver).
import type { LatLng } from '@/lib/data';
import type { NavStepDto, NavigationDto } from '@/lib/driver-api';
import { bearing, decodePolyline, distanceKm } from '@/lib/geo';
import { tr, tx } from '@/lib/i18n';

export type ManeuverKind = 'left' | 'right' | 'slightLeft' | 'slightRight' | 'sharpLeft' | 'sharpRight' | 'uturn' | 'roundabout' | 'straight' | 'arrive';
/**
 * at — burilishning tartib raqami (ovozli xabar bir marta aytilishi uchun);
 * street — burilgandan keyingi ko'cha; exit — aylanma yo'ldan nechanchi chiqish;
 * then — undan keyin darhol (≤ 250 m) keladigan burilish
 */
export type Maneuver = { kind: ManeuverKind; distM: number; leftKm: number; at: number; street?: string; exit?: number; then?: ManeuverKind; offRoute?: boolean };

/** Shundan uzoqda mashina yo'ldan chiqqan hisoblanadi (GPS xatosidan kattaroq) */
export const OFF_ROUTE_M = 45;

/** Yo'l chizig'idagi burilish: along — boshidan shu nuqtagacha masofa, km */
export type PlanStep = { kind: ManeuverKind; street: string; exit?: number; along: number };
/** Navigator rejasi: chiziq, har bir cho'qqigacha to'plangan masofa, burilishlar, butun yo'l (km, daq) */
export type NavPlan = { coords: LatLng[]; cum: number[]; steps: PlanStep[]; km: number; min: number; to: LatLng; at: number };

const turn = (a: number, b: number) => ((b - a + 540) % 360) - 180; // −180..180, musbat — o'ngga
const KM_PER_DEG = 111.32;

/** Nuqtaning chiziqdagi proyeksiyasi: kesma, undagi ulush va chiziqqacha masofa (km); kichik masofada tekis koordinatalar yetarli */
function project(path: LatLng[], pos: LatLng, from = 0, to = path.length - 1) {
  const kx = Math.cos((pos.latitude * Math.PI) / 180);
  let seg = from, t = 0, bestD = Infinity;
  for (let k = from; k < to; k++) {
    const ax = (path[k].longitude - pos.longitude) * kx, ay = path[k].latitude - pos.latitude;
    const bx = (path[k + 1].longitude - pos.longitude) * kx, by = path[k + 1].latitude - pos.latitude;
    const dx = bx - ax, dy = by - ay;
    const len = dx * dx + dy * dy;
    const u = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
    const d = (ax + u * dx) ** 2 + (ay + u * dy) ** 2;
    if (d < bestD) { bestD = d; seg = k; t = u; }
  }
  return { seg, t, offKm: Math.sqrt(bestD) * KM_PER_DEG };
}

/** OSRM manevrini ilovadagi turga: false — e'lon qilinmaydi (ko'cha nomi almashdi, to'g'riga davom va h.k.) */
function kindOf(s: NavStepDto): ManeuverKind | false {
  const m = s.modifier ?? '';
  if (s.type === 'arrive') return 'arrive';
  if (s.type === 'roundabout' || s.type === 'rotary') return 'roundabout';
  if (s.type === 'depart' || s.type === 'new name' || s.type === 'notification' || s.type.startsWith('exit ')) return false;
  const byModifier: Record<string, ManeuverKind> = {
    uturn: 'uturn', 'sharp right': 'sharpRight', right: 'right', 'slight right': 'slightRight',
    'sharp left': 'sharpLeft', left: 'left', 'slight left': 'slightLeft',
  };
  const kind = byModifier[m];
  if (!kind) return false;
  // «continue» faqat haqiqiy burilishda aytiladi — yo'lning mayin egilishi burilish emas
  if (s.type === 'continue' && (kind === 'slightLeft' || kind === 'slightRight')) return false;
  return kind;
}

/** Server javobidan navigator rejasi */
export function planOf(r: NavigationDto, to: LatLng): NavPlan {
  const coords = decodePolyline(r.polyline);
  const cum = [0];
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + distanceKm(coords[i - 1], coords[i]));
  const steps: PlanStep[] = [];
  let from = 0;
  for (const s of r.steps) {
    const kind = kindOf(s);
    if (!kind || coords.length < 2) continue;
    // qadamlar tartibda — qidiruvni oldingisidan davom ettiramiz (halqa yo'llarda adashmaslik uchun)
    const p = project(coords, { latitude: s.latitude, longitude: s.longitude }, from);
    from = p.seg;
    const along = cum[p.seg] + (cum[p.seg + 1] - cum[p.seg]) * p.t;
    steps.push({ kind, street: s.name || s.ref || '', exit: s.exit ?? undefined, along });
  }
  const km = cum[cum.length - 1] ?? 0;
  return { coords, cum, steps, km, min: r.durationMin, to, at: Date.now() };
}

/** Mashina rejadagi qayerda: bosib o'tilgan masofa (km) va chiziqdan uzoqligi (m) */
export function progressOf(plan: NavPlan, pos: LatLng) {
  if (plan.coords.length < 2) return { along: 0, offM: Infinity, seg: 0, t: 0 };
  const p = project(plan.coords, pos);
  return { along: plan.cum[p.seg] + (plan.cum[p.seg + 1] - plan.cum[p.seg]) * p.t, offM: p.offKm * 1000, seg: p.seg, t: p.t };
}

/** Rejadagi keyingi manevr */
export function guide(plan: NavPlan, pos: LatLng): Maneuver {
  const { along, offM } = progressOf(plan, pos);
  const leftKm = Math.max(0, plan.km - along);
  // yo'ldan chiqqan mashinaga eski ko'rsatma («yetib keldingiz» ham) berilmaydi — yangi yo'l kutiladi
  if (offM > OFF_ROUTE_M * 1.5) return { kind: 'straight', distM: 0, leftKm, at: -1, offRoute: true };
  // 8 m — manevr nuqtasidan o'tgach u darhol «o'tdi» hisoblanadi
  const i = plan.steps.findIndex(s => s.along > along + 0.008);
  if (i < 0) return { kind: leftKm < 0.05 ? 'arrive' : 'straight', distM: Math.round(leftKm * 1000), leftKm, at: -1 };
  const s = plan.steps[i];
  const next = plan.steps[i + 1];
  const then = next && next.along - s.along <= 0.25 && next.kind !== 'arrive' ? next.kind : undefined;
  return { kind: s.kind, distM: Math.round((s.along - along) * 1000), leftKm, at: i, street: s.street || undefined, exit: s.exit, then };
}

/** Chizilish uchun qolgan yo'l: mashina turgan joydan oxirigacha (bosib o'tilgani ko'rsatilmaydi) */
export function remainingPath(path: LatLng[], pos: LatLng): LatLng[] {
  if (path.length < 2) return path;
  const { seg, t } = project(path, pos);
  const a = path[seg], b = path[seg + 1];
  const here = { latitude: a.latitude + (b.latitude - a.latitude) * t, longitude: a.longitude + (b.longitude - a.longitude) * t };
  return [here, ...path.slice(seg + 1)];
}

/** Rejasi yo'q chiziq uchun: burilishlar chiziq burchaklaridan topiladi */
export function nextManeuver(path: LatLng[], pos: LatLng): Maneuver {
  if (path.length < 2) return { kind: 'arrive', distM: 0, leftKm: 0, at: -1 };
  // mashina turgan bo'lak: eng yaqin cho'qqi emas, eng yaqin kesma (aks holda burilish oldidan uni «o'tib ketgan» deb hisoblardi)
  const i = project(path, pos).seg;
  let left = distanceKm(pos, path[i + 1]);
  for (let k = i + 1; k < path.length - 1; k++) left += distanceKm(path[k], path[k + 1]);

  let acc = distanceKm(pos, path[i + 1]);
  for (let j = i + 1; j < path.length - 1; j++) {
    // chiquvchi yo'nalishni ~25 m oldindan olamiz — mayda egriliklar burilish hisoblanmaydi
    let k = j + 1;
    while (k < path.length - 1 && distanceKm(path[j], path[k]) < 0.025) k++;
    const t = turn(bearing(path[j - 1], path[j]), bearing(path[j], path[k]));
    const abs = Math.abs(t);
    if (abs >= 32) {
      const kind: ManeuverKind = abs >= 150 ? 'uturn' : abs >= 110 ? (t > 0 ? 'sharpRight' : 'sharpLeft') : t > 0 ? 'right' : 'left';
      return { kind, distM: Math.round(acc * 1000), leftKm: left, at: j };
    }
    acc += distanceKm(path[j], path[j + 1]);
  }
  return { kind: left < 0.05 ? 'arrive' : 'straight', distM: Math.round(left * 1000), leftKm: left, at: -1 };
}

export const fmtDist = (m: number) => (m >= 1000 ? tr('{km} km', { km: (m / 1000).toFixed(m >= 10000 ? 0 : 1) }) : tr('{m} m', { m: Math.max(10, Math.round(m / 10) * 10) }));

/** Manevr matni (ekranda tr() bilan) */
export const MANEUVER_TEXT: Record<ManeuverKind, string> = {
  left: tx('chapga buriling'),
  right: tx("o'ngga buriling"),
  slightLeft: tx("chap tomonga og'ing"),
  slightRight: tx("o'ng tomonga og'ing"),
  sharpLeft: tx('keskin chapga'),
  sharpRight: tx("keskin o'ngga"),
  uturn: tx('orqaga qayriling'),
  roundabout: tx("aylanma yo'l"),
  straight: tx("to'g'riga yuring"),
  arrive: tx('manzilga yetdingiz'),
};

/** Ekrandagi qisqa ko'rsatma: «o'ngga buriling», «aylanmadan 2-chiqish» */
export function maneuverText(m: Pick<Maneuver, 'kind' | 'exit'>) {
  if (m.kind === 'roundabout' && m.exit) return tr('aylanmadan {n}-chiqish', { n: m.exit });
  return tr(MANEUVER_TEXT[m.kind]);
}
