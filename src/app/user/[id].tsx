// Foydalanuvchining (jismoniy shaxs) ochiq profili: chat tepasidagi ismni yoki loyiha muallifini bosganda
// ochiladi — kompaniya va mutaxassis sahifalari kabi. Alohida server so'rovi yo'q: ochiq katalogdagi uning
// loyihalari va e'lonlaridan yig'iladi; ism va tasdiq belgisi chatdan parametr bilan keladi, shuning uchun
// loyihasi bo'lmasa ham profil bo'sh qolmaydi.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MarketCard, Place, ProjectCard, ReportSheet } from '@/components/platform-ui';
import { Avatar, Badge, Button, Card, EmptyState, IconButton, Row, Screen, SectionHeader, Txt, Verified } from '@/components/ui';
import { useStartChat } from '@/lib/actions';
import { tr } from '@/lib/i18n';
import { usePlatform } from '@/lib/platform';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

export default function UserScreen() {
  const { id, name, verified, conv } = useLocalSearchParams<{ id: string; name?: string; verified?: string; conv?: string }>();
  const { colors: c, user } = useStore();
  const p = usePlatform();
  const start = useStartChat();
  const [reporting, setReporting] = useState(false);

  const projects = p.publicProjects.filter(x => x.ownerId === id && x.ownerKind === 'person');
  const listings = p.publicMarket.filter(x => x.sellerId === id);
  const fullName = name || projects[0]?.ownerName || listings[0]?.sellerName || tr('Foydalanuvchi');
  const isVerified = verified === '1' || projects.some(x => x.ownerVerified) || listings.some(x => x.sellerVerified);
  const mine = !!user && id === user.id;
  const home = projects[0] ? { code: projects[0].country, city: projects[0].city } : listings[0] ? { code: listings[0].country, city: undefined } : null;
  const views = projects.reduce((sum, x) => sum + x.views, 0);
  const peer = { peerId: id, peerName: fullName, peerKind: 'person' as const, peerVerified: isVerified };
  // chatdan kelgan bo'lsa va u oddiy suhbat bo'lsa — «Yozish» o'sha suhbatga qaytaradi, yangisini ochmaydi
  const from = conv ? p.conversations.find(x => x.id === conv) : undefined;
  const write = () => {
    if (from && (from.kind === 'chat' || from.requestStatus === 'accepted') && router.canGoBack()) router.back();
    else start(peer);
  };
  const rows: (typeof listings)[] = [];
  for (let i = 0; i < listings.length; i += 2) rows.push(listings.slice(i, i + 2));

  return (
    <Screen
      title={fullName}
      subtitle="YUMS"
      right={!mine ? <IconButton name="flag-outline" size={42} onPress={() => setReporting(true)} /> : undefined}
      footer={!mine ? <Button title={tr('Yozish')} icon="chatbubble-ellipses" onPress={write} /> : undefined}>
      <Card style={styles.hero}>
        <View style={{ alignItems: 'center' }}>
          <Avatar name={fullName} size={84} bg={c.accent} uri={mine ? user?.avatar : undefined} />
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Row gap={5} style={{ justifyContent: 'center' }}>
            <Txt v="h2" numberOfLines={2} style={{ flexShrink: 1, textAlign: 'center' }}>{fullName}</Txt>
            {isVerified && <Verified size={18} />}
          </Row>
          <Txt v="small" muted style={{ fontFamily: F.semi }}>{tr('Jismoniy shaxs')}</Txt>
          {home && <Place code={home.code} city={home.city} faint />}
        </View>
        <Badge
          label={isVerified ? tr('Shaxsi tasdiqlangan') : tr('Shaxsi hali tasdiqlanmagan')}
          icon={isVerified ? 'shield-checkmark' : 'alert-circle-outline'}
          tone={isVerified ? 'ok' : 'muted'}
          style={{ alignSelf: 'center' }}
        />
        {/* loyihalar · e'lonlar · ko'rishlar — bir qatorda */}
        <View style={[styles.stats, { borderTopColor: c.line }]}>
          {[
            { label: tr('Loyihalar'), value: projects.length },
            { label: tr("E'lonlar"), value: listings.length },
            { label: tr("Ko'rishlar"), value: views },
          ].map((s, i) => (
            <View key={s.label} style={[styles.stat, i > 0 && { borderStartWidth: StyleSheet.hairlineWidth, borderStartColor: c.line }]}>
              <Txt style={styles.statValue}>{s.value.toLocaleString('en-US')}</Txt>
              <Txt v="tiny" muted numberOfLines={1}>{s.label}</Txt>
            </View>
          ))}
        </View>
      </Card>

      {projects.length > 0 && <SectionHeader title={tr('Loyihalari')} />}
      {projects.map(x => <ProjectCard key={x.id} p={x} />)}

      {listings.length > 0 && <SectionHeader title={tr("E'lonlari")} />}
      {rows.map((r, i) => (
        <Row key={i} gap={12} style={{ alignItems: 'stretch' }}>
          {r.map(m => <MarketCard key={m.id} m={m} style={{ flex: 1 }} />)}
          {r.length === 1 && <View style={{ flex: 1 }} />}
        </Row>
      ))}

      {!projects.length && !listings.length && (
        <EmptyState icon="folder-open-outline" title={tr("Hali ochiq loyiha yoki e'lon yo'q")} sub={tr("{name} katalogga loyiha yoki e'lon joylasa, shu yerda ko'rinadi", { name: fullName })} />
      )}

      <ReportSheet visible={reporting} onClose={() => setReporting(false)} kind="user" id={id} title={fullName} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'stretch', gap: 12, paddingTop: 22, paddingBottom: 6 },
  stats: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 4, paddingTop: 12, paddingBottom: 6 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontFamily: F.heavy, fontSize: 19, fontVariant: ['tabular-nums'] },
});
