import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ImageSlot } from '@/components/image-slot';
import { KindTiles, OptionRow, SectorStrip } from '@/components/listing-ui';
import { PickerSheet, SelectField } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Button, Card, Field, Flag, Screen, SectionTitle, Txt } from '@/components/ui';
import { marketForm } from '@/lib/market-forms';
import { COUNTRIES, MARKET_KINDS, type MarketKind } from '@/lib/platform-data';
import { countryOf, flagged, usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr } from '@/lib/i18n';

/** Turga xos maydonlar: har bir tur o'z qiymatlarini saqlaydi — tur almashtirilsa, kiritilgani yo'qolmaydi */
type Extra = { unit: string; delivery: string; minOrder: string };
const startExtra = (kind: MarketKind): Extra => {
  const f = marketForm(kind);
  return { unit: f.unit.initial, delivery: f.delivery.initial ?? '', minOrder: f.minOrder.initial ?? '' };
};

export default function NewMarketItem() {
  const { colors: c, user } = useStore();
  const p = usePlatform();
  const params = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<MarketKind>(() => MARKET_KINDS.find(m => m.id === params.kind)?.id ?? 'goods');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [extras, setExtras] = useState<Record<MarketKind, Extra>>(() => ({ goods: startExtra('goods'), digital: startExtra('digital'), service: startExtra('service') }));
  const [sector, setSector] = useState('ecommerce');
  const [country, setCountry] = useState(user?.country ?? 'UZ');
  const [image, setImage] = useState<string>();
  const [picker, setPicker] = useState<'country' | null>(null);
  const [tried, setTried] = useState(false);

  const form = marketForm(kind);
  const extra = extras[kind];
  const setExtra = (patch: Partial<Extra>) => setExtras(x => ({ ...x, [kind]: { ...x[kind], ...patch } }));

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
    p.addMarketItem({
      title: title.trim(), kind, price: priceNum, unit: extra.unit || undefined, desc: desc.trim(), delivery: extra.delivery.trim() || undefined,
      minOrder: extra.minOrder.trim() || undefined, sector, country, image,
    }).then(id => {
      if (!id) return;
      haptic.success();
      const live = p.myMarket.find(m => m.id === id)?.status === 'published' || !banned.length;
      toast(live ? tr("E'lon katalogda e'lon qilindi") : tr("Yuborildi — moderator qo'lda tekshiradi"), live ? 'checkmark-circle' : 'hourglass');
      router.replace({ pathname: '/market/[id]', params: { id } });
    });
  };

  const k = countryOf(country);
  // tanlov yoki matn maydoni — turga qarab
  const slot = (s: typeof form.delivery, value: string, onChange: (v: string) => void) => (
    <View style={{ gap: 8 }}>
      <View style={styles.slotHead}>
        <Ionicons name={s.icon} size={16} color={c.muted} />
        <Txt v="small" muted style={{ fontFamily: F.bold }}>{s.label}</Txt>
      </View>
      {s.choices
        ? <OptionRow choices={s.choices} value={value} onChange={onChange} />
        : <Field value={value} onChangeText={onChange} placeholder={s.hint} maxLength={s === form.minOrder ? 60 : 120} />}
    </View>
  );

  return (
    <Screen title={tr("Yangi e'lon")} subtitle="YUMS Market" footer={<Button title={tr('Moderatsiyaga yuborish')} icon="send" onPress={submit} />}>
      <SectionTitle>{tr('Turi')}</SectionTitle>
      <KindTiles value={kind} onChange={setKind} />

      <SectionTitle>{tr('Soha')}</SectionTitle>
      <SectorStrip value={sector} onChange={setSector} />

      <SectionTitle>{tr("Asosiy ma'lumot")}</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Field label={tr('Nomi')} value={title} onChangeText={setTitle} maxLength={80} placeholder={form.titleHint} error={tried ? errors.title : undefined} />
        <Field label={form.priceLabel} prefix="$" value={price} onChangeText={v => setPrice(v.replace(/[^\d.,]/g, ''))} keyboardType="decimal-pad" placeholder="0" error={tried ? errors.price : undefined} />
        <View style={{ gap: 8 }}>
          <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>{form.unit.label}</Txt>
          <OptionRow choices={form.unit.choices} value={extra.unit} onChange={v => setExtra({ unit: v })} />
        </View>
        <Field label={tr('Tavsif')} value={desc} onChangeText={setDesc} multiline placeholder={form.descHint} error={tried ? errors.desc : undefined} inputStyle={{ minHeight: 100 }} />
      </Card>

      <SectionTitle>{form.section}</SectionTitle>
      <Card style={{ gap: 16 }}>
        {kind === 'digital' ? (
          <>
            {slot(form.minOrder, extra.minOrder, v => setExtra({ minOrder: v }))}
            {slot(form.delivery, extra.delivery, v => setExtra({ delivery: v }))}
          </>
        ) : (
          <>
            {slot(form.delivery, extra.delivery, v => setExtra({ delivery: v }))}
            {slot(form.minOrder, extra.minOrder, v => setExtra({ minOrder: v }))}
          </>
        )}
        <SelectField label={kind === 'goods' ? tr("Qayerdan jo'natiladi") : tr('Mamlakat')} value={k.name} left={<Flag code={k.code} size={22} />} placeholder={tr('Mamlakat')} onPress={() => setPicker('country')} />
      </Card>

      <Card>
        <ImageSlot kind="product" label={form.imageLabel} value={image} onChange={setImage} />
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

      <PickerSheet visible={picker === 'country'} onClose={() => setPicker(null)} title={tr('Mamlakat')} selected={[country]} onChange={ids => setCountry(ids[0])}
        options={COUNTRIES.map(x => ({ id: x.code, label: x.name, flag: x.code }))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  slotHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 2 },
});
