import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandMark, Button, Chip, Field, Row, Screen, Txt } from '@/components/ui';
import { useDriver } from '@/driver/lib/driver-store';
import { TARIFF_ART } from '@/lib/cars';
import { TARIFFS } from '@/lib/data';
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
  const [color, setColor] = useState('Oq');
  const [plate, setPlate] = useState('');
  const [city, setCity] = useState('Toshkent');
  const [tariffs, setTariffs] = useState<string[]>(['start']);
  const [tried, setTried] = useState(false);

  const err = {
    phone: phone.replace(/\D/g, '').length !== 9 ? 'Telefon raqamini to\'liq kiriting' : '',
    name: name.trim().length < 3 ? 'Ism va familiyani kiriting' : '',
    car: car.trim().length < 2 ? 'Mashina modelini kiriting' : '',
    plate: !/^\d{2} [A-Z] \d{3} [A-Z]{2}$/.test(plate) ? 'Masalan: 01 A 123 BC' : '',
  };
  const ok = !Object.values(err).some(Boolean) && tariffs.length > 0;

  const submit = () => {
    setTried(true);
    if (!ok) return;
    register({ name: name.trim(), phone: '+998 ' + phone, car: car.trim(), color, plate, city, tariffs });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title="Haydovchi bo'lish" subtitle="YUMS Driver · ro'yxatdan o'tish" back={false} footer={<Button title="Liniyaga chiqishga tayyorman" icon="car-sport" onPress={submit} />}>
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
        <Field label="Mashina" placeholder="Chevrolet Cobalt" value={car} onChangeText={setCar} error={tried ? err.car : ''} />
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
        <View style={{ gap: 8 }}>
          <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>Qaysi tariflarda ishlaysiz</Txt>
          <View style={styles.grid}>
            {TARIFFS.map(t => {
              const on = tariffs.includes(t.id);
              return (
                <Pressable key={t.id} onPress={() => setTariffs(ts => (on ? ts.filter(x => x !== t.id) : [...ts, t.id]))}
                  style={[styles.tariff, { backgroundColor: on ? c.brandSoft : c.surface, borderColor: on ? c.brand : c.line }]}>
                  <Image source={TARIFF_ART[t.id]} style={{ width: '100%', height: 44 }} contentFit="contain" />
                  <Txt v="small" style={{ fontFamily: F.bold }}>{t.name}</Txt>
                </Pressable>
              );
            })}
          </View>
          {tried && !tariffs.length ? <Txt v="tiny" color={c.danger}>Kamida bitta tarifni tanlang</Txt> : null}
        </View>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tariff: { width: '31%', flexGrow: 1, alignItems: 'center', gap: 4, padding: 10, borderRadius: 16, borderWidth: 1.5 },
});
