import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ImageSlot } from '@/components/image-slot';
import { PickerSheet, SectorGlyph, SelectField } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Button, Card, Chip, Field, Flag, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { COUNTRIES, MARKET_KINDS, SECTORS, type MarketKind } from '@/lib/platform-data';
import { countryOf, flagged, sectorOf, usePlatform } from '@/lib/platform';
import { SECTOR_ART } from '@/lib/sector-art';
import { haptic, useStore } from '@/lib/store';
import { tr } from '@/lib/i18n';

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
  const [image, setImage] = useState<string>();
  const [picker, setPicker] = useState<'sector' | 'country' | null>(null);
  const [tried, setTried] = useState(false);

  const priceNum = Number(price.replace(',', '.'));
  const errors = {
    title: title.trim().length < 4 ? tr('Nomini kiriting') : undefined,
    price: !(priceNum > 0) ? tr("Narxni to'g'ri kiriting") : undefined,
    desc: desc.trim().length < 20 ? tr('Kamida 20 belgi') : undefined,
  };
  const banned = flagged(title, desc);

  const submit = () => {
    setTried(true);
    if (Object.values(errors).some(Boolean)) { toast(tr("Maydonlarni to'ldiring"), 'alert-circle'); return; }
    const id = p.addMarketItem({
      title: title.trim(), kind, price: priceNum, unit: unit.trim() || undefined, desc: desc.trim(), delivery: delivery.trim() || undefined,
      minOrder: minOrder.trim() || undefined, sector, country, image,
    });
    haptic.success();
    toast(tr("E'lon moderatsiyaga yuborildi"), 'hourglass');
    router.replace({ pathname: '/market/[id]', params: { id } });
  };

  const k = countryOf(country);
  const sec = sectorOf(sector);

  return (
    <Screen title={tr("Yangi e'lon")} subtitle="YUMS Market" footer={<Button title={tr('Moderatsiyaga yuborish')} icon="send" onPress={submit} />}>
      <SectionTitle>{tr('Turi')}</SectionTitle>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {MARKET_KINDS.map(m => <Chip key={m.id} label={m.name} icon={m.icon} active={kind === m.id} onPress={() => setKind(m.id)} />)}
      </Row>

      <Card style={{ gap: 14 }}>
        <Field label={tr('Nomi')} value={title} onChangeText={setTitle} maxLength={80} placeholder={tr("Masalan: Quritilgan o'rik")} error={tried ? errors.title : undefined} />
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <Field label={tr('Narx (USD)')} prefix="$" value={price} onChangeText={v => setPrice(v.replace(/[^\d.,]/g, ''))} keyboardType="decimal-pad" placeholder="0" style={{ flex: 1 }} error={tried ? errors.price : undefined} />
          <Field label={tr('Birlik')} value={unit} onChangeText={setUnit} placeholder={kind === 'service' ? tr('soat') : tr('dona')} style={{ flex: 1 }} />
        </Row>
        <Field label={tr('Tavsif')} value={desc} onChangeText={setDesc} multiline placeholder={tr('Sifat, sertifikatlar, shartlar…')} error={tried ? errors.desc : undefined} inputStyle={{ minHeight: 100 }} />
        <SelectField label={tr('Soha')} value={sec.name} placeholder={tr('Soha')} left={<SectorGlyph id={sec.id} size={24} />} onPress={() => setPicker('sector')} />
        <SelectField label={tr('Mamlakat')} value={k.name} left={<Flag code={k.code} size={22} />} placeholder={tr('Mamlakat')} onPress={() => setPicker('country')} />
        {kind === 'goods' && (
          <>
            <Field label={tr('Yetkazib berish')} value={delivery} onChangeText={setDelivery} placeholder={tr('Masalan: DHL, 5–9 kun')} />
            <Field label={tr('Minimal buyurtma')} value={minOrder} onChangeText={setMinOrder} placeholder={tr('Masalan: 100 kg')} />
          </>
        )}
      </Card>

      <Card>
        <ImageSlot kind="product" label={tr('Mahsulot rasmi')} value={image} onChange={setImage} />
        <Txt v="tiny" faint>{tr("Rasm bo'lmasa, e'lon soha belgisi bilan ko'rsatiladi.")}</Txt>
      </Card>

      <View style={[styles.note, { backgroundColor: banned.length ? c.dangerSoft : c.surface2 }]}>
        <Ionicons name={banned.length ? 'warning' : 'information-circle-outline'} size={18} color={banned.length ? c.danger : c.muted} />
        <Txt v="small" color={banned.length ? c.danger : c.muted} style={{ flex: 1, lineHeight: 19 }}>
          {banned.length
            ? tr("«{banned}» — taqiqlangan toifaga kirishi mumkin. E'lon qo'lda tekshiriladi.", { banned: banned.join('», «') })
            : tr("Qurol, giyohvand moddalar, qalbaki tovarlar, litsenziyasiz moliyaviy xizmatlar va boshqa taqiqlangan e'lonlar joylashtirilmaydi.")}
        </Txt>
      </View>

      <PickerSheet visible={picker === 'sector'} onClose={() => setPicker(null)} title={tr('Soha')} selected={[sector]} onChange={ids => setSector(ids[0])}
        options={SECTORS.map(s => ({ id: s.id, label: s.name, icon: s.icon, art: SECTOR_ART[s.id] }))} />
      <PickerSheet visible={picker === 'country'} onClose={() => setPicker(null)} title={tr('Mamlakat')} selected={[country]} onChange={ids => setCountry(ids[0])}
        options={COUNTRIES.map(x => ({ id: x.code, label: x.name, flag: x.code }))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
});
