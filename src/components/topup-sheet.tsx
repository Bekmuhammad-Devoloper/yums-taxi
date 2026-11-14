import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';

import { toast } from '@/components/toast';
import { Button, Chip, Field, Row, Sheet, Txt } from '@/components/ui';
import { errorText } from '@/lib/api';
import type { Card } from '@/lib/data';
import { som } from '@/lib/geo';
import { tr } from '@/lib/i18n';
import { useStore } from '@/lib/store';
import { startClickTopup, topUpFromCard, topupStatus, type WalletKind } from '@/lib/wallet-api';

const PRESETS = [10_000, 20_000, 50_000, 100_000];
const MIN_AMOUNT = 1_000;
const POLL_MS = 3_000;
// To'lov havolasi 30 daqiqa yashaydi; undan keyin kutishning ma'nosi yo'q
const POLL_LIMIT_MS = 30 * 60_000;

const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

type Props = { visible: boolean; onClose: () => void; kind: WalletKind; cards: Card[]; onDone: () => void; onAddCard?: () => void };

/** Balansni to'ldirish: Click ilovasi orqali yoki saqlangan kartadan */
export function TopupSheet({ visible, onClose, kind, cards, onDone, onAddCard }: Props) {
  const { colors: c, settings } = useStore();
  // server Click ulanmaganini aytsa — ishlamaydigan tugma ko'rsatilmaydi (eski server bu belgini bermaydi — unda bor deb hisoblanadi)
  const clickOn = settings?.clickTopup !== false;
  const cardsOn = settings?.cardPayments !== false;
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

  // Yopilganda kutish tugaydi: yangi urinish mumkin, to'lov o'tgan bo'lsa balans yangilanadi
  const close = () => {
    setWaitingFor(null);
    onDone();
    onClose();
  };

  const valid = Number.isInteger(amount) && amount >= MIN_AMOUNT;

  return (
    <Sheet visible={visible} onClose={close} title={tr("Balansni to'ldirish")}>
      <View style={{ gap: 12 }}>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>
          {PRESETS.map(sum => <Chip key={sum} label={som(sum)} active={sum === amount} onPress={() => setAmount(sum)} />)}
        </Row>
        <Field label={tr("Summa (so'm)")} keyboardType="number-pad" value={String(amount || '')} onChangeText={v => setAmount(Number(v.replace(/\D/g, '')))} />
        {waitingFor ? (
          <Txt v="small" muted>{tr("Click'da to'lovni yakunlang, natija shu yerda chiqadi")}</Txt>
        ) : null}
        {clickOn ? (
          <Button title={tr('Click orqali to\'lash')} icon="wallet-outline" loading={busy} disabled={!valid || !!waitingFor} onPress={payInClick} />
        ) : (
          // Click hali ulanmagan: sababini va hozir nima qilish mumkinligini aytamiz
          <View style={[styles.note, { backgroundColor: c.surface2, borderColor: c.line }]}>
            <View style={[styles.noteIco, { backgroundColor: c.warnSoft }]}><Ionicons name="time-outline" size={18} color={c.warn} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="h3">{tr("Click orqali to'lov hali ulanmagan")}</Txt>
              <Txt v="small" muted style={{ lineHeight: 19 }}>
                {cardsOn && cards.length
                  ? tr("Hozircha saqlangan kartangizdan to'ldiring")
                  : cardsOn
                  ? tr("Hozircha karta qo'shib, undan to'ldirishingiz mumkin")
                  : tr("Tez orada ulanadi. Hozircha safar uchun naqd pul bilan to'lang")}
              </Txt>
            </View>
          </View>
        )}
        {!clickOn && cardsOn && !cards.length && onAddCard ? (
          <Button title={tr("Karta qo'shish")} icon="card-outline" onPress={() => { onClose(); onAddCard(); }} />
        ) : null}
        {cards.map(card => (
          <Button key={card.id} kind="ghost" title={`${card.brand} •••• ${card.last4}`} icon="card-outline" disabled={!valid || busy || !!waitingFor} onPress={() => payFromCard(card)} />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  noteIco: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
