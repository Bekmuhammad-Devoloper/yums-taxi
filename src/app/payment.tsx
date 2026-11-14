import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { TopupSheet } from '@/components/topup-sheet';
import { toast } from '@/components/toast';
import { alpha, Button, Card, Row, Screen, SectionTitle, Txt, type IconName } from '@/components/ui';
import { errorText } from '@/lib/api';
import type { Card as PayCard, PaymentId } from '@/lib/data';
import { som } from '@/lib/geo';
import { tr } from '@/lib/i18n';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { addCard, confirmCard, removeCard } from '@/lib/wallet-api';

const fmtCard = (d: string) => d.replace(/(\d{4})(?=\d)/g, '$1 ');
const brandHint = (n: string): PayCard['brand'] | null => (n.startsWith('9860') ? 'Humo' : n.startsWith('4') ? 'Visa' : n.length >= 4 ? 'Uzcard' : null);

// Balans kartasi rasmi: YUMS taksisi va Toshkent manzarasi (asl bannerning o'ng qismi, logotipsiz)
const WALLET_ART = require('@/assets/cards/wallet.webp') as number;

// Usul ranglari: naqd — yashil, balans — sariq, karta — tizimiga qarab
const CASH = '#12A150';
const WALLET = '#F5B400';
const CARD_TINT: Record<PayCard['brand'], string> = { Uzcard: '#2563EB', Humo: '#0EA5A4', Visa: '#1A1F71' };
// Karta ko'rinishi gradientlari (yangi karta qo'shishda raqam yozilgan sari yangilanadi)
const CARD_GRADIENT: Record<PayCard['brand'] | 'none', [string, string]> = {
  Uzcard: ['#3B82F6', '#1D4ED8'], Humo: ['#14B8A6', '#0F766E'], Visa: ['#2A3190', '#141A5C'], none: ['#3A4357', '#1E2533'],
};

