import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TARIFF_ART } from '@/lib/cars';
import { RATING_TAGS, RIDE_OPTIONS, TARIFFS, type Place } from '@/lib/data';
import { som } from '@/lib/geo';
import { haptic, surgeNow, useStore } from '@/lib/store';
import { F, radius } from '@/lib/theme';

import { toast } from './toast';
import { Button, Chip, Divider, Flag, IconTile, PersonAvatar, Row, Txt, type IconName } from './ui';

/* ---------- Kichik bo'laklar ---------- */
function AddressRow({ dot, label, place, onPress, placeholder }: { dot: 'from' | 'to'; label: string; place?: Place | null; onPress?: () => void; placeholder?: string }) {
  const { colors: c } = useStore();
  return (
    <Pressable onPress={() => { haptic.tap(); onPress?.(); }} style={({ pressed }) => [styles.addr, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.addrDot, dot === 'from' ? { backgroundColor: '#0F1E3D', borderColor: c.surface3 } : { backgroundColor: '#FFC800', borderRadius: 4, borderColor: c.brandSoft }]} />
      <View style={{ flex: 1 }}>
        <Txt v="tiny" faint>{label}</Txt>
        <Txt v="h3" numberOfLines={1} muted={!place}>{place?.title ?? placeholder ?? 'Aniqlanmoqda…'}</Txt>
      </View>
    </Pressable>
  );
}

const paymentLabel = (id: string, last4?: string): { icon: IconName; text: string } =>
  id === 'card' ? { icon: 'card-outline', text: last4 ? `•••• ${last4}` : 'Karta' } : id === 'balance' ? { icon: 'wallet-outline', text: 'YUMS balans' } : { icon: 'cash-outline', text: 'Naqd' };

function usePaymentLabel() {
  const s = useStore();
  const card = s.cards.find(x => x.id === s.cardId);
  return paymentLabel(s.payment, card?.last4);
}

