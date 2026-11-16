import { SECTION_ART } from '@/lib/section-art';
import { SECTOR_ART } from '@/lib/sector-art';

/** Professional xizmatlarning ko'rinishi: rang va 3D belgi (ro'yxatda ham, xizmat sahifasida ham) */
export const SERVICE_LOOK: Record<string, { color: string; art?: number }> = {
  analysis: { color: '#12A66A', art: SECTOR_ART.invest },
  design: { color: '#D6336C', art: SECTOR_ART.design },
  translate: { color: '#2457F5', art: SECTION_ART.world },
  docs: { color: '#C98A00', art: SECTOR_ART.legal },
};
