// Professional xizmat sahifasi: har bir xizmat o'z rangi, 3D belgisi, «nima olasiz» ro'yxati va o'z buyurtma
// formasi bilan. Buyurtma barcha tafsilotlari bilan operatorga murojaat bo'lib boradi; javob shu chatda keladi.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HowItWorks, OptionRow } from '@/components/listing-ui';
import { toast } from '@/components/toast';
import { Button, Card, Chip, EmptyState, Field, Screen, SectionTitle, Txt, alpha } from '@/components/ui';
import { errorText } from '@/lib/api';
import { tr, tx } from '@/lib/i18n';
import type { Choice } from '@/lib/market-forms';
import { usePlatform } from '@/lib/platform';
import { PRO_SERVICES } from '@/lib/platform-data';
import { SERVICE_LOOK } from '@/lib/service-look';
import { haptic } from '@/lib/store';
import { openTicket } from '@/lib/support-api';
import { F, radius } from '@/lib/theme';

const GETS: Record<string, string[]> = {
  analysis: [tx("Bozor hajmi va o'sish sur'ati"), tx('Raqobatchilar xaritasi'), tx('3 yillik moliyaviy model'), tx('Kuchli va zaif tomonlar, tavsiyalar')],
  design: [tx('Investorlar uchun tuzilgan 10–20 slayd'), tx('Brendingizga mos dizayn'), tx('PDF va tahrirlanadigan fayl'), tx('2 marta tuzatish')],
  translate: [tx('Ona tili egasining tahriri'), tx('Atamalar bir xil saqlanadi'), tx('Asl formatda topshiriladi')],
  docs: [tx("O'zbekiston qonunchiligiga mos shablon"), tx("Ma'lumotlaringiz bilan to'ldiriladi"), tx('Yurist tekshiruvi'), tx('Word va PDF')],
};

const LANGS = [tx("O'zbek"), tx('Rus'), tx('Ingliz'), tx('Turk'), tx('Arab'), tx('Xitoy'), tx('Nemis')];
const WORD_USD = 0.06;
const MIN_TRANSLATE_USD = 10;

const opts = (values: string[]): Choice[] => values.map(v => ({ value: v, label: tr(v) }));
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);

