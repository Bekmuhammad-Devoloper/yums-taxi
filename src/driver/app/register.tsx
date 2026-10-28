import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';

import { BrandMark, Button, Chip, DEFAULT_DRIVER, Field, Row, Screen, Txt } from '@/components/ui';
import { CarPicker } from '@/driver/components/car-picker';
import { useDriver } from '@/driver/lib/driver-store';
import { CLASS_NAME, findCar } from '@/driver/lib/requirements';
import { TARIFF_ART } from '@/lib/cars';
import { TARIFFS, type Gender } from '@/lib/data';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

const COLORS = ['Oq', 'Qora', 'Kumush', 'Kulrang', "Ko'k", 'Qizil', 'Sariq'];
const SWATCH: Record<string, string> = { Oq: '#F4F4F4', Qora: '#14161B', Kumush: '#C4C8CE', Kulrang: '#7B818B', "Ko'k": '#2457F5', Qizil: '#D93A3A', Sariq: '#FFC800' };
const CITIES = ['Toshkent', 'Samarqand', 'Buxoro', 'Andijon', "Farg'ona", 'Namangan'];

/** 01A123BC → "01 A 123 BC" */
const fmtPlate = (s: string) => {
  const r = s.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 8);
  const m = r.match(/^(\d{0,2})([A-Z]?)(\d{0,3})([A-Z]{0,2})/);
  return m ? [m[1], m[2], m[3], m[4]].filter(Boolean).join(' ') : r;
};
const fmtPhone = (s: string) => {
  const d = s.replace(/\D/g, '').replace(/^998/, '').slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
};

