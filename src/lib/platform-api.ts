// YUMS platformasi backendda: katalog, loyihalar, market, sevimlilar, chat, moderatsiya, tariflar.
// Shartnoma: backend docs/MOBILE-INTEGRATION.md §6c. Ilova turlari (platform-data.ts) shu yerda moslanadi.
import { api } from './api';
import type {
  Attachment, Company, Conversation, Investor, MarketItem, Meeting, Message, Notice, PeerKind, Project, Report, Verification,
} from './platform-data';

type Card = { id: string; name: string; kind: 'PERSON' | 'COMPANY'; verified: boolean; avatar?: string };
type FileDto = { name: string; mime?: string; size?: number; data?: string };

const lower = <T extends string>(s: string) => s.toLowerCase() as T;
const upper = (s: string) => s.toUpperCase();

/* ---------- Fayllar: qurilmadagi fayl → data URI ---------- */

/** Bitta fayl serverga ~1 MB gacha (data URI ~1,4 MB) */
export const FILE_LIMIT = 1_000_000;

export async function fileToDataUri(uri: string, mime?: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  const blob = await (await fetch(uri)).blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const out = String(reader.result ?? '');
      // ba'zi platformalarda tur bo'sh keladi — tanlangan fayl turini qo'yamiz
      resolve(mime && out.startsWith('data:;') ? out.replace('data:;', `data:${mime};`) : out);
    };
    reader.onerror = () => reject(reader.error ?? new Error('read'));
    reader.readAsDataURL(blob);
  });
}

const toFileDto = async (a: Attachment): Promise<FileDto> => ({
  name: a.name, mime: a.mime, size: a.size,
  data: a.uri ? await fileToDataUri(a.uri, a.mime) : undefined,
});
const fromFileDto = (f: FileDto, i: number): Attachment => ({ id: `f${i}-${f.name}`, name: f.name, size: f.size, mime: f.mime, uri: f.data });

/* ---------- Katalog ---------- */

export type ProfileDto = {
  id: string; type: 'COMPANY' | 'SPECIALIST' | 'INVESTOR'; name: string; country: string; city?: string; sector?: string;
  about: string; verified: boolean; ownerId: string | null; details: Record<string, unknown>;
  /** Sharhlar o'rtachasi (sharh bo'lmasa yo'q) va soni */
  rating?: number; reviewCount: number;
};
export type Directory = { companies: Company[]; specialists: Specialist[]; investors: Investor[]; owners: Record<string, string> };
type Specialist = import('./platform-data').Specialist;

const num = (v: unknown, d = 0) => (typeof v === 'number' ? v : d);
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Reyting sharhlardan; sharhi yo'q namuna (seed) profillarda — ularning o'z qiymati */
const ratingOf = (p: ProfileDto) => (p.reviewCount > 0 && p.rating !== undefined ? p.rating : num(p.details.rating));

/* ---------- Katalogdagi o'z profilim va sharhlar ---------- */

export type ProfileKind = 'company' | 'specialist' | 'investor';
const KIND: Record<ProfileKind, ProfileDto['type']> = { company: 'COMPANY', specialist: 'SPECIALIST', investor: 'INVESTOR' };
export type ProfileInput = { name: string; country: string; city?: string; sector?: string; about: string; details: Record<string, unknown> };
export const myProfiles = () => api<ProfileDto[]>('GET', '/platform/directory/mine');
export const saveMyProfile = (kind: ProfileKind, input: ProfileInput) => api<ProfileDto>('PUT', `/platform/directory/mine/${KIND[kind]}`, input);
export const deleteMyProfile = (kind: ProfileKind) => api<void>('DELETE', `/platform/directory/mine/${KIND[kind]}`);
export type Review = { id: string; stars: number; text: string; author: string; mine: boolean; createdAt: string };
export const reviewsOf = (profileId: string) => api<Review[]>('GET', `/platform/directory/${profileId}/reviews?limit=50`);
export const saveReview = (profileId: string, stars: number, text: string) =>
  api<Review>('PUT', `/platform/directory/${profileId}/review`, { stars, text: text.trim() || undefined });
export const deleteReview = (profileId: string) => api<void>('DELETE', `/platform/directory/${profileId}/review`);

async function profiles(type: ProfileDto['type']): Promise<ProfileDto[]> {
  return api<ProfileDto[]>('GET', `/platform/directory?type=${type}&limit=100`);
}

