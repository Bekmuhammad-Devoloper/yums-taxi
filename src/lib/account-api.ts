// Kirish va profil: backend javoblarini ilova turlariga o'tkazadi.
import { api, clearTokens, saveTokens, type Tokens } from './api';
import type { AccountKind, User } from './store';

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
  createdAt: string;
};

type Session = Tokens & { user: Profile; isNewUser: boolean };

export type ProfileInput = {
  fullName: string;
  kind: AccountKind;
  company?: string;
  country: string;
  pinfl?: string;
  stir?: string;
};

const toUser = (p: Profile): User => ({
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
  role: 'user',
  joinedAt: p.createdAt,
});

export const requestOtp = (contact: OtpContact) =>
  api<{ resendInSec: number; expiresInSec: number }>('POST', '/auth/otp/request', contact);

/** Tokenlar darhol saqlanadi; yangi hisob uchun ism keyingi qadamda so'raladi */
export async function verifyOtp(contact: OtpContact, code: string): Promise<{ user: User; isNewUser: boolean }> {
  const session = await api<Session>('POST', '/auth/otp/verify', { ...contact, code, termsAccepted: true });
  await saveTokens(session);
  return { user: toUser(session.user), isNewUser: session.isNewUser };
}

export const saveProfile = async (input: ProfileInput): Promise<User> =>
  toUser(await api<Profile>('PATCH', '/users/me', { ...input, kind: input.kind === 'company' ? 'COMPANY' : 'PERSON' }));

export async function signOut(): Promise<void> {
  await api('POST', '/auth/logout').catch(() => {});
  await clearTokens();
}

export async function deleteAccount(): Promise<void> {
  await api('DELETE', '/auth/account');
  await clearTokens();
}
