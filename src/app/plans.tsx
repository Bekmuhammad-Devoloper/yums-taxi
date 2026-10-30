import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ImageSlot } from '@/components/image-slot';
import { toast } from '@/components/toast';
import { Badge, Button, Card, Chip, Field, ListItem, Row, Screen, SectionHeader, Segmented, Sheet, Txt } from '@/components/ui';
import { useStartChat } from '@/lib/actions';
import { fmtDay } from '@/lib/format';
import { PLANS, PRO_SERVICES, type Plan } from '@/lib/platform-data';
import { usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F, radius } from '@/lib/theme';
import { tr } from '@/lib/i18n';

const BOOST_PRICE = 5;

export default function Plans() {
  const { boost } = useLocalSearchParams<{ boost?: string }>();
  const { colors: c } = useStore();
  const p = usePlatform();
  const start = useStartChat();
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const [buying, setBuying] = useState<Plan | 'boost' | null>(null);
  const [adOpen, setAdOpen] = useState(false);
  const [adTitle, setAdTitle] = useState('');
  const [adBudget, setAdBudget] = useState(50);
  const [adImage, setAdImage] = useState<string>();
  const boostProject = boost ? p.projects.find(x => x.id === boost) : undefined;

  const plan = buying && buying !== 'boost' ? PLANS.find(x => x.id === buying) : undefined;
  const amount = buying === 'boost' ? BOOST_PRICE : plan ? (period === 'year' ? plan.yearly : plan.price) : 0;

  const pay = () => {
    haptic.success();
    if (buying === 'boost' && boostProject) {
      p.boostProject(boostProject.id);
      toast(tr('«{title}» 7 kunga TOPga chiqarildi', { title: boostProject.title }), 'flash');
      setBuying(null);
      router.back();
      return;
    }
    if (plan) { p.setPlan(plan.id, period === 'year'); toast(tr('{name} tarifi faollashtirildi', { name: plan.name }), 'diamond'); }
    setBuying(null);
  };

  return (
    <Screen title={tr('Tariflar va reklama')} subtitle={tr("Bepul boshlang — kerak bo'lganda kengaytiring")}>
      {boostProject && (
        <Card style={{ gap: 10, borderWidth: 2, borderColor: c.brand }}>
          <Row gap={8}><Ionicons name="flash" size={20} color={c.brandDeep} /><Txt v="h3" style={{ flex: 1 }}>{tr('TOPga chiqarish')}</Txt><Txt v="h2">${BOOST_PRICE}</Txt></Row>
          <Txt v="small" muted>{tr("«{title}» 7 kun davomida bosh sahifa va qidiruvda birinchi ko'rsatiladi.", { title: boostProject.title })}</Txt>
          <Button title={tr("${BOOST_PRICE} to'lash", { BOOST_PRICE })} icon="card" onPress={() => setBuying('boost')} />
          <Txt v="tiny" faint>{tr('Pro tarifida oyiga 2 ta, Business tarifida 5 ta bepul TOP.')}</Txt>
        </Card>
      )}

      <Segmented value={period} onChange={setPeriod} items={[{ id: 'month', label: tr('Oylik') }, { id: 'year', label: tr('Yillik · −17%') }]} />

      {PLANS.map(pl => {
        const current = p.plan === pl.id;
        const price = period === 'year' ? pl.yearly : pl.price;
        return (
          <Card key={pl.id} style={[{ gap: 12 }, current && { borderWidth: 2, borderColor: pl.color }]}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row gap={8}>
                <View style={[styles.planIco, { backgroundColor: pl.color }]}><Ionicons name={pl.id === 'free' ? 'leaf' : pl.id === 'pro' ? 'rocket' : 'business'} size={18} color="#fff" /></View>
                <Txt v="h2">{pl.name}</Txt>
              </Row>
              {current ? <Badge label={tr('Joriy tarif')} tone="ok" icon="checkmark" /> : pl.id === 'pro' ? <Badge label={tr('Mashhur')} tone="brand" /> : null}
            </Row>
            <Txt v="title">{price ? `$${price}` : tr('Bepul')}<Txt v="small" muted>{price ? (period === 'year' ? tr(' / yil') : tr(' / oy')) : ''}</Txt></Txt>
            <View style={{ gap: 8 }}>
              {pl.perks.map(x => <Row key={x} gap={8}><Ionicons name="checkmark-circle" size={18} color={pl.color} /><Txt v="small" style={{ flex: 1 }}>{x}</Txt></Row>)}
            </View>
            {!current && <Button title={pl.id === 'free' ? tr("Free'ga qaytish") : tr("{name}ga o'tish", { name: pl.name })} kind={pl.id === 'free' ? 'ghost' : 'dark'} onPress={() => {
              if (pl.id !== 'free') { setBuying(pl.id); return; }
              p.setPlan('free', false);
              toast(tr('Free tarifiga qaytdingiz'), 'leaf');
            }} />}
            {current && p.planUntil && <Txt v="tiny" faint>{tr('Amal qiladi: {v2} gacha · TOP kreditlari: {boostCredits}', { v2: `${fmtDay(p.planUntil)} ${new Date(p.planUntil).getFullYear()}`, boostCredits: p.boostCredits })}</Txt>}
          </Card>
        );
      })}

      <SectionHeader title={tr('Reklama')} />
      <View style={[styles.ad, { backgroundColor: '#0F1E3D' }]}>
        <Text style={styles.adKicker}>{tr('YUMS ADS')}</Text>
        <Text style={styles.adTitle}>{tr("Kompaniyangizni 86 mamlakatdagi auditoriyaga ko'rsating")}</Text>
        <Text style={styles.adSub}>{tr('Bosh sahifa banneri, qidiruv natijalari va soha sahifalari. Faqat tekshirilgan reklama beruvchilar.')}</Text>
        <Button title={p.isVerified ? tr('Reklama kampaniyasi yaratish') : tr('Avval profilni tasdiqlang')} icon={p.isVerified ? 'megaphone' : 'shield-checkmark'} style={{ marginTop: 10 }}
          onPress={() => (p.isVerified ? setAdOpen(true) : router.push('/verify'))} />
      </View>
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
          <ListItem key={s.id} icon={s.icon} title={s.title} sub={`${s.price} · ${s.desc}`} onPress={() => start({ peerId: 'support', peerName: tr("YUMS qo'llab-quvvatlash"), peerKind: 'support', peerVerified: true }, { subject: s.title })} />
        ))}
      </Card>

      <Card style={{ gap: 6 }}>
        <Row gap={8}><Ionicons name="swap-horizontal" size={18} color={c.ok} /><Txt v="h3">{tr('Savdo komissiyasi')}</Txt></Row>
        <Txt v="small" muted style={{ lineHeight: 19 }}>{tr("YUMS Market orqali tuzilgan bitimlardan 3% komissiya — faqat qonuniy to'lov va shartnoma asosida. Loyiha va e'lon joylashtirish har doim bepul.")}</Txt>
      </Card>

      <Sheet visible={!!buying} onClose={() => setBuying(null)} title={tr("To'lov")} footer={<Button title={tr("${amount} to'lash", { amount })} icon="lock-closed" onPress={pay} />}>
        <Card style={{ backgroundColor: c.surface2, gap: 4 }}>
          <Txt v="small" muted>{buying === 'boost' ? tr('TOPga chiqarish · 7 kun') : `${plan?.name} · ${tr('{n} oy', { n: period === 'year' ? 12 : 1 })}`}</Txt>
          <Txt v="h1">${amount}</Txt>
        </Card>
        <Row gap={8}>
          <Chip label={tr('Visa / Mastercard')} icon="card-outline" active />
          <Chip label={tr('Uzcard / Humo')} icon="card-outline" />
        </Row>
        <Txt v="tiny" faint>{tr("Demo rejim: haqiqiy to'lov olinmaydi. Ishga tushirishda to'lovlar litsenziyalangan to'lov provayderi orqali qabul qilinadi.")}</Txt>
      </Sheet>

      <Sheet visible={adOpen} onClose={() => setAdOpen(false)} title={tr('Reklama kampaniyasi')} footer={
        <Button title={tr('Moderatsiyaga yuborish')} icon="send" disabled={adTitle.trim().length < 4} onPress={() => { p.createAd(adTitle.trim(), adBudget, adImage); setAdOpen(false); setAdTitle(''); setAdImage(undefined); toast(tr('Reklama tekshiruvga yuborildi'), 'megaphone'); }} />
      }>
        <ImageSlot kind="banner" label={tr('Reklama banneri')} value={adImage} onChange={setAdImage} />
        <Field label={tr('Reklama sarlavhasi')} value={adTitle} onChangeText={setAdTitle} placeholder={tr('Masalan: Xalqaro yuk tashish — 12 kunda')} maxLength={60} />
        <Txt v="small" muted style={{ fontFamily: F.bold }}>{tr('Byudjet')}</Txt>
        <Row gap={8}>{[50, 150, 500, 1000].map(b => <Chip key={b} label={`$${b}`} active={adBudget === b} onPress={() => setAdBudget(b)} />)}</Row>
        <Txt v="tiny" faint>{tr("Taxminan {adBudget} ko'rsatish. Banner bosh sahifada 2:1 o'lchamda, «Reklama» belgisi bilan ko'rsatiladi.", { adBudget: adBudget * 120 })}</Txt>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  adThumb: { width: 64, height: 32, borderRadius: 8 },
  planIco: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  ad: { padding: 18, borderRadius: radius.l, gap: 6 },
  adKicker: { color: '#FFC800', fontSize: 10.5, fontFamily: F.heavy, letterSpacing: 1 },
  adTitle: { color: '#fff', fontSize: 16, fontFamily: F.display, letterSpacing: -0.5, lineHeight: 22 },
  adSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontFamily: F.semi, lineHeight: 18 },
});
