// Hamyon va kartalar: backenddagi haqiqiy pul. Pul miqdori butun so'mda.
import { api } from './api';
import type { Card } from './data';

type CardRow = { id: string; brand: Card['brand']; last4: string; expiry: string; status: 'PENDING' | 'ACTIVE'; isDefault: boolean };
type Overview = { defaultMethod: 'CASH' | 'BALANCE' | 'CARD'; balance: number; cards: CardRow[] };

export type TopupStatus = 'PENDING' | 'CAPTURED' | 'FAILED';
export type WalletKind = 'passenger' | 'driver';

const walletPath = (kind: WalletKind) => (kind === 'driver' ? '/driver/wallet' : '/wallet');

const toCard = ({ id, brand, last4, status }: CardRow): Card => ({ id, brand, last4, status });

export async function loadWallet(): Promise<{ balance: number; cards: Card[] }> {
  const overview = await api<Overview>('GET', '/payment-methods');
  return { balance: overview.balance, cards: overview.cards.map(toCard) };
}

export const addCard = async (number: string, expiry: string): Promise<Card> =>
  toCard(await api<CardRow>('POST', '/cards', { number, expiry }));

export const confirmCard = async (id: string, code: string): Promise<Card> =>
  toCard(await api<CardRow>('POST', `/cards/${id}/confirm`, { code }));

export const removeCard = (id: string) => api<void>('DELETE', `/cards/${id}`);

/** Takroriy so'rov ikki marta yechmasligi uchun bir urinish bitta `key` bilan yuboriladi */
export const topUpFromCard = (kind: WalletKind, amount: number, cardId: string, key: string) =>
  api<{ paymentId: string; balance: number }>('POST', `${walletPath(kind)}/topups`, { amount, cardId }, undefined, { 'Idempotency-Key': key });

export const startClickTopup = (kind: WalletKind, amount: number) =>
  api<{ paymentId: string; payUrl: string }>('POST', `${walletPath(kind)}/topups/click`, { amount });

export const topupStatus = (kind: WalletKind, id: string) =>
  api<{ status: TopupStatus; balance: number }>('GET', `${walletPath(kind)}/topups/${id}`);
