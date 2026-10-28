import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { toast } from '@/components/toast';
import { ActionSheet, Button, Card, Chip, Divider, Field, IOSSwitch, PersonAvatar, Row, Screen, Sheet, Txt } from '@/components/ui';
import { CarPicker } from '@/driver/components/car-picker';
import { DOC_KINDS } from '@/driver/lib/docs';
import { useDriver, type TariffState } from '@/driver/lib/driver-store';
import { CLASS_NAME, findCar } from '@/driver/lib/requirements';
import { TARIFF_ART } from '@/lib/cars';
import { TARIFFS } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { pickAvatar } from '@/lib/media';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

const go = (path: string) => router.push(path as never);
const CLASS_ART = { economy: 'start', comfort: 'comfort', business: 'business', minivan: 'minivan', cargo: 'delivery' } as const;

const DELIVERY_TERMS = [
  "Posilkani yo'lovchi ko'rsatgan manzilgacha ochmasdan yetkazaman",
  'Hujjat, oziq-ovqat va mayda yuklarni qabul qilaman (20 kg gacha)',
  "Taqiqlangan buyumlar (pul, qurol, dori-darmon) olinmaydi",
  "Topshirishda qabul qiluvchining kodini so'rayman",
];

export default function Profile() {
  const { colors: c } = useStore();
  const d = useDriver();
  const [sheet, setSheet] = useState<TariffState | null>(null);
  const [carSheet, setCarSheet] = useState(false);
  const [yearSheet, setYearSheet] = useState(false);
  const [pendingCar, setPendingCar] = useState('');
  const [year, setYear] = useState('');
  const [photoSheet, setPhotoSheet] = useState(false);
  const p = d.profile;
  if (!p) return null;
  const car = findCar(p.car);
  const approved = DOC_KINDS.filter(k => d.docs[k].status === 'approved').length;
  const active = d.tariffState.filter(t => t.enabled).map(t => TARIFFS.find(x => x.id === t.id)?.name);

  const toggle = (t: TariffState, on: boolean) => {
    if (!t.eligible) { setSheet(t); return; }
    d.setTariffEnabled(t.id, on);
  };
  const saveCar = () => {
    const y = +year;
    if (!(y >= 1995 && y <= new Date().getFullYear() + 1)) { toast("Yilni to'g'ri kiriting", 'alert-circle'); return; }
    d.updateCar(pendingCar || p.car, y);
    setYearSheet(false);
  };
  const pickPhoto = async (source: 'camera' | 'library') => {
    setPhotoSheet(false);
    const r = await pickAvatar(source);
    if (r.ok) { d.updateProfile({ photo: r.uri }); toast('Profil rasmi yangilandi', 'checkmark-circle'); }
    else if (r.reason === 'denied') toast('Kameraga ruxsat berilmadi', 'camera');
    else if (r.reason === 'error') toast("Rasmni yuklab bo'lmadi", 'alert-circle');
  };
  const editCar = () => { setPendingCar(p.car); setYear(p.year ? String(p.year) : ''); setCarSheet(true); };

  return (
    <Screen title="Avtomobil va tariflar">
      <Card style={{ alignItems: 'center', gap: 6, paddingVertical: 20 }}>
        <Pressable onPress={() => setPhotoSheet(true)} accessibilityLabel="Profil rasmini o'zgartirish">
          <PersonAvatar driver name={p.name} photo={p.photo} gender={p.gender} size={88} />
          <View style={[styles.cam, { backgroundColor: c.brand, borderColor: c.surface }]}><Ionicons name="camera" size={15} color={c.brandText} /></View>
        </Pressable>
        <Txt v="h2">{p.name}</Txt>
        <Txt v="small" muted>{p.phone} · {p.city} · YUMSda {fmtDate(p.joinedAt).split(',')[0]} dan</Txt>
        <Row gap={8} style={{ marginTop: 6 }}>
          <Chip label="Erkak" icon="male" active={p.gender === 'm'} onPress={() => d.updateProfile({ gender: 'm' })} />
          <Chip label="Ayol" icon="female" active={p.gender === 'f'} onPress={() => d.updateProfile({ gender: 'f' })} />
        </Row>
        {!p.gender && !p.photo ? <Txt v="tiny" color={c.warn}>Jinsingizni tanlang yoki rasm yuklang — profilda mos rasm chiqadi</Txt> : null}
      </Card>

      <Card style={{ gap: 12 }}>
        <Row>
          <Image source={TARIFF_ART[car ? CLASS_ART[car.cls] : 'start']} style={{ width: 100, height: 52 }} contentFit="contain" />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="h3">{p.car}</Txt>
            <Txt v="small" muted>{[car ? CLASS_NAME[car.cls] : 'Katalogda yo\'q', p.year ? `${p.year} yil` : 'yili ko\'rsatilmagan', p.color].join(' · ')}</Txt>
          </View>
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={[styles.plate, { borderColor: c.text }]}>
            <Text style={[styles.plateText, { color: c.text }]}>{p.plate}</Text>
            <View style={styles.uz}><Text style={styles.uzText}>UZ</Text></View>
          </View>
          <Pressable onPress={editCar} style={[styles.small, { backgroundColor: c.surface2 }]} accessibilityLabel="Avtomobilni o'zgartirish">
            <Ionicons name="create-outline" size={16} color={c.text} /><Txt v="small" style={{ fontFamily: F.bold }}>O&apos;zgartirish</Txt>
          </Pressable>
        </Row>
      </Card>

      <Pressable onPress={() => go('/documents')} accessibilityLabel="Hujjatlar">
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.docIcon, { backgroundColor: approved === DOC_KINDS.length ? c.okSoft : c.brandSoft }]}>
            <Ionicons name="document-text" size={20} color={approved === DOC_KINDS.length ? c.ok : c.brandDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="h3">Hujjatlar</Txt>
            <Txt v="small" muted>{approved} / {DOC_KINDS.length} tasdiqlangan</Txt>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.faint} />
        </Card>
      </Pressable>

      <Card style={{ gap: 4 }}>
        <Txt v="h3">Tariflar</Txt>
        <Txt v="small" muted style={{ marginBottom: 4 }}>{active.length ? `Faol: ${active.join(', ')}` : 'Faol tarif yo\'q — shartlarni bajaring'}</Txt>
        {d.tariffState.map((t, i) => {
          const info = TARIFFS.find(x => x.id === t.id)!;
          const left = t.checks.filter(x => !x.ok).length;
          return (
            <View key={t.id}>
              {i > 0 && <Divider />}
              <Pressable onPress={() => setSheet(t)} accessibilityLabel={`${info.name} tarifi shartlari`} style={[styles.tariff, !t.eligible && { opacity: 0.85 }]}>
                <Image source={TARIFF_ART[t.id]} style={[{ width: 56, height: 30 }, !t.eligible && { opacity: 0.45 }]} contentFit="contain" />
                <View style={{ flex: 1 }}>
                  <Row gap={6}>
                    <Txt v="h3">{info.name}</Txt>
                    {!t.eligible ? <Ionicons name="lock-closed" size={13} color={c.faint} /> : null}
                  </Row>
                  <Txt v="tiny" muted>{t.eligible ? info.desc : `${left} ta shart bajarilmagan · batafsil`}</Txt>
                </View>
                {t.eligible
                  ? <IOSSwitch value={t.enabled} onChange={v => toggle(t, v)} label={info.name} />
                  : <View style={[styles.lock, { backgroundColor: c.surface2 }]}><Txt v="tiny" muted style={{ fontFamily: F.bold }}>Yopiq</Txt></View>}
              </Pressable>
            </View>
          );
        })}
      </Card>

      <ActionSheet
        visible={photoSheet}
        onClose={() => setPhotoSheet(false)}
        header={<Txt v="small" muted style={{ textAlign: 'center' }}>Yo&apos;lovchilar sizni shu rasm orqali taniydi</Txt>}
        groups={[
          [
            { icon: 'camera', title: 'Kamerada suratga olish', onPress: () => pickPhoto('camera') },
            { icon: 'images', title: 'Galereyadan tanlash', onPress: () => pickPhoto('library') },
          ],
          p.photo ? [{ icon: 'trash', title: "Rasmni o'chirish", danger: true, onPress: () => { setPhotoSheet(false); d.updateProfile({ photo: undefined }); } }] : [],
        ]}
      />
      <TariffSheet t={sheet ? d.tariffState.find(x => x.id === sheet.id) ?? sheet : null} onClose={() => setSheet(null)}
        onFix={fix => {
          setSheet(null);
          if (fix === 'documents') go('/documents');
          if (fix === 'car') setTimeout(editCar, 350);
        }} />
      <CarPicker visible={carSheet} onClose={() => setCarSheet(false)} value={pendingCar} onPick={m => { setPendingCar(`${m.brand} ${m.model}`); setTimeout(() => setYearSheet(true), 350); }} />
      <Sheet visible={yearSheet} onClose={() => setYearSheet(false)} title="Ishlab chiqarilgan yili" footer={<Button title="Saqlash" icon="checkmark" onPress={saveCar} style={{ marginTop: 12 }} />}>
        <Txt v="small" muted>{pendingCar}</Txt>
        <Field placeholder="2021" keyboardType="number-pad" maxLength={4} value={year} onChangeText={v => setYear(v.replace(/\D/g, ''))} />
        {d.docs.techPassport.status !== 'missing' && pendingCar !== p.car ? <Txt v="tiny" color={c.warn}>Avtomobil almashsa, texnik pasport qayta tekshiriladi</Txt> : null}
      </Sheet>
    </Screen>
  );
}

