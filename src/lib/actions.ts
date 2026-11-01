import { router } from 'expo-router';

import type { Investor } from './platform-data';
import { usePlatform, type PeerInfo } from './platform';
import { tr } from '@/lib/i18n';

/** Suhbatni ochish (yoki hamkorlik so'rovini boshlash) va chat ekraniga o'tish */
export function useStartChat() {
  const { openChat } = usePlatform();
  return (peer: PeerInfo, opts?: { subject?: string; request?: boolean }) => {
    const id = openChat(peer, opts);
    router.push({ pathname: '/chat/[id]', params: { id } });
  };
}

export function useContactInvestor() {
  const start = useStartChat();
  return (inv: Investor) =>
    start({ peerId: inv.id, peerName: inv.name, peerKind: 'investor', peerVerified: inv.verified }, { request: true, subject: tr('Investitsiya taklifi') });
}
