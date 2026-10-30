// Operatsion xarita (admin panel): liniyadagi haydovchilar, kutayotgan buyurtmalar, yuqori talab hududlari.
// Asosiy amalga oshirish — ops-map.web.tsx (Leaflet); admin panel faqat vebda ishlaydi, bu fayl — turlar va zaxira.
import { Text, View } from 'react-native';

import type { LatLng } from '@/lib/data';
import type { SurgeZone } from '@/lib/remote-config';
import type { AdminDriver, LiveDriver, OrderRec } from '@/site/lib/admin-types';
import type { Hotspot } from '@/site/lib/insights';

export type OpsMapProps = {
  drivers: Record<string, AdminDriver>;
  live: LiveDriver[];
  /** faol buyurtmalar */
  orders: OrderRec[];
  zones: SurgeZone[];
  /** tavsiya etilgan (hali yoqilmagan) hududlar */
  hotspots?: Hotspot[];
  selectedDriver?: string | null;
  selectedOrder?: string | null;
  onSelectDriver?: (id: string) => void;
  onSelectOrder?: (id: string) => void;
  /** xaritani bosish (yangi hudud markazini tanlash) */
  onMapClick?: (p: LatLng) => void;
  /** tayyorlanayotgan hudud (narx sahifasi) */
  draftZone?: { center: LatLng; radiusKm: number; surge: number } | null;
  /** shu nuqtalarni ko'rsatish uchun xaritani moslash */
  focus?: LatLng[] | null;
  legend?: boolean;
};

export default function OpsMap(_: OpsMapProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Xarita faqat veb-versiyada</Text>
    </View>
  );
}
