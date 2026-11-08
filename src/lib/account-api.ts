// Kirish va profil: backend javoblarini ilova turlariga o'tkazadi.
import { api, clearTokens, saveTokens, type Tokens } from './api';
import type { AccountKind, Role, User } from './store';

export type OtpContact = { phone: string } | { email: string };

type Profile = {
  id: string;
  phone: string;
  email?: string;
  fullName: string;
  rating: number;
  kind: 'PERSON' | 'COMPANY';
  company?: string;
  country: string;
  bio?: string;
  avatar?: string;
  pinfl?: string;
  stir?: string;
  registryVerified: boolean;
  notifyTrip: boolean;
  notifyPromo: boolean;
  twoFactor: boolean;
  roles: string[];
  createdAt: string;
};

type Session = Tokens & { user: Profile; isNewUser: boolean };

/** Ikki bosqichli himoyasi yoqilgan hisob: ikkinchi kod boshqa manzilga yuborildi */
export type SecondStep = { challengeId: string; channel: 'PHONE' | 'EMAIL'; destination: string; resendInSec: number };
type Challenge = SecondStep & { twoFactorRequired: true; expiresInSec: number };

export type ProfileInput = {
  fullName: string;
  kind: AccountKind;
  company?: string;
  country: string;
  pinfl?: string;
  stir?: string;
};

/** Serverdagi rollardan ilovadagi daraja: moderator paneli faqat shu rollarga ochiladi */
const roleOf = (roles: string[]): Role =>
  roles.includes('ADMIN') ? 'admin' : roles.includes('MODERATOR') || roles.includes('SUPPORT') ? 'moderator' : 'user';

export const toUser = (p: Profile): User => ({
  id: p.id,
  name: p.fullName,
  phone: p.phone,
  email: p.email,
  rating: p.rating,
  kind: p.kind === 'COMPANY' ? 'company' : 'person',
  company: p.company,
  country: p.country,
  bio: p.bio,
  avatar: p.avatar,
  pinfl: p.pinfl,
  stir: p.stir,
  registryVerified: p.registryVerified,
  notifyTrip: p.notifyTrip,
  notifyPromo: p.notifyPromo,
  twoFactor: p.twoFactor,
  role: roleOf(p.roles ?? []),
  roles: p.roles ?? [],
  joinedAt: p.createdAt,
});

export const requestOtp = (contact: OtpContact) =>
  api<{ resendInSec: number; expiresInSec: number }>('POST', '/auth/otp/request', contact);

export type SignInResult = { user: User; isNewUser: boolean } | { second: SecondStep };

/** Tokenlar darhol saqlanadi; yangi hisob uchun ism keyingi qadamda so'raladi */
export async function verifyOtp(contact: OtpContact, code: string): Promise<SignInResult> {
  const answer = await api<Session | Challenge>('POST', '/auth/otp/verify', { ...contact, code, termsAccepted: true });
  if ('twoFactorRequired' in answer) {
    return { second: { challengeId: answer.challengeId, channel: answer.channel, destination: answer.destination, resendInSec: answer.resendInSec } };
  }
  await saveTokens(answer);
  return { user: toUser(answer.user), isNewUser: answer.isNewUser };
}

/** Ikki bosqichli kirishning ikkinchi kodi */
export async function verifySecondFactor(challengeId: string, code: string): Promise<User> {
  const session = await api<Session>('POST', '/auth/otp/second-factor', { challengeId, code });
  await saveTokens(session);
  return toUser(session.user);
}

export const saveProfile = async (input: ProfileInput): Promise<User> =>
  toUser(await api<Profile>('PATCH', '/users/me', { ...input, kind: input.kind === 'company' ? 'COMPANY' : 'PERSON' }));

export type ProfilePatch = Partial<{
  fullName: string;
  kind: AccountKind;
  company: string | null;
  country: string;
  bio: string | null;
  avatar: string | null;
  notifyTrip: boolean;
  notifyPromo: boolean;
}>;

/** Faqat yuborilgan maydonlar o'zgaradi; null — tozalaydi */
export const updateProfile = async (patch: ProfilePatch): Promise<User> => {
  const { kind, ...rest } = patch;
  return toUser(await api<Profile>('PATCH', '/users/me', { ...rest, ...(kind && { kind: kind === 'company' ? 'COMPANY' : 'PERSON' }) }));
};

export const loadProfile = async (): Promise<User> => toUser(await api<Profile>('GET', '/users/me'));

/** Telefon yoki email qo'shish/almashtirish: avval kod, keyin tasdiq */
export const requestContactCode = (contact: OtpContact) =>
  api<{ resendInSec: number; expiresInSec: number }>('POST', '/users/me/contact/request', contact);
export const confirmContact = async (contact: OtpContact, code: string): Promise<User> =>
  toUser(await api<Profile>('POST', '/users/me/contact/verify', { ...contact, code }));

export const setTwoFactor = async (enabled: boolean): Promise<User> =>
  toUser(await api<Profile>('PUT', '/users/me/two-factor', { enabled }));

export type SecurityEvent = { id: string; event: 'SIGN_IN' | 'SIGN_IN_FAILED' | 'SIGN_OUT' | 'TWO_FACTOR_ON' | 'TWO_FACTOR_OFF' | 'DATA_EXPORTED'; ok: boolean; device?: string; at: string };
export const securityEvents = () => api<SecurityEvent[]>('GET', '/users/me/security-events');
export const exportMyData = () => api<Record<string, unknown>>('GET', '/users/me/export');

/** Push bildirishnomalar uchun qurilma (takroriy chaqiruv xavfsiz) */
export const registerDevice = (device: { deviceId: string; platform: 'IOS' | 'ANDROID' | 'WEB'; pushToken?: string; appVersion?: string }) =>
  api<void>('PUT', '/devices', device);

export async function signOut(): Promise<void> {
  await api('POST', '/auth/logout').catch(() => {});
  await clearTokens();
}

export async function deleteAccount(): Promise<void> {
  await api('DELETE', '/auth/account');
  await clearTokens();
}
