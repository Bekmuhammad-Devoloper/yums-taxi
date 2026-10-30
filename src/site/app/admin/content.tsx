// Sayt matni: bosh qism, aksiya, «Haydovchi bo'ling» bo'limi, savol-javoblar (o'zbek va rus tillarida), aloqa va bo'limlarni yoqish.
// Faqat standartdan farq qiladigan maydonlar serverga yuboriladi; saqlangach sayt ochiq turgan brauzerlarda ham yangilanadi.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { IOSSwitch } from '@/components/ui';
import { confirm } from '@/lib/confirm';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';
import { openUrl, useLayout } from '@/site/components/kit';
import { Btn, Cols, Page, Panel, Pill, Seg, STATUS_COLOR } from '@/site/components/admin/ui';
import { useAdmin, useRun } from '@/site/lib/admin-store';
import { DEFAULT_CONTENT, mergeContent, type ContentOverrides, type Faq, type Lang, type LangBlock, type SiteContent } from '@/site/lib/content';

type TextKey = Exclude<keyof LangBlock, 'faq'>;
const TEXTS: { k: TextKey; label: string; max: number; multiline?: boolean; soft?: number }[] = [
  { k: 'heroTitle', label: 'Bosh sarlavha', max: 120, soft: 56 },
  { k: 'heroSub', label: 'Sarlavha ostidagi matn', max: 300, multiline: true, soft: 220 },
  { k: 'promoText', label: 'Aksiya matni', max: 120, soft: 80 },
  { k: 'promoCode', label: 'Promokod', max: 16 },
  { k: 'driverTitle', label: "«Haydovchi bo'ling» sarlavhasi", max: 120, soft: 60 },
  { k: 'driverSub', label: "«Haydovchi bo'ling» matni", max: 300, multiline: true, soft: 220 },
];
const LANGS: { id: Lang; label: string }[] = [{ id: 'uz', label: "O'zbekcha" }, { id: 'ru', label: 'Ruscha' }];
const HERO = { night: require('@/assets/site/hero-night.webp'), day: require('@/assets/site/hero-day.webp') };
const YELLOW = '#FFC800';

/** Standartdan farq qiladigan maydonlar (serverga shu yuboriladi) */
function overridesOf(d: SiteContent): ContentOverrides {
  const o: ContentOverrides = {};
  for (const lang of ['uz', 'ru'] as const) {
    const b: Partial<LangBlock> = {};
    for (const { k } of TEXTS) {
      const v = d[lang][k].trim();
      if (v && v !== DEFAULT_CONTENT[lang][k]) b[k] = v;
    }
    const faq = d[lang].faq.map(f => ({ q: f.q.trim(), a: f.a.trim() })).filter(f => f.q && f.a);
    if (faq.length && JSON.stringify(faq) !== JSON.stringify(DEFAULT_CONTENT[lang].faq)) b.faq = faq;
    if (Object.keys(b).length) o[lang] = b;
  }
  for (const k of ['phone', 'telegram', 'email'] as const) {
    const v = d[k].trim();
    if (v && v !== DEFAULT_CONTENT[k]) o[k] = v;
  }
  if (d.showStats !== DEFAULT_CONTENT.showStats) o.showStats = d.showStats;
  if (d.showPromo !== DEFAULT_CONTENT.showPromo) o.showPromo = d.showPromo;
  return o;
}