export async function loadDirectory(): Promise<Directory> {
  const [c, s, i] = await Promise.all([profiles('COMPANY'), profiles('SPECIALIST'), profiles('INVESTOR')]);
  const owners: Record<string, string> = {};
  for (const p of [...c, ...s, ...i]) if (p.ownerId) owners[p.id] = p.ownerId;
  return {
    owners,
    companies: c.map(p => ({
      id: p.id, name: p.name, color: str(p.details.color, '#2457F5'), country: p.country, city: p.city ?? '', sector: p.sector ?? '',
      about: p.about, services: list(p.details.services), offers: list(p.details.offers), verified: p.verified,
      plan: str(p.details.plan, 'free') as Company['plan'], employees: str(p.details.employees), founded: num(p.details.founded),
      rating: ratingOf(p), languages: list(p.details.languages), website: str(p.details.website) || undefined,
    })),
    specialists: s.map(p => ({
      id: p.id, name: p.name, title: str(p.details.title), skills: list(p.details.skills), country: p.country, city: p.city ?? '',
      languages: list(p.details.languages), rate: num(p.details.rate), rating: ratingOf(p), reviews: p.reviewCount || num(p.details.reviews),
      available: p.details.available !== false, remote: p.details.remote === true, verified: p.verified, sector: p.sector ?? '',
      experience: num(p.details.experience), about: p.about, website: str(p.details.website) || undefined, photo: str(p.details.photo) || undefined,
      gender: (p.details.gender === 'f' ? 'f' : p.details.gender === 'm' ? 'm' : undefined),
    })),
    investors: i.map(p => ({
      id: p.id, name: p.name, kind: str(p.details.kind, 'fund') as Investor['kind'], country: p.country, about: p.about,
      ticketMin: num(p.details.ticketMin), ticketMax: num(p.details.ticketMax), sectors: list(p.details.sectors),
      stages: list(p.details.stages), verified: p.verified, licensed: p.details.licensed === true, deals: num(p.details.deals),
    })),
  };
}

/* ---------- Loyihalar va market ---------- */

type ProjectDto = {
  id: string; owner: Card; title: string; summary: string; description: string; goal: string; sector: string; country: string;
  city: string; languages: string[]; stage: string; budgetMin: number; budgetMax: number; durationMonths: number; contact: string;
  contactValue?: string; seeking: string[]; attachments: FileDto[]; cover?: string; team: number; status: string;
  rejectReason?: string; views: number; saves: number; boosted: boolean; favorite: boolean; mine: boolean; createdAt: string;
};

const toProject = (p: ProjectDto): Project => ({
  id: p.id, ownerId: p.owner.id, ownerName: p.owner.name, ownerKind: p.owner.kind === 'COMPANY' ? 'company' : 'person',
  ownerVerified: p.owner.verified, title: p.title, summary: p.summary, description: p.description, goal: p.goal, sector: p.sector,
  country: p.country, city: p.city, languages: p.languages, stage: lower(p.stage), budgetMin: p.budgetMin, budgetMax: p.budgetMax,
  durationMonths: p.durationMonths, contact: lower(p.contact), contactValue: p.contactValue, seeking: p.seeking.map(s => lower(s)),
  attachments: p.attachments.map(fromFileDto), cover: p.cover, status: lower(p.status), rejectReason: p.rejectReason,
  views: p.views, saves: p.saves, boosted: p.boosted, team: p.team, createdAt: p.createdAt,
});

export type ProjectInputApi = Omit<Project, 'id' | 'ownerId' | 'ownerName' | 'ownerKind' | 'ownerVerified' | 'status' | 'views' | 'saves' | 'createdAt' | 'rejectReason' | 'boosted'>;

async function projectBody(i: ProjectInputApi, submit: boolean) {
  return {
    title: i.title, summary: i.summary, description: i.description, goal: i.goal || undefined, sector: i.sector, country: i.country,
    city: i.city || undefined, languages: i.languages, stage: upper(i.stage), budgetMin: Math.round(i.budgetMin),
    budgetMax: Math.round(Math.max(i.budgetMin, i.budgetMax)), durationMonths: Math.round(i.durationMonths), contact: upper(i.contact),
    contactValue: i.contactValue || undefined, seeking: i.seeking.map(upper), attachments: await Promise.all(i.attachments.map(toFileDto)),
    cover: i.cover || undefined, team: i.team || 1, submit,
  };
}

