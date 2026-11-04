import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, View } from 'react-native';

import { toast } from '@/components/toast';
import { Button, Chip, Field, Row, Sheet, Txt } from '@/components/ui';
import { errorText } from '@/lib/api';
import type { Card } from '@/lib/data';
import { som } from '@/lib/geo';
import { tr } from '@/lib/i18n';
import { startClickTopup, topUpFromCard, topupStatus, type WalletKind } from '@/lib/wallet-api';

const PRESETS = [10_000, 20_000, 50_000, 100_000];
const MIN_AMOUNT = 1_000;
const POLL_MS = 3_000;
// To'lov havolasi 30 daqiqa yashaydi; undan keyin kutishning ma'nosi yo'q
const POLL_LIMIT_MS = 30 * 60_000;

const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

type Props = { visible: boolean; onClose: () => void; kind: WalletKind; cards: Card[]; onDone: () => void };

/** Balansni to'ldirish: Click ilovasi orqali yoki saqlangan kartadan */
export function TopupSheet({ visible, onClose, kind, cards, onDone }: Props) {
  const [amount, setAmount] = useState(PRESETS[1]);
  const [busy, setBusy] = useState(false);
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  // Javob yo'qolsa, shu kalit bilan takrorlash pulni ikki marta yechmaydi
  const cardKey = useRef(newKey());

  useEffect(() => {
    if (!waitingFor) return;
    const started = Date.now();
    let stopped = false;
    const check = async () => {
      if (stopped) return;
      if (Date.now() - started > POLL_LIMIT_MS) { setWaitingFor(null); return; }
      const { status } = await topupStatus(kind, waitingFor).catch(() => ({ status: 'PENDING' as const }));
      if (stopped || status === 'PENDING') return;
      setWaitingFor(null);
      onDone();
      if (status === 'CAPTURED') { toast(tr('Balans to\'ldirildi'), 'checkmark-circle'); onClose(); }
      else toast(tr("To'lov amalga oshmadi"), 'alert-circle');
    };
    const timer = setInterval(check, POLL_MS);
    // Click ilovasidan qaytganda natijani darhol ko'rsatadi
    const returned = AppState.addEventListener('change', state => { if (state === 'active') check(); });
    return () => { stopped = true; clearInterval(timer); returned.remove(); };
  }, [waitingFor, kind, onClose, onDone]);

  const payInClick = async () => {
    setBusy(true);
    try {
      const { paymentId, payUrl } = await startClickTopup(kind, amount);
      setWaitingFor(paymentId);
      await Linking.openURL(payUrl);
    } catch (error) {
      setWaitingFor(null);
      toast(errorText(error), 'alert-circle');
    } finally {
      setBusy(false);
    }
  };

  const payFromCard = async (card: Card) => {
    setBusy(true);
    try {
      await topUpFromCard(kind, amount, card.id, cardKey.current);
      cardKey.current = newKey();
      toast(tr('Balans to\'ldirildi'), 'checkmark-circle');
      onDone();
      onClose();
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    } finally {
      setBusy(false);
    }
  };

  const valid = Number.isInteger(amount) && amount >= MIN_AMOUNT;

  return (
    <Sheet visible={visible} onClose={onClose} title={tr("Balansni to'ldirish")}>
      <View style={{ gap: 12 }}>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {PRESETS.map(sum => <Chip key={sum} label={som(sum)} active={sum === amount} onPress={() => setAmount(sum)} />)}
        </Row>
        <Field label={tr("Summa (so'm)")} keyboardType="number-pad" value={String(amount || '')} onChangeText={v => setAmount(Number(v.replace(/\D/g, '')))} />
        {waitingFor ? (
          <Txt v="small" muted>{tr("Click'da to'lovni yakunlang, natija shu yerda chiqadi")}</Txt>
        ) : null}
        <Button title={tr('Click orqali to\'lash')} icon="wallet-outline" loading={busy} disabled={!valid || !!waitingFor} onPress={payInClick} />
        {cards.map(card => (
          <Button key={card.id} kind="ghost" title={`${card.brand} •••• ${card.last4}`} icon="card-outline" disabled={!valid || busy || !!waitingFor} onPress={() => payFromCard(card)} />
        ))}
      </View>
    </Sheet>
  );
}
