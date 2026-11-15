import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';

import { LangButton } from '@/components/lang-picker';
import { toast } from '@/components/toast';
import { BrandMark, Button, Chip, DEFAULT_DRIVER, Field, Row, Screen, Txt } from '@/components/ui';
import { CarPicker } from '@/driver/components/car-picker';
import { useContractAcceptance } from '@/driver/lib/contract';
import { useDriver } from '@/driver/lib/driver-store';
import { CLASS_NAME, findCar } from '@/driver/lib/requirements';
import { TARIFF_ART } from '@/lib/cars';
import { errorText } from '@/lib/api';
import { TARIFFS, type Gender } from '@/lib/data';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr, tx } from '@/lib/i18n';

const HERO_BG = require('@/assets/menu/card-register.webp');

// rang nomi profilda o'zbekcha saqlanadi, ekranda tr() bilan
const COLORS = [tx('Oq'), tx('Qora'), tx('Kumush'), tx('Kulrang'), tx("Ko'k"), tx('Qizil'), tx('Sariq')];
const SWATCH: Record<string, string> = { Oq: '#F4F4F4', Qora: '#14161B', Kumush: '#C4C8CE', Kulrang: '#7B818B', "Ko'k": '#2457F5', Qizil: '#D93A3A', Sariq: '#FFC800' };
const CITIES = [tx('Toshkent'), tx('Samarqand'), tx('Buxoro'), tx('Andijon'), tx("Farg'ona"), tx('Namangan')];