export const publishedProjects = async (): Promise<Project[]> => (await api<ProjectDto[]>('GET', '/platform/projects?limit=100')).map(toProject);
export const myProjects = async (): Promise<Project[]> => (await api<ProjectDto[]>('GET', '/platform/projects/mine')).map(toProject);
export const projectById = async (id: string): Promise<Project> => toProject(await api<ProjectDto>('GET', `/platform/projects/${id}`));
export const createProject = async (i: ProjectInputApi, submit: boolean) => toProject(await api<ProjectDto>('POST', '/platform/projects', await projectBody(i, submit)));
export const updateProject = async (id: string, i: ProjectInputApi, submit: boolean) => toProject(await api<ProjectDto>('PUT', `/platform/projects/${id}`, await projectBody(i, submit)));
export const submitProject = async (id: string) => toProject(await api<ProjectDto>('POST', `/platform/projects/${id}/submit`, {}));
export const setProjectActive = async (id: string, active: boolean) => toProject(await api<ProjectDto>('POST', `/platform/projects/${id}/${active ? 'resume' : 'pause'}`, {}));
export const viewProject = (id: string) => api<void>('POST', `/platform/projects/${id}/view`, {});
export const deleteProject = (id: string) => api<void>('DELETE', `/platform/projects/${id}`);
export const boostProject = async (id: string) => {
  const r = await api<ProjectDto & { paidWith: 'CREDIT' | 'PAID' }>('POST', `/platform/projects/${id}/boost`, {});
  return { project: toProject(r), paidWith: r.paidWith };
};

type MarketDto = {
  id: string; seller: Card; title: string; kind: string; price: number; oldPrice?: number; unit?: string; country: string;
  sector: string; description: string; image?: string; delivery?: string; minOrder?: string; sold: number; saves: number;
  status: string; rejectReason?: string; favorite: boolean; mine: boolean; createdAt: string;
};
const toMarket = (m: MarketDto): MarketItem => ({
  id: m.id, title: m.title, kind: lower(m.kind), price: m.price, unit: m.unit, sellerId: m.seller.id, sellerName: m.seller.name,
  sellerVerified: m.seller.verified, country: m.country, sector: m.sector, desc: m.description, image: m.image, delivery: m.delivery,
  minOrder: m.minOrder, oldPrice: m.oldPrice, sold: m.sold, status: lower(m.status), createdAt: m.createdAt,
});
export type MarketInputApi = Omit<MarketItem, 'id' | 'sellerId' | 'sellerName' | 'sellerVerified' | 'status' | 'createdAt'>;

export const publishedMarket = async (): Promise<MarketItem[]> => (await api<MarketDto[]>('GET', '/platform/market?limit=100')).map(toMarket);
export const myMarket = async (): Promise<MarketItem[]> => (await api<MarketDto[]>('GET', '/platform/market/mine')).map(toMarket);
export const createMarketItem = async (i: MarketInputApi) => toMarket(await api<MarketDto>('POST', '/platform/market', {
  title: i.title, kind: upper(i.kind), price: i.price, oldPrice: i.oldPrice, unit: i.unit || undefined, country: i.country,
  sector: i.sector, description: i.desc, image: i.image || undefined, delivery: i.delivery || undefined, minOrder: i.minOrder || undefined,
}));
export const deleteMarketItem = (id: string) => api<void>('DELETE', `/platform/market/${id}`);

/* ---------- Sevimlilar ---------- */

export const favorites = () => api<string[]>('GET', '/platform/favorites');
export const setFavorite = (key: string, on: boolean) => api<void>(on ? 'PUT' : 'DELETE', `/platform/favorites/${encodeURIComponent(key)}`);

/* ---------- Chat va uchrashuvlar ---------- */

type PeerDto = { id: string; name: string; kind: 'PERSON' | 'COMPANY'; verified: boolean; profileId?: string; profileType?: 'COMPANY' | 'SPECIALIST' | 'INVESTOR' };
type MessageDto = { id: string; conversationId: string; from: 'ME' | 'THEM' | 'SYSTEM'; text: string; file?: FileDto; meetingId?: string; createdAt: string };
type ConversationDto = {
  id: string; kind: 'CHAT' | 'REQUEST'; subject?: string; peer: PeerDto; requestStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  incoming: boolean; unread: number; blocked: boolean; blockedByPeer: boolean; lastMessage?: MessageDto; lastMessageAt: string;
};
type MeetingDto = { id: string; conversationId: string; title: string; startsAt: string; durationMin: number; link: string; status: 'SCHEDULED' | 'CANCELLED'; mine: boolean; with: PeerDto };

const peerKind = (p: PeerDto): PeerKind =>
  p.profileType === 'INVESTOR' ? 'investor' : p.profileType === 'SPECIALIST' ? 'specialist' : p.kind === 'COMPANY' ? 'company' : 'person';

