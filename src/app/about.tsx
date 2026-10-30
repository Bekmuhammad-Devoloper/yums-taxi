import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionArt } from '@/components/platform-ui';
import { BrandLogo, Card, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { SECTIONS, SECTORS } from '@/lib/platform-data';
import { haptic, useStore } from '@/lib/store';
import { F, radius } from '@/lib/theme';
import { flipRTL } from '@/lib/i18n';

const GOALS = [
  "Dunyo bo'yicha loyihalarni joylashtirish va qidirish imkoniyatini yaratish",
  "Loyiha egalari, kompaniyalar, investorlar va mutaxassislarni bog'lash",
  "Biznes g'oyalarini rivojlantirish, xizmat va mahsulotlarni taqdim etish",
  "Xalqaro hamkorlik uchun profillar, xabarlar va hujjat almashish vositalari",
  "Ko'p tilli interfeys, mamlakatlar bo'yicha qidiruv va mobil ilovalar",
];

const ROADMAP: { title: string; desc: string; state: 'done' | 'now' | 'next' }[] = [
  { title: 'Talablarni aniqlash', desc: "Foydalanuvchi turlari, loyiha jarayoni, huquqiy cheklovlar", state: 'done' },
  { title: 'Dizayn va prototip', desc: 'Sahifalar xaritasi, UX/UI maketlar, ssenariylar', state: 'done' },
  { title: 'MVP ishlab chiqish', desc: 'Hisoblar, loyiha katalogi, qidiruv, moderatsiya paneli', state: 'now' },
  { title: 'Test va xavfsizlik', desc: 'Funksional test, xavfsizlik tekshiruvi, huquqiy hujjatlar', state: 'next' },
  { title: 'Pilot ishga tushirish', desc: 'Bir nechta til va bozorda sinov, fikr-mulohaza', state: 'next' },
  { title: 'Kengaytirish', desc: 'Tarjima, integratsiyalar, yangi sohalar', state: 'next' },
];

const REVENUE = [
  ['pricetag-outline', "Bepul va pullik e'lonlar", 'Oddiy joylashtirish bepul, TOP ko\'rsatish pullik'],
  ['business-outline', 'Kompaniya obunasi', 'Pro va Business tariflar'],
  ['megaphone-outline', 'Reklama', 'Tekshirilgan reklama beruvchilar uchun'],
  ['construct-outline', 'Professional xizmatlar', 'Tahlil, dizayn, tarjima, hujjatlar'],
  ['swap-horizontal-outline', 'Savdo komissiyasi', 'Qonuniy bitimlardan 3%'],
] as const;

export default function About() {
  const { colors: c } = useStore();
  return (
    <Screen title="Platforma haqida">
      <View style={[styles.hero, { backgroundColor: '#000' }]}>
        <BrandLogo width={170} style={{ alignSelf: 'center', marginBottom: 6 }} />
        <Text style={styles.sub}>Xalqaro raqamli loyihalar platformasi — Yevropa, Osiyo, Amerika va Afrikadagi loyiha egalari, tadbirkorlar, kompaniyalar, investorlar va mutaxassislarni yagona elektron muhitda bog'laydi.</Text>
      </View>

      <SectionHeader title="Maqsadlar" />
      <Card style={{ gap: 12 }}>
        {GOALS.map((g, i) => (
          <Row key={g} gap={12} style={{ alignItems: 'flex-start' }}>
            <View style={[styles.num, { backgroundColor: c.brandSoft }]}><Txt v="small" color={c.brandDeep} style={{ fontFamily: F.heavy }}>{i + 1}</Txt></View>
            <Txt v="small" style={{ flex: 1, lineHeight: 20 }}>{g}</Txt>
          </Row>
        ))}
      </Card>

      <SectionHeader title="Bo'limlar" />
      {SECTIONS.map(s => (
        <Pressable key={s.id} onPress={() => { haptic.tap(); router.push(s.route as never); }} style={({ pressed }) => [styles.section, { backgroundColor: c.surface, opacity: pressed ? 0.85 : 1 }]}>
          <SectionArt id={s.id} icon={s.icon} color={s.color} size={42} />
          <View style={{ flex: 1 }}>
            <Txt v="h3">YUMS {s.name}</Txt>
            <SectionDesc id={s.id} />
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.faint} style={flipRTL()} />
        </Pressable>
      ))}

      <SectionHeader title={`${SECTORS.length} ta soha`} action="Barchasi" onAction={() => router.push('/sectors')} />
      <Card><Txt v="small" muted style={{ lineHeight: 20 }}>{SECTORS.map(s => s.name).join(' · ')}</Txt></Card>

      <SectionHeader title="Daromad modeli" />
      <Card style={{ gap: 12 }}>
        {REVENUE.map(([i, t, d]) => (
          <Row key={t} gap={12}>
            <Ionicons name={i} size={20} color={c.ok} />
            <View style={{ flex: 1 }}><Txt v="small" style={{ fontFamily: F.heavy }}>{t}</Txt><Txt v="tiny" faint>{d}</Txt></View>
          </Row>
        ))}
      </Card>

      <SectionHeader title="Rivojlanish rejasi" />
      <Card style={{ gap: 0 }}>
        {ROADMAP.map((r, i) => {
          const color = r.state === 'done' ? c.ok : r.state === 'now' ? c.brandDeep : c.faint;
          return (
            <Row key={r.title} gap={12} style={{ alignItems: 'flex-start' }}>
              <View style={{ alignItems: 'center' }}>
                <View style={[styles.step, { borderColor: color, backgroundColor: r.state === 'next' ? 'transparent' : color }]}>
                  {r.state === 'done' && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                {i < ROADMAP.length - 1 && <View style={[styles.line, { backgroundColor: c.line }]} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 14 }}>
                <Txt v="small" style={{ fontFamily: F.heavy }}>{i + 1}-bosqich · {r.title}{r.state === 'now' ? ' (joriy)' : ''}</Txt>
                <Txt v="tiny" faint>{r.desc}</Txt>
              </View>
            </Row>
          );
        })}
      </Card>

      <Txt v="tiny" faint style={{ textAlign: 'center', lineHeight: 16 }}>
        YUMS — ishchi nom. Kompaniya nomi, tovar belgisi va domen alohida tekshirilishi kerak.{'\n'}Versiya 1.0 (MVP)
      </Txt>
    </Screen>
  );
}

function SectionDesc({ id }: { id: string }) {
  const { t } = useStore();
  const s = SECTIONS.find(x => x.id === id)!;
  return <Txt v="small" muted numberOfLines={1}>{t(s.desc)}</Txt>;
}

const styles = StyleSheet.create({
  hero: { padding: 20, borderRadius: radius.xl, gap: 8 },
  sub: { color: 'rgba(255,255,255,0.72)', fontSize: 14, fontFamily: F.semi, lineHeight: 21 },
  num: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  section: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.l },
  step: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, minHeight: 22, marginVertical: 2 },
});
