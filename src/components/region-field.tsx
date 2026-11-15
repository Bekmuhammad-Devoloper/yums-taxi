// Shahar / hudud maydoni: mamlakatning viloyatlari ro'yxati bo'lsa — ro'yxatdan tanlanadi,
// bo'lmasa — qo'lda yoziladi. Ro'yxatga mos kelmaydigan eski qiymat ham o'z holicha ko'rinadi.
import { useState } from 'react';
import { View } from 'react-native';

import { PickerSheet, SelectField } from '@/components/platform-ui';
import { Field, Txt } from '@/components/ui';
import { REGIONS, findRegion, regionName } from '@/lib/regions';
import { useStore } from '@/lib/store';
import { tr } from '@/lib/i18n';

export function RegionField({ country, value, onChange, error }: { country: string; value: string; onChange: (v: string) => void; error?: string }) {
  const { colors: c } = useStore();
  const [open, setOpen] = useState(false);
  const list = REGIONS[country];

  if (!list) {
    return <Field label={tr('Shahar / hudud')} value={value} onChangeText={onChange} placeholder={tr('Masalan: Toshkent')} error={error} />;
  }

  const picked = findRegion(country, value);
  return (
    <View style={{ gap: 6 }}>
      <SelectField
        label={tr('Shahar / hudud')}
        value={picked ? regionName(picked) : value}
        placeholder={tr('Hududni tanlang')}
        icon="location-outline"
        onPress={() => setOpen(true)}
      />
      {error ? <Txt v="tiny" color={c.danger} style={{ marginLeft: 4 }}>{error}</Txt> : null}
      <PickerSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={tr('Shahar / hudud')}
        selected={picked ? [picked.uz] : []}
        onChange={ids => ids[0] && onChange(ids[0])}
        options={list.map(x => ({ id: x.uz, label: regionName(x) }))}
      />
    </View>
  );
}