/** Tarjima, format va uzunlik bo'yicha maslahatlar */
function checksOf(d: SiteContent) {
  const out: { level: 'warn' | 'info'; text: string }[] = [];
  for (const { k, label } of TEXTS) {
    const uz = d.uz[k].trim() !== DEFAULT_CONTENT.uz[k], ru = d.ru[k].trim() !== DEFAULT_CONTENT.ru[k];
    if (k !== 'promoCode' && uz !== ru) out.push({ level: 'warn', text: `«${label}» faqat ${uz ? "o'zbekcha" : 'ruscha'} o'zgartirilgan — ${uz ? 'rus' : "o'zbek"} tilidagi sahifada eski matn qoladi` });
  }
  if (d.uz.faq.length !== d.ru.faq.length) out.push({ level: 'warn', text: `Savol-javoblar soni tillarda har xil: o'zbekcha ${d.uz.faq.length} ta, ruscha ${d.ru.faq.length} ta` });
  for (const lang of ['uz', 'ru'] as const) {
    const code = d[lang].promoCode.trim();
    if (code && !/^[A-Z0-9]{3,16}$/.test(code)) out.push({ level: 'warn', text: `Promokod (${lang}) faqat katta lotin harflari va raqamlardan, 3–16 belgi bo'lsin` });
  }
  if (d.uz.promoCode.trim() !== d.ru.promoCode.trim()) out.push({ level: 'warn', text: 'Promokod tillarda har xil — mijozlar adashishi mumkin' });
  if (d.showPromo && (!d.uz.promoText.trim() || !d.ru.promoText.trim())) out.push({ level: 'warn', text: "Aksiya yoqilgan, lekin matni bo'sh" });
  const digits = d.phone.replace(/\D/g, '');
  if (digits.length !== 12 || !digits.startsWith('998')) out.push({ level: 'warn', text: 'Telefon +998 XX XXX XX XX shaklida bo\'lsin' });
  if (!/^[A-Za-z0-9_]{5,32}$/.test(d.telegram.trim())) out.push({ level: 'warn', text: "Telegram — @ belgisisiz foydalanuvchi nomi (5–32 belgi, lotin harflari, raqam va _)" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) out.push({ level: 'warn', text: "Elektron pochta manzili noto'g'ri" });
  for (const lang of ['uz', 'ru'] as const) {
    for (const t of TEXTS) if (t.soft && d[lang][t.k].trim().length > t.soft) out.push({ level: 'info', text: `«${t.label}» (${lang}) ${d[lang][t.k].trim().length} belgi — telefonda uzun ko'rinadi, ${t.soft} gacha tavsiya etiladi` });
  }
  return out;
}

export default function Content() {
  const { state } = useAdmin();
  // server matni o'zgarsa (saqlangach yoki boshqa operator o'zgartirsa) muharrir yangi qiymatlar bilan qayta ochiladi
  return <Editor key={JSON.stringify(state.content)} saved={state.content} />;
}

function Editor({ saved }: { saved: ContentOverrides }) {
  const { colors: c } = useStore();
  const { wide } = useLayout();
  const runCmds = useRun();
  const base = useMemo(() => mergeContent(saved), [saved]);
  const [d, setD] = useState<SiteContent>(base);
  const [lang, setLang] = useState<Lang>('uz');
  const [busy, setBusy] = useState(false);
  const next = useMemo(() => overridesOf(d), [d]);
  const dirty = JSON.stringify(next) !== JSON.stringify(overridesOf(base));
  const checks = useMemo(() => checksOf(d), [d]);
  const changedCount = (['uz', 'ru'] as const).reduce((n, l) => n + Object.keys(next[l] ?? {}).length, 0) + (['phone', 'telegram', 'email', 'showStats', 'showPromo'] as const).filter(k => k in next).length;

  const block = d[lang];
  const setText = (k: TextKey, v: string) => setD(s => ({ ...s, [lang]: { ...s[lang], [k]: k === 'promoCode' ? v.toUpperCase().replace(/\s/g, '') : v } }));
  const setFaq = (faq: Faq[]) => setD(s => ({ ...s, [lang]: { ...s[lang], faq } }));

  const save = async () => {
    setBusy(true);
    await runCmds({ cmd: 'content', content: next }, 'Sayt matni saqlandi');
    setBusy(false);
  };
  const resetAll = () => confirm('Standart matn', "Barcha o'zgarishlar o'chirilib, sayt standart matnga qaytarilsinmi?", async () => {
    setBusy(true);
    await runCmds({ cmd: 'content', content: {} }, 'Sayt standart matnga qaytarildi');
    setBusy(false);
  }, 'Qaytarish');
  const openSite = () => {
    const origin = Platform.OS === 'web' ? globalThis.location?.origin : undefined;
    if (origin) openUrl(`${origin}/`);
  };

  return (
    <Page title="Sayt matni" sub={changedCount ? `${changedCount} ta maydon standartdan farq qiladi` : 'Hamma maydonlar standart holatda'}
      actions={<>
        <Btn title="Saytni ochish" icon="open-outline" onPress={openSite} />
        {Object.keys(saved).length ? <Btn title="Standartga qaytarish" icon="refresh" onPress={resetAll} /> : null}
        {dirty ? <Btn title="Bekor qilish" onPress={() => setD(base)} /> : null}
        <Btn title={dirty ? 'Saqlash' : 'Saqlangan'} icon={dirty ? 'save' : 'checkmark'} kind="dark" disabled={!dirty} loading={busy} onPress={save} />
      </>}>
      <Cols>
        <View style={{ flex: wide ? 1.25 : undefined, gap: 16, minWidth: 0 }}>
          <Seg<Lang> items={LANGS} value={lang} onChange={setLang} />
          <Panel title="Matnlar" sub="Bo'sh qoldirilgan maydon standart matnni ko'rsatadi">
            {TEXTS.map(t => {
              const v = block[t.k];
              const def = DEFAULT_CONTENT[lang][t.k];
              const changed = v.trim() !== def;
              return (
                <View key={t.k} style={{ gap: 6 }}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.label, { color: c.muted, flex: 1 }]}>{t.label}</Text>
                    {changed ? <Pressable onPress={() => setText(t.k, def)} accessibilityLabel={`${t.label}: standart`}><Text style={[styles.link, { color: c.accent }]}>Standart</Text></Pressable> : null}
                    <Text style={[styles.count, { color: t.soft && v.length > t.soft ? STATUS_COLOR.serious : c.faint }]}>{v.length}/{t.max}</Text>
                  </View>
                  <TextInput value={v} onChangeText={x => setText(t.k, x)} placeholder={def} placeholderTextColor={c.faint} multiline={t.multiline} maxLength={t.max} accessibilityLabel={t.label}
                    style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: changed ? c.brand : 'transparent' }, t.multiline && styles.multi]} />
                </View>
              );
            })}
          </Panel>

          <Panel title="Savol-javoblar" sub={`${block.faq.length} ta · saytning pastki qismida`}
            right={<Btn small title="Qo'shish" icon="add" onPress={() => setFaq([...block.faq, { q: '', a: '' }])} />}>
            {block.faq.map((f, i) => (
              <View key={i} style={[styles.faq, { borderColor: c.line }]}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { color: c.muted, flex: 1 }]}>{i + 1}-savol</Text>
                  <IconBtn icon="arrow-up" label="Yuqoriga" disabled={i === 0} onPress={() => { const x = [...block.faq]; [x[i - 1], x[i]] = [x[i], x[i - 1]]; setFaq(x); }} />
                  <IconBtn icon="arrow-down" label="Pastga" disabled={i === block.faq.length - 1} onPress={() => { const x = [...block.faq]; [x[i + 1], x[i]] = [x[i], x[i + 1]]; setFaq(x); }} />
                  <IconBtn icon="trash-outline" label="O'chirish" danger onPress={() => setFaq(block.faq.filter((_, j) => j !== i))} />
                </View>
                <TextInput value={f.q} onChangeText={q => setFaq(block.faq.map((x, j) => (j === i ? { ...x, q } : x)))} placeholder="Savol" placeholderTextColor={c.faint} maxLength={200} accessibilityLabel={`${i + 1}-savol`}
                  style={[styles.input, { backgroundColor: c.surface2, color: c.text, fontFamily: F.bold }]} />
                <TextInput value={f.a} onChangeText={a => setFaq(block.faq.map((x, j) => (j === i ? { ...x, a } : x)))} placeholder="Javob" placeholderTextColor={c.faint} multiline maxLength={1000} accessibilityLabel={`${i + 1}-javob`}
                  style={[styles.input, styles.multi, { backgroundColor: c.surface2, color: c.text }]} />
                {!f.q.trim() || !f.a.trim() ? <Text style={[styles.hint, { color: STATUS_COLOR.serious }]}>Savol va javob to&apos;ldirilmasa saqlanmaydi</Text> : null}
              </View>
            ))}
            <View style={styles.labelRow}>
              <Text style={[styles.hint, { color: c.faint, flex: 1 }]}>Hammasi o&apos;chirilsa sayt standart savollarni ko&apos;rsatadi</Text>
              {JSON.stringify(block.faq) !== JSON.stringify(DEFAULT_CONTENT[lang].faq) ? <Btn small title="Standart savollar" icon="refresh" onPress={() => setFaq(DEFAULT_CONTENT[lang].faq)} /> : null}
            </View>
          </Panel>

          <Panel title="Aloqa va bo'limlar" sub="Ikkala til uchun umumiy">
            <Row label="Telefon" value={d.phone} placeholder={DEFAULT_CONTENT.phone} onChange={phone => setD(s => ({ ...s, phone }))} max={24} />
            <Row label="Telegram" value={d.telegram} placeholder={DEFAULT_CONTENT.telegram} onChange={v => setD(s => ({ ...s, telegram: v.replace(/^@|^https?:\/\/t\.me\//, '') }))} max={64} />
            <Row label="Elektron pochta" value={d.email} placeholder={DEFAULT_CONTENT.email} onChange={email => setD(s => ({ ...s, email }))} max={80} />
            <Toggle label="Jonli ko'rsatkichlar" sub="Liniyadagi haydovchilar, bugungi safarlar, o'rtacha kelish vaqti (server ulanganda)" value={d.showStats} onChange={showStats => setD(s => ({ ...s, showStats }))} />
            <Toggle label="Aksiya qatori" sub="Bosh qismdagi chegirma va promokod" value={d.showPromo} onChange={showPromo => setD(s => ({ ...s, showPromo }))} />
          </Panel>
        </View>

        <View style={{ flex: wide ? 1 : undefined, gap: 16, minWidth: 0 }}>
          <Panel title="Ko'rinishi" sub={`${LANGS.find(l => l.id === lang)!.label} · saqlanmagan o'zgarishlar bilan`}>
            <Preview d={d} lang={lang} />
          </Panel>
          <Panel title="Tekshiruv" sub={checks.length ? `${checks.length} ta maslahat` : 'Hammasi joyida'}>
            {checks.length ? checks.map(x => (
              <View key={x.text} style={styles.check}>
                <Ionicons name={x.level === 'warn' ? 'warning' : 'information-circle'} size={16} color={x.level === 'warn' ? STATUS_COLOR.serious : '#2a78d6'} />
                <Text style={[styles.meta, { color: c.text, flex: 1 }]}>{x.text}</Text>
              </View>
            )) : (
              <View style={styles.check}>
                <Ionicons name="checkmark-circle" size={16} color={STATUS_COLOR.good} />
                <Text style={[styles.meta, { color: c.text, flex: 1 }]}>Tarjimalar, promokod va aloqa ma&apos;lumotlari to&apos;g&apos;ri.</Text>
              </View>
            )}
          </Panel>
        </View>
      </Cols>
    </Page>
  );
}

function Preview({ d, lang }: { d: SiteContent; lang: Lang }) {
  const { dark } = useStore();
  const b = d[lang];
  const fg = dark ? '#fff' : '#0E1525';
  const muted = dark ? 'rgba(255,255,255,0.7)' : 'rgba(14,21,37,0.68)';
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.preview}>
        <Image source={dark ? HERO.night : HERO.day} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="right center" accessible={false} />
        <LinearGradient colors={dark ? ['rgba(10,13,20,0.97)', 'rgba(10,13,20,0.78)', 'rgba(10,13,20,0.25)'] : ['rgba(244,245,248,0.98)', 'rgba(244,245,248,0.85)', 'rgba(244,245,248,0.2)']}
          locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <View style={{ gap: 10, maxWidth: '78%' }}>
          <Text style={[styles.pTitle, { color: fg }]}>{b.heroTitle || DEFAULT_CONTENT[lang].heroTitle}</Text>
          <Text style={[styles.pSub, { color: muted }]} numberOfLines={4}>{b.heroSub || DEFAULT_CONTENT[lang].heroSub}</Text>
          <View style={styles.pCtas}>
            <View style={[styles.pCta, { backgroundColor: YELLOW }]}><Text style={[styles.pCtaText, { color: '#0E1525' }]}>{lang === 'ru' ? 'Заказать' : 'Buyurtma'}</Text></View>
            <View style={[styles.pCta, { borderWidth: 1, borderColor: muted }]}><Text style={[styles.pCtaText, { color: fg }]}>{lang === 'ru' ? 'Стать водителем' : "Haydovchi bo'lish"}</Text></View>
          </View>
          {d.showPromo && b.promoText.trim() ? (
            <View style={[styles.pPromo, { backgroundColor: dark ? 'rgba(255,255,255,0.08)' : '#fff' }]}>
              <Text style={{ fontSize: 12 }}>🎁</Text>
              <Text style={[styles.pPromoText, { color: fg }]} numberOfLines={2}>{b.promoText}</Text>
              {b.promoCode ? <Text style={[styles.pCode, { color: fg, borderColor: YELLOW }]}>{b.promoCode}</Text> : null}
            </View>
          ) : null}
        </View>
      </View>
      <View style={[styles.pDriver, { backgroundColor: '#0E1525' }]}>
        <Text style={[styles.pTitle, { color: '#fff', fontSize: 17, lineHeight: 22 }]}>{b.driverTitle || DEFAULT_CONTENT[lang].driverTitle}</Text>
        <Text style={[styles.pSub, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={3}>{b.driverSub || DEFAULT_CONTENT[lang].driverSub}</Text>
        <Text style={[styles.pSub, { color: 'rgba(255,255,255,0.55)' }]}>{d.phone} · @{d.telegram} · {d.email}</Text>
      </View>
      {!d.showStats ? <Pill text="Jonli ko'rsatkichlar o'chirilgan" tone="muted" icon="eye-off" /> : null}
    </View>
  );
}

function Row({ label, value, placeholder, onChange, max }: { label: string; value: string; placeholder: string; onChange: (v: string) => void; max: number }) {
  const { colors: c } = useStore();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.faint} maxLength={max} accessibilityLabel={label} autoCapitalize="none"
        style={[styles.input, { backgroundColor: c.surface2, color: c.text, borderColor: value.trim() !== placeholder ? c.brand : 'transparent' }]} />
    </View>
  );
}

function Toggle({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors: c } = useStore();
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.toggleLabel, { color: c.text }]}>{label}</Text>
        <Text style={[styles.meta, { color: c.muted }]}>{sub}</Text>
      </View>
      <IOSSwitch value={value} onChange={onChange} label={label} />
    </View>
  );
}

