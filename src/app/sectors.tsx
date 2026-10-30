import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { SectorIcon } from '@/components/platform-ui';
import { Row, Screen, Txt } from '@/components/ui';
import { SECTORS } from '@/lib/platform-data';
import { usePlatform } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { radius, shadow } from '@/lib/theme';
import { tr } from '@/lib/i18n';

export default function Sectors() {
  const { colors: c } = useStore();
  const p = usePlatform();
  return (
    <Screen title={tr('Sohalar')} subtitle={tr("{length} ta yo'nalish · faoliyat qonunchilikka muvofiq tekshiriladi", { length: SECTORS.length })}>
      <View style={styles.grid}>
        {SECTORS.map(s => {
          const n = p.publicProjects.filter(x => x.sector === s.id).length;
          return (
            <Pressable
              key={s.id}
              onPress={() => { haptic.tap(); router.push({ pathname: '/world', params: { sector: s.id } }); }}
              style={({ pressed }) => [styles.card, { backgroundColor: c.surface, transform: [{ scale: pressed ? 0.97 : 1 }] }, shadow(c, 0.4)]}>
              <Row style={{ justifyContent: 'space-between' }}>
                <SectorIcon id={s.id} size={46} />
                {n > 0 && <Txt v="tiny" faint>{tr('{n} loyiha', { n })}</Txt>}
              </Row>
              <Txt v="h3" numberOfLines={2} style={{ fontSize: 14.5 }}>{s.name}</Txt>
              <Txt v="tiny" faint numberOfLines={3} style={{ lineHeight: 15 }}>{s.examples}</Txt>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', flexGrow: 1, padding: 14, borderRadius: radius.l, gap: 8 },
});
