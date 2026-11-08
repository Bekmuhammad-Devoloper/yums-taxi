import { SupportChat } from '@/components/support-chat';
import { useDriver } from '@/driver/lib/driver-store';
import { tr, tx } from '@/lib/i18n';

const TOPICS = [tx('Pul kartaga tushmadi'), tx('Hujjat tekshiruvi'), tx('Tarif nega yopiq?'), tx('Mijoz chiqmadi'), tx('Ilovada xatolik')];

/** Haydovchilar yordam xizmati: murojaat backendda, operator javob beradi */
export default function DriverSupportChat() {
  const d = useDriver();
  const name = d.profile?.name.split(' ')[0];
  return (
    <SupportChat
      topics={TOPICS}
      orderId={d.trip?.order.id}
      greeting={name
        ? tr('Assalomu alaykum, {name}! Savolingizni yozing yoki pastdagi mavzulardan birini tanlang — operator javob beradi.', { name })
        : tr('Assalomu alaykum! Savolingizni yozing yoki pastdagi mavzulardan birini tanlang — operator javob beradi.')}
    />
  );
}