export default function Register() {
  const { colors: c } = useStore();
  const { register } = useDriver();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [car, setCar] = useState('');
  const [carSheet, setCarSheet] = useState(false);
  const [year, setYear] = useState('');
  const [color, setColor] = useState('Oq');
  const [plate, setPlate] = useState('');
  const [city, setCity] = useState('Toshkent');
  const [gender, setGender] = useState<Gender | null>(null);
  const [tried, setTried] = useState(false);

  const err = {
    phone: phone.replace(/\D/g, '').length !== 9 ? 'Telefon raqamini to\'liq kiriting' : '',
    name: name.trim().length < 3 ? 'Ism va familiyani kiriting' : '',
    gender: !gender ? 'Jinsingizni tanlang' : '',
    car: !findCar(car) ? 'Avtomobil modelini ro\'yxatdan tanlang' : '',
    year: !(+year >= 1995 && +year <= new Date().getFullYear() + 1) ? 'Masalan: 2021' : '',
    plate: !/^\d{2} [A-Z] \d{3} [A-Z]{2}$/.test(plate) ? 'Masalan: 01 A 123 BC' : '',
  };
  const ok = !Object.values(err).some(Boolean);
  const model = findCar(car);
  // shu sinfdagi avtomobil qaysi tariflarga mos kelishi mumkin (hujjat va reyting shartlaridan tashqari)
  const fits = model ? TARIFFS.filter(t => ({ economy: ['start', 'delivery'], comfort: ['start', 'comfort', 'delivery'], business: ['start', 'comfort', 'business', 'delivery'], minivan: ['start', 'minivan', 'delivery'], cargo: ['delivery'] })[model.cls].includes(t.id)) : [];

  const submit = () => {
    setTried(true);
    if (!ok) return;
    // tariflar oldindan yoqilgan bo'ladi, lekin har biri o'z shartlari bajarilgandagina ishlaydi
    register({ name: name.trim(), gender: gender ?? undefined, phone: '+998 ' + phone, car, year: +year, color, plate, city, tariffs: TARIFFS.map(t => t.id) });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title="Haydovchi bo'lish" subtitle="YUMS Driver · ro'yxatdan o'tish" back={false} footer={<Button title="Ro'yxatdan o'tish" icon="arrow-forward-circle" onPress={submit} />}>
        <View style={[styles.hero, { backgroundColor: '#0F1E3D' }]}>
          <Row gap={10}>
            <BrandMark size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>YUMS Driver</Text>
              <Txt v="small" color="rgba(255,255,255,0.7)">Buyurtmalar YUMS ilovasidagi yo'lovchilardan to'g'ridan-to'g'ri keladi</Txt>
            </View>
          </Row>
          <Row gap={8} style={{ marginTop: 14 }}>
            {['0% komissiya 1-oy', 'Kunlik to\'lov', 'Erkin grafik'].map(t => (
              <View key={t} style={styles.perk}><Txt v="tiny" color="#FFC800" style={{ fontFamily: F.bold }}>{t}</Txt></View>
            ))}
          </Row>
        </View>

        <Field label="Telefon" prefix="+998" keyboardType="phone-pad" placeholder="90 123 45 67" value={phone} onChangeText={v => setPhone(fmtPhone(v))} error={tried ? err.phone : ''} />
        <Field label="Ism va familiya" placeholder="Masalan: Jasur Karimov" value={name} onChangeText={setName} error={tried ? err.name : ''} />
        <View style={{ gap: 8 }}>
          <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>Jinsi</Txt>
          <Row gap={10}>
            {([['m', 'Erkak'], ['f', 'Ayol']] as const).map(([g, label]) => (
              <Pressable key={g} onPress={() => setGender(g)} accessibilityLabel={label}
                style={[styles.gender, { backgroundColor: gender === g ? c.brandSoft : c.surface2, borderColor: gender === g ? c.brand : tried && !gender ? c.danger : 'transparent' }]}>
                <Image source={DEFAULT_DRIVER[g]} style={styles.genderPic} contentFit="cover" />
                <Txt v="h3">{label}</Txt>
              </Pressable>
            ))}
          </Row>
          {tried && err.gender ? <Txt v="tiny" color={c.danger} style={{ marginLeft: 2 }}>{err.gender}</Txt> : <Txt v="tiny" faint style={{ marginLeft: 2 }}>Profil rasmi yuklanmaguncha shu rasm ko&apos;rinadi</Txt>}
        </View>
        <View style={{ gap: 6 }}>
          <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>Avtomobil</Txt>
          <Pressable onPress={() => setCarSheet(true)} accessibilityLabel="Avtomobilni tanlash"
            style={[styles.pick, { backgroundColor: c.surface2, borderColor: tried && err.car ? c.danger : c.line }]}>
            <Ionicons name="car-sport-outline" size={20} color={c.muted} />
            <Txt v="h3" color={car ? c.text : c.faint} style={{ flex: 1 }}>{car || 'Modelni tanlang'}</Txt>
            {model ? <Txt v="tiny" muted>{CLASS_NAME[model.cls]}</Txt> : null}
            <Ionicons name="chevron-down" size={18} color={c.faint} />
          </Pressable>
          {tried && err.car ? <Txt v="tiny" color={c.danger} style={{ marginLeft: 2 }}>{err.car}</Txt> : null}
        </View>
        <Field label="Ishlab chiqarilgan yili" placeholder="2021" keyboardType="number-pad" maxLength={4} value={year} onChangeText={v => setYear(v.replace(/\D/g, ''))} error={tried ? err.year : ''} />
        <View style={{ gap: 8 }}>
          <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>Rangi</Txt>
          <Row gap={10} style={{ flexWrap: 'wrap' }}>
            {COLORS.map(col => (
              <Pressable key={col} onPress={() => setColor(col)} accessibilityLabel={col} style={[styles.swatchWrap, { borderColor: color === col ? c.brand : 'transparent' }]}>
                <View style={[styles.swatch, { backgroundColor: SWATCH[col], borderColor: c.line }]} />
              </Pressable>
            ))}
          </Row>
          <Txt v="tiny" faint style={{ marginLeft: 2 }}>{color}</Txt>
        </View>
        <Field label="Davlat raqami" placeholder="01 A 123 BC" autoCapitalize="characters" value={plate} onChangeText={v => setPlate(fmtPlate(v))} error={tried ? err.plate : ''} inputStyle={{ fontFamily: F.heavy, letterSpacing: 1.5 }} />
        <View style={{ gap: 8 }}>
          <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>Shahar</Txt>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>{CITIES.map(x => <Chip key={x} label={x} active={city === x} onPress={() => setCity(x)} />)}</Row>
        </View>
        <View style={[styles.note, { backgroundColor: c.surface2 }]}>
          <Txt v="h3">Tariflar qanday ochiladi</Txt>
          <Txt v="small" muted style={{ lineHeight: 19 }}>Hujjatlaringiz tasdiqlangach tariflar avtomobil sinfi, yili, reyting va safarlar soniga qarab ochiladi.</Txt>
          {fits.length ? (
            <Row gap={8} style={{ flexWrap: 'wrap', marginTop: 4 }}>
              {fits.map(t => (
                <View key={t.id} style={[styles.fit, { backgroundColor: c.surface }]}>
                  <Image source={TARIFF_ART[t.id]} style={{ width: 34, height: 18 }} contentFit="contain" />
                  <Txt v="tiny" style={{ fontFamily: F.bold }}>{t.name}</Txt>
                </View>
              ))}
            </Row>
          ) : null}
        </View>
        <CarPicker visible={carSheet} onClose={() => setCarSheet(false)} value={car} onPick={m => setCar(`${m.brand} ${m.model}`)} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 22, padding: 18 },
  heroTitle: { fontFamily: F.brand, fontSize: 20, color: '#fff', marginBottom: 2 },
  perk: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: 'rgba(255,200,0,0.14)' },
  swatchWrap: { padding: 3, borderRadius: 99, borderWidth: 2 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1 },
  gender: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 16, borderWidth: 1.5 },
  genderPic: { width: 40, height: 40, borderRadius: 14 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  note: { gap: 6, padding: 14, borderRadius: 18 },
  fit: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
});
