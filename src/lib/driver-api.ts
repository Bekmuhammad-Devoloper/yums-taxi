// Haydovchi hisobi: backenddagi akkaunt, hamyon va pul yechish so'rovlari.
import { api, ApiError, refreshSession } from './api';

export type DriverAccount = {
  id: string;
  fullName: string;
  phone: string;
  rating: number;
  trips: number;
  vehicle?: { brand: string; model: string; color: string; plate: string; tariffIds: string[] };
};

export type DriverWallet = { balance: number; minBalance: number; recommendedBalance: number; canWork: boolean };

export type DriverRegistration = {
  fullName: string;
  brand: string;
  model: string;
  color: string;
  plate: string;
  tariffIds: string[];
};

/** Hali haydovchi bo'lmagan foydalanuvchi uchun null: u ro'yxatdan o'tishga yuboriladi */
export async function loadDriverAccount(): Promise<DriverAccount | null> {
  try {
    return await api<DriverAccount>('GET', '/driver/profile');
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) return null;
    throw error;
  }
}

export async function registerDriver(input: DriverRegistration): Promise<void> {
  const { fullName, tariffIds, ...vehicle } = input;
  await api('PATCH', '/users/me', { fullName });
  await api('POST', '/driver/registration', { vehicle, tariffIds });
  // Haydovchi roli faqat keyingi tokenda paydo bo'ladi
  await refreshSession();
}

export const loadDriverWallet = () => api<DriverWallet>('GET', '/driver/wallet');

export const requestPayout = (amount: number) =>
  api<{ id: string; amount: number; createdAt: string }>('POST', '/driver/payouts', { amount });
