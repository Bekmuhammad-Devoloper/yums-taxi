import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Row, SearchBar, Sheet, Txt } from '@/components/ui';
import { CAR_MODELS, CLASS_NAME, carTitle, type CarClass, type CarModel } from '@/driver/lib/requirements';
import { useStore } from '@/lib/store';
import { F } from '@/lib/theme';

const ORDER: CarClass[] = ['economy', 'comfort', 'business', 'minivan', 'cargo'];

/** Avtomobil modelini katalogdan tanlash — sinfi tariflarni belgilaydi */
export function CarPicker({ visible, onClose, value, onPick }: { visible: boolean; onClose: () => void; value?: string; onPick: (m: CarModel) => void }) {
  const { colors: c } = useStore();
  const [q, setQ] = useState('');
  const list = CAR_MODELS.filter(m => carTitle(m).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Sheet visible={visible} onClose={onClose} title="Avtomobil modeli">
      <SearchBar value={q} onChangeText={setQ} placeholder="Masalan: Cobalt" />
      {ORDER.map(cls => {
        const items = list.filter(m => m.cls === cls);
        if (!items.length) return null;
        return (
          <View key={cls} style={{ gap: 6 }}>
            <Txt v="tiny" muted style={styles.caps}>{CLASS_NAME[cls]}</Txt>
            {items.map(m => {
              const on = value === carTitle(m);
              return (
                <Pressable key={carTitle(m)} onPress={() => { onPick(m); onClose(); }} accessibilityLabel={carTitle(m)}
                  style={[styles.row, { backgroundColor: on ? c.brandSoft : c.surface2, borderColor: on ? c.brand : 'transparent' }]}>
                  <Row gap={10} style={{ flex: 1 }}>
                    <Ionicons name={cls === 'minivan' ? 'bus-outline' : cls === 'cargo' ? 'cube-outline' : 'car-sport-outline'} size={18} color={c.muted} />
                    <Txt v="h3" style={{ flex: 1 }}>{carTitle(m)}</Txt>
                    <Txt v="tiny" muted>{m.seats} o&apos;rin</Txt>
                  </Row>
                  {on ? <Ionicons name="checkmark-circle" size={20} color={c.brandDeep} /> : null}
                </Pressable>
              );
            })}
          </View>
        );
      })}
      {!list.length && <Txt v="small" muted>Topilmadi. Katalogda bo&apos;lmagan avtomobil uchun yordam markaziga yozing.</Txt>}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  caps: { fontFamily: F.bold, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1.5 },
});
