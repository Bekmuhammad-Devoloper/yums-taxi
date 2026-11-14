import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { InvestorCard, ProjectCard } from '@/components/platform-ui';
import { alpha, Card, Chip, ListItem, Screen, SectionTitle, Segmented, Txt } from '@/components/ui';
import { useContactInvestor } from '@/lib/actions';
import { INVESTOR_KINDS, type Investor } from '@/lib/platform-data';
import { short, usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { tr } from '@/lib/i18n';

type Tab = 'investors' | 'projects';
type IconName = keyof typeof Ionicons.glyphMap;

// Bosh kartochka banneri: chap tomoni toza binafsha (matn uchun), o'ngda raketa, o'sish grafigi va tangalar
const HERO_ART = require('@/assets/cards/invest.webp') as number;

export default function Invest() {
  const { colors: c } = useStore();
  const p = usePlatform();
  const contact = useContactInvestor();
  const [tab, setTab] = useState<Tab>('investors');
  const [kind, setKind] = useState<Investor['kind'] | null>(null);
  const [legalOpen, setLegalOpen] = useState(false);
  const investors = p.investors.filter(x => !p.isBlocked('investor', x.id) && (!kind || x.kind === kind));
  const seeking = p.publicProjects.filter(x => x.seeking.includes('investment')).sort((a, b) => b.views - a.views);
  const total = seeking.reduce((n, x) => n + x.budgetMax, 0);

  const toggleLegal = () => {
    haptic.tap();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLegalOpen(v => !v);
  };

  return (
    <Screen title="YUMS Invest" subtitle={tr("Investorlar va loyiha egalarini bog'lash")}>
      {/* bosh kartochka: chapda sarlavha va raqamlar, o'ngda banner (raketa, o'sish grafigi, tangalar) */}
      <View style={styles.hero}>
        <Image source={HERO_ART} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="right" />
        {/* chap tomonga binafsha soya — oq matn rasm ustida ham aniq o'qiladi */}
        <LinearGradient colors={['rgba(74,28,200,0.92)', 'rgba(74,28,200,0.6)', 'rgba(74,28,200,0)']} locations={[0, 0.45, 0.72]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>{tr('Investitsiya imkoniyatlari')}</Text>
          <View style={styles.stats}>
            <Stat icon="people" value={String(p.investors.length)} label={tr('Investorlar')} />
            <Stat icon="rocket" value={String(seeking.length)} label={tr('Loyihalar')} />
            <Stat icon="cash" value={`$${short(total)}`} label={tr("So'rov hajmi")} />
          </View>
        </View>
      </View>

      {/* huquqiy izoh: qisqa qator, «Batafsil» — to'liq matn */}
      <Pressable onPress={toggleLegal} style={[styles.legal, { backgroundColor: c.violetSoft, borderColor: alpha(c.violet, 0.25) }]} accessibilityRole="button" accessibilityState={{ expanded: legalOpen }}>
        <View style={styles.legalRow}>
          <Ionicons name="shield-checkmark" size={18} color={c.violet} />
          <Txt v="small" color={c.violet} style={{ flex: 1, fontFamily: F.semi }} numberOfLines={legalOpen ? undefined : 2}>
            {tr('Bitimlar faqat litsenziyalangan hamkorlar orqali')}
          </Txt>
          <Text style={[styles.more, { color: c.violet }]}>{legalOpen ? tr('Yopish') : tr('Batafsil')}</Text>
        </View>
        {legalOpen ? (
          <Txt v="small" color={c.violet} style={{ lineHeight: 19, opacity: 0.9 }}>
            {tr("YUMS investitsiya takliflari haqida ma'lumot joylashtiradi va tomonlarni bog'laydi. Mablag' qabul qilish va bitimlar faqat litsenziyalangan moliyaviy hamkorlar orqali, amaldagi qonunchilikka muvofiq amalga oshiriladi.")}
          </Txt>
        ) : null}
      </Pressable>

      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { id: 'investors', label: `${tr('Investorlar')} · ${p.investors.length}` },
          { id: 'projects', label: `${tr('Loyihalar')} · ${seeking.length}` },
        ]}
      />

      {tab === 'investors' ? (
        <>
          <View style={{ marginHorizontal: -16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              <Chip label={tr('Barchasi')} active={!kind} onPress={() => setKind(null)} />
              {(Object.keys(INVESTOR_KINDS) as Investor['kind'][]).map(k => <Chip key={k} label={INVESTOR_KINDS[k]} active={kind === k} onPress={() => setKind(kind === k ? null : k)} />)}
            </ScrollView>
          </View>
          {investors.map(inv => <InvestorCard key={inv.id} inv={inv} onContact={() => contact(inv)} />)}
        </>
      ) : (
        seeking.map(x => <ProjectCard key={x.id} p={x} />)
      )}

      <SectionTitle>{tr('Ishtirok etish')}</SectionTitle>
      <Card style={{ padding: 6 }}>
        <ListItem icon="add-circle" iconBg={alpha('#12A150', 0.15)} iconColor="#12A150" title={tr('Investitsiya uchun loyiha joylashtirish')} sub={tr("Bepul · moderatsiyadan so'ng ko'rinadi")} onPress={() => router.push('/project/edit')} />
        <ListItem icon="briefcase" iconBg={alpha(c.violet, 0.16)} iconColor={c.violet} title={tr("Investor sifatida qo'shilish")} sub={tr("Katalogga profil · «Tasdiqlangan» belgisi hujjatlar bilan")} onPress={() => router.push({ pathname: '/directory-edit', params: { type: 'investor' } })} />
        <ListItem icon="analytics" iconBg={alpha('#3B82F6', 0.15)} iconColor="#3B82F6" title={tr('Loyiha tahlili xizmati')} sub={tr('Investorlar uchun ekspert xulosasi')} onPress={() => router.push('/plans')} />
      </Card>
    </Screen>
  );
}

function Stat({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statIco}><Ionicons name={icon} size={11} color="#FFD84D" /></View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#4A1CC8', paddingHorizontal: 16, paddingVertical: 14, shadowColor: '#5B2EE0', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  heroText: { width: '62%', gap: 8 },
  heroTitle: { color: '#FFFFFF', fontFamily: F.heavy, fontSize: 16.5, lineHeight: 20, letterSpacing: -0.3 },
  stats: { gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 14, backgroundColor: 'rgba(20,6,70,0.38)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
  statIco: { width: 20, height: 20, borderRadius: 7, backgroundColor: 'rgba(255,216,77,0.16)', alignItems: 'center', justifyContent: 'center' },
  statValue: { flexShrink: 0, color: '#FFFFFF', fontFamily: F.heavy, fontSize: 14.5, letterSpacing: -0.3 },
  statLabel: { flexShrink: 1, color: 'rgba(255,255,255,0.75)', fontFamily: F.semi, fontSize: 11.5 },
  legal: { gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  legalRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  more: { fontFamily: F.bold, fontSize: 12.5 },
});
