// /admin — taksi xizmatini boshqarish paneli: kirish, chap menyu va ichki sahifalar.
import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useStore } from '@/lib/store';
import { Login, Shell } from '@/site/components/admin/shell';
import { AdminProvider, useAdmin } from '@/site/lib/admin-store';

function Gate() {
  const { authed, state } = useAdmin();
  const { colors: c } = useStore();
  useEffect(() => {
    if (typeof document !== 'undefined') document.title = 'YUMS Admin';
  }, []);
  if (authed === null) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  if (!authed) return <Login />;
  return (
    <Shell>
      {state.ready ? <Slot /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.muted} /></View>}
    </Shell>
  );
}

export default function AdminLayout() {
  return (
    <AdminProvider>
      <Gate />
    </AdminProvider>
  );
}
