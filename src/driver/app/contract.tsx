import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { LayoutAnimation, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { toast } from '@/components/toast';
import { alpha, BrandMark, Button, Card, Divider, Row, Screen, SectionTitle, Segmented, Txt } from '@/components/ui';
import {
  acceptContract, COMPANY_REQUISITES, CONTRACT_CONSENT, CONTRACT_META, CONTRACT_NOTE, CONTRACT_PREAMBLE, CONTRACT_SECTIONS,
  CONTRACT_TERMS as T, CONTRACT_TITLE, DRIVER_REQUISITES, inScript, useContractAcceptance, type ReqLink, type Script, type Section,
} from '@/driver/lib/contract';
import { useDriver } from '@/driver/lib/driver-store';
import { som } from '@/lib/geo';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr } from '@/lib/i18n';

type IonName = keyof typeof Ionicons.glyphMap;
type McName = keyof typeof MaterialCommunityIcons.glyphMap;

const LINKS: Record<ReqLink, (v: string) => string> = {
  tel: v => `tel:${v.replace(/[^\d+]/g, '')}`,
  telegram: v => `https://t.me/${v.replace(/^@/, '')}`,
  web: v => `https://${v.toLowerCase()}`,
};

/** Haydovchi bilan YUMS – O‘rgumchak Taxi Park o'rtasidagi hamkorlik shartnomasi: qisqa shartlar, to'liq matn, rozilik */
export default function Contract() {
  const { colors: c, user, lang } = useStore();
  const d = useDriver();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const account = user?.id ?? user?.phone;
  const accepted = useContractAcceptance(account);
  // rus va tojik tilida o'qiydiganlarga kirill yozuvi qulayroq
  const [script, setScript] = useState<Script>(lang === 'ru' || lang === 'tg' ? 'cyrl' : 'latn');
  const [open, setOpen] = useState<number[]>([1]);
  const [busy, setBusy] = useState(false);
  const sc = (s: string) => inScript(s, script);
  const allOpen = open.length === CONTRACT_SECTIONS.length;

  const toggle = (n: number) => {
    haptic.tap();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(o => (o.includes(n) ? o.filter(x => x !== n) : [...o, n]));
  };
  const toggleAll = () => {
    haptic.tap();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(allOpen ? [] : CONTRACT_SECTIONS.map(s => s.n));
  };

  const accept = async () => {
    setBusy(true);
    try {
      await acceptContract(account);
      haptic.success();
      toast(tr('Rozilik qayd etildi'));
      if (from === 'register' && router.canGoBack()) router.back();
    } finally {
      setBusy(false);
    }
  };

  const p = d.profile;
  const docNo = (k: 'license' | 'techPassport') => d.docs[k].number || (d.docs[k].status === 'missing' ? '' : tr('tekshiruvda'));
  const driverRows: [string, string][] = [
    [DRIVER_REQUISITES.name, p?.name ?? user?.name ?? ''],
    [DRIVER_REQUISITES.phone, p?.phone ?? user?.phone ?? ''],
    [DRIVER_REQUISITES.car, p ? `${p.car}${p.year ? `, ${p.year}` : ''}` : ''],
    [DRIVER_REQUISITES.plate, p?.plate ?? ''],
    [DRIVER_REQUISITES.license, p ? docNo('license') : ''],
    [DRIVER_REQUISITES.techPassport, p ? docNo('techPassport') : ''],
    [DRIVER_REQUISITES.platformId, p?.id ? p.id.slice(0, 8).toUpperCase() : ''],
  ];

  return (
    <Screen
      title={tr('Hamkorlik shartnomasi')}
      subtitle={`YUMS – O‘rgumchak Taxi Park · ${CONTRACT_META.signed}`}
      footer={accepted === null ? <Button title={tr('Tanishdim va roziman')} icon="checkmark-circle" loading={busy} onPress={accept} /> : undefined}
    >
      {/* bosh kartochka: kim bilan, nima haqida, qachongacha */}
      <LinearGradient colors={['#13254A', '#0B1530']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Row gap={10}>
          <BrandMark size={40} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={styles.heroPark} numberOfLines={2}>{CONTRACT_META.park}</Text>
            <Text style={styles.heroCompany} numberOfLines={1}>{CONTRACT_META.company}</Text>
          </View>
        </Row>
        <Text style={styles.heroTitle}>{sc(CONTRACT_TITLE)}</Text>
        <View style={styles.heroDates}>
          <DateChip icon="create-outline" label={tr('Tuzilgan')} value={CONTRACT_META.signed} />
          <DateChip icon="hourglass-outline" label={tr('Amal qiladi')} value={tr('{date} gacha', { date: CONTRACT_META.until })} />
        </View>
      </LinearGradient>

      {accepted ? (
        <View style={[styles.consent, { backgroundColor: c.okSoft }]}>
          <Ionicons name="checkmark-circle" size={20} color={c.ok} />
          <Txt v="small" color={c.ok} style={{ flex: 1, fontFamily: F.semi }}>
            {tr('Siz {date} kuni shartnoma bilan tanishib, rozilik bildirgansiz', { date: new Date(accepted.at).toLocaleDateString('ru-RU') })}
          </Txt>
        </View>
      ) : null}

      <SectionTitle>{tr('Asosiy shartlar')}</SectionTitle>
      <View style={styles.grid}>
        <Fact icon="pie-chart" tint="#FFC800" value={som(T.commission)} label={tr('komissiya · har buyurtmaga')} hint={tr('Brendli avtomobil: {sum}', { sum: som(T.brandedCommission) })} />
        <Fact icon="wallet" tint="#12A66A" value={som(T.keepBalance)} label={tr('balansda turadi')} hint={tr("{sum} qolsa, buyurtmalar to'xtaydi", { sum: som(T.stopBelow) })} />
        <Fact icon="navigate" tint="#2457F5" value={som(T.baseFare)} label={tr("yo'l haqi · birinchi {km} km", { km: T.baseKm })} hint={tr('keyingi har km: {sum}', { sum: som(T.perKm) })} />
        <Fact icon="ribbon" tint="#7A4DF0" value={som(T.joinFee)} label={tr("a'zolik badali · bir marta")} />
        <Fact icon="briefcase" tint="#D97706" value={som(T.seniorityMonthly)} label={tr('oyiga · ish staji (ixtiyoriy)')} />
        <Fact icon="card" tint="#E5484D" value={som(T.cardLinkFee)} label={tr("karta bog'lash · bir marta")} />
      </View>

      <SectionTitle>{tr('Bonuslar')}</SectionTitle>
      <Card style={{ padding: 6 }}>
        <Bonus icon="tire" tint="#2457F5" title={tr('Yangi shinalar')} sub={tr("18–20 ta haydovchi jalb qiling — ular 30 kun yaxshi ishlasa, mashinangiz shinalari bir marta almashtiriladi")} />
        <Divider style={{ marginLeft: 62 }} />
        <Bonus icon="oil" tint="#D97706" title={tr('Motor moyi')} sub={tr("Platforma orqali 3 000 km yursangiz, motor moyi bir marta bepul quyiladi")} />
        <Divider style={{ marginLeft: 62 }} />
        <Bonus icon="bag-suitcase" tint="#12A66A" title={tr('Ichki turizm')} sub={tr("18–20 ta haydovchi bilan 3 oy barqaror ishlang: 3 kunlik sayohat, 2 kecha mehmonxona, turistik paket")} />
        <Divider style={{ marginLeft: 62 }} />
        <Bonus icon="mosque" tint="#7A4DF0" title={tr('Ota-onaga Umra ziyorati')} sub={tr('18–20 ta haydovchi bilan kamida 6 oy barqaror hamkorlik qilsangiz')} />
      </Card>

      {/* to'liq matn: bo'limlar yig'iladi, yozuvni almashtirish mumkin */}
      <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <Txt v="h2">{tr('Shartnoma matni')}</Txt>
        <Pressable onPress={toggleAll} hitSlop={10} accessibilityRole="button">
          <Txt v="small" color={c.accent} style={{ fontFamily: F.bold }}>{allOpen ? tr('Hammasini yopish') : tr('Hammasini ochish')}</Txt>
        </Pressable>
      </Row>
      <Segmented<Script> value={script} onChange={setScript} items={[{ id: 'latn', label: 'Lotin' }, { id: 'cyrl', label: 'Кирилл' }]} />

      <Card style={{ gap: 6 }}>
        <Txt muted style={styles.body}>{sc(CONTRACT_PREAMBLE)}</Txt>
      </Card>
      {CONTRACT_SECTIONS.map(s => <SectionCard key={s.n} s={s} sc={sc} open={open.includes(s.n)} onToggle={() => toggle(s.n)} />)}

      <SectionTitle>{sc('12. Томонларнинг реквизитлари')}</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Txt v="h3">{sc('1-томон — Компания')}</Txt>
        {COMPANY_REQUISITES.map(r => (
          <ReqRow key={r.label} label={sc(r.label)} value={r.value} link={r.link} />
        ))}
        <Divider style={{ marginVertical: 4 }} />
        <Txt v="h3">{sc('2-томон — Ҳамкор ҳайдовчи')}</Txt>
        {driverRows.map(([label, value]) => <ReqRow key={label} label={sc(label)} value={value} />)}
        <Txt v="tiny" faint style={{ lineHeight: 16 }}>{tr("Haydovchi ma'lumotlari profilingiz va hujjatlaringizdan olinadi")}</Txt>
      </Card>

      <View style={[styles.note, { backgroundColor: c.warnSoft }]}>
        <Ionicons name="information-circle" size={20} color={c.warn} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt v="small" color={c.warn} style={{ fontFamily: F.bold }}>{sc('Эслатма')}</Txt>
          <Txt v="small" color={c.warn} style={{ lineHeight: 19 }}>{sc(CONTRACT_NOTE)}</Txt>
        </View>
      </View>

      <Txt v="small" faint style={{ textAlign: 'center', fontFamily: F.semi }}>{sc(CONTRACT_CONSENT)}</Txt>
    </Screen>
  );
}

function DateChip({ icon, label, value }: { icon: IonName; label: string; value: string }) {
  return (
    <View style={styles.dateChip}>
      <Ionicons name={icon} size={13} color="#FFC800" />
      <Text style={styles.dateLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.dateValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Fact({ icon, tint, value, label, hint }: { icon: IonName; tint: string; value: string; label: string; hint?: string }) {
  const { colors: c } = useStore();
  return (
    <View style={[styles.fact, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={[styles.factIcon, { backgroundColor: alpha(tint, 0.14) }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <Text style={[styles.factValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Txt v="tiny" muted style={{ lineHeight: 15 }}>{label}</Txt>
      {hint ? <Txt v="tiny" color={tint === '#FFC800' ? c.brandDeep : tint} style={{ lineHeight: 15, fontFamily: F.semi }}>{hint}</Txt> : null}
    </View>
  );
}

function Bonus({ icon, tint, title, sub }: { icon: McName; tint: string; title: string; sub: string }) {
  const { colors: c } = useStore();
  return (
    <View style={styles.bonus}>
      <View style={[styles.bonusIcon, { backgroundColor: alpha(tint, 0.14) }]}>
        <MaterialCommunityIcons name={icon} size={22} color={tint} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt v="h3">{title}</Txt>
        <Txt v="small" muted style={{ lineHeight: 18 }}>{sub}</Txt>
      </View>
      <Ionicons name="gift" size={16} color={alpha(c.text, 0.25)} />
    </View>
  );
}

function SectionCard({ s, sc, open, onToggle }: { s: Section; sc: (x: string) => string; open: boolean; onToggle: () => void }) {
  const { colors: c } = useStore();
  return (
    <View style={[styles.section, { backgroundColor: c.surface, borderColor: open ? alpha(c.brand, 0.45) : c.line }]}>
      <Pressable onPress={onToggle} style={styles.sectionHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={[styles.num, { backgroundColor: open ? c.brand : c.surface2 }]}>
          <Text style={[styles.numText, { color: open ? c.brandText : c.muted }]}>{s.n}</Text>
        </View>
        <Txt v="h3" style={{ flex: 1 }}>{sc(s.title)}</Txt>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.faint} />
      </Pressable>
      {open ? (
        <View style={styles.sectionBody}>
          {s.intro ? <Txt muted style={styles.body}>{sc(s.intro)}</Txt> : null}
          {s.clauses.map(cl => (
            <View key={cl.n} style={styles.clause}>
              <Text style={[styles.clauseNo, { color: c.brandDeep }]}>{cl.n}</Text>
              <View style={{ flex: 1, gap: 4 }}>
                {cl.title ? <Txt v="h3" style={{ fontSize: 15 }}>{sc(cl.title)}</Txt> : null}
                <Txt style={styles.body}>{sc(cl.text)}</Txt>
                {cl.items?.map(it => (
                  <Row key={it} gap={8} style={{ alignItems: 'flex-start' }}>
                    <View style={[styles.dot, { backgroundColor: c.brand }]} />
                    <Txt muted style={[styles.body, { flex: 1 }]}>{sc(it)}</Txt>
                  </Row>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ReqRow({ label, value, link }: { label: string; value: string; link?: ReqLink }) {
  const { colors: c } = useStore();
  const body = (
    <>
      <Txt v="small" muted style={{ width: 128 }}>{label}</Txt>
      <Txt v="small" color={link ? c.accent : value ? c.text : c.faint} style={{ flex: 1, fontFamily: F.semi }} selectable={!link}>{value || '—'}</Txt>
      {link ? <Ionicons name={link === 'tel' ? 'call' : link === 'telegram' ? 'paper-plane' : 'open-outline'} size={15} color={c.accent} /> : null}
    </>
  );
  if (!link) return <Row gap={10} style={{ alignItems: 'flex-start' }}>{body}</Row>;
  return (
    <Pressable onPress={() => Linking.openURL(LINKS[link](value)).catch(() => {})} style={styles.reqLink} accessibilityRole="link">
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 22, padding: 16, gap: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)' },
  heroPark: { fontFamily: F.brand, fontSize: 12.5, lineHeight: 17, color: '#FFFFFF' },
  heroCompany: { fontFamily: F.medium, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  heroTitle: { fontFamily: F.heavy, fontSize: 19, lineHeight: 24, color: '#FFFFFF', letterSpacing: -0.3 },
  heroDates: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.14)' },
  dateLabel: { fontFamily: F.medium, fontSize: 11.5, color: 'rgba(255,255,255,0.62)' },
  dateValue: { fontFamily: F.bold, fontSize: 12, color: '#FFFFFF' },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fact: { flexGrow: 1, flexBasis: '46%', minWidth: 140, gap: 4, padding: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  factIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  factValue: { fontFamily: F.heavy, fontSize: 18, letterSpacing: -0.4 },
  bonus: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 12 },
  bonusIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  section: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  num: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: F.heavy, fontSize: 13 },
  sectionBody: { gap: 12, paddingHorizontal: 14, paddingBottom: 16 },
  clause: { flexDirection: 'row', gap: 10 },
  clauseNo: { width: 34, fontFamily: F.heavy, fontSize: 13, lineHeight: 22 },
  body: { lineHeight: 22 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  reqLink: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 16 },
});
