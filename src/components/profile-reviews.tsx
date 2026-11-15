// Katalog profilining sharhlari (serverdan). Sharhni faqat profil egasi bilan suhbatlashgan
// foydalanuvchi qoldiradi — server tekshiradi; o'z profilingizga sharh yozilmaydi.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { toast } from '@/components/toast';
import { Button, Card, Field, Row, SectionHeader, Sheet, Txt } from '@/components/ui';
import { ApiError, errorText } from '@/lib/api';
import { ago } from '@/lib/platform';
import * as papi from '@/lib/platform-api';
import { haptic, useStore } from '@/lib/store';
import { tr } from '@/lib/i18n';

const STAR = '#F5A524';

export function ProfileReviews({ profileId, ownerId, onChanged }: { profileId: string; ownerId?: string; onChanged?: () => void }) {
  const { colors: c, user } = useStore();
  const [items, setItems] = useState<papi.Review[]>([]);
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const mineProfile = !!ownerId && ownerId === user?.id;
  const myReview = items.find(r => r.mine);

  const load = useCallback(() => papi.reviewsOf(profileId).then(setItems).catch(() => {}), [profileId]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const start = () => {
    setStars(myReview?.stars ?? 0);
    setText(myReview?.text ?? '');
    setOpen(true);
  };
  const send = async () => {
    setBusy(true);
    try {
      await papi.saveReview(profileId, stars, text);
      haptic.success();
      setOpen(false);
      toast(tr('Sharhingiz saqlandi'), 'star');
      await load();
      onChanged?.();
    } catch (error) {
      const reason = error instanceof ApiError ? (error.details as { reason?: string } | undefined)?.reason : undefined;
      toast(reason === 'NO_CONVERSATION' ? tr('Avval profil egasiga yozing — sharhni u bilan ishlaganlar qoldiradi') : errorText(error), 'alert-circle');
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    try {
      await papi.deleteReview(profileId);
      setOpen(false);
      await load();
      onChanged?.();
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <SectionHeader title={tr('Sharhlar · {reviews}', { reviews: items.length })} />
      {items.length === 0 && <Txt v="small" muted style={{ paddingHorizontal: 4 }}>{tr("Hali sharh yo'q. Bu profil egasi bilan ishlaganlar sharh qoldira oladi.")}</Txt>}
      {items.map(r => (
        <Card key={r.id} style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="h3" style={{ flex: 1 }} numberOfLines={1}>{r.mine ? tr('Siz') : r.author}</Txt>
            <Row gap={1}>{[1, 2, 3, 4, 5].map(n => <Ionicons key={n} name={n <= r.stars ? 'star' : 'star-outline'} size={13} color={STAR} />)}</Row>
          </Row>
          {r.text ? <Txt v="small" muted>{r.text}</Txt> : null}
          <Txt v="tiny" faint>{ago(r.createdAt)}</Txt>
        </Card>
      ))}
      {!mineProfile && (
        <Button title={myReview ? tr('Sharhimni tahrirlash') : tr('Sharh qoldirish')} kind="ghost" icon="star-outline" onPress={start} />
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title={tr('Sharh')} footer={
        <Button title={tr('Saqlash')} icon="checkmark" disabled={!stars || busy} loading={busy} onPress={() => { send().catch(() => {}); }} />
      }>
        <Row gap={8} style={{ justifyContent: 'center' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <Pressable key={n} onPress={() => { haptic.tap(); setStars(n); }} hitSlop={6} accessibilityRole="button" accessibilityLabel={tr('{n} yulduz', { n })}>
              <Ionicons name={n <= stars ? 'star' : 'star-outline'} size={36} color={n <= stars ? STAR : c.faint} />
            </Pressable>
          ))}
        </Row>
        <Field label={tr('Fikringiz')} value={text} onChangeText={setText} multiline maxLength={500} hint={`${text.length}/500`} />
        {myReview && <Button title={tr("Sharhni o'chirish")} kind="ghost" small icon="trash-outline" onPress={() => { remove().catch(() => {}); }} />}
      </Sheet>
    </View>
  );
}