export const toMessage = (m: MessageDto): Message => ({
  id: m.id, from: m.from === 'ME' ? 'me' : m.from === 'THEM' ? 'them' : 'system', text: m.text, at: m.createdAt,
  file: m.file ? fromFileDto(m.file, 0) : undefined, meetingId: m.meetingId,
});

export const toConversation = (c: ConversationDto, messages: Message[] = c.lastMessage ? [toMessage(c.lastMessage)] : []): Conversation => ({
  id: c.id, peerId: c.peer.id, peerName: c.peer.name, peerKind: peerKind(c.peer), peerVerified: c.peer.verified, subject: c.subject,
  kind: c.kind === 'REQUEST' ? 'request' : 'chat', incoming: c.incoming,
  requestStatus: c.requestStatus ? lower(c.requestStatus) : undefined, messages, unread: c.unread, blocked: c.blocked || c.blockedByPeer,
});

const toMeeting = (m: MeetingDto): Meeting => ({
  id: m.id, convId: m.conversationId, title: m.title, with: m.with.name, at: m.startsAt, durationMin: m.durationMin, link: m.link, status: lower(m.status),
});

export const conversations = () => api<ConversationDto[]>('GET', '/platform/chats');
export const conversation = (id: string) => api<ConversationDto>('GET', `/platform/chats/${id}`);
export const openConversation = (target: { userId?: string; profileId?: string }, opts: { request?: boolean; subject?: string; text?: string }) =>
  api<ConversationDto>('POST', '/platform/chats', { ...target, kind: opts.request ? 'REQUEST' : 'CHAT', subject: opts.subject, text: opts.text });
export const messages = async (id: string): Promise<Message[]> => (await api<MessageDto[]>('GET', `/platform/chats/${id}/messages?limit=200`)).map(toMessage);
export const sendMessage = async (id: string, text: string, file?: Attachment) =>
  toMessage(await api<MessageDto>('POST', `/platform/chats/${id}/messages`, { text, file: file ? await toFileDto(file) : undefined }));
export const markRead = (id: string) => api<void>('POST', `/platform/chats/${id}/read`, {});
export const respond = (id: string, accept: boolean) => api<ConversationDto>('POST', `/platform/chats/${id}/respond`, { accept });
export const setBlocked = (id: string, blocked: boolean) => api<ConversationDto>('POST', `/platform/chats/${id}/block`, { blocked });
export const meetings = async (): Promise<Meeting[]> => (await api<MeetingDto[]>('GET', '/platform/meetings')).map(toMeeting);
export const scheduleMeeting = async (id: string, at: Date, title: string, durationMin: number) =>
  toMeeting(await api<MeetingDto>('POST', `/platform/chats/${id}/meetings`, { title, startsAt: at.toISOString(), durationMin }));
export const cancelMeeting = async (id: string) => toMeeting(await api<MeetingDto>('POST', `/platform/meetings/${id}/cancel`, {}));

/* ---------- Shikoyat, tasdiqlash, moderatsiya ---------- */

type ReportDto = { id: string; targetKind: string; targetId: string; targetTitle: string; reason: string; note?: string; reporter: Card; status: string; action?: string; createdAt: string };
type VerificationDto = { id: string; user: Card; documents: { name: string; mime?: string; data?: string }[]; status: string; note?: string; createdAt: string };

const toReport = (r: ReportDto): Report => ({
  id: r.id, targetKind: lower(r.targetKind), targetId: r.targetId, targetTitle: r.targetTitle, reason: r.reason, note: r.note,
  by: r.reporter.name, status: lower(r.status), action: r.action, createdAt: r.createdAt,
});
const toVerification = (v: VerificationDto, isMe: boolean): Verification => ({
  id: v.id, name: v.user.name, kind: v.user.kind === 'COMPANY' ? 'company' : 'person', country: 'UZ', docs: v.documents.map(d => d.name),
  files: v.documents.filter(d => d.data).map(d => ({ name: d.name, data: d.data! })), status: lower(v.status), isMe, createdAt: v.createdAt,
});

export const report = (r: Pick<Report, 'targetKind' | 'targetId' | 'targetTitle' | 'reason' | 'note'>) =>
  api<ReportDto>('POST', '/platform/reports', { ...r, targetKind: upper(r.targetKind), note: r.note || undefined });