/** 01A123BC → "01 A 123 BC" */
const fmtPlate = (s: string) => {
  const r = s.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 8);
  const m = r.match(/^(\d{0,2})([A-Z]?)(\d{0,3})([A-Z]{0,2})/);
  return m ? [m[1], m[2], m[3], m[4]].filter(Boolean).join(' ') : r;
};
export default function Register() {
  const { colors: c, user } = useStore();
  const { register } = useDriver();
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [car, setCar] = useState('');
  const [carSheet, setCarSheet] = useState(false);
  const [year, setYear] = useState('');
  const [color, setColor] = useState('Oq');
  const [plate, setPlate] = useState('');
  const [city, setCity] = useState('Toshkent');
  const [gender, setGender] = useState<Gender | null>(null);
  const [tried, setTried] = useState(false);
  // hamkorlik shartnomasiga rozilik — shartnoma sahifasida «Tanishdim va roziman» bilan beriladi
  const accepted = useContractAcceptance(user?.id ?? user?.phone);
  const openContract = () => router.push({ pathname: '/contract', params: { from: 'register' } } as never);

  const err = {
    name: name.trim().length < 3 ? tr('Ism va familiyani kiriting') : '',
    gender: !gender ? tr('Jinsingizni tanlang') : '',
    car: !findCar(car) ? tr("Avtomobil modelini ro'yxatdan tanlang") : '',
    year: !(+year >= 1995 && +year <= new Date().getFullYear() + 1) ? tr('Masalan: {example}', { example: 2021 }) : '',
    plate: !/^\d{2} [A-Z] \d{3} [A-Z]{2}$/.test(plate) ? tr('Masalan: {example}', { example: '01 A 123 BC' }) : '',
    contract: !accepted ? tr('Shartnoma bilan tanishib, rozilik bildiring') : '',
  };
  const ok = !Object.values(err).some(Boolean);
  const model = findCar(car);
  // shu sinfdagi avtomobil qaysi tariflarga mos kelishi mumkin (hujjat va reyting shartlaridan tashqari)
  const fits = model ? TARIFFS.filter(t => ({ economy: ['start', 'delivery'], comfort: ['start', 'comfort', 'delivery'], business: ['start', 'comfort', 'business', 'delivery'], minivan: ['start', 'minivan', 'delivery'], cargo: ['delivery'] })[model.cls].includes(t.id)) : [];

  const submit = async () => {
    setTried(true);
    if (!ok) return;
    setBusy(true);
    try {
      // server mashina sinfiga mos tariflarni oladi; har biri o'z shartlari bajarilgandagina ishlaydi
      await register({ name: name.trim(), gender: gender ?? undefined, phone: user?.phone ?? '', car, year: +year, color, plate, city, tariffs: TARIFFS.map(t => t.id) }, fits.map(t => t.id));
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={tr("Haydovchi bo'lish")} subtitle={tr("YUMS Driver · ro'yxatdan o'tish")} back={false} right={<LangButton />} footer={<Button title={tr("Ro'yxatdan o'tish")} icon="arrow-forward-circle" loading={busy} onPress={submit} />}>
        <LinearGradient colors={['#13254A', '#0B1530']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          {/* Fon: tungi shahar va o'ngda taksi. Ustidan chapdan va pastdan qorong'ilatish — matn har doim o'qiladi */}
          <Image source={HERO_BG} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" accessible={false} />
          <LinearGradient pointerEvents="none" colors={['rgba(8,14,32,0.94)', 'rgba(8,14,32,0.74)', 'rgba(8,14,32,0.3)']} locations={[0, 0.5, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          <LinearGradient pointerEvents="none" colors={['rgba(8,14,32,0)', 'rgba(8,14,32,0.78)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
          <Row gap={10}>
            <BrandMark size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.heroTitle}>YUMS Driver</Text>
              <Text style={styles.heroSub}>{tr("Buyurtmalar YUMS ilovasidagi yo'lovchilardan to'g'ridan-to'g'ri keladi")}</Text>
            </View>
          </Row>
          <View style={styles.heroRule} />
          {/* Teng ustunlar: ikonka, katta qiymat, ostida izoh. Faqat shartnomadagi faktlar */}
          <View style={styles.perks}>
            {([['pie-chart', tr("1 200 so'm"), tr('har buyurtmaga')], ['time', tr('Erkin grafik'), tr('xohlagan vaqtda ishlang')]] as const).map(([icon, big, small], i) => (
              <View key={icon} style={[styles.perk, i === 0 ? { paddingStart: 0 } : styles.perkSep]}>
                {/* ikonka qiymat yonida — karta past va ixcham bo'ladi */}
                <View style={styles.perkHead}>
                  <Ionicons name={icon} size={13} color="#FFC800" />
                  <Text style={styles.perkBig} numberOfLines={1}>{big}</Text>
                </View>
                <Text style={styles.perkSmall} numberOfLines={2}>{small}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <Field label={tr('Ism va familiya')} placeholder={tr('Masalan: Jasur Karimov')} value={name} onChangeText={setName} error={tried ? err.name : ''} />
        <View style={{ gap: 8 }}>
          <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>{tr('Jinsi')}</Txt>
          <Row gap={10}>
            {([['m', tr('Erkak')], ['f', tr('Ayol')]] as const).map(([g, label]) => (
              <Pressable key={g} onPress={() => setGender(g)} accessibilityLabel={label}
                style={[styles.gender, { backgroundColor: gender === g ? c.brandSoft : c.surface2, borderColor: gender === g ? c.brand : tried && !gender ? c.danger : 'transparent' }]}>
                <Image source={DEFAULT_DRIVER[g]} style={styles.genderPic} contentFit="cover" />
                <Txt v="h3">{label}</Txt>
              </Pressable>
            ))}
          </Row>
          {tried && err.gender ? <Txt v="tiny" color={c.danger} style={{ marginLeft: 2 }}>{err.gender}</Txt> : <Txt v="tiny" faint style={{ marginLeft: 2 }}>{tr("Profil rasmi yuklanmaguncha shu rasm ko'rinadi")}</Txt>}
        </View>
        <View style={{ gap: 6 }}>
          <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>{tr('Avtomobil')}</Txt>
          <Pressable onPress={() => setCarSheet(true)} accessibilityLabel={tr('Avtomobilni tanlash')}
            style={[styles.pick, { backgroundColor: c.surface2, borderColor: tried && err.car ? c.danger : c.line }]}>
            <Ionicons name="car-sport-outline" size={20} color={c.muted} />
            <Txt v="h3" color={car ? c.text : c.faint} style={{ flex: 1 }} numberOfLines={1}>{car || tr('Modelni tanlang')}</Txt>
            {model ? <View style={[styles.cls, { backgroundColor: c.surface }]}><Txt v="tiny" muted numberOfLines={1}>{tr(CLASS_NAME[model.cls])}</Txt></View> : null}
            <Ionicons name="chevron-down" size={18} color={c.faint} />
          </Pressable>
          {tried && err.car ? <Txt v="tiny" color={c.danger} style={{ marginLeft: 2 }}>{err.car}</Txt> : null}
        </View>
        <Field label={tr('Ishlab chiqarilgan yili')} placeholder="2021" keyboardType="number-pad" maxLength={4} value={year} onChangeText={v => setYear(v.replace(/\D/g, ''))} error={tried ? err.year : ''} />
        <View style={{ gap: 8 }}>
          <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>
            {tr('Rangi')} · <Txt v="small" style={{ fontFamily: F.bold }}>{tr(color)}</Txt>
          </Txt>
          {/* 7 ta rang bitta qatorda teng taqsimlanadi — oxirgisi alohida qatorga tushib qolmaydi */}
          <View style={styles.swatches}>
            {COLORS.map(col => (
              <Pressable key={col} onPress={() => setColor(col)} accessibilityLabel={tr(col)} accessibilityState={{ selected: color === col }} style={[styles.swatchWrap, { borderColor: color === col ? c.brand : 'transparent' }]}>
                <View style={[styles.swatch, { backgroundColor: SWATCH[col], borderColor: c.line }]}>
                  {color === col ? <Ionicons name="checkmark" size={16} color={col === 'Oq' || col === 'Sariq' || col === 'Kumush' ? '#0E1525' : '#fff'} /> : null}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
        <Field label={tr('Davlat raqami')} placeholder="01 A 123 BC" autoCapitalize="characters" value={plate} onChangeText={v => setPlate(fmtPlate(v))} error={tried ? err.plate : ''} inputStyle={{ fontFamily: F.heavy, letterSpacing: 1.5 }} />
        <View style={{ gap: 8 }}>
          <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>{tr('Shahar')}</Txt>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>{CITIES.map(x => <Chip key={x} label={tr(x)} active={city === x} onPress={() => setCity(x)} />)}</Row>
        </View>
        <View style={[styles.note, { backgroundColor: c.surface2 }]}>
          <Txt v="h3">{tr('Tariflar qanday ochiladi')}</Txt>
          <Txt v="small" muted style={{ lineHeight: 19 }}>{tr('Hujjatlaringiz tasdiqlangach tariflar avtomobil sinfi, yili, reyting va safarlar soniga qarab ochiladi.')}</Txt>
          {fits.length ? (
            <Row gap={8} style={{ flexWrap: 'wrap', marginTop: 4 }}>
              {fits.map(t => (
                <View key={t.id} style={[styles.fit, { backgroundColor: c.surface }]}>
                  <Image source={TARIFF_ART[t.id]} style={{ width: 34, height: 18 }} contentFit="contain" />
                  <Txt v="tiny" style={{ fontFamily: F.bold }}>{tr(t.name)}</Txt>
                </View>
              ))}
            </Row>
          ) : null}
        </View>
        <Pressable onPress={openContract} accessibilityRole="checkbox" accessibilityState={{ checked: !!accepted }}
          style={[styles.consent, { backgroundColor: accepted ? c.okSoft : c.surface2, borderColor: accepted ? 'transparent' : tried && err.contract ? c.danger : c.line }]}>
          <View style={[styles.box, { backgroundColor: accepted ? c.ok : 'transparent', borderColor: accepted ? c.ok : tried && err.contract ? c.danger : c.faint }]}>
            {accepted ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="h3" style={{ fontSize: 15 }}>{tr('Hamkorlik shartnomasi bilan tanishdim va roziman')}</Txt>
            <Txt v="small" muted style={{ lineHeight: 18 }}>{accepted ? tr("Rozilik bildirilgan · matnni qayta ko'rish") : tr("Komissiya, balans, bonuslar va majburiyatlar — o'qish uchun bosing")}</Txt>
          </View>
          <Ionicons name="document-text-outline" size={20} color={accepted ? c.ok : c.muted} />
        </Pressable>
        {tried && err.contract ? <Txt v="tiny" color={c.danger} style={{ marginTop: -8, marginLeft: 2 }}>{err.contract}</Txt> : null}
        <CarPicker visible={carSheet} onClose={() => setCarSheet(false)} value={car} onPick={m => setCar(`${m.brand} ${m.model}`)} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 13, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)' },
  heroTitle: { fontFamily: F.brand, fontSize: 17, color: '#fff' },
  heroSub: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 17, color: 'rgba(255,255,255,0.66)' },
  heroRule: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 11 },
  perks: { flexDirection: 'row' },
  perk: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 2, paddingHorizontal: 9 },
  perkSep: { borderStartWidth: StyleSheet.hairlineWidth, borderStartColor: 'rgba(255,255,255,0.12)' },
  perkHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  perkBig: { fontFamily: F.heavy, fontSize: 15, color: '#fff', letterSpacing: -0.2 },
  perkSmall: { fontFamily: F.medium, fontSize: 11, lineHeight: 14, color: 'rgba(255,255,255,0.58)' },
  swatches: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  swatchWrap: { padding: 3, borderRadius: 99, borderWidth: 2 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cls: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, maxWidth: 110 },
  gender: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 16, borderWidth: 1.5 },
  genderPic: { width: 40, height: 40, borderRadius: 14 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  note: { gap: 6, padding: 14, borderRadius: 18 },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1 },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  fit: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
});
