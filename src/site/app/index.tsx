// YUMS Taxi sayti (landing): bosh qism, jonli ko'rsatkichlar, narx kalkulyatori, tariflar, afzalliklar,
// haydovchilar uchun bo'lim (kalkulyator, talablar, ariza), savollar va aloqa.
// Narxlar, aksiya va matnlar admin paneldan boshqariladi (server ulangan bo'lsa — jonli).
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { toast } from '@/components/toast';
import { LOGO_EMBLEM } from '@/components/ui';
import { TARIFF_ART } from '@/lib/cars';
import type { Tariff } from '@/lib/data';
import { som } from '@/lib/geo';
import { commissionOf } from '@/lib/remote-config';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { Container, openUrl, useLayout } from '@/site/components/kit';
import { DriverJoin } from '@/site/components/landing/driver-join';
import { Estimator } from '@/site/components/landing/estimator';
import type { Lang } from '@/site/lib/content';
import { T, TARIFF_RU } from '@/site/lib/i18n';
import { useLang, useSiteData } from '@/site/lib/use-site';

const HERO = { night: require('@/assets/site/hero-night.webp'), day: require('@/assets/site/hero-day.webp') };
const PHONES = { passenger: require('@/assets/site/app-passenger.webp'), driver: require('@/assets/site/app-driver.webp') };
const FEATURE_ART = [
  require('@/assets/menu/car.webp'),
  require('@/assets/menu/documents.webp'),
  require('@/assets/menu/safety.webp'),
  require('@/assets/menu/quality.webp'),
  require('@/assets/menu/support.webp'),
  require('@/assets/menu/earnings.webp'),
];
/** Ilova do'konlari havolalari — berilmasa tugma «tez orada» bo'ladi */
const STORE_LINKS = { apple: process.env.EXPO_PUBLIC_APPSTORE_URL, google: process.env.EXPO_PUBLIC_PLAY_URL, web: process.env.EXPO_PUBLIC_WEBAPP_URL };
const NAVY = '#0E1525';
const YELLOW = '#FFC800';

type SectionId = 'estimate' | 'tariffs' | 'drivers' | 'faq';

