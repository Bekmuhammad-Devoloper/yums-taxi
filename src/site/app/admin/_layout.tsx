// /admin — taksi xizmatini boshqarish paneli: kirish, chap menyu va ichki sahifalar.
// Panel faqat o'zbek tilida: sayt boshqa tilda (masalan, arabcha) ochilgan bo'lsa ham bu yerda o'zbekcha va chapdan o'ngga.
import { Slot } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { dirProps, setAppLang } from '@/lib/i18n';
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

/** Panelga kirganda o'zbek tili yoqiladi (birinchi chizishdan oldin), chiqqanda sayt tili qaytariladi */
function useUzbek() {
  const { lang } = useStore();
  useState(() => setAppLang('uz'));
  useLayoutEffect(() => {
    setAppLang('uz');
    return () => { setAppLang(lang); };
  }, [lang]);
}

export default function AdminLayout() {
  useUzbek();
  return (
    <View {...dirProps('uz')} style={{ flex: 1 }}>
      <AdminProvider>
        <Gate />
      </AdminProvider>
    </View>
  );
}
