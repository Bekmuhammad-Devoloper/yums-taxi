// QR-kod: modullar oddiy View'lar bilan chiziladi (SVG kutubxonasi kerak emas). Har qatordagi ketma-ket qora
// modullar bitta to'rtburchakka birlashtiriladi — View soni kam. Modul o'lchami ekranning fizik pikseliga
// yaxlitlanadi: chiziqlar orasida yoriq qolmaydi, kamera aniq o'qiydi. Atrofida 2 modul oq chegara.
import createQr from 'qrcode-generator';
import { useMemo } from 'react';
import { PixelRatio, View, type StyleProp, type ViewStyle } from 'react-native';

type Run = { row: number; col: number; len: number };

export function QrCode({ value, size, color = '#0E1525', background = '#FFFFFF', quiet = 2, style }: {
  value: string;
  /** Taxminiy o'lcham (modul pikselga yaxlitlangani uchun bir-ikki pikselga farq qilishi mumkin) */
  size: number;
  color?: string;
  background?: string;
  /** Atrofdagi oq chegara, modullarda */
  quiet?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { count, runs } = useMemo(() => {
    const qr = createQr(0, 'M');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const out: Run[] = [];
    for (let row = 0; row < n; row++) {
      let col = 0;
      while (col < n) {
        if (!qr.isDark(row, col)) { col++; continue; }
        let len = 1;
        while (col + len < n && qr.isDark(row, col + len)) len++;
        out.push({ row, col, len });
        col += len;
      }
    }
    return { count: n, runs: out };
  }, [value]);

  const total = count + quiet * 2;
  const ratio = PixelRatio.get();
  const m = Math.max(1, Math.round((size / total) * ratio)) / ratio;
  return (
    <View style={[{ width: m * total, height: m * total, backgroundColor: background }, style]} accessibilityRole="image">
      {runs.map(r => (
        <View
          key={`${r.row}:${r.col}`}
          style={{ position: 'absolute', left: (quiet + r.col) * m, top: (quiet + r.row) * m, width: r.len * m, height: m, backgroundColor: color }}
        />
      ))}
    </View>
  );
}
