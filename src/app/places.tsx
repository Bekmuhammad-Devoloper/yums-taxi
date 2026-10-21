import { router } from 'expo-router';
import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { toast } from '@/components/toast';
import { Card, ListItem, Screen, Txt } from '@/components/ui';
import { useStore } from '@/lib/store';

export default function Places() {
  const { colors: c, saved, savePlace } = useStore();
  const row = (k: 'home' | 'work', label: string, icon: 'home' | 'briefcase') => {
    const p = saved[k];
    return (
      <ListItem
        icon={icon}
        iconBg={c.brandSoft}
        title={label}
        sub={p ? p.title : "Manzil qo'shilmagan"}
        onPress={() => router.push(`/search?mode=${k}`)}
        right={p ? (
          <Pressable hitSlop={8} onPress={() => { savePlace(k, undefined); toast("Manzil o'chirildi", 'trash'); }}>
            <Ionicons name="trash-outline" size={19} color={c.faint} />
          </Pressable>
        ) : <Ionicons name="add-circle" size={24} color="#E0A800" />}
      />
    );
  };
  return (
    <Screen title="Manzillarim">
      <Card style={{ padding: 6 }}>
        {row('home', 'Uy', 'home')}
        {row('work', 'Ish', 'briefcase')}
      </Card>
      <Txt v="small" muted style={{ paddingHorizontal: 4 }}>Saqlangan manzillar bosh ekranda tez tanlash uchun chiqadi.</Txt>
    </Screen>
  );
}