function IconBtn({ icon, label, onPress, disabled, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  const { colors: c } = useStore();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ hovered }: { hovered?: boolean }) => [styles.iconBtn, { backgroundColor: hovered ? c.surface2 : 'transparent', opacity: disabled ? 0.3 : 1 }]}>
      <Ionicons name={icon} size={17} color={danger ? c.danger : c.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: F.semi, fontSize: 12.5 },
  link: { fontFamily: F.bold, fontSize: 12.5 },
  count: { fontFamily: F.semi, fontSize: 11.5, fontVariant: ['tabular-nums'] },
  hint: { fontFamily: F.semi, fontSize: 12 },
  meta: { fontFamily: F.medium, fontSize: 13, lineHeight: 19 },
  input: { minHeight: 44, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.semi, fontSize: 14.5, borderWidth: 1.5, borderColor: 'transparent' },
  multi: { minHeight: 88, textAlignVertical: 'top' },
  faq: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 8 },
  iconBtn: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  toggleLabel: { fontFamily: F.bold, fontSize: 14.5 },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  preview: { borderRadius: 16, overflow: 'hidden', padding: 18, minHeight: 260, justifyContent: 'center' },
  pTitle: { fontFamily: F.heavy, fontSize: 24, lineHeight: 28, letterSpacing: -0.6 },
  pSub: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 18 },
  pCtas: { flexDirection: 'row', gap: 8, marginTop: 2 },
  pCta: { height: 32, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pCtaText: { fontFamily: F.bold, fontSize: 12 },
  pPromo: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, maxWidth: '100%' },
  pPromoText: { fontFamily: F.semi, fontSize: 11.5, flexShrink: 1 },
  pCode: { fontFamily: F.heavy, fontSize: 11, borderWidth: 1, borderStyle: 'dashed', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  pDriver: { borderRadius: 16, padding: 16, gap: 6 },
});