export default function Landing() {
  const { colors: c, dark, setTheme } = useStore();
  const { wide, mid } = useLayout();
  const [lang, setLang] = useLang();
  const site = useSiteData();
  const t = T[lang];
  const content = site.content[lang];
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [offsets, setOffsets] = useState<Partial<Record<SectionId, number>>>({});
  const [solid, setSolid] = useState(false);
  const [menu, setMenu] = useState(false);
  const commission = commissionOf(site.config);

  useEffect(() => {
    if (typeof document !== 'undefined') document.title = lang === 'ru' ? 'YUMS Taxi — такси по Ташкенту' : "YUMS Taxi — Toshkent bo'ylab taksi";
  }, [lang]);

  const go = (id: SectionId) => {
    setMenu(false);
    scroll.current?.scrollTo({ y: Math.max(0, (offsets[id] ?? 0) - 72), animated: true });
  };
  const mark = (id: SectionId) => (e: { nativeEvent: { layout: { y: number } } }) => {
    const y = e.nativeEvent.layout.y;
    setOffsets(o => (o[id] === y ? o : { ...o, [id]: y }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView ref={scroll} onScroll={e => setSolid(e.nativeEvent.contentOffset.y > 24)} scrollEventThrottle={64} contentContainerStyle={{ paddingBottom: 0 }}>
        {/* ---------- Bosh qism ---------- */}
        <View style={[styles.hero, { minHeight: wide ? 680 : undefined }]}>
          <Image source={dark ? HERO.night : HERO.day} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={wide ? 'right center' : 'center'} accessible={false} />
          <LinearGradient
            colors={dark ? ['rgba(10,13,20,0.97)', 'rgba(10,13,20,0.82)', 'rgba(10,13,20,0.2)'] : ['rgba(244,245,248,0.98)', 'rgba(244,245,248,0.86)', 'rgba(244,245,248,0.1)']}
            locations={[0, 0.48, 1]} start={wide ? { x: 0, y: 0 } : { x: 0, y: 0 }} end={wide ? { x: 1, y: 0 } : { x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
          <Container style={[styles.heroInner, wide && { flexDirection: 'row', alignItems: 'center' }]}>
            <View style={[{ gap: 22 }, wide && { flex: 1.15 }]}>
              <View style={[styles.badge, { backgroundColor: dark ? 'rgba(255,200,0,0.14)' : 'rgba(15,30,61,0.07)' }]}>
                <View style={styles.liveDot} />
                <Text style={[styles.badgeText, { color: dark ? YELLOW : NAVY }]}>{t.hero.badge}</Text>
              </View>
              <Text style={[styles.h1, { color: c.text, fontSize: wide ? 60 : mid ? 46 : 36, lineHeight: wide ? 66 : mid ? 52 : 42 }]} accessibilityRole="header">{content.heroTitle}</Text>
              <Text style={[styles.lead, { color: c.muted, fontSize: wide ? 19 : 16.5 }]}>{content.heroSub}</Text>
              <View style={styles.ctaRow}>
                <Pressable onPress={() => go('estimate')} style={({ pressed }) => [styles.cta, { backgroundColor: YELLOW, transform: [{ scale: pressed ? 0.98 : 1 }] }]} accessibilityLabel={t.nav.estimate}>
                  <Ionicons name="calculator" size={19} color={NAVY} />
                  <Text style={[styles.ctaText, { color: NAVY }]}>{t.estimate.title}</Text>
                </Pressable>
                <Pressable onPress={() => go('drivers')} style={({ pressed }) => [styles.cta, { borderWidth: 1.5, borderColor: dark ? 'rgba(255,255,255,0.28)' : 'rgba(14,21,37,0.2)', transform: [{ scale: pressed ? 0.98 : 1 }] }]} accessibilityLabel={t.hero.become}>
                  <Ionicons name="car-sport" size={19} color={c.text} />
                  <Text style={[styles.ctaText, { color: c.text }]}>{t.hero.become}</Text>
                </Pressable>
              </View>
              <View style={styles.storeRow}>
                <StoreButton icon="logo-apple" label={t.stores.apple} sub={STORE_LINKS.apple ? t.stores.title : t.stores.soon} url={STORE_LINKS.apple} />
                <StoreButton icon="logo-google-playstore" label={t.stores.google} sub={STORE_LINKS.google ? t.stores.title : t.stores.soon} url={STORE_LINKS.google} />
                {STORE_LINKS.web ? <StoreButton icon="globe-outline" label={t.stores.web} sub={t.hero.order} url={STORE_LINKS.web} /> : null}
              </View>
              {site.content.showPromo && content.promoText ? <Promo lang={lang} text={content.promoText} code={content.promoCode} /> : null}
            </View>
            <View style={[styles.phones, !wide && { marginTop: 36, alignSelf: 'center' }]} accessible={false}>
              <Phone source={PHONES.driver} width={wide ? 236 : 168} style={{ transform: [{ rotate: '-6deg' }, { translateX: wide ? 40 : 30 }, { translateY: 24 }], opacity: 0.96 }} />
              <Phone source={PHONES.passenger} width={wide ? 268 : 190} style={{ transform: [{ rotate: '4deg' }, { translateX: wide ? -24 : -18 }], zIndex: 2 }} />
            </View>
          </Container>
        </View>

        {/* ---------- Ko'rsatkichlar ---------- */}
        <Container style={{ marginTop: -34, zIndex: 3 }}>
          <StatsStrip lang={lang} stats={site.content.showStats ? site.stats : null} />
        </Container>

        {/* ---------- Narx kalkulyatori ---------- */}
        <View onLayout={mark('estimate')}>
          <Section title={t.estimate.title} sub={t.estimate.sub}>
            <Estimator lang={lang} tariffs={site.tariffs} config={site.config} />
          </Section>
        </View>

        {/* ---------- Tariflar ---------- */}
        <View onLayout={mark('tariffs')}>
          <Section title={t.tariffs.title} sub={t.tariffs.sub}>
            <View style={[styles.grid, { gap: 14 }]}>
              {site.tariffs.map(tf => <TariffCard key={tf.id} lang={lang} t={tf} />)}
            </View>
          </Section>
        </View>

        {/* ---------- Afzalliklar ---------- */}
        <Section title={t.features.title} sub={t.features.sub}>
          <View style={[styles.grid, { gap: 14 }]}>
            {t.features.items.map((f, i) => (
              <View key={f.title} style={[styles.feature, { backgroundColor: c.surface, borderColor: c.line, flexBasis: wide ? '30%' : mid ? '46%' : '100%' }, !mid && styles.featureRow]}>
                <Image source={FEATURE_ART[i]} style={mid ? styles.featureArt : styles.featureArtSmall} contentFit="contain" accessible={false} />
                <View style={{ gap: 6, flex: mid ? undefined : 1 }}>
                  <Text style={[styles.h3, { color: c.text }]}>{f.title}</Text>
                  <Text style={[styles.body, { color: c.muted }]}>{f.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        {/* ---------- Haydovchilarga ---------- */}
        <View onLayout={mark('drivers')} style={[styles.driverBand, { backgroundColor: dark ? '#0F1626' : NAVY }]}>
          <Container style={{ gap: 26 }}>
            <View style={[{ gap: 14 }, wide && { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }]}>
              <View style={[{ gap: 12 }, wide && { flex: 1, maxWidth: 680 }]}>
                <View style={[styles.badge, { backgroundColor: 'rgba(255,200,0,0.16)' }]}>
                  <Ionicons name="car-sport" size={14} color={YELLOW} />
                  <Text style={[styles.badgeText, { color: YELLOW }]}>{t.driver.badge}</Text>
                </View>
                <Text style={[styles.h2, { color: '#fff', fontSize: wide ? 40 : 30 }]} accessibilityRole="header">{content.driverTitle}</Text>
                <Text style={[styles.lead, { color: 'rgba(255,255,255,0.72)' }]}>{content.driverSub}</Text>
              </View>
              <View style={styles.benefits}>
                <Benefit text={`${t.driver.commission} ${Math.round(commission * 100)}%`} icon="pie-chart" />
                {t.driver.benefits.map((b, i) => <Benefit key={b} text={b} icon={(['time', 'card', 'git-branch', 'navigate'] as const)[i]} />)}
              </View>
            </View>
            <DriverJoin lang={lang} tariffs={site.tariffs} commission={commission} />
          </Container>
        </View>

        {/* ---------- Savollar ---------- */}
        <View onLayout={mark('faq')}>
          <Section title={t.faq.title}>
            <View style={{ gap: 10 }}>
              {content.faq.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
            </View>
          </Section>
        </View>

        <Footer lang={lang} phone={site.content.phone} telegram={site.content.telegram} email={site.content.email} />
      </ScrollView>

      {/* ---------- Yuqori panel ---------- */}
      <View style={[styles.nav, { backgroundColor: solid || menu ? (dark ? 'rgba(10,13,20,0.9)' : 'rgba(255,255,255,0.92)') : 'transparent', borderBottomColor: solid ? c.line : 'transparent' }]}>
        <Container style={styles.navInner}>
          <Pressable onPress={() => scroll.current?.scrollTo({ y: 0, animated: true })} style={styles.logo} accessibilityLabel="YUMS Taxi">
            <Image source={LOGO_EMBLEM} style={{ width: 34, height: 34, borderRadius: 17 }} />
            <Text style={[styles.logoText, { color: c.text }]}>YUMS <Text style={{ color: dark ? YELLOW : '#E0A800' }}>Taxi</Text></Text>
          </Pressable>
          {wide ? (
            <View style={styles.navLinks}>
              {(['estimate', 'tariffs', 'drivers', 'faq'] as const).map(id => (
                <Pressable key={id} onPress={() => go(id)} style={({ hovered }: { hovered?: boolean }) => [styles.navLink, hovered && { backgroundColor: c.surface2 }]} accessibilityRole="link">
                  <Text style={[styles.navLinkText, { color: c.text }]}>{t.nav[id]}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={styles.navRight}>
            <LangSwitch lang={lang} onChange={setLang} />
            <Pressable onPress={() => setTheme(dark ? 'light' : 'dark')} style={[styles.iconBtn, { backgroundColor: c.surface2 }]} accessibilityLabel={dark ? t.theme.light : t.theme.dark}>
              <Ionicons name={dark ? 'sunny' : 'moon'} size={17} color={c.text} />
            </Pressable>
            {wide ? (
              <Pressable onPress={() => go('drivers')} style={[styles.navCta, { backgroundColor: YELLOW }]} accessibilityLabel={t.hero.become}>
                <Text style={[styles.navCtaText, { color: NAVY }]}>{t.hero.become}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setMenu(m => !m)} style={[styles.iconBtn, { backgroundColor: c.surface2 }]} accessibilityLabel="Menyu">
                <Ionicons name={menu ? 'close' : 'menu'} size={20} color={c.text} />
              </Pressable>
            )}
          </View>
        </Container>
        {menu && !wide ? (
          <Container style={{ paddingBottom: 14, gap: 4 }}>
            {(['estimate', 'tariffs', 'drivers', 'faq'] as const).map(id => (
              <Pressable key={id} onPress={() => go(id)} style={[styles.menuItem, { backgroundColor: c.surface2 }]} accessibilityRole="link">
                <Text style={[styles.navLinkText, { color: c.text, fontSize: 16 }]}>{t.nav[id]}</Text>
                <Ionicons name="chevron-forward" size={18} color={c.faint} />
              </Pressable>
            ))}
          </Container>
        ) : null}
      </View>
    </View>
  );
}

/* ---------- Bo'laklar ---------- */

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  const c = useStore().colors;
  const { wide } = useLayout();
  return (
    <Container style={{ paddingVertical: wide ? 64 : 44, gap: 24 }}>
      <View style={{ gap: 8, maxWidth: 720 }}>
        <Text style={[styles.h2, { color: c.text, fontSize: wide ? 38 : 28 }]} accessibilityRole="header">{title}</Text>
        {sub ? <Text style={[styles.lead, { color: c.muted }]}>{sub}</Text> : null}
      </View>
      {children}
    </Container>
  );
}

function Phone({ source, width, style }: { source: number; width: number; style?: object }) {
  return (
    <View style={[styles.phone, { width, borderRadius: width * 0.16 }, style]}>
      <Image source={source} style={{ width: width - 14, aspectRatio: 540 / 1169, borderRadius: width * 0.13 }} contentFit="cover" />
    </View>
  );
}

function StoreButton({ icon, label, sub, url }: { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; url?: string }) {
  const { colors: c, dark } = useStore();
  return (
    <Pressable onPress={() => (url ? openUrl(url) : toast(`${label}: ${sub}`, 'time'))} style={({ pressed }) => [styles.store, { backgroundColor: dark ? '#fff' : NAVY, opacity: url ? (pressed ? 0.85 : 1) : 0.88 }]} accessibilityLabel={`${label} — ${sub}`}>
      <Ionicons name={icon} size={24} color={dark ? NAVY : '#fff'} />
      <View>
        <Text style={[styles.storeSub, { color: dark ? c.muted : 'rgba(255,255,255,0.7)' }]}>{sub}</Text>
        <Text style={[styles.storeLabel, { color: dark ? NAVY : '#fff' }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function Promo({ lang, text, code }: { lang: Lang; text: string; code: string }) {
  const { colors: c } = useStore();
  const copy = () => {
    globalThis.navigator?.clipboard?.writeText?.(code).then(() => toast(`${T[lang].hero.copied}: ${code}`, 'copy')).catch(() => {});
  };
  return (
    <View style={[styles.promo, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Text style={styles.promoEmoji} accessible={false}>🎁</Text>
      <Text style={[styles.promoText, { color: c.text }]}>{text}</Text>
      {code ? (
        <Pressable onPress={copy} style={[styles.code, { borderColor: YELLOW }]} accessibilityLabel={`${T[lang].hero.promoCopy}: ${code}`}>
          <Text style={[styles.codeText, { color: c.text }]}>{code}</Text>
          <Ionicons name="copy-outline" size={14} color={c.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function StatsStrip({ lang, stats }: { lang: Lang; stats: { driversOnline: number; tripsToday: number; avgPickupMin: number | null; rating: number | null } | null }) {
  const { colors: c } = useStore();
  const { wide } = useLayout();
  const t = T[lang];
  const items: { icon: keyof typeof Ionicons.glyphMap; big: string; small: string }[] = stats
    ? [
      { icon: 'car-sport', big: String(stats.driversOnline), small: t.stats.online },
      { icon: 'checkmark-done', big: String(stats.tripsToday), small: t.stats.trips },
      ...(stats.avgPickupMin ? [{ icon: 'time' as const, big: String(stats.avgPickupMin).replace('.', ','), small: t.stats.pickup }] : []),
      ...(stats.rating ? [{ icon: 'star' as const, big: stats.rating.toFixed(2), small: t.stats.rating }] : []),
    ]
    : t.values.map((v, i) => ({ icon: (['pricetag', 'shield-checkmark', 'navigate'] as const)[i], big: v.title, small: v.text }));
  return (
    <View style={[styles.stats, { backgroundColor: c.surface, borderColor: c.line, flexDirection: wide ? 'row' : 'column' }]} accessibilityLabel={stats ? t.stats.live : undefined}>
      {items.map((it, i) => (
        <View key={it.small} style={[styles.statItem, wide && i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: c.line }]}>
          <View style={[styles.statIcon, { backgroundColor: c.brandSoft }]}><Ionicons name={it.icon} size={18} color={c.brandDeep} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[stats ? styles.statBig : styles.statTitle, { color: c.text }]} numberOfLines={1}>{it.big}</Text>
            <Text style={[styles.statSmall, { color: c.muted }]} numberOfLines={2}>{it.small}</Text>
          </View>
          {stats && i === 0 ? <View style={styles.liveDot} /> : null}
        </View>
      ))}
    </View>
  );
}

function TariffCard({ lang, t: tf }: { lang: Lang; t: Tariff }) {
  const { colors: c } = useStore();
  const { wide, mid } = useLayout();
  const t = T[lang].tariffs;
  const name = lang === 'ru' ? TARIFF_RU[tf.id]?.name ?? tf.name : tf.name;
  const desc = lang === 'ru' ? TARIFF_RU[tf.id]?.desc ?? tf.desc : tf.desc;
  return (
    <View style={[styles.tariff, { backgroundColor: c.surface, borderColor: c.line, flexBasis: wide ? '18%' : mid ? '30%' : '46%' }, !mid && { padding: 12, borderRadius: 22 }]}>
      <Image source={TARIFF_ART[tf.id]} style={styles.tariffArt} contentFit="contain" accessible={false} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <Text style={[styles.h3, { color: c.text }]}>{name}</Text>
        {tf.seats !== '—' ? <Text style={[styles.small, { color: c.faint }]}>{tf.seats} {t.seats}</Text> : null}
      </View>
      <Text style={[styles.small, { color: c.muted }]}>{desc}</Text>
      <View style={[styles.priceBox, { backgroundColor: c.surface2 }]}>
        <Text style={[styles.priceBig, { color: c.text }]}>{som(tf.base)}</Text>
        <Text style={[styles.small, { color: c.muted, marginTop: -4 }]}>{t.base}</Text>
        <View style={[styles.priceRule, { backgroundColor: c.line }]} />
        <PriceLine label={t.perKm} value={`+${som(tf.perKm)}`} />
        <PriceLine label={t.perMin} value={`+${som(tf.perMin)}`} />
        <PriceLine label={t.minFare} value={som(tf.minFare)} bold />
      </View>
    </View>
  );
}

function PriceLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const { colors: c } = useStore();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text style={[styles.small, { color: c.muted }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.small, { color: c.text, fontFamily: bold ? F.heavy : F.bold }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Benefit({ text, icon }: { text: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.benefit}>
      <Ionicons name={icon} size={15} color={YELLOW} />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const { colors: c } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen(o => !o)} style={[styles.faq, { backgroundColor: c.surface, borderColor: open ? c.brand : c.line }]} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={q}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={[styles.h3, { color: c.text, flex: 1, fontSize: 17 }]}>{q}</Text>
        <View style={[styles.faqIcon, { backgroundColor: open ? YELLOW : c.surface2 }]}><Ionicons name={open ? 'remove' : 'add'} size={18} color={open ? NAVY : c.text} /></View>
      </View>
      {open ? <Text style={[styles.body, { color: c.muted }]}>{a}</Text> : null}
    </Pressable>
  );
}

function LangSwitch({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  const { colors: c } = useStore();
  return (
    <View style={[styles.lang, { backgroundColor: c.surface2 }]}>
      {(['uz', 'ru'] as const).map(l => (
        <Pressable key={l} onPress={() => onChange(l)} style={[styles.langBtn, l === lang && { backgroundColor: c.surface }]} accessibilityLabel={l === 'uz' ? "O'zbekcha" : 'Русский'} accessibilityState={{ selected: l === lang }}>
          <Text style={[styles.langText, { color: l === lang ? c.text : c.muted }]}>{l.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Footer({ lang, phone, telegram, email }: { lang: Lang; phone: string; telegram: string; email: string }) {
  const { wide } = useLayout();
  const t = T[lang].footer;
  const tg = telegram.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '');
  return (
    <View style={[styles.footer, { backgroundColor: NAVY }]}>
      <Container style={[{ gap: 24 }, wide && { flexDirection: 'row', justifyContent: 'space-between' }]}>
        <View style={{ gap: 10, maxWidth: 360 }}>
          <View style={styles.logo}>
            <Image source={LOGO_EMBLEM} style={{ width: 34, height: 34, borderRadius: 17 }} />
            <Text style={[styles.logoText, { color: '#fff' }]}>YUMS <Text style={{ color: YELLOW }}>Taxi</Text></Text>
          </View>
          <Text style={[styles.small, { color: 'rgba(255,255,255,0.6)' }]}>{T[lang].hero.badge}</Text>
        </View>
        <View style={{ gap: 10 }}>
          <Text style={styles.footHead}>{t.contacts}</Text>
          <FootLink icon="call" text={phone} onPress={() => openUrl(`tel:${phone.replace(/[^\d+]/g, '')}`)} />
          {tg ? <FootLink icon="paper-plane" text={`${t.telegram}: @${tg}`} onPress={() => openUrl(`https://t.me/${tg}`)} /> : null}
          {email ? <FootLink icon="mail" text={email} onPress={() => openUrl(`mailto:${email}`)} /> : null}
        </View>
        <View style={{ gap: 10 }}>
          <Text style={styles.footHead}>YUMS</Text>
          <FootLink icon="grid" text={t.admin} onPress={() => router.push('/admin' as never)} />
          <Text style={[styles.small, { color: 'rgba(255,255,255,0.5)' }]}>© {new Date().getFullYear()} YUMS · {t.rights}</Text>
          <Text style={[styles.small, { color: 'rgba(255,255,255,0.5)' }]}>{t.made}</Text>
        </View>
      </Container>
    </View>
  );
}

function FootLink({ icon, text, onPress }: { icon: keyof typeof Ionicons.glyphMap; text: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ hovered }: { hovered?: boolean }) => [styles.footLink, hovered && { opacity: 0.8 }]} accessibilityRole="link" accessibilityLabel={text}>
      <Ionicons name={icon} size={16} color={YELLOW} />
      <Text style={styles.footText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden' },
  heroInner: { paddingTop: 116, paddingBottom: 76, gap: 24 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  badgeText: { fontFamily: F.bold, fontSize: 13 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2BC48A' },
  h1: { fontFamily: F.heavy, letterSpacing: -1.6 },
  h2: { fontFamily: F.heavy, letterSpacing: -1 },
  h3: { fontFamily: F.display, fontSize: 19, letterSpacing: -0.4 },
  lead: { fontFamily: F.medium, fontSize: 17, lineHeight: 26, maxWidth: 620 },
  body: { fontFamily: F.medium, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: F.semi, fontSize: 13.5, lineHeight: 19 },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 56, paddingHorizontal: 22, borderRadius: 18 },
  ctaText: { fontFamily: F.heavy, fontSize: 16 },
  storeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  store: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 16, borderRadius: 14 },
  storeSub: { fontFamily: F.semi, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.4 },
  storeLabel: { fontFamily: F.heavy, fontSize: 16, marginTop: -1 },
  promo: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, maxWidth: 620 },
  promoEmoji: { fontSize: 18 },
  promoText: { fontFamily: F.semi, fontSize: 14.5, flexShrink: 1 },
  code: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  codeText: { fontFamily: F.heavy, fontSize: 14, letterSpacing: 1 },
  phones: { flex: 0.85, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 420 },
  phone: { backgroundColor: '#0B0F17', padding: 7, alignItems: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.35)' },
  stats: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 8, boxShadow: '0 18px 40px rgba(15,30,61,0.08)' },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 12 },
  statIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  statBig: { fontFamily: F.heavy, fontSize: 24, letterSpacing: -0.6 },
  statTitle: { fontFamily: F.bold, fontSize: 16 },
  statSmall: { fontFamily: F.medium, fontSize: 13, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  feature: { flexGrow: 1, borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, padding: 22, gap: 8 },
  featureArt: { width: 72, height: 72, marginBottom: 6 },
  featureArtSmall: { width: 56, height: 56 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 18 },
  tariff: { flexGrow: 1, borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, padding: 18, gap: 6 },
  tariffArt: { width: '100%', height: 84, marginBottom: 4 },
  priceBox: { borderRadius: 16, padding: 12, gap: 5, marginTop: 6 },
  priceBig: { fontFamily: F.heavy, fontSize: 20, letterSpacing: -0.5 },
  priceRule: { height: StyleSheet.hairlineWidth * 2, marginVertical: 4 },
  driverBand: { paddingVertical: 64 },
  benefits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, maxWidth: 520 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' },
  benefitText: { fontFamily: F.bold, fontSize: 13.5, color: '#fff' },
  faq: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 10 },
  faqIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingVertical: 48 },
  footHead: { fontFamily: F.bold, fontSize: 13, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 },
  footLink: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footText: { fontFamily: F.semi, fontSize: 15, color: '#fff' },
  nav: { position: 'absolute', left: 0, right: 0, top: 0, borderBottomWidth: StyleSheet.hairlineWidth, backdropFilter: 'blur(14px)' },
  navInner: { height: 68, flexDirection: 'row', alignItems: 'center', gap: 16 },
  logo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoText: { fontFamily: F.brand, fontSize: 17, letterSpacing: 0.3 },
  navLinks: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  navLink: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  navLinkText: { fontFamily: F.bold, fontSize: 14.5 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  iconBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navCta: { height: 40, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center' },
  navCtaText: { fontFamily: F.heavy, fontSize: 14 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14 },
  lang: { flexDirection: 'row', borderRadius: 12, padding: 3 },
  langBtn: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9 },
  langText: { fontFamily: F.heavy, fontSize: 12.5 },
});
