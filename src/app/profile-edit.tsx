import { router } from 'expo-router';
import { useState } from 'react';

import { PickerSheet, SelectField } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Button, Card, Chip, Field, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { COUNTRIES } from '@/lib/platform-data';
import { countryOf } from '@/lib/platform';
import { useStore, type AccountKind } from '@/lib/store';

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
    toast('Profil saqlandi', 'checkmark-circle');
    router.back();
  };

  return (
    <Screen title="Profilni tahrirlash" footer={<Button title="Saqlash" disabled={!valid} onPress={save} />}>
      <SectionTitle>Profil turi</SectionTitle>
      <Row gap={8}>
        <Chip label="Jismoniy shaxs" icon="person-outline" active={kind === 'person'} onPress={() => setKind('person')} />
        <Chip label="Kompaniya" icon="business-outline" active={kind === 'company'} onPress={() => setKind('company')} />
      </Row>
      <Card style={{ gap: 14 }}>
        {kind === 'company' && <Field label="Kompaniya nomi" value={company} onChangeText={setCompany} placeholder="Masalan: Silk Road Logistics" />}
        <Field label={kind === 'company' ? 'Mas\'ul shaxs' : 'Ism familiya'} value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="name@example.com" error={emailOk ? undefined : "Email noto'g'ri"} />
        <Field label="Telefon" value={user?.phone} editable={false} hint="Telefon raqami kirish uchun ishlatiladi" />
        <SelectField label="Mamlakat" value={`${k.flag} ${k.name}`} placeholder="Mamlakat" onPress={() => setPicker(true)} />
        <Field label={kind === 'company' ? 'Kompaniya haqida' : "O'zingiz haqingizda"} value={bio} onChangeText={setBio} multiline maxLength={300} placeholder="Faoliyat, tajriba, nimalarni taklif qilasiz…" hint={`${bio.length}/300`} />
      </Card>
      <Txt v="tiny" faint style={{ paddingHorizontal: 4 }}>Profil turini o'zgartirsangiz, «Tasdiqlangan» belgisi uchun hujjatlarni qayta yuborish kerak bo'lishi mumkin.</Txt>
      <PickerSheet visible={picker} onClose={() => setPicker(false)} title="Mamlakat" selected={[country]} onChange={ids => setCountry(ids[0])}
        options={COUNTRIES.map(x => ({ id: x.code, label: x.name, emoji: x.flag, sub: x.region }))} />
    </Screen>
  );
}
