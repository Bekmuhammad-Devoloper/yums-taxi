import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ImageSlot } from '@/components/image-slot';
import { SERVICE_LOOK } from '@/lib/service-look';
import { ClickButton, ClickMark } from '@/components/click-mark';
import { toast } from '@/components/toast';
import { TopupSheet } from '@/components/topup-sheet';
import { Badge, Button, Card, Chip, Field, ListItem, Row, Screen, SectionHeader, Segmented, Sheet, Txt } from '@/components/ui';
import { fmtDay } from '@/lib/format';
import { som } from '@/lib/geo';
import { PLANS, PRO_SERVICES, type Plan } from '@/lib/platform-data';
import { DIGITAL_SALES } from '@/lib/distribution';
import { usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F, radius } from '@/lib/theme';
import { tr } from '@/lib/i18n';

export default function Plans() {
  const { boost } = useLocalSearchParams<{ boost?: string }>();
  const { colors: c, balance, refreshWallet, settings, cards } = useStore();
  const clickOn = settings?.clickTopup !== false;
  const [method, setMethod] = useState<'balance' | 'click'>('balance');
  // 'click' — butun summa Click orqali; 'short' — yetishmagan qismi (Click yoki karta); to'lov o'tgach tarif darhol faollashadi
  const [topup, setTopup] = useState<'click' | 'short' | null>(null);
  const p = usePlatform();
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [buying, setBuying] = useState<Plan | 'boost' | null>(null);
  const [adOpen, setAdOpen] = useState(false);
  const [adTitle, setAdTitle] = useState('');
  const [adBudget, setAdBudget] = useState(50);
  const [adImage, setAdImage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const boostProject = boost ? p.projects.find(x => x.id === boost) : undefined;

  // Narxlar serverdan (GET /platform/plans): dollar narxi va joriy kurs bo'yicha so'mdagi yechim
  const plans = PLANS.map(pl => {
    const s = p.planList.find(x => x.id === pl.id);
    return { ...pl, price: s?.monthlyUsd ?? pl.price, yearly: s?.yearlyUsd ?? pl.yearly, priceSom: s?.monthlySom ?? 0, yearlySom: s?.yearlySom ?? 0 };
  });
  const boostUsd = p.pricing?.boostUsd ?? 0;
  const boostSom = p.pricing?.boostSom ?? 0;
  const boostDays = p.pricing?.boostDays ?? 7;
  const plan = buying && buying !== 'boost' ? plans.find(x => x.id === buying) : undefined;
  const amount = buying === 'boost' ? boostUsd : plan ? (period === 'year' ? plan.yearly : plan.price) : 0;
  const amountSom = buying === 'boost' ? boostSom : plan ? (period === 'year' ? plan.yearlySom : plan.priceSom) : 0;
  const free = buying === 'boost' && p.boostCredits > 0;
  const shortOf = free ? 0 : Math.max(0, amountSom - balance);
  const viaClick = clickOn && method === 'click' && !free && amountSom > 0;

  const pay = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (buying === 'boost' && boostProject) {
        const r = await p.boostProject(boostProject.id);
        if (!r) return;
        haptic.success();
        refreshWallet().catch(() => {});
        toast(tr('«{title}» {days} kunga TOPga chiqarildi', { title: boostProject.title, days: boostDays }), 'flash');
        setBuying(null);
        router.back();
        return;
      }
      if (plan && (await p.setPlan(plan.id, period === 'year'))) {
        haptic.success();
        refreshWallet().catch(() => {});
        toast(tr('{name} tarifi faollashtirildi', { name: plan.name }), 'diamond');
        setBuying(null);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={tr('Tariflar va reklama')} subtitle={tr("Bepul boshlang — kerak bo'lganda kengaytiring")}>
      {/* Play'da (Play Billing ulanmaguncha) — faqat tarif krediti bilan */}
      {boostProject && (DIGITAL_SALES || p.boostCredits > 0) && (
        <Card style={{ gap: 10, borderWidth: 2, borderColor: c.brand }}>
          <Row gap={8}><Ionicons name="flash" size={20} color={c.brandDeep} /><Txt v="h3" style={{ flex: 1 }}>{tr('TOPga chiqarish')}</Txt><Txt v="h2">{p.boostCredits > 0 ? tr('Bepul') : `$${boostUsd}`}</Txt></Row>
          <Txt v="small" muted>{tr("«{title}» {days} kun davomida bosh sahifa va qidiruvda birinchi ko'rsatiladi.", { title: boostProject.title, days: boostDays })}</Txt>
          <Button
            title={p.boostCredits > 0 ? tr('TOP kreditini ishlatish ({n} ta qoldi)', { n: p.boostCredits }) : tr("${amount} to'lash", { amount: boostUsd })}
            icon={p.boostCredits > 0 ? 'flash' : 'card'}
            onPress={() => setBuying('boost')}
          />
          <Txt v="tiny" faint>{tr('Pro tarifida oyiga 2 ta, Business tarifida 5 ta bepul TOP.')}</Txt>
        </Card>
      )}

      <Segmented value={period} onChange={setPeriod} items={[{ id: 'month', label: tr('Oylik') }, { id: 'year', label: tr('Yillik · −17%') }]} />

      {plans.map(pl => {
        const current = p.plan === pl.id;
        const price = period === 'year' ? pl.yearly : pl.price;
        const priceSom = period === 'year' ? pl.yearlySom : pl.priceSom;
        return (
          <Card key={pl.id} style={[{ gap: 12 }, current && { borderWidth: 2, borderColor: pl.color }]}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={8}>
                <View style={[styles.planIco, { backgroundColor: pl.color }]}><Ionicons name={pl.id === 'free' ? 'leaf' : pl.id === 'pro' ? 'rocket' : 'business'} size={18} color="#fff" /></View>
                <Txt v="h2">{pl.name}</Txt>
              </Row>
              {current ? <Badge label={tr('Joriy tarif')} tone="ok" icon="checkmark" /> : pl.id === 'pro' ? <Badge label={tr('Mashhur')} tone="brand" /> : null}
            </Row>
            <View>
              <Txt v="title">{price ? `$${price}` : tr('Bepul')}<Txt v="small" muted>{price ? (period === 'year' ? tr(' / yil') : tr(' / oy')) : ''}</Txt></Txt>
              {!!priceSom && DIGITAL_SALES && <Txt v="tiny" faint>{tr('≈ {sum} · YUMS balansidan', { sum: som(priceSom) })}</Txt>}
            </View>
            <View style={{ gap: 8 }}>
              {pl.perks.map(x => <Row key={x} gap={8}><Ionicons name="checkmark-circle" size={18} color={pl.color} /><Txt v="small" style={{ flex: 1 }}>{x}</Txt></Row>)}
            </View>
            {!current && (pl.id === 'free' || DIGITAL_SALES) && <Button title={pl.id === 'free' ? tr("Free'ga qaytish") : tr("{name}ga o'tish", { name: pl.name })} kind={pl.id === 'free' ? 'ghost' : 'dark'} onPress={() => {
              if (pl.id !== 'free') { setBuying(pl.id); return; }
              p.setPlan('free', false).then(ok => ok && toast(tr('Free tarifiga qaytdingiz'), 'leaf')).catch(() => {});
            }} />}
            {current && p.planUntil && <Txt v="tiny" faint>{tr('Amal qiladi: {v2} gacha · TOP kreditlari: {boostCredits}', { v2: `${fmtDay(p.planUntil)} ${new Date(p.planUntil).getFullYear()}`, boostCredits: p.boostCredits })}</Txt>}
          </Card>
        );
      })}

      {(DIGITAL_SALES || p.ads.length > 0) && <SectionHeader title={tr('Reklama')} />}
      {DIGITAL_SALES && (
      <View style={[styles.ad, { backgroundColor: '#0F1E3D' }]}>
        <Text style={styles.adKicker}>{tr('YUMS ADS')}</Text>
        <Text style={styles.adTitle}>{tr("Kompaniyangizni 86 mamlakatdagi auditoriyaga ko'rsating")}</Text>
        <Text style={styles.adSub}>{tr('Bosh sahifa banneri, qidiruv natijalari va soha sahifalari. Faqat tekshirilgan reklama beruvchilar.')}</Text>
        <Button title={p.isVerified ? tr('Reklama kampaniyasi yaratish') : tr('Avval profilni tasdiqlang')} icon={p.isVerified ? 'megaphone' : 'shield-checkmark'} style={{ marginTop: 10 }}
          onPress={() => (p.isVerified ? setAdOpen(true) : router.push('/verify'))} />
      </View>
      )}
      {p.ads.map(a => (
        <Card key={a.id}>
          <Row>
            {a.image ? (
              <Image source={{ uri: a.image }} style={styles.adThumb} contentFit="cover" />
            ) : (
              <View style={[styles.adThumb, { backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="megaphone-outline" size={20} color={c.muted} />
              </View>
            )}
            <View style={{ flex: 1 }}><Txt v="h3" numberOfLines={1}>{a.title}</Txt><Txt v="small" muted>{tr('${budget} byudjet', { budget: a.budget })}</Txt></View>
            <Badge label={a.status === 'active' ? tr('Faol') : tr("Ko'rib chiqilmoqda")} tone={a.status === 'active' ? 'ok' : 'warn'} />
          </Row>
        </Card>
      ))}

      <SectionHeader title={tr('Professional xizmatlar')} />
      <Card style={{ padding: 6 }}>
        {PRO_SERVICES.map(s => (
          <ListItem key={s.id} icon={s.icon} art={SERVICE_LOOK[s.id]?.art} title={s.title} sub={`${s.price} · ${s.desc}`} onPress={() => router.push({ pathname: '/service/[id]', params: { id: s.id } })} />
        ))}
      </Card>

      <Card style={{ gap: 6 }}>
        <Row gap={8}><Ionicons name="swap-horizontal" size={18} color={c.ok} /><Txt v="h3">{tr('Savdo komissiyasi')}</Txt></Row>
        <Txt v="small" muted style={{ lineHeight: 19 }}>{tr("YUMS Market orqali tuzilgan bitimlardan 3% komissiya — faqat qonuniy to'lov va shartnoma asosida. Loyiha va e'lon joylashtirish har doim bepul.")}</Txt>
      </Card>

      <Sheet visible={!!buying && !topup} onClose={() => setBuying(null)} title={tr("To'lov")} footer={
        viaClick
          ? <ClickButton title={tr("Click orqali to'lash")} onPress={() => setTopup('click')} busy={busy} />
          : shortOf > 0
          ? <Button title={tr("Balansni to'ldirish")} icon="wallet" onPress={() => setTopup('short')} />
          : <Button title={free ? tr('TOP kreditini ishlatish') : tr("${amount} to'lash", { amount })} icon="lock-closed" disabled={busy} onPress={() => { pay().catch(() => {}); }} />
      }>
        <Card style={{ backgroundColor: c.surface2, gap: 4 }}>
          <Txt v="small" muted>{buying === 'boost' ? tr('TOPga chiqarish · {days} kun', { days: boostDays }) : `${plan?.name} · ${tr('{n} oy', { n: period === 'year' ? 12 : 1 })}`}</Txt>
          <Txt v="h1">{buying === 'boost' && p.boostCredits > 0 ? tr('Bepul') : `$${amount}`}</Txt>
          {!!amountSom && !(buying === 'boost' && p.boostCredits > 0) && <Txt v="small" muted>{tr('≈ {sum} (joriy kurs bo\'yicha)', { sum: som(amountSom) })}</Txt>}
        </Card>
        {!free && (
          <View style={{ gap: 8 }}>
            <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>{tr("To'lov usuli")}</Txt>
            <PayMethod on={!viaClick} onPress={() => setMethod('balance')} title={tr('YUMS balansi')} sub={som(balance)}
              icon={<View style={[styles.payIco, { backgroundColor: c.surface2 }]}><Ionicons name="wallet" size={20} color={c.text} /></View>} />
            {clickOn && amountSom > 0 && (
              <PayMethod on={viaClick} onPress={() => setMethod('click')} title="Click" sub={tr('Click ilovasi orqali · {sum}', { sum: som(amountSom) })}
                icon={<View style={[styles.payIco, styles.payIcoClick, { borderColor: c.line }]}><ClickMark size={40} round={12} /></View>} />
            )}
          </View>
        )}
        {viaClick
          ? <Txt v="tiny" faint>{tr("Click ilovasi ochiladi. To'lov o'tgach tarif shu zahoti faollashadi.")}</Txt>
          : shortOf > 0
          ? <Txt v="small" style={{ color: c.danger }}>{tr("Balansda {sum} yetishmayapti. To'ldirsangiz, tarif shu zahoti faollashadi.", { sum: som(shortOf) })}</Txt>
          : <Txt v="tiny" faint>{free
            ? tr('Tarifingizdagi bepul TOP kreditlaridan biri ishlatiladi.')
            : tr("To'lov YUMS balansingizdan yechiladi. Tarif muddati tugagach avtomatik uzaytirilmaydi.")}</Txt>}
      </Sheet>
      <TopupSheet
        visible={!!topup}
        onClose={() => setTopup(null)}
        kind="passenger"
        cards={topup === 'short' ? cards.filter(card => card.status === 'ACTIVE') : []}
        onDone={() => { refreshWallet().catch(() => {}); }}
        fixedAmount={topup === 'click' ? amountSom : shortOf}
        title={topup === 'click' ? tr("Click orqali to'lash") : tr("Balansni to'ldirish")}
        onPaid={() => { setTopup(null); pay().catch(() => {}); }}
      />

      <Sheet visible={adOpen} onClose={() => setAdOpen(false)} title={tr('Reklama kampaniyasi')} footer={
        <Button title={tr('Moderatsiyaga yuborish')} icon="send" disabled={busy || adTitle.trim().length < 4} onPress={() => {
          setBusy(true);
          p.createAd(adTitle.trim(), adBudget, adImage)
            .then(ok => {
              if (!ok) return;
              refreshWallet().catch(() => {});
              setAdOpen(false); setAdTitle(''); setAdImage(undefined);
              toast(tr('Reklama tekshiruvga yuborildi'), 'megaphone');
            })
            .catch(() => {})
            .finally(() => setBusy(false));
        }} />
      }>
        <ImageSlot kind="banner" label={tr('Reklama banneri')} value={adImage} onChange={setAdImage} />
        <Field label={tr('Reklama sarlavhasi')} value={adTitle} onChangeText={setAdTitle} placeholder={tr('Masalan: Xalqaro yuk tashish — 12 kunda')} maxLength={60} />
        <Txt v="small" muted style={{ fontFamily: F.bold }}>{tr('Byudjet')}</Txt>
        <Row gap={8} style={{ flexWrap: 'wrap' }}>{[50, 150, 500, 1000].map(b => <Chip key={b} label={`$${b}`} active={adBudget === b} onPress={() => setAdBudget(b)} />)}</Row>
        <Txt v="tiny" faint>{tr("Taxminan {adBudget} ko'rsatish. Banner bosh sahifada 2:1 o'lchamda, «Reklama» belgisi bilan ko'rsatiladi.", { adBudget: adBudget * 120 })}</Txt>
        <Txt v="tiny" faint>{tr("Byudjet YUMS balansidan yechiladi; reklama rad etilsa to'liq qaytariladi. Balans: {sum}", { sum: som(balance) })}</Txt>
      </Sheet>
    </Screen>
  );
}

/** To'lov usuli qatori: belgi, nom, izoh va o'ngda tanlov doirasi */
function PayMethod({ on, onPress, title, sub, icon }: { on: boolean; onPress: () => void; title: string; sub: string; icon: ReactNode }) {
  const { colors: c } = useStore();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={() => { haptic.tap(); onPress(); }}
      style={({ pressed }) => [styles.method, { backgroundColor: on ? c.brandSoft : c.surface, borderColor: on ? c.brand : c.line, opacity: pressed ? 0.9 : 1 }]}>
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt v="h3" numberOfLines={1}>{title}</Txt>
        <Txt v="small" muted numberOfLines={1}>{sub}</Txt>
      </View>
      <View style={[styles.radio, { borderColor: on ? c.brand : c.faint, backgroundColor: on ? c.brand : 'transparent' }]}>
        {on && <Ionicons name="checkmark" size={14} color={c.brandText} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, borderWidth: 1.5 },
  payIco: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  payIcoClick: { backgroundColor: '#FFFFFF', borderWidth: StyleSheet.hairlineWidth },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  adThumb: { width: 64, height: 32, borderRadius: 8 },
  planIco: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  ad: { padding: 18, borderRadius: radius.l, gap: 6 },
  adKicker: { color: '#FFC800', fontSize: 10.5, fontFamily: F.heavy, letterSpacing: 1 },
  adTitle: { color: '#fff', fontSize: 16, fontFamily: F.display, letterSpacing: -0.5, lineHeight: 22 },
  adSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontFamily: F.semi, lineHeight: 18 },
});