/** Tarif shartlari: har biri bajarilgan / bajarilmagan va qanday bajarish */
function TariffSheet({ t, onClose, onFix }: { t: TariffState | null; onClose: () => void; onFix: (fix: 'documents' | 'car') => void }) {
  const { colors: c } = useStore();
  const d = useDriver();
  if (!t) return <Sheet visible={false} onClose={onClose}><View /></Sheet>;
  const info = TARIFFS.find(x => x.id === t.id)!;
  return (
    <Sheet visible onClose={onClose} title={`${info.name} tarifi`}>
      <Row>
        <Image source={TARIFF_ART[t.id]} style={{ width: 84, height: 44 }} contentFit="contain" />
        <View style={{ flex: 1 }}>
          <Txt v="small" muted>{info.desc}</Txt>
          <Txt v="small" color={t.eligible ? c.ok : c.warn} style={{ fontFamily: F.bold }}>{t.eligible ? 'Barcha shartlar bajarilgan' : 'Tarif yopiq — shartlarni bajaring'}</Txt>
        </View>
      </Row>
      {t.checks.map((ch, i) => (
        <View key={i} style={[styles.check, { backgroundColor: c.surface2 }]}>
          <Ionicons name={ch.ok ? 'checkmark-circle' : 'close-circle'} size={20} color={ch.ok ? c.ok : c.danger} />
          <View style={{ flex: 1 }}>
            <Txt v="small" style={{ fontFamily: F.bold }}>{ch.label}</Txt>
            {ch.now ? <Txt v="tiny" muted>Hozir: {ch.now}</Txt> : null}
          </View>
          {!ch.ok && (ch.fix === 'documents' || ch.fix === 'car') ? (
            <Pressable onPress={() => onFix(ch.fix as 'documents' | 'car')} style={[styles.fix, { backgroundColor: c.brand }]} accessibilityLabel="Bajarish">
              <Txt v="tiny" color={c.brandText} style={{ fontFamily: F.heavy }}>{ch.fix === 'documents' ? 'Yuklash' : "O'zgartirish"}</Txt>
            </Pressable>
          ) : null}
        </View>
      ))}
      {t.id === 'delivery' && !d.profile?.deliveryTerms ? (
        <View style={{ gap: 8 }}>
          <Txt v="small" muted style={{ fontFamily: F.bold }}>Yetkazish qoidalari</Txt>
          {DELIVERY_TERMS.map(x => <Row key={x} gap={8} style={{ alignItems: 'flex-start' }}><Text style={{ color: c.muted }}>•</Text><Txt v="small" muted style={{ flex: 1 }}>{x}</Txt></Row>)}
          <Button title="Qoidalarni qabul qilaman" icon="checkmark-done" onPress={() => { d.acceptDeliveryTerms(); toast('Yetkazish qoidalari qabul qilindi', 'checkmark-circle'); }} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cam: { position: 'absolute', right: -4, bottom: -4, width: 30, height: 30, borderRadius: 15, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  plate: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 2, borderRadius: 8, paddingLeft: 12, overflow: 'hidden' },
  plateText: { fontFamily: F.heavy, fontSize: 20, letterSpacing: 2, paddingVertical: 4, paddingRight: 10 },
  uz: { backgroundColor: '#1E88E5', alignSelf: 'stretch', justifyContent: 'center', paddingHorizontal: 6 },
  uzText: { color: '#fff', fontFamily: F.heavy, fontSize: 11 },
  small: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  docIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tariff: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  lock: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  fix: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
});