/* ---------- 1. Bosh holat: qayerga? ---------- */
export function IdleSheet() {
  const { colors: c, order, saved, recent, setDestination, setTariff } = useStore();
  const quick: { key: string; icon: IconName; title: string; place?: Place; onPress: () => void }[] = [
    { key: 'home', icon: 'home', title: saved.home ? 'Uy' : "Uyni qo'shish", place: saved.home, onPress: () => (saved.home ? setDestination(saved.home) : router.push('/search?mode=home')) },
    { key: 'work', icon: 'briefcase', title: saved.work ? 'Ish' : "Ishni qo'shish", place: saved.work, onPress: () => (saved.work ? setDestination(saved.work) : router.push('/search?mode=work')) },
    ...recent.slice(0, 3).map(p => ({ key: p.title, icon: 'time-outline' as IconName, title: p.title, place: p, onPress: () => setDestination(p) })),
  ];
  const services = [
    { id: 'start', label: 'Taksi' },
    { id: 'comfort', label: 'Komfort' },
    { id: 'delivery', label: 'Yetkazish' },
    { id: 'minivan', label: 'Miniven' },
  ];
  return (
    <View style={{ gap: 14 }}>
      <AddressRow dot="from" label="Qayerdan" place={order.pickup} onPress={() => router.push('/search?mode=from')} />
      <Pressable onPress={() => { haptic.tap(); router.push('/search?mode=to'); }} style={({ pressed }) => [styles.whereTo, { backgroundColor: c.surface2, opacity: pressed ? 0.8 : 1 }]}>
        <Ionicons name="search" size={22} color={c.text} />
        <Text style={{ flex: 1, fontSize: 16, fontFamily: F.display, letterSpacing: -0.4, color: c.text }}>Qayerga boramiz?</Text>
        <View style={[styles.arrowBtn, { backgroundColor: c.brand }]}><Ionicons name="arrow-forward" size={18} color={c.brandText} /></View>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {quick.map(q => (
          <Pressable key={q.key} onPress={() => { haptic.tap(); q.onPress(); }} style={[styles.quick, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Ionicons name={q.icon} size={17} color={c.text} />
            <View style={{ maxWidth: 140 }}>
              <Txt v="small" style={{ fontFamily: F.bold }} numberOfLines={1}>{q.title}</Txt>
              {q.place && q.key.length < 5 ? <Txt v="tiny" faint numberOfLines={1}>{q.place.title}</Txt> : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <Row gap={8}>
        {services.map(s => (
          <Pressable key={s.id} onPress={() => { setTariff(s.id); router.push('/search?mode=to'); }} style={({ pressed }) => [styles.service, { backgroundColor: c.surface2, transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
            <Image source={TARIFF_ART[s.id]} style={styles.serviceArt} contentFit="contain" />
            <Txt v="tiny" style={{ fontFamily: F.bold }}>{s.label}</Txt>
          </Pressable>
        ))}
      </Row>
    </View>
  );
}

/* ---------- 2. Tarif tanlash ---------- */
export function ChoosingSheet({ onOptions }: { onOptions: () => void }) {
  const s = useStore();
  const { colors: c, order, priceOf, finalPrice, promo } = s;
  const pay = usePaymentLabel();
  const r = order.route;
  const surge = surgeNow();
  return (
    <View style={{ gap: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt v="small" muted numberOfLines={1}>{order.pickup?.title} → {order.destination?.title}</Txt>
          {r ? <Txt v="h3">{r.min} daqiqa · {r.km.toFixed(1)} km</Txt> : <Txt v="h3" muted>Marshrut hisoblanmoqda…</Txt>}
        </View>
        {surge > 1 && (
          <View style={[styles.surge, { backgroundColor: c.dangerSoft }]}>
            <Ionicons name="flash" size={13} color={c.danger} />
            <Txt v="tiny" color={c.danger}>×{surge}</Txt>
          </View>
        )}
      </Row>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
        {TARIFFS.map(t => {
          const on = t.id === order.tariffId;
          return (
            <Pressable key={t.id} onPress={() => { haptic.tap(); s.setTariff(t.id); }} style={[styles.tariff, { backgroundColor: on ? c.brandSoft : c.surface2, borderColor: on ? c.brand : 'transparent' }]}>
              <View style={[styles.eta, { backgroundColor: on ? c.brand : c.surface }]}>
                <Txt v="tiny" color={on ? c.brandText : c.muted} style={{ fontFamily: F.bold }}>{2 + t.etaExtra} daq</Txt>
              </View>
              <Image source={TARIFF_ART[t.id]} style={styles.tariffArt} contentFit="contain" />
              <Txt v="small" style={{ fontFamily: F.heavy }}>{t.name}</Txt>
              {r ? <Txt v="h3" style={{ fontSize: 15 }}>{som(priceOf(t.id))}</Txt> : <ActivityIndicator size="small" color={c.muted} style={{ alignSelf: 'flex-start', height: 20 }} />}
              <Row gap={3}>
                <Ionicons name={t.seats !== '—' ? 'person-outline' : 'cube-outline'} size={11} color={c.faint} />
                <Txt v="tiny" faint>{t.seats !== '—' ? t.seats : 'Posilka'}</Txt>
              </Row>
            </Pressable>
          );
        })}
      </ScrollView>
      <Txt v="small" muted>{TARIFFS.find(t => t.id === order.tariffId)?.desc}</Txt>

      <Row gap={8}>
        <Pressable onPress={() => router.push('/payment')} style={[styles.pill, { backgroundColor: c.surface2, flex: 1 }]}>
          <Ionicons name={pay.icon} size={18} color={c.text} />
          <Txt v="small" style={{ fontFamily: F.bold, flex: 1 }} numberOfLines={1}>{pay.text}</Txt>
          <Ionicons name="chevron-down" size={16} color={c.faint} />
        </Pressable>
        <Pressable onPress={onOptions} style={[styles.pill, { backgroundColor: c.surface2 }]}>
          <Ionicons name="options-outline" size={18} color={c.text} />
          <Txt v="small" style={{ fontFamily: F.bold }}>Istaklar{order.options.length || order.comment ? ` · ${order.options.length + (order.comment ? 1 : 0)}` : ''}</Txt>
        </Pressable>
        <Pressable onPress={() => router.push('/payment')} style={[styles.pill, { backgroundColor: promo ? c.okSoft : c.surface2 }]}>
          <Ionicons name="pricetag-outline" size={18} color={promo ? c.ok : c.text} />
          {promo ? <Txt v="small" color={c.ok} style={{ fontFamily: F.heavy }}>-{promo.percent}%</Txt> : null}
        </Pressable>
      </Row>

      <Button title="Buyurtma berish" sub={r ? (promo ? `${som(finalPrice)} · chegirma bilan` : som(finalPrice)) : undefined} disabled={!r} onPress={s.placeOrder} />
    </View>
  );
}

/* ---------- 3. Haydovchi qidirilmoqda ---------- */
export function SearchingSheet() {
  const { colors: c, order, finalPrice, cancelOrder } = useStore();
  const [anim] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const a = Animated.loop(Animated.timing(anim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    const p = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    a.start(); p.start();
    return () => { a.stop(); p.stop(); };
  }, [anim, pulse]);
  const t = TARIFFS.find(x => x.id === order.tariffId)!;
  return (
    <View style={{ gap: 14 }}>
      <Row>
        <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[styles.pulse, { backgroundColor: c.brand, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }] }]} />
          <View style={[styles.radar, { backgroundColor: c.brandSoft, borderColor: c.brand }]}><Image source={TARIFF_ART[t.id]} style={{ width: 44, height: 22 }} contentFit="contain" /></View>
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="h2">Haydovchi qidirilmoqda</Txt>
          <Txt v="small" muted>Yaqin atrofdagi {t.name} mashinalari</Txt>
        </View>
      </Row>
      <View style={[styles.track, { backgroundColor: c.surface2 }]}>
        <Animated.View style={[styles.trackBar, { backgroundColor: c.brand, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-120, 360] }) }] }]} />
      </View>
      <View style={{ gap: 2 }}>
        <AddressRow dot="from" label="Qayerdan" place={order.pickup} />
        <AddressRow dot="to" label="Qayerga" place={order.destination} />
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt muted>{t.name} · narx</Txt>
        <Txt v="h3">{som(finalPrice)}</Txt>
      </Row>
      <Button title="Buyurtmani bekor qilish" kind="ghost" onPress={() => { cancelOrder(); toast('Buyurtma bekor qilindi', 'close-circle'); }} />
    </View>
  );
}

/* ---------- 4. Haydovchi kartasi ---------- */
function DriverCard() {
  const { colors: c, order } = useStore();
  const d = order.driver!;
  return (
    <Row style={[styles.driverCard, { backgroundColor: c.surface2 }]}>
      <PersonAvatar driver name={d.name} photo={d.photo} gender={d.gender} size={52} />
      <View style={{ flex: 1 }}>
        <Txt v="h3">{d.name}</Txt>
        <Row gap={4}>
          <Ionicons name="star" size={13} color="#F5A524" />
          <Txt v="small" muted>{d.rating.toFixed(2)} · {d.trips} safar</Txt>
        </Row>
        <Txt v="small" muted numberOfLines={1}>{d.color} {d.car}</Txt>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Image source={TARIFF_ART[order.tariffId] ?? TARIFF_ART.start} style={{ width: 72, height: 36 }} contentFit="contain" />
        <Plate value={d.plate} />
      </View>
    </Row>
  );
}

/** O'zbekiston davlat raqami: hudud kodi | raqam | bayroq */
function Plate({ value }: { value: string }) {
  const region = value.slice(0, 2), rest = value.slice(3);
  return (
    <View style={styles.plate}>
      <Text style={styles.plateRegion}>{region}</Text>
      <View style={styles.plateSep} />
      <Text style={styles.plateText}>{rest}</Text>
      <View style={{ alignItems: 'center', marginLeft: 4 }}>
        <Flag code="UZ" size={11} />
        <Text style={styles.plateUz}>UZ</Text>
      </View>
    </View>
  );
}

function ActionBtn({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const { colors: c } = useStore();
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} style={({ pressed }) => [styles.action, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.actionIco, { backgroundColor: danger ? c.dangerSoft : c.surface2 }]}><Ionicons name={icon} size={22} color={danger ? c.danger : c.text} /></View>
      <Txt v="tiny" color={danger ? c.danger : undefined}>{label}</Txt>
    </Pressable>
  );
}

const shareTrip = (text: string) => Share.share({ message: text }).catch(() => {});

export function DriverSheet() {
  const { colors: c, order, cancelOrder, finalPrice } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const pay = usePaymentLabel();
  useEffect(() => {
    if (order.phase !== 'arrived') return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [order.phase]);
  const d = order.driver!;
  const arrived = order.phase === 'arrived';
  const left = Math.max(0, 180 - Math.floor((now - (order.arrivedAt ?? now)) / 1000));
  return (
    <View style={{ gap: 14 }}>
      <View>
        <Txt v="h2">{arrived ? 'Haydovchi sizni kutmoqda' : `${order.etaMin} daqiqada yetib keladi`}</Txt>
        <Txt v="small" muted>
          {arrived ? `Bepul kutish: ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : `${d.color} ${d.car} · ${d.plate}`}
        </Txt>
      </View>
      {!arrived && (
        <View style={[styles.track, { backgroundColor: c.surface2 }]}>
          <View style={[styles.trackFill, { backgroundColor: c.brand, width: `${Math.round(order.progress * 100)}%` }]} />
        </View>
      )}
      <DriverCard />
      <Row style={{ justifyContent: 'space-around' }}>
        <ActionBtn icon="call" label="Qo'ng'iroq" onPress={() => Linking.openURL(`tel:${d.phone}`).catch(() => toast("Qo'ng'iroq qilib bo'lmadi", 'alert-circle'))} />
        <ActionBtn icon="chatbubble-ellipses" label="Xabar" onPress={() => Linking.openURL(`sms:${d.phone}`).catch(() => {})} />
        <ActionBtn icon="share-social" label="Ulashish" onPress={() => shareTrip(`Men YUMS Taxi'da ketyapman: ${d.color} ${d.car}, ${d.plate}. Haydovchi: ${d.name}. Manzil: ${order.destination?.title}`)} />
        <ActionBtn icon="close" label="Bekor" danger onPress={() => setConfirm(true)} />
      </Row>
      {confirm ? (
        <View style={[styles.confirm, { backgroundColor: c.dangerSoft }]}>
          <Txt v="h3" color={c.danger}>Buyurtmani bekor qilasizmi?</Txt>
          <Txt v="small" muted>Haydovchi allaqachon yo'lda. Tez-tez bekor qilish reytingingizga ta'sir qiladi.</Txt>
          <Row gap={8} style={{ marginTop: 6 }}>
            <Button title="Yo'q" kind="ghost" small style={{ flex: 1 }} onPress={() => setConfirm(false)} />
            <Button title="Ha, bekor qilish" kind="danger" small style={{ flex: 1.4 }} onPress={() => { cancelOrder(); toast('Buyurtma bekor qilindi', 'close-circle'); }} />
          </Row>
        </View>
      ) : (
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={6}><Ionicons name={pay.icon} size={18} color={c.muted} /><Txt muted>{pay.text}</Txt></Row>
          <Txt v="h3">{som(finalPrice)}</Txt>
        </Row>
      )}
    </View>
  );
}

/* ---------- 5. Safarda ---------- */
export function RideSheet() {
  const { colors: c, order, finalPrice } = useStore();
  const d = order.driver!;
  return (
    <View style={{ gap: 14 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt v="h2">Yo'ldasiz · {order.etaMin} daq qoldi</Txt>
          <Txt v="small" muted numberOfLines={1}>{order.destination?.title}</Txt>
        </View>
        <Txt v="h3">{som(finalPrice)}</Txt>
      </Row>
      <View style={[styles.track, { backgroundColor: c.surface2 }]}>
        <View style={[styles.trackFill, { backgroundColor: c.brand, width: `${Math.round(order.progress * 100)}%` }]} />
      </View>
      <DriverCard />
      <Row style={{ justifyContent: 'space-around' }}>
        <ActionBtn icon="shield-checkmark" label="Xavfsizlik" onPress={() => router.push('/safety')} />
        <ActionBtn icon="share-social" label="Ulashish" onPress={() => shareTrip(`Men YUMS Taxi'da ketyapman: ${d.color} ${d.car}, ${d.plate}. Taxminan ${order.etaMin} daqiqada "${order.destination?.title}"ga yetib boraman.`)} />
        <ActionBtn icon="call" label="Haydovchi" onPress={() => Linking.openURL(`tel:${d.phone}`).catch(() => {})} />
        <ActionBtn icon="help-buoy" label="Yordam" onPress={() => router.push('/support')} />
      </Row>
    </View>
  );
}

/* ---------- 6. Baholash ---------- */
export function RatingModal() {
  const { colors: c, order, finalPrice, finishRide } = useStore();
  const insets = useSafeAreaInsets();
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tip, setTip] = useState(0);
  const pay = usePaymentLabel();
  const visible = order.phase === 'done';
  const d = order.driver;
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={[styles.modalBg, { backgroundColor: c.overlay }]}>
        <View style={[styles.modal, { backgroundColor: c.surface, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.grab, { backgroundColor: c.surface3 }]} />
          <IconTile name="flag-outline" color={c.ok} size={60} style={{ alignSelf: 'center' }} />
          <Txt v="h1" style={{ textAlign: 'center' }}>Yetib keldingiz!</Txt>
          <Txt muted style={{ textAlign: 'center' }}>{order.destination?.title}</Txt>
          <View style={[styles.total, { backgroundColor: c.surface2 }]}>
            <Txt muted>To'lov · {pay.text}</Txt>
            <Txt v="h1">{som(finalPrice + tip)}</Txt>
          </View>
          {d && <Txt v="h3" style={{ textAlign: 'center' }}>{d.name} bilan safar qanday o'tdi?</Txt>}
          <Row gap={6} style={{ justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable key={n} onPress={() => { haptic.tap(); setStars(n); }} hitSlop={6}>
                <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={40} color={n <= stars ? '#F5A524' : c.faint} />
              </Pressable>
            ))}
          </Row>
          {stars > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {(stars >= 4 ? RATING_TAGS : ['Kech keldi', 'Iflos mashina', 'Qo\'pol muomala', 'Xavfli haydash', 'Noto\'g\'ri yo\'l']).map(t => (
                <Chip key={t} label={t} active={tags.includes(t)} onPress={() => setTags(x => (x.includes(t) ? x.filter(y => y !== t) : [...x, t]))} />
              ))}
            </View>
          )}
          {stars >= 4 && (
            <View style={{ gap: 8 }}>
              <Txt v="small" muted style={{ textAlign: 'center' }}>Choy puli qoldirasizmi?</Txt>
              <Row gap={8} style={{ justifyContent: 'center' }}>
                {[0, 2000, 5000, 10000].map(v => <Chip key={v} label={v ? som(v) : "Yo'q"} active={tip === v} onPress={() => setTip(v)} />)}
              </Row>
            </View>
          )}
          <Button title={stars ? 'Yuborish' : "O'tkazib yuborish"} kind={stars ? 'brand' : 'ghost'} onPress={() => {
            finishRide(stars, tip);
            setStars(0); setTags([]); setTip(0);
            toast(stars ? 'Rahmat! Bahoyingiz qabul qilindi' : 'Safar yakunlandi', 'heart');
          }} />
        </View>
      </View>
    </Modal>
  );
}

/* ---------- Istaklar ---------- */
export function OptionsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors: c, order, toggleOption, setComment } = useStore();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.modalBg, { backgroundColor: c.overlay }]} onPress={onClose}>
        <Pressable style={[styles.modal, { backgroundColor: c.surface, paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
          <View style={[styles.grab, { backgroundColor: c.surface3 }]} />
          <Txt v="h2">Istaklar</Txt>
          <View style={{ gap: 4 }}>
            {RIDE_OPTIONS.map(o => {
              const on = order.options.includes(o.id);
              return (
                <Pressable key={o.id} onPress={() => { haptic.tap(); toggleOption(o.id); }} style={[styles.optRow, { backgroundColor: on ? c.brandSoft : 'transparent' }]}>
                  <Ionicons name={o.icon as IconName} size={22} color={c.text} />
                  <Txt v="h3" style={{ flex: 1 }}>{o.label}</Txt>
                  <View style={[styles.check, { borderColor: on ? c.brand : c.line, backgroundColor: on ? c.brand : 'transparent' }]}>
                    {on && <Ionicons name="checkmark" size={16} color={c.brandText} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Divider />
          <TextInput
            value={order.comment}
            onChangeText={setComment}
            placeholder="Haydovchiga izoh: masalan, 2-podyezd oldida"
            placeholderTextColor={c.faint}
            multiline
            style={[styles.input, { backgroundColor: c.surface2, color: c.text }]}
          />
          <Button title="Tayyor" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addr: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 },
  addrDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 4, marginLeft: 4 },
  whereTo: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 62, borderRadius: radius.l, paddingLeft: 18, paddingRight: 10 },
  arrowBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 52, borderRadius: 16, borderWidth: 1 },
  service: { flex: 1, alignItems: 'center', gap: 4, paddingTop: 8, paddingBottom: 10, borderRadius: 18 },
  serviceArt: { width: 64, height: 32 },
  tariff: { width: 124, padding: 12, paddingTop: 10, borderRadius: 20, borderWidth: 2, gap: 1 },
  tariffArt: { width: 96, height: 48, marginLeft: -6, marginBottom: 2 },
  eta: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, zIndex: 1 },
  surge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 14, borderRadius: 15 },
  pulse: { position: 'absolute', width: 56, height: 56, borderRadius: 28 },
  radar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  trackBar: { width: 120, height: 6, borderRadius: 3 },
  trackFill: { height: 6, borderRadius: 3 },
  driverCard: { padding: 12, borderRadius: 20 },
  plate: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#0E1525', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, backgroundColor: '#fff' },
  plateRegion: { fontSize: 12, fontFamily: F.heavy, color: '#0E1525' },
  plateSep: { width: 1.5, alignSelf: 'stretch', backgroundColor: '#0E1525', marginHorizontal: 5 },
  plateText: { fontSize: 12, fontFamily: F.heavy, letterSpacing: 0.6, color: '#0E1525' },
  plateUz: { fontSize: 6.5, fontFamily: F.heavy, color: '#2457F5', marginTop: 1 },
  action: { alignItems: 'center', gap: 6, minWidth: 64 },
  actionIco: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  confirm: { padding: 14, borderRadius: 18, gap: 4 },
  modalBg: { flex: 1, justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, gap: 14 },
  grab: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 4 },
  total: { alignItems: 'center', padding: 14, borderRadius: 20, gap: 2 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 14 },
  check: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 70, borderRadius: 16, padding: 14, fontSize: 15, textAlignVertical: 'top' },
});
