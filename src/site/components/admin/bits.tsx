// Haydovchi bilan bog'liq kichik bloklar: rasm, holat, hujjatlar belgisi.
import { PersonAvatar } from '@/components/ui';
import { DOC_KINDS } from '@/driver/lib/docs';
import { useAdmin } from '@/site/lib/admin-store';
import type { AdminDriver, LiveDriver } from '@/site/lib/admin-types';

import { Pill, type Tone } from './ui';

export function DriverAvatar({ d, size = 36 }: { d: AdminDriver; size?: number }) {
  const { state } = useAdmin();
  return <PersonAvatar driver name={d.name} photo={state.photos[d.id]} gender={d.gender} size={size} />;
}

export function driverStatus(d: AdminDriver, live?: LiveDriver): { label: string; tone: Tone } {
  if (d.blocked) return { label: 'Bloklangan', tone: 'critical' };
  if (live?.pending) return { label: 'Hujjat tekshiruvida', tone: 'muted' };
  if (live?.busy) return { label: 'Safarda', tone: 'info' };
  if (live?.offering) return { label: 'Taklif kutmoqda', tone: 'warning' };
  if (live) return { label: "Bo'sh", tone: 'good' };
  if (!DOC_KINDS.every(k => d.docs[k]?.status === 'approved')) return { label: "Hujjatlar to'liq emas", tone: 'serious' };
  return { label: 'Oflayn', tone: 'muted' };
}

export function StatusPill({ d, live }: { d: AdminDriver; live?: LiveDriver }) {
  const s = driverStatus(d, live);
  return <Pill text={s.label} tone={s.tone} />;
}

/** Hujjatlar: nechtasi tasdiqlangan, tekshiruvda yoki rad etilgan */
export function DocsPill({ d }: { d: AdminDriver }) {
  const docs = DOC_KINDS.map(k => d.docs[k]?.status ?? 'missing');
  const ok = docs.filter(s => s === 'approved').length;
  if (docs.includes('rejected')) return <Pill text={`${ok}/4 · rad etilgan`} tone="critical" icon="close-circle" />;
  if (docs.includes('review')) return <Pill text={`${ok}/4 · tekshiruvda`} tone="warning" icon="time" />;
  if (ok < 4) return <Pill text={`${ok}/4`} tone="serious" icon="alert-circle" />;
  return <Pill text="4/4" tone="good" icon="checkmark-circle" />;
}