export default function ServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePlatform();
  const service = PRO_SERVICES.find(s => s.id === id);
  const look = SERVICE_LOOK[id ?? ''] ?? { color: '#2457F5' };
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  // Loyiha tahlili
  const [project, setProject] = useState<string>(p.myProjects[0]?.title ?? '');
  const [focus, setFocus] = useState<string[]>([tx('Bozor'), tx('Raqobatchilar'), tx('Moliyaviy model')]);
  const [speed, setSpeed] = useState<string>(tx('Standart · 7 kun'));
  // Taqdimot dizayni
  const [slides, setSlides] = useState('15');
  const [style, setStyle] = useState<string>(tx('Korporativ'));
  const [deckLangs, setDeckLangs] = useState<string[]>([tx('Ingliz')]);
  const [start, setStart] = useState<string>(tx('Noldan'));
  // Tarjima
  const [from, setFrom] = useState<string>(tx("O'zbek"));
  const [to, setTo] = useState<string[]>([tx('Ingliz')]);
  const [words, setWords] = useState('');
  const [textKind, setTextKind] = useState<string>(tx('Loyiha sahifasi'));
  // Hujjat tayyorlash
  const [docType, setDocType] = useState<string>(tx('Shartnoma'));
  const [party, setParty] = useState<string>(tx('Kompaniya'));
  const [docLangs, setDocLangs] = useState<string[]>([tx("O'zbek")]);

  if (!service) return <Screen title={tr('Xizmat')}><EmptyState icon="construct-outline" title={tr('Xizmat topilmadi')} /></Screen>;

  const wordCount = Number(words.replace(/\D/g, '')) || 0;
  const targets = to.filter(x => x !== from);
  const translateUsd = Math.max(MIN_TRANSLATE_USD, Math.ceil(wordCount * WORD_USD * Math.max(1, targets.length)));

  // buyurtma matni: operator bir qarashda tushunadigan qatorlar
  const lines: [string, string][] =
    id === 'analysis' ? [[tr('Loyiha'), project.trim()], [tr("E'tibor"), focus.map(f => tr(f)).join(', ')], [tr('Muddat'), tr(speed)]]
    : id === 'design' ? [[tr('Slaydlar'), slides], [tr('Uslub'), tr(style)], [tr('Tillar'), deckLangs.map(l => tr(l)).join(', ')], [tr('Boshlanish'), tr(start)]]
    : id === 'translate' ? [[tr('Qaysi tildan'), tr(from)], [tr('Qaysi tillarga'), targets.map(l => tr(l)).join(', ')], [tr("So'zlar soni"), String(wordCount)], [tr('Matn turi'), tr(textKind)], [tr('Taxminiy narx'), `$${translateUsd}`]]
    : [[tr('Hujjat turi'), tr(docType)], [tr('Tomon'), tr(party)], [tr('Tillar'), docLangs.map(l => tr(l)).join(', ')]];

  const valid =
    id === 'analysis' ? project.trim().length >= 3 && focus.length > 0
    : id === 'design' ? deckLangs.length > 0
    : id === 'translate' ? wordCount > 0 && targets.length > 0
    : docLangs.length > 0;

  const order = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const body = [
        tr('«{title}» buyurtmasi', { title: service.title }),
        ...lines.map(([k, v]) => `${k}: ${v}`),
        note.trim() ? `${tr('Izoh')}: ${note.trim()}` : '',
        `${tr('Narx')}: ${id === 'translate' ? `$${translateUsd}` : service.price}`,
      ].filter(Boolean).join('\n');
      const ticket = await openTicket(service.title.slice(0, 120), body.slice(0, 2000));
      haptic.success();
      toast(tr("Buyurtma yuborildi — menejer tez orada yozadi"), 'checkmark-circle');
      router.replace({ pathname: '/support-chat', params: { ticket: ticket.id } });
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    } finally {
      setBusy(false);
    }
  };

  const block = (label: string, child: ReactNode) => (
    <View style={{ gap: 8 }}>
      <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>{label}</Txt>
      {child}
    </View>
  );
  const chips = (values: string[], on: (v: string) => boolean, press: (v: string) => void) => (
    <View style={styles.wrap}>{values.map(v => <Chip key={v} label={tr(v)} active={on(v)} onPress={() => press(v)} />)}</View>
  );

  return (
    <Screen
      title={service.title}
      subtitle={tr('Professional xizmat')}
      footer={<Button title={id === 'translate' ? tr('Buyurtma berish · ${sum}', { sum: translateUsd }) : tr('Buyurtma berish')} icon="send" loading={busy} disabled={!valid} onPress={() => { order().catch(() => {}); }} />}>
      <LinearGradient colors={[look.color, alpha(look.color, 0.78)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.glow} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={styles.price}><Text style={styles.priceText}>{service.price}</Text></View>
          <Text style={styles.heroTitle}>{service.title}</Text>
          <Text style={styles.heroDesc}>{service.desc}</Text>
        </View>
        {look.art ? <Image source={look.art} style={styles.heroArt} contentFit="contain" /> : <Ionicons name={service.icon} size={64} color="#FFFFFF" />}
      </LinearGradient>

      <Card style={{ gap: 10 }}>
        <Txt v="h3">{tr('Nima olasiz')}</Txt>
        {(GETS[service.id] ?? []).map(g => (
          <View key={g} style={styles.get}>
            <View style={[styles.getIco, { backgroundColor: alpha(look.color, 0.14) }]}><Ionicons name="checkmark" size={14} color={look.color} /></View>
            <Txt v="small" style={{ flex: 1, fontFamily: F.semi, lineHeight: 19 }}>{tr(g)}</Txt>
          </View>
        ))}
      </Card>

      <SectionTitle>{tr('Buyurtma tafsilotlari')}</SectionTitle>
      <Card style={{ gap: 16 }}>
        {id === 'analysis' && (
          <>
            {block(tr('Qaysi loyiha'), p.myProjects.length
              ? chips(p.myProjects.map(x => x.title), v => v === project, setProject)
              : <Field value={project} onChangeText={setProject} placeholder={tr("Loyiha nomi yoki g'oyangiz")} />)}
            {block(tr("Nimalarga e'tibor beramiz"), chips([tx('Bozor'), tx('Raqobatchilar'), tx('Moliyaviy model'), tx('Biznes-model'), tx('Xatarlar')], v => focus.includes(v), v => setFocus(x => toggle(x, v))))}
            {block(tr('Muddat'), <OptionRow choices={opts([tx('Standart · 7 kun'), tx('Tezkor · 3 kun')])} value={speed} onChange={setSpeed} />)}
          </>
        )}
        {id === 'design' && (
          <>
            {block(tr('Slaydlar soni'), <OptionRow choices={[{ value: '10', label: '10' }, { value: '15', label: '15' }, { value: '20', label: '20' }]} value={slides} onChange={setSlides} />)}
            {block(tr('Uslub'), <OptionRow choices={opts([tx('Minimal'), tx('Korporativ'), tx('Yorqin')])} value={style} onChange={setStyle} />)}
            {block(tr('Taqdimot tillari'), chips(LANGS.slice(0, 4), v => deckLangs.includes(v), v => setDeckLangs(x => toggle(x, v))))}
            {block(tr('Hozirgi taqdimot'), <OptionRow choices={opts([tx('Noldan'), tx('Borini yangilash')])} value={start} onChange={setStart} />)}
          </>
        )}
        {id === 'translate' && (
          <>
            {block(tr('Qaysi tildan'), chips(LANGS.slice(0, 4), v => v === from, setFrom))}
            {block(tr('Qaysi tillarga'), chips(LANGS.filter(l => l !== from), v => to.includes(v), v => setTo(x => toggle(x, v))))}
            <Field label={tr("So'zlar soni")} value={words} onChangeText={v => setWords(v.replace(/\D/g, '').slice(0, 7))} keyboardType="number-pad" placeholder="1500" />
            {block(tr('Matn turi'), <OptionRow choices={opts([tx('Loyiha sahifasi'), tx('Hujjat'), tx('Taqdimot')])} value={textKind} onChange={setTextKind} />)}
            <View style={[styles.total, { backgroundColor: alpha(look.color, 0.1) }]}>
              <View style={{ flex: 1 }}>
                <Txt v="small" muted>{tr('Taxminiy narx')}</Txt>
                <Txt v="tiny" faint>{tr("{words} so'z × ${rate} × {langs} til", { words: wordCount, rate: WORD_USD, langs: Math.max(1, targets.length) })}</Txt>
              </View>
              <Text style={[styles.totalSum, { color: look.color }]}>${translateUsd}</Text>
            </View>
          </>
        )}
        {id === 'docs' && (
          <>
            {block(tr('Hujjat turi'), chips([tx('Shartnoma'), tx('NDA'), tx('Biznes-reja'), tx('Ustav'), tx('Boshqa')], v => v === docType, setDocType))}
            {block(tr('Kim uchun'), <OptionRow choices={opts([tx('Jismoniy shaxs'), tx('Kompaniya')])} value={party} onChange={setParty} />)}
            {block(tr('Hujjat tillari'), chips(LANGS.slice(0, 3), v => docLangs.includes(v), v => setDocLangs(x => toggle(x, v))))}
          </>
        )}
        <Field label={tr('Izoh')} value={note} onChangeText={setNote} multiline maxLength={800} inputStyle={{ minHeight: 80 }}
          placeholder={id === 'docs' ? tr('Tomonlar, predmet, muddat…') : id === 'translate' ? tr('Matn havolasi yoki maxsus atamalar…') : tr('Maqsadingiz va savollaringiz…')} />
      </Card>

      <HowItWorks steps={[tr('Buyurtma yuboring'), tr("Menejer bir soat ichida yozadi va narxni tasdiqlaydi"), tr('Natijani shu chatda olasiz')]} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 18, paddingEnd: 10, borderRadius: radius.l, overflow: 'hidden' },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -110, right: -60, backgroundColor: 'rgba(255,255,255,0.14)' },
  price: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  priceText: { color: '#FFFFFF', fontFamily: F.heavy, fontSize: 12.5 },
  heroTitle: { color: '#FFFFFF', fontFamily: F.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
  heroDesc: { color: 'rgba(255,255,255,0.9)', fontFamily: F.medium, fontSize: 13.5, lineHeight: 19 },
  heroArt: { width: 104, height: 104 },
  get: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  getIco: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  total: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16 },
  totalSum: { fontFamily: F.display, fontSize: 26 },
});
