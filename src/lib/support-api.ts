// Qo'llab-quvvatlash: murojaatlar (ticket) backendda, operator javobi push va shu yerda keladi.
import { api } from './api';

export type TicketStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';
export type TicketMessage = { id: string; author: 'USER' | 'STAFF'; body: string; createdAt: string };
export type Ticket = { id: string; subject: string; status: TicketStatus; orderId?: string; lastMessageAt: string; createdAt: string };
export type TicketDetail = Ticket & { messages: TicketMessage[] };

export const myTickets = () => api<Ticket[]>('GET', '/support/tickets?limit=20');
export const ticket = (id: string) => api<TicketDetail>('GET', `/support/tickets/${id}`);
export const openTicket = (subject: string, message: string, orderId?: string) =>
  api<TicketDetail>('POST', '/support/tickets', { subject, message, orderId });
export const replyTicket = (id: string, message: string) => api<TicketDetail>('POST', `/support/tickets/${id}/messages`, { message });
export const closeTicket = (id: string) => api<TicketDetail>('POST', `/support/tickets/${id}/close`, {});