export default function Payment() {
  const s = useStore();
  const { colors: c, refreshWallet } = s;
  const [adding, setAdding] = useState(false);
  const [topup, setTopup] = useState(false);
  const [num, setNum] = useState('');
  const [exp, setExp] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PayCard | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [code, setCode] = useState('');

  const reload = useCallback(() => {
    refreshWallet().catch(error => toast(errorText(error), 'alert-circle'));
  }, [refreshWallet]);
  useEffect(reload, [reload]);

  const remove = async (cardId: string) => {
    try {
      await removeCard(cardId);
      toast(tr("Karta o'chirildi"), 'trash');
      reload();
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    }
  };

  const option = ({ id, cardId, icon, tint, title, sub }: { id: PaymentId; cardId?: string; icon: IconName; tint: string; title: string; sub?: string }) => {
    const on = s.payment === id && (id !== 'card' || s.cardId === cardId);
    return (
      <Pressable
        key={cardId ?? id}
        onPress={() => { haptic.tap(); s.setPayment(id, cardId); }}
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        style={({ pressed }) => [styles.opt, { backgroundColor: on ? alpha(c.brand, 0.1) : pressed ? c.surface2 : 'transparent', borderColor: on ? alpha(c.brand, 0.7) : 'transparent' }]}>
        <View style={[styles.optIcon, { backgroundColor: alpha(tint, 0.16) }]}><Ionicons name={icon} size={22} color={tint} /></View>
        <View style={{ flex: 1, gap: 1 }}>
          <Txt v="h3">{title}</Txt>
          {sub ? <Txt v="small" muted>{sub}</Txt> : null}
        </View>
        {id === 'card' && cardId && (
          <Pressable hitSlop={8} onPress={() => remove(cardId)} style={styles.trash} accessibilityLabel={tr("Kartani o'chirish")}>
            <Ionicons name="trash-outline" size={17} color={c.faint} />
          </Pressable>
        )}
        {/* tanlangan — brend doirada belgi, aks holda bo'sh halqa */}
        <View style={[styles.radio, on ? { backgroundColor: c.brand, borderColor: c.brand } : { borderColor: c.line }]}>
          {on && <Ionicons name="checkmark" size={15} color={c.brandText} />}
        </View>
      </Pressable>
    );
  };

  const submitCard = async () => {
    setBusy(true);
    try {
      setPending(await addCard(num, exp));
      setAdding(false); setNum(''); setExp(''); setSmsCode('');
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await confirmCard(pending.id, smsCode);
      toast(tr("Karta qo'shildi"), 'card');
      setPending(null);
      reload();
    } catch (error) {
      toast(errorText(error), 'alert-circle');
      setSmsCode('');
    } finally {
      setBusy(false);
    }
  };

  const validExp = /^(0[1-9]|1[0-2])\/\d{2}$/.test(exp);
  // server karta to'lovi yo'qligini aytsa — «Karta qo'shish» ko'rsatilmaydi (eski server bu belgini bermaydi)
  const cardsOff = s.settings?.cardPayments === false;
  const activeCards = s.cards.filter(card => card.status === 'ACTIVE');
  const waiting = pending ?? s.cards.find(card => card.status === 'PENDING') ?? null;

  return (
    <Screen title={tr("To'lov usullari")}>
      {/* balans — qora-oltin karta: chapda summa, o'ngda YUMS taksisi va Toshkent manzarasi */}
      <View style={styles.wallet}>
        <Image source={WALLET_ART} style={styles.walletArt} contentFit="cover" contentPosition="center" />
        {/* rasmning chap cheti qorong'ilikka silliq o'tadi — summa va yozuvlar aniq o'qiladi */}
        <LinearGradient colors={['#0B0B0C', 'rgba(11,11,12,0.92)', 'rgba(11,11,12,0)']} locations={[0, 0.4, 0.68]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(11,11,12,0)', 'rgba(11,11,12,0.55)']} start={{ x: 0.5, y: 0.55 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        <Row style={{ justifyContent: 'space-between', gap: 10 }}>
          <Row gap={8} style={{ flexShrink: 1 }}>
            <View style={styles.walletIco}><Ionicons name="wallet" size={16} color="#FFC800" /></View>
            <Text style={styles.walletLabel} numberOfLines={1}>{tr('YUMS balans')}</Text>
          </Row>
          <Pressable onPress={() => { haptic.tap(); setTopup(true); }} style={({ pressed }) => [styles.topup, { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]} accessibilityRole="button" accessibilityLabel={tr("To'ldirish")}>
            <Ionicons name="add" size={17} color="#1A1205" />
            <Text style={styles.topupText}>{tr("To'ldirish")}</Text>
          </Pressable>
        </Row>
        <Text style={styles.walletSum} numberOfLines={1} adjustsFontSizeToFit>{som(s.balance)}</Text>
        {s.settings?.cashbackPercent ? (
          <View style={styles.cashback}>
            <Ionicons name="sparkles" size={13} color="#FFD84D" />
            <Text style={styles.cashbackText} numberOfLines={1}>{tr('Har safardan {n}% keshbek', { n: s.settings.cashbackPercent })}</Text>
          </View>
        ) : null}
      </View>

      <SectionTitle>{tr("To'lov usuli")}</SectionTitle>
      <Card style={{ padding: 6 }}>
        {option({ id: 'cash', icon: 'cash', tint: CASH, title: tr('Naqd pul'), sub: tr("Haydovchiga to'lash") })}
        {option({ id: 'balance', icon: 'wallet', tint: WALLET, title: tr('YUMS balans'), sub: som(s.balance) })}
        {activeCards.map(card => option({ id: 'card', cardId: card.id, icon: 'card', tint: CARD_TINT[card.brand], title: `${card.brand} •••• ${card.last4}`, sub: tr('Avtomatik yechiladi') }))}
        {cardsOff && (
          // karta protsessori yoqilmagan — qo'shish tugmasi o'rniga holat
          <View style={[styles.addCard, { borderColor: c.line, opacity: 0.85 }]}>
            <View style={[styles.optIcon, { backgroundColor: c.surface2 }]}><Ionicons name="card-outline" size={21} color={c.muted} /></View>
            <View style={{ flex: 1, gap: 1 }}>
              <Txt v="h3" color={c.muted}>{tr("Karta orqali to'lov")}</Txt>
              <Txt v="small" muted>{tr('Tez orada ulanadi')}</Txt>
            </View>
          </View>
        )}
        {!cardsOff && !adding && !waiting && (
          <Pressable onPress={() => { haptic.tap(); setAdding(true); }} style={({ pressed }) => [styles.addCard, { borderColor: c.line, backgroundColor: pressed ? c.surface2 : 'transparent' }]} accessibilityRole="button">
            <View style={[styles.optIcon, { backgroundColor: alpha(c.accent, 0.14) }]}>
              <Ionicons name="card" size={21} color={c.accent} />
              <View style={[styles.plus, { backgroundColor: c.accent, borderColor: c.surface }]}><Ionicons name="add" size={11} color="#fff" /></View>
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Txt v="h3">{tr("Karta qo'shish")}</Txt>
              <Txt v="small" muted>{tr('Uzcard, Humo yoki Visa')}</Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.faint} />
          </Pressable>
        )}
      </Card>

      {adding && (
        <Card style={{ gap: 12 }}>
          <Txt v="h3">{tr('Yangi karta')}</Txt>
          <LinearGradient colors={CARD_GRADIENT[brandHint(num) ?? 'none']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.preview}>
            <View style={[styles.blob, { width: 150, height: 150, right: -50, top: -70, backgroundColor: 'rgba(255,255,255,0.10)' }]} />
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={styles.chip} />
              <Text style={styles.previewBrand}>{brandHint(num) ?? tr('Uzcard · Humo')}</Text>
            </Row>
            <Text style={styles.previewNum} numberOfLines={1}>{fmtCard(num.padEnd(16, '•'))}</Text>
            <Text style={styles.previewExp}>{exp || tr('OO/YY')}</Text>
          </LinearGradient>
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
            <Button title={tr("Qo'shish")} small style={{ flex: 1.5 }} loading={busy} disabled={num.length !== 16 || !validExp} onPress={submitCard} />
          </Row>
        </Card>
      )}

      {waiting && (
        <Card style={{ gap: 12 }}>
          <Txt v="h3">{`${waiting.brand} •••• ${waiting.last4}`}</Txt>
          <Txt v="small" muted>{tr('SMS orqali kelgan kodni kiriting')}</Txt>
          <TextInput value={smsCode} onChangeText={v => setSmsCode(v.replace(/\D/g, '').slice(0, 8))} placeholder="123456" placeholderTextColor={c.faint} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" style={[styles.input, { backgroundColor: c.surface2, color: c.text }]} />
          <Row gap={8}>
            <Button title={tr('Bekor')} kind="ghost" small style={{ flex: 1 }} onPress={() => { setPending(null); remove(waiting.id); }} />
            <Button title={tr('Tasdiqlash')} small style={{ flex: 1.5 }} loading={busy} disabled={smsCode.length < 4} onPress={submitCode} />
          </Row>
        </Card>
      )}

      <SectionTitle>{tr('Promokod')}</SectionTitle>
      <Card style={{ gap: 12 }}>
        {s.promo ? (
          <Row>
            <View style={[styles.optIcon, { backgroundColor: alpha(c.ok, 0.16) }]}><Ionicons name="pricetag" size={20} color={c.ok} /></View>
            <View style={{ flex: 1 }}>
              <Txt v="h3">{s.promo.code}</Txt>
              <Txt v="small" color={c.ok}>{tr('Keyingi safarga -{percent}% faol', { percent: s.promo.percent })}</Txt>
            </View>
            <Pressable onPress={s.clearPromo} hitSlop={8}><Ionicons name="close-circle" size={22} color={c.faint} /></Pressable>
          </Row>
        ) : (
          <View style={[styles.promo, { backgroundColor: c.surface2 }]}>
            <Ionicons name="pricetag-outline" size={19} color={c.muted} />
            <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" placeholder={tr('Masalan: YUMS20')} placeholderTextColor={c.faint} style={[styles.promoInput, { color: c.text }]} />
            <Pressable
              disabled={!code.trim()}
              onPress={() => {
                haptic.tap();
                // xato bo'lsa sababi (topilmadi, muddati o'tgan, sizga tegishli emas) serverdan keladi
                s.applyPromo(code).then(ok => { if (ok) { toast(tr("Promokod qo'llandi"), 'pricetag'); setCode(''); } });
              }}
              style={({ pressed }) => [styles.apply, { backgroundColor: code.trim() ? c.brand : c.surface3, opacity: pressed ? 0.85 : 1 }]}>
              <Text style={[styles.applyText, { color: code.trim() ? c.brandText : c.faint }]}>{tr("Qo'llash")}</Text>
            </Pressable>
          </View>
        )}
      </Card>

      <TopupSheet visible={topup} onClose={() => setTopup(false)} kind="passenger" cards={activeCards} onDone={reload} onAddCard={() => setAdding(true)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wallet: { height: 178, borderRadius: 24, padding: 18, gap: 8, overflow: 'hidden', backgroundColor: '#0B0B0C', justifyContent: 'space-between', shadowColor: '#F5A300', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  walletArt: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '64%' },
  walletIco: { width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(255,200,0,0.16)', alignItems: 'center', justifyContent: 'center' },
  walletLabel: { flexShrink: 1, color: 'rgba(255,255,255,0.86)', fontFamily: F.bold, fontSize: 14 },
  walletSum: { color: '#FFFFFF', fontFamily: F.heavy, fontSize: 31, letterSpacing: -0.8, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 1 } },
  cashback: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, flexShrink: 1, maxWidth: '92%', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(20,16,4,0.72)', borderWidth: 1, borderColor: 'rgba(255,200,0,0.28)' },
  cashbackText: { flexShrink: 1, color: '#FFD84D', fontFamily: F.bold, fontSize: 11.5 },
  topup: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 38, paddingHorizontal: 14, borderRadius: 13, backgroundColor: '#FFC800', flexShrink: 0, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  topupText: { color: '#1A1205', fontFamily: F.bold, fontSize: 14.5 },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 16, borderWidth: 1.5 },
  optIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  trash: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, marginTop: 4, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed' },
  plus: { position: 'absolute', right: 4, bottom: 4, width: 16, height: 16, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  preview: { height: 170, borderRadius: 20, padding: 18, justifyContent: 'space-between', overflow: 'hidden' },
  chip: { width: 38, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,214,102,0.85)' },
  previewBrand: { color: '#FFFFFF', fontFamily: F.heavy, fontSize: 15, letterSpacing: 0.5 },
  previewNum: { color: '#FFFFFF', fontFamily: F.bold, fontSize: 20, letterSpacing: 2, fontVariant: ['tabular-nums'] },
  previewExp: { color: 'rgba(255,255,255,0.8)', fontFamily: F.semi, fontSize: 13, fontVariant: ['tabular-nums'] },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, borderRadius: 16, paddingLeft: 14, paddingRight: 6 },
  promoInput: { flex: 1, minWidth: 0, height: '100%', fontSize: 16, fontFamily: F.semi },
  apply: { height: 42, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontFamily: F.bold, fontSize: 14 },
  input: { height: 52, borderRadius: 14, paddingHorizontal: 14, fontSize: 16, fontFamily: F.semi },
});
