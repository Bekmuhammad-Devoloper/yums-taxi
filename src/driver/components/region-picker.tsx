import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { Sheet, Txt } from '@/components/ui';
import { REGIONS, regionName } from '@/lib/regions';
import { useStore } from '@/lib/store';
import { tr } from '@/lib/i18n';

interface RegionPickerProps {
  visible: boolean;
  onClose: () => void;
  value: string;
  onPick: (uz: string) => void;
}

/** Haydovchining ish hududi — O'zbekistonning 14 hududidan bittasi. Qiymat o'zbekcha nom: server hududni shundan topadi */
export function RegionPicker({ visible, onClose, value, onPick }: RegionPickerProps) {
  const { colors: c } = useStore();
  return (
    <Sheet visible={visible} onClose={onClose} title={tr('Shahar / hudud')}>
      {REGIONS.UZ?.map(region => {
        const on = value === region.uz;
        return (
          <Pressable key={region.uz} onPress={() => { onPick(region.uz); onClose(); }} accessibilityLabel={regionName(region)} accessibilityState={{ selected: on }}
            style={[styles.row, { backgroundColor: on ? c.brandSoft : c.surface2, borderColor: on ? c.brand : 'transparent' }]}>
            <Txt v="h3" style={{ flex: 1 }}>{regionName(region)}</Txt>
            {on ? <Ionicons name="checkmark-circle" size={20} color={c.brandDeep} /> : null}
          </Pressable>
        );
      })}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1.5 },
});