export const myVerification = async (): Promise<Verification | undefined> => {
  const v = await api<VerificationDto | null>('GET', '/platform/verification');
  return v ? toVerification(v, true) : undefined;
};
export const requestVerification = async (files: { name: string; uri: string; mime?: string }[]) =>
  toVerification(await api<VerificationDto>('POST', '/platform/verification', {
    documents: await Promise.all(files.map(async f => ({ name: f.name, mime: f.mime, data: await fileToDataUri(f.uri, f.mime) }))),
  }), true);

export type AdDto = { id: string; title: string; budgetUsd: number; paid: number; image?: string; status: string; createdAt: string };
export type ModerationQueue = { projects: Project[]; market: MarketItem[]; reports: Report[]; verifications: Verification[]; ads: AdDto[] };
export const moderationQueue = async (): Promise<ModerationQueue> => {
  const q = await api<{ projects: ProjectDto[]; market: MarketDto[]; ads: AdDto[]; reports: ReportDto[]; verifications: VerificationDto[] }>('GET', '/admin/platform/queue');
  return { projects: q.projects.map(toProject), market: q.market.map(toMarket), reports: q.reports.map(toReport), verifications: q.verifications.map(v => toVerification(v, false)), ads: q.ads };
};
export const decide = (kind: 'projects' | 'market' | 'ads' | 'verifications', id: string, approve: boolean, reason?: string) =>
  api<unknown>('POST', `/admin/platform/${kind}/${id}/decision`, { approve, reason });
export const resolveReport = (id: string, action: 'block' | 'dismiss') =>
  api<unknown>('POST', `/admin/platform/reports/${id}/resolve`, { action: upper(action) });

/* ---------- Tariflar, TOP va reklama ---------- */

export type PlanInfo = { id: string; name: string; monthlyUsd: number; yearlyUsd: number; boostCredits: number; activeProjects: number | null; monthlySom: number; yearlySom: number };
export type MyPlan = { plan: string; until?: string; boostCredits: number; boostUsd: number; boostSom: number; boostDays: number; usdRate: number };
export const plans = () => api<PlanInfo[]>('GET', '/platform/plans');
export const myPlan = () => api<MyPlan>('GET', '/platform/plans/mine');
export const subscribe = (plan: string, yearly: boolean) => api<MyPlan>('POST', '/platform/plans/subscribe', { plan, yearly });
export const myAds = () => api<AdDto[]>('GET', '/platform/ads');
export const createAd = (title: string, budgetUsd: number, image?: string) => api<AdDto>('POST', '/platform/ads', { title, budgetUsd, image });

/* ---------- Bildirishnomalar (inbox) ---------- */

type NotificationDto = { id: string; type: string; title: string; body: string; data: Record<string, unknown>; read: boolean; createdAt: string };
const ICON: Record<string, Notice['icon']> = {
  LISTING_PUBLISHED: 'checkmark-circle', LISTING_REJECTED: 'alert-circle', VERIFICATION_APPROVED: 'shield-checkmark',
  VERIFICATION_REJECTED: 'alert-circle', CHAT_MESSAGE: 'chatbubbles', CHAT_REQUEST: 'people', REQUEST_ANSWERED: 'people',
  MEETING_SCHEDULED: 'calendar', AD_DECIDED: 'megaphone', PLAN_ACTIVATED: 'diamond', SUPPORT_REPLY: 'headset',
  DRIVER_ASSIGNED: 'car', DRIVER_ARRIVED: 'car', TRIP_COMPLETED: 'flag', ORDER_CANCELLED: 'close-circle', NO_DRIVER_FOUND: 'alert-circle',
  ORDER_MESSAGE: 'chatbubble-ellipses', ROUTE_DEVIATION: 'warning',
};
const hrefOf = (d: Record<string, unknown>): string | undefined =>
  typeof d.projectId === 'string' ? `/project/${d.projectId}`
    : typeof d.marketId === 'string' ? `/market/${d.marketId}`
      : typeof d.conversationId === 'string' ? `/chat/${d.conversationId}`
        : typeof d.ticketId === 'string' ? '/support-chat'
          : typeof d.orderId === 'string' ? '/history' : undefined;

export const inbox = async (): Promise<Notice[]> =>
  (await api<NotificationDto[]>('GET', '/notifications?limit=50')).map(n => ({
    id: n.id, icon: ICON[n.type] ?? 'notifications', title: n.title, text: n.body, at: n.createdAt, read: n.read, href: hrefOf(n.data),
  }));
export const unreadNotices = async () => (await api<{ unread: number }>('GET', '/notifications/unread-count')).unread;
export const markInboxRead = () => api<unknown>('POST', '/notifications/read', {});
