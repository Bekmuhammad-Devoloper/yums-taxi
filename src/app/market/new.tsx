import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PickerSheet, SelectField } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Button, Card, Chip, Field, Flag, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { COUNTRIES, MARKET_KINDS, SECTORS, type MarketKind } from '@/lib/platform-data';
import { countryOf, flagged, sectorOf, usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';

const EMOJIS = ['📦', '🛠️', '💻', '📊', '🎨', '🌐', '⚖️', '🍑', '🧵', '☀️', '🚚', '📚', '🩺', '🏗️', '🌾', '🎓'];

export default function NewMarketItem() {
  const { colors: c, user } = useStore();
  const p = usePlatform();
  const [kind, setKind] = useState<MarketKind>('goods');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('');
  const [desc, setDesc] = useState('');
  const [delivery, setDelivery] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [sector, setSector] = useState('ecommerce');
  const [country, setCountry] = useState(user?.country ?? 'UZ');
  const [emoji, setEmoji] = useState('📦');
  const [picker, setPicker] = useState<'sector' | 'country' | null>(null);
  const [tried, setTried] = useState(false);

  const priceNum = Number(price.replace(',', '.'));
  const errors = {
    title: title.trim().length < 4 ? 'Nomini kiriting' : undefined,
    price: !(priceNum > 0) ? "Narxni to'g'ri kiriting" : undefined,
    desc: desc.trim().length < 20 ? 'Kamida 20 belgi' : undefined,
  };
  const banned = flagged(title, desc);

  const submit = () => {
    setTried(true);
    if (Object.values(errors).some(Boolean)) { toast("Maydonlarni to'ldiring", 'alert-circle'); return; }
    const id = p.addMarketItem({
      title: title.trim(), kind, price: priceNum, unit: unit.trim() || undefined, desc: desc.trim(), delivery: delivery.trim() || undefined,
      minOrder: minOrder.trim() || undefined, sector, country, emoji,
    });
    haptic.success();
    toast("E'lon moderatsiyaga yuborildi", 'hourglass');
    router.replace({ pathname: '/market/[id]', params: { id } });
  };

  const k = countryOf(country);
  const sec = sectorOf(sector);

  return (
    <Screen title="Yangi e'lon" subtitle="YUMS Market" footer={<Button title="Moderatsiyaga yuborish" icon="send" onPress={submit} />}>
      <SectionTitle>Turi</SectionTitle>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {MARKET_KINDS.map(m => <Chip key={m.id} label={m.name} icon={m.icon} active={kind === m.id} onPress={() => setKind(m.id)} />)}
      </Row>

      <Card style={{ gap: 14 }}>
        <Field label="Nomi" value={title} onChangeText={setTitle} maxLength={80} placeholder="Masalan: Quritilgan o'rik" error={tried ? errors.title : undefined} />
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <Field label="Narx (USD)" prefix="$" value={price} onChangeText={v => setPrice(v.replace(/[^\d.,]/g, ''))} keyboardType="decimal-pad" placeholder="0" style={{ flex: 1 }} error={tried ? errors.price : undefined} />
          <Field label="Birlik" value={unit} onChangeText={setUnit} placeholder={kind === 'service' ? 'soat' : 'dona'} style={{ flex: 1 }} />
        </Row>
        <Field label="Tavsif" value={desc} onChangeText={setDesc} multiline placeholder="Sifat, sertifikatlar, shartlar…" error={tried ? errors.desc : undefined} inputStyle={{ minHeight: 100 }} />
        <SelectField label="Soha" value={sec.name} placeholder="Soha" icon={sec.icon} onPress={() => setPicker('sector')} />
        <SelectField label="Mamlakat" value={k.name} left={<Flag code={k.code} emoji={k.flag} size={22} />} placeholder="Mamlakat" onPress={() => setPicker('country')} />
        {kind === 'goods' && (
          <>
            <Field label="Yetkazib berish" value={delivery} onChangeText={setDelivery} placeholder="Masalan: DHL, 5–9 kun" />
            <Field label="Minimal buyurtma" value={minOrder} onChangeText={setMinOrder} placeholder="Masalan: 100 kg" />
          </>
        )}
      </Card>

      <SectionTitle>Rasm belgisi</SectionTitle>
      <View style={styles.emojis}>
        {EMOJIS.map(e => (
          <Pressable key={e} onPress={() => { haptic.tap(); setEmoji(e); }} style={[styles.emoji, { backgroundColor: emoji === e ? c.brandSoft : c.surface, borderColor: emoji === e ? c.brand : c.line }]}>
            <Text style={{ fontSize: 26 }}>{e}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.note, { backgroundColor: banned.length ? c.dangerSoft : c.surface2 }]}>
        <Ionicons name={banned.length ? 'warning' : 'information-circle-outline'} size={18} color={banned.length ? c.danger : c.muted} />
        <Txt v="small" color={banned.length ? c.danger : c.muted} style={{ flex: 1, lineHeight: 19 }}>
          {banned.length
            ? `«${banned.join('», «')}» — taqiqlangan toifaga kirishi mumkin. E'lon qo'lda tekshiriladi.`
            : "Qurol, giyohvand moddalar, qalbaki tovarlar, litsenziyasiz moliyaviy xizmatlar va boshqa taqiqlangan e'lonlar joylashtirilmaydi."}
        </Txt>
      </View>

      <PickerSheet visible={picker === 'sector'} onClose={() => setPicker(null)} title="Soha" selected={[sector]} onChange={ids => setSector(ids[0])}
        options={SECTORS.map(s => ({ id: s.id, label: s.name, icon: s.icon }))} />
      <PickerSheet visible={picker === 'country'} onClose={() => setPicker(null)} title="Mamlakat" selected={[country]} onChange={ids => setCountry(ids[0])}
        options={COUNTRIES.map(x => ({ id: x.code, label: x.name, emoji: x.flag }))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emoji: { width: 54, height: 54, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
});
