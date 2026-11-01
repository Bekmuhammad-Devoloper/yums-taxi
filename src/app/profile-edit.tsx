import { router } from 'expo-router';
import { useState } from 'react';

import { View } from 'react-native';

import { AvatarEditor } from '@/components/avatar-editor';
import { PickerSheet, SelectField } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Button, Card, Chip, Field, Flag, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { COUNTRIES } from '@/lib/platform-data';
import { countryOf } from '@/lib/platform';
import { useStore, type AccountKind } from '@/lib/store';
import { tr } from '@/lib/i18n';

export default function ProfileEdit() {
  const { user, updateUser } = useStore();
  const [kind, setKind] = useState<AccountKind>(user?.kind ?? 'person');
  const [name, setName] = useState(user?.name ?? '');
  const [company, setCompany] = useState(user?.company ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [country, setCountry] = useState(user?.country ?? 'UZ');
  const [picker, setPicker] = useState(false);
  const emailOk = !email.trim() || /^\S+@\S+\.\S+$/.test(email.trim());
  const valid = name.trim().length > 1 && emailOk && (kind === 'person' || company.trim().length > 1);
  const k = countryOf(country);

  const save = () => {
    updateUser({ kind, name: name.trim(), company: kind === 'company' ? company.trim() : undefined, email: email.trim() || undefined, bio: bio.trim() || undefined, country });
    toast(tr('Profil saqlandi'), 'checkmark-circle');
    router.back();
  };

  return (
    <Screen title={tr('Profilni tahrirlash')} footer={<Button title={tr('Saqlash')} disabled={!valid} onPress={save} />}>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 6 }}>
        <AvatarEditor size={96} />
        <Txt v="small" muted>{tr("Rasmni o'zgartirish uchun bosing")}</Txt>
      </View>
      <SectionTitle>{tr('Profil turi')}</SectionTitle>
      <Row gap={8}>
        <Chip label={tr('Jismoniy shaxs')} icon="person-outline" active={kind === 'person'} onPress={() => setKind('person')} />
        <Chip label={tr('Kompaniya')} icon="business-outline" active={kind === 'company'} onPress={() => setKind('company')} />
      </Row>
      <Card style={{ gap: 14 }}>
        {kind === 'company' && <Field label={tr('Kompaniya nomi')} value={company} onChangeText={setCompany} placeholder={tr('Masalan: Silk Road Logistics')} />}
        <Field label={kind === 'company' ? tr("Mas'ul shaxs") : tr('Ism familiya')} value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label={tr('Email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder={tr('name@example.com')} error={emailOk ? undefined : tr("Email noto'g'ri")} />
        <Field label={tr('Telefon')} value={user?.phone} editable={false} hint={tr('Telefon raqami kirish uchun ishlatiladi')} />
        <SelectField label={tr('Mamlakat')} value={k.name} left={<Flag code={k.code} size={22} />} placeholder={tr('Mamlakat')} onPress={() => setPicker(true)} />
        <Field label={kind === 'company' ? tr('Kompaniya haqida') : tr("O'zingiz haqingizda")} value={bio} onChangeText={setBio} multiline maxLength={300} placeholder={tr('Faoliyat, tajriba, nimalarni taklif qilasiz…')} hint={`${bio.length}/300`} />
      </Card>
      <Txt v="tiny" faint style={{ paddingHorizontal: 4 }}>{tr("Profil turini o'zgartirsangiz, «Tasdiqlangan» belgisi uchun hujjatlarni qayta yuborish kerak bo'lishi mumkin.")}</Txt>
      <PickerSheet visible={picker} onClose={() => setPicker(false)} title={tr('Mamlakat')} selected={[country]} onChange={ids => setCountry(ids[0])}
        options={COUNTRIES.map(x => ({ id: x.code, label: x.name, flag: x.code, sub: x.region }))} />
    </Screen>
  );
}
