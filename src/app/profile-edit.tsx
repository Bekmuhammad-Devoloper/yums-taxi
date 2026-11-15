import { router } from 'expo-router';
import { useState } from 'react';

import { View } from 'react-native';

import { AvatarEditor } from '@/components/avatar-editor';
import { PickerSheet, SelectField } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Button, Card, Chip, Field, Flag, Row, Screen, SectionTitle, Sheet, Txt } from '@/components/ui';
import { confirmContact, requestContactCode } from '@/lib/account-api';
import { errorText } from '@/lib/api';
import { COUNTRIES } from '@/lib/platform-data';
import { countryOf } from '@/lib/platform';
import { useStore, type AccountKind } from '@/lib/store';
import { tr } from '@/lib/i18n';

const EMAIL = /^\S+@\S+\.\S+$/;

export default function ProfileEdit() {
  const { user, updateUser, adoptUser } = useStore();
  const [kind, setKind] = useState<AccountKind>(user?.kind ?? 'person');
  const [name, setName] = useState(user?.name ?? '');
  const [company, setCompany] = useState(user?.company ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [country, setCountry] = useState(user?.country ?? 'UZ');
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const valid = name.trim().length > 1 && (kind === 'person' || company.trim().length > 1);
  const k = countryOf(country);

  // Email faqat tasdiqlash kodi orqali o'zgaradi (server PATCH'da emailni qabul qilmaydi)
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const emailOk = EMAIL.test(email.trim());

  const save = async () => {
    setSaving(true);
    const ok = await updateUser({ kind, name: name.trim(), company: kind === 'company' ? company.trim() : undefined, bio: bio.trim() || undefined, country });
    setSaving(false);
    if (!ok) return;
    toast(tr('Profil saqlandi'), 'checkmark-circle');
    router.back();
  };

  const openEmail = () => { setEmail(user?.email ?? ''); setCode(''); setCodeSent(false); setEmailOpen(true); };
  const sendCode = async () => {
    setBusy(true);
    try {
      await requestContactCode({ email: email.trim() });
      setCodeSent(true);
      toast(tr('Tasdiqlash kodi {email} manziliga yuborildi', { email: email.trim() }), 'mail');
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    try {
      adoptUser(await confirmContact({ email: email.trim() }, code.trim()));
      setEmailOpen(false);
      toast(tr('Email tasdiqlandi'), 'checkmark-circle');
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={tr('Profilni tahrirlash')} footer={<Button title={tr('Saqlash')} disabled={!valid || saving} onPress={() => { save().catch(() => {}); }} />}>
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
        <View style={{ gap: 6 }}>
          <Field label={tr('Email')} value={user?.email ?? ''} editable={false} placeholder={tr("Qo'shilmagan")} hint={user?.email ? tr('Tasdiqlangan') : undefined} />
          <Button title={user?.email ? tr("Emailni o'zgartirish") : tr("Email qo'shish")} kind="ghost" small icon="mail-outline" onPress={openEmail} />
        </View>
        <Field label={tr('Telefon')} value={user?.phone} editable={false} hint={tr('Telefon raqami kirish uchun ishlatiladi')} />
        <SelectField label={tr('Mamlakat')} value={k.name} left={<Flag code={k.code} size={22} />} placeholder={tr('Mamlakat')} onPress={() => setPicker(true)} />
        <Field label={kind === 'company' ? tr('Kompaniya haqida') : tr("O'zingiz haqingizda")} value={bio} onChangeText={setBio} multiline maxLength={300} placeholder={tr('Faoliyat, tajriba, nimalarni taklif qilasiz…')} hint={`${bio.length}/300`} />
      </Card>
      <Txt v="tiny" faint style={{ paddingHorizontal: 4 }}>{tr("Profil turini o'zgartirsangiz, «Tasdiqlangan» belgisi uchun hujjatlarni qayta yuborish kerak bo'lishi mumkin.")}</Txt>
      <PickerSheet visible={picker} onClose={() => setPicker(false)} title={tr('Mamlakat')} selected={[country]} onChange={ids => setCountry(ids[0])}
        options={COUNTRIES.map(x => ({ id: x.code, label: x.name, flag: x.code, sub: x.region }))} />

      <Sheet visible={emailOpen} onClose={() => setEmailOpen(false)} title={tr('Email')} footer={
        codeSent
          ? <Button title={tr('Tasdiqlash')} icon="checkmark" disabled={busy || code.trim().length < 4} onPress={() => { verify().catch(() => {}); }} />
          : <Button title={tr('Kod yuborish')} icon="send" disabled={busy || !emailOk} onPress={() => { sendCode().catch(() => {}); }} />
      }>
        <Field label={tr('Email')} value={email} onChangeText={v => { setEmail(v); setCodeSent(false); }} keyboardType="email-address" autoCapitalize="none" placeholder={tr('name@example.com')}
          error={!email.trim() || emailOk ? undefined : tr("Email noto'g'ri")} />
        {codeSent && (
          <>
            <Field label={tr('Tasdiqlash kodi')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoFocus />
            <Button title={tr('Kodni qayta yuborish')} kind="ghost" small disabled={busy} onPress={() => { sendCode().catch(() => {}); }} />
          </>
        )}
        <Txt v="tiny" faint>{tr('Email ikki bosqichli kirish (2FA) va hisob xabarlari uchun ishlatiladi.')}</Txt>
      </Sheet>
    </Screen>
  );
}
