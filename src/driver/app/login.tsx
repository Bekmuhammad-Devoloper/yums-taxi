import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { LangButton } from '@/components/lang-picker';
import { toast } from '@/components/toast';
import { BrandMark, Button, Field, Row, Screen, Txt } from '@/components/ui';
import { useDriver } from '@/driver/lib/driver-store';
import { requestOtp, verifyOtp, verifySecondFactor, type SecondStep } from '@/lib/account-api';
import { errorText } from '@/lib/api';
import { tr } from '@/lib/i18n';
import { useStore } from '@/lib/store';

const CODE_LEN = 4;

const fmtPhone = (s: string) => {
  const d = s.replace(/\D/g, '').replace(/^998/, '').slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
};

export default function Login() {
  const { signIn } = useStore();
  const { loadAccount } = useDriver();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [second, setSecond] = useState<SecondStep | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const fullPhone = `+998${phone.replace(/\D/g, '')}`;

  const send = async () => {
    setBusy(true);
    try {
      await requestOtp({ phone: fullPhone });
      setSent(true);
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const result = second
        ? { user: await verifySecondFactor(second.challengeId, code) }
        : await verifyOtp({ phone: fullPhone }, code);
      if ('second' in result) {
        // ikki bosqichli himoya: ikkinchi kod emailga yuborildi
        setSecond(result.second);
        setCode('');
        toast(tr('Ikkinchi kod {destination} manziliga yuborildi', { destination: result.second.destination }), 'shield-checkmark');
        return;
      }
      // Hisob avval yuklanadi: haydovchi ro'yxatdan o'tish sahifasini ko'rmaydi
      await loadAccount();
      signIn(result.user);
    } catch (error) {
      toast(errorText(error), 'alert-circle');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={tr('YUMS Driver')} subtitle={tr('Telefon raqamingiz bilan kiring')} back={false} right={<LangButton />}>
        <View style={{ gap: 16 }}>
          <Row style={{ justifyContent: 'center', paddingVertical: 8 }}><BrandMark size={72} /></Row>
          <Field label={tr('Telefon')} prefix="+998" keyboardType="phone-pad" placeholder="90 123 45 67" value={phone} editable={!sent} onChangeText={v => setPhone(fmtPhone(v))} />
          {sent ? (
            <>
              <Field label={tr('Tasdiqlash kodi')} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={CODE_LEN} value={code} onChangeText={v => setCode(v.replace(/\D/g, ''))} autoFocus />
              <Button title={tr('Kirish')} icon="log-in-outline" loading={busy} disabled={code.length !== CODE_LEN} onPress={verify} />
            </>
          ) : (
            <Button title={tr('Davom etish')} loading={busy} disabled={phone.replace(/\D/g, '').length !== 9} onPress={send} />
          )}
          <Txt v="tiny" faint style={{ textAlign: 'center' }}>{tr('Davom etib, foydalanish shartlariga rozilik bildirasiz')}</Txt>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
