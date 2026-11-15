import { useLocalSearchParams } from 'expo-router';

import { SupportChat } from '@/components/support-chat';
import { useStore } from '@/lib/store';
import { tr, tx } from '@/lib/i18n';

const TOPICS = [tx('Buyumimni mashinada unutdim'), tx("To'lov bo'yicha savol"), tx('Haydovchidan shikoyat'), tx('Loyiha moderatsiyasi'), tx('Ilovada xatolik')];

/** Yo'lovchi va platforma foydalanuvchisi uchun qo'llab-quvvatlash chati (backend murojaati) */
export default function PassengerSupportChat() {
  const { user, order } = useStore();
  const { subject } = useLocalSearchParams<{ subject?: string }>();
  const name = user?.name.split(' ')[0];
  return (
    <SupportChat
      topics={TOPICS}
      orderId={order.liveId}
      draft={subject ? tr('«{subject}» xizmati haqida: ', { subject }) : undefined}
      greeting={name
        ? tr('Assalomu alaykum, {name}! Savolingizni yozing yoki pastdagi mavzulardan birini tanlang — operator javob beradi.', { name })
        : tr('Assalomu alaykum! Savolingizni yozing yoki pastdagi mavzulardan birini tanlang — operator javob beradi.')}
    />
  );
}
