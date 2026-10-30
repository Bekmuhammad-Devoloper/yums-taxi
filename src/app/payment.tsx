import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { toast } from '@/components/toast';
import { Button, Card, Row, Screen, SectionTitle, Txt, type IconName } from '@/components/ui';
import type { Card as PayCard, PaymentId } from '@/lib/data';
import { som } from '@/lib/geo';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr } from '@/lib/i18n';

const brandOf = (n: string): PayCard['brand'] => (n.startsWith('9860') ? 'Humo' : n.startsWith('4') ? 'Visa' : 'Uzcard');
const fmtCard = (d: string) => d.replace(/(\d{4})(?=\d)/g, '$1 ');

export default function Payment() {
  const s = useStore();
  const { colors: c } = s;
  const [adding, setAdding] = useState(false);
  const [num, setNum] = useState('');
  const [exp, setExp] = useState('');
  const [code, setCode] = useState('');

  const option = ({ id, cardId, icon, title, sub }: { id: PaymentId; cardId?: string; icon: IconName; title: string; sub?: string }) => {
    const on = s.payment === id && (id !== 'card' || s.cardId === cardId);
    return (
      <Pressable key={cardId ?? id} onPress={() => { haptic.tap(); s.setPayment(id, cardId); }} style={[styles.opt, { backgroundColor: on ? c.brandSoft : 'transparent' }]}>
        <View style={[styles.optIcon, { backgroundColor: c.surface2 }]}><Ionicons name={icon} size={22} color={c.text} /></View>
        <View style={{ flex: 1 }}>
          <Txt v="h3">{title}</Txt>
          {sub ? <Txt v="small" muted>{sub}</Txt> : null}
        </View>
        {id === 'card' && cardId && (
          <Pressable hitSlop={8} onPress={() => { s.removeCard(cardId); toast(tr("Karta o'chirildi"), 'trash'); }} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={18} color={c.faint} />
          </Pressable>
        )}
        <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={24} color={on ? '#E0A800' : c.faint} />
      </Pressable>
    );
  };

  const addCard = () => {
    s.addCard({ id: 'c' + Date.now(), brand: brandOf(num), last4: num.slice(-4) });
    toast(tr("Karta qo'shildi"), 'card');
    setAdding(false); setNum(''); setExp('');
  };

  const validExp = /^(0[1-9]|1[0-2])\/\d{2}$/.test(exp);

  return (
    <Screen title={tr("To'lov usullari")}>
      <SectionTitle>{tr("To'lov usuli")}</SectionTitle>
      <Card style={{ padding: 6 }}>
        {option({ id: 'cash', icon: 'cash-outline', title: tr('Naqd pul'), sub: tr("Haydovchiga to'lash") })}
        {option({ id: 'balance', icon: 'wallet-outline', title: tr('YUMS balans'), sub: som(s.balance) })}
        {s.cards.map(card => option({ id: 'card', cardId: card.id, icon: 'card-outline', title: `${card.brand} •••• ${card.last4}`, sub: tr('Avtomatik yechiladi') }))}
        {!adding && (
          <Pressable onPress={() => setAdding(true)} style={[styles.opt]}>
            <View style={[styles.optIcon, { backgroundColor: c.brand }]}><Ionicons name="add" size={24} color={c.brandText} /></View>
            <Txt v="h3">{tr("Karta qo'shish")}</Txt>
          </Pressable>
        )}
      </Card>

      {adding && (
        <Card style={{ gap: 12 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="h3">{tr('Yangi karta')}</Txt>
            <Txt v="small" muted>{num.length >= 4 ? brandOf(num) : tr('Uzcard · Humo · Visa')}</Txt>
          </Row>
          <TextInput value={fmtCard(num)} onChangeText={v => setNum(v.replace(/\D/g, '').slice(0, 16))} placeholder="8600 0000 0000 0000" placeholderTextColor={c.faint} keyboardType="number-pad" style={[styles.input, { backgroundColor: c.surface2, color: c.text }]} />
          <TextInput
            value={exp}
            onChangeText={v => { const d = v.replace(/\D/g, '').slice(0, 4); setExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d); }}
            placeholder={tr('OO/YY')}
            placeholderTextColor={c.faint}
            keyboardType="number-pad"
            style={[styles.input, { backgroundColor: c.surface2, color: c.text }]}
          />
          <Txt v="tiny" faint>{tr("Karta ma'lumotlari to'lov provayderida shifrlangan holda saqlanadi. Tasdiqlash uchun SMS-kod yuboriladi.")}</Txt>
          <Row gap={8}>
            <Button title={tr('Bekor')} kind="ghost" small style={{ flex: 1 }} onPress={() => setAdding(false)} />
            <Button title={tr("Qo'shish")} small style={{ flex: 1.5 }} disabled={num.length !== 16 || !validExp} onPress={addCard} />
          </Row>
        </Card>
      )}

      <SectionTitle>{tr('Promokod')}</SectionTitle>
      <Card style={{ gap: 12 }}>
        {s.promo ? (
          <Row>
            <View style={[styles.optIcon, { backgroundColor: c.okSoft }]}><Ionicons name="pricetag" size={20} color={c.ok} /></View>
            <View style={{ flex: 1 }}>
              <Txt v="h3">{s.promo.code}</Txt>
              <Txt v="small" color={c.ok}>{tr('Keyingi safarga -{percent}% faol', { percent: s.promo.percent })}</Txt>
            </View>
            <Pressable onPress={s.clearPromo} hitSlop={8}><Ionicons name="close-circle" size={22} color={c.faint} /></Pressable>
          </Row>
        ) : (
          <Row gap={8}>
            <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" placeholder={tr('Masalan: YUMS20')} placeholderTextColor={c.faint} style={[styles.input, { flex: 1, backgroundColor: c.surface2, color: c.text }]} />
            <Button title={tr("Qo'llash")} small disabled={!code.trim()} onPress={() => {
              if (s.applyPromo(code)) { toast(tr("Promokod qo'llandi"), 'pricetag'); setCode(''); }
              else toast(tr("Promokod topilmadi yoki muddati o'tgan"), 'alert-circle');
            }} />
          </Row>
        )}
        <Txt v="tiny" faint>{tr('Demo promokodlar: YUMS20, YANGI30, TOSHKENT')}</Txt>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 16 },
  optIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  input: { height: 52, borderRadius: 14, paddingHorizontal: 14, fontSize: 16, fontFamily: F.semi },
});
