// Birinchi bepul buyurtmalar: bosh ekrandagi karta va ular tugagach ochiladigan to'lov oynasi.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ClickButton } from '@/components/click-mark';
import { TopupSheet } from '@/components/topup-sheet';
import { Row, Sheet, Txt, alpha } from '@/components/ui';
import { feeOf, useDriver } from '@/driver/lib/driver-store';
import { GREEN } from '@/driver/lib/theme';
import { tr } from '@/lib/i18n';
import { som } from '@/lib/geo';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

/** Nechta bepul buyurtma bajarilgani: har biri bitta bo'lak */
function Steps({ total, done }: { total: number; done: number }) {
  const { colors: c } = useStore();
  return (
    <Row gap={5}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.step, { backgroundColor: i < done ? GREEN : c.surface3 }]} />
      ))}
    </Row>
  );
}

export function FreeTripsCard() {
  const { freeTrips, freeTripsLeft } = useDriver();
  if (freeTripsLeft <= 0) return null;
  const title = freeTripsLeft === freeTrips
    ? tr('Birinchi {n} ta buyurtma bepul', { n: freeTrips })
    : tr('Yana {n} ta bepul buyurtma', { n: freeTripsLeft });
  return (
    <View style={[styles.card, { backgroundColor: alpha(GREEN, 0.1) }]} accessibilityLabel={title}>
      <View style={[styles.icon, { backgroundColor: GREEN }]}><Ionicons name="gift" size={20} color="#fff" /></View>
      <View style={{ flex: 1, gap: 3 }}>
        <Txt v="h3">{title}</Txt>
        <Txt v="small" muted>{tr("Komissiya yo'q, hisobni to'ldirish shart emas")}</Txt>
        <View style={{ marginTop: 4 }}><Steps total={freeTrips} done={freeTrips - freeTripsLeft} /></View>
      </View>
    </View>
  );
}

/** Balans yetmaganda: nima uchun to'xtagani, qancha kerakligi va Click orqali to'lash */
export function PaySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors: c } = useStore();
  const d = useDriver();
  const [topup, setTopup] = useState(false);
  const { refreshWallet } = d;
  const closeTopup = useCallback(() => setTopup(false), []);
  const refresh = useCallback(() => { refreshWallet().catch(() => {}); }, [refreshWallet]);
  const earned = d.earnings.reduce((sum, e) => sum + e.price + (e.waitFee ?? 0) + e.tip - feeOf(e), 0);

  const pay = () => {
    onClose();
    // iOS ikkita oynani birdan ocholmaydi: avval bunisi yopiladi
    setTimeout(() => setTopup(true), 350);
  };

  return (
    <>
      <Sheet visible={visible} onClose={onClose}>
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: alpha(GREEN, 0.14) }]}>
            <Ionicons name={d.freeTripsEnded ? 'trophy' : 'wallet'} size={34} color={GREEN} />
          </View>
          <Txt v="h1" style={styles.center}>
            {d.freeTripsEnded ? tr("Zo'r boshladingiz!") : tr("Hisobingizni to'ldiring")}
          </Txt>
          <Txt v="body" muted style={styles.center}>
            {d.freeTripsEnded
              ? tr("{n} ta bepul buyurtma tugadi. Doimiy buyurtma olish uchun hisobingizni to'ldiring.", { n: d.freeTrips })
              : tr("Balans yetarli emas. Buyurtma olishda davom etish uchun hisobingizni to'ldiring.")}
          </Txt>
        </View>
        {d.freeTripsEnded ? <Steps total={d.freeTrips} done={d.freeTrips} /> : null}
        <View style={[styles.box, { backgroundColor: c.surface2 }]}>
          {d.freeTripsEnded && earned > 0 ? <Line label={tr('Shu paytgacha ishladingiz')} value={som(earned)} color={GREEN} /> : null}
          <Line label={tr('Hozirgi balans')} value={som(d.balance)} color={d.balance < 0 ? c.danger : c.text} />
          <Line label={tr('Kamida kerak')} value={som(d.topUpNeeded)} color={c.text} big />
        </View>
        <ClickButton title={tr("Click orqali to'ldirish")} onPress={pay} />
        <Txt v="tiny" faint style={styles.center}>
          {d.balance < 0
            ? tr('Avval {sum} qarz yopiladi, qolgani hisobingizda turadi', { sum: som(-d.balance) })
            : tr('Pul hisobingizda turadi: har buyurtmadan faqat {sum} komissiya yechiladi', { sum: som(d.commission) })}
        </Txt>
      </Sheet>
      <TopupSheet visible={topup} onClose={closeTopup} kind="driver" cards={[]} minAmount={d.topUpNeeded} onDone={refresh} />
    </>
  );
}

function Line({ label, value, color, big }: { label: string; value: string; color: string; big?: boolean }) {
  return (
    <Row style={{ justifyContent: 'space-between', gap: 12 }}>
      <Txt v="small" muted style={{ flexShrink: 1 }}>{label}</Txt>
      <Text style={[styles.value, big && { fontSize: 20 }, { color }]}>{value}</Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  step: { flex: 1, height: 5, borderRadius: 3 },
  hero: { alignItems: 'center', gap: 8, paddingTop: 4 },
  heroIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  box: { gap: 12, padding: 16, borderRadius: 18 },
  value: { fontFamily: F.heavy, fontSize: 16, letterSpacing: -0.3 },
});
