// «Haydovchi bo'ling» bo'limi: daromad kalkulyatori, tariflar talablari va ariza (avtomobil tanlanganda mos tariflar darhol ko'rsatiladi).
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CAR_MODELS, CLASS_NAME, CLASS_OK, carFit, carTitle, EXTRA, MIN_YEAR } from '@/driver/lib/requirements';
import type { Tariff } from '@/lib/data';
import { priceFor, som } from '@/lib/geo';
import { useColors } from '@/lib/store';
import { F } from '@/lib/theme';
import { submitLead } from '@/site/lib/api';
import type { Lang } from '@/site/lib/content';
import { T, TARIFF_RU } from '@/site/lib/i18n';

import { PickerModal, useLayout } from '../kit';

const AVG_KM = 7, AVG_MIN = 18, TRIPS_PER_HOUR = 1.6, WEEKS_PER_MONTH = 4.33;
const CLASS_RU: Record<string, string> = { economy: 'Эконом', comfort: 'Комфорт', business: 'Бизнес', minivan: 'Минивэн', cargo: 'Грузовой' };

export function DriverJoin({ lang, tariffs, commission }: { lang: Lang; tariffs: Tariff[]; commission: number }) {
  const { wide } = useLayout();
  return (
    <View style={[{ gap: 18 }, wide && { flexDirection: 'row', alignItems: 'flex-start' }]}>
      <View style={[{ gap: 18 }, wide && { flex: 1.05 }]}>
        <Calculator lang={lang} tariffs={tariffs} commission={commission} />
        <Requirements lang={lang} tariffs={tariffs} />
      </View>
      <View style={wide ? { flex: 1 } : undefined}>
        <LeadForm lang={lang} tariffs={tariffs} />
      </View>
    </View>
  );
}

const tName = (lang: Lang, t: Tariff) => (lang === 'ru' ? TARIFF_RU[t.id]?.name ?? t.name : t.name);

function Calculator({ lang, tariffs, commission }: { lang: Lang; tariffs: Tariff[]; commission: number }) {
  const c = useColors();
  const { mid } = useLayout();
  const t = T[lang].driver;
  const [hours, setHours] = useState(8);
  const [days, setDays] = useState(6);
  const [tariffId, setTariffId] = useState('start');
  const tf = tariffs.find(x => x.id === tariffId) ?? tariffs[0];
  const perTrip = priceFor(tf, AVG_KM, AVG_MIN);
  const gross = perTrip * TRIPS_PER_HOUR * hours * days;
  const fee = gross * commission;
  const net = gross - fee;
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Text style={[styles.h3, { color: c.text }]}>{t.calcTitle}</Text>
      <View style={styles.row}>
        <Stepper label={t.hours} value={hours} min={2} max={14} onChange={setHours} />
        <Stepper label={t.days} value={days} min={1} max={7} onChange={setDays} />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: c.muted }]}>{t.tariff}</Text>
        <View style={styles.chips}>
          {tariffs.filter(x => ['start', 'comfort', 'business'].includes(x.id)).map(x => (
            <Pressable key={x.id} onPress={() => setTariffId(x.id)} style={[styles.chip, { backgroundColor: x.id === tariffId ? c.ink : c.surface2 }]} accessibilityLabel={`Kalkulyator: ${x.name}`}>
              <Text style={[styles.chipText, { color: x.id === tariffId ? c.bg : c.text }]}>{tName(lang, x)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={[styles.result, { backgroundColor: c.brandSoft }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: c.brandDeep }]}>{t.week} · {t.net.toLowerCase()}</Text>
          <Text style={[styles.big, { color: c.text }, !mid && { fontSize: 22 }]} testID="calc-week">{som(Math.round(net / 1000) * 1000)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.label, { color: c.brandDeep }]}>{t.month}</Text>
          <Text style={[styles.mid, { color: c.text }]}>{som(Math.round((net * WEEKS_PER_MONTH) / 10000) * 10000)}</Text>
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <Line label={t.gross} value={som(Math.round(gross / 1000) * 1000)} />
        <Line label={`${t.fee} (${Math.round(commission * 100)}%)`} value={`−${som(Math.round(fee / 1000) * 1000)}`} />
      </View>
      <Text style={[styles.note, { color: c.faint }]}>{t.calcNote}</Text>
    </View>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const c = useColors();
  const btn = (d: number, icon: 'remove' | 'add') => (
    <Pressable onPress={() => onChange(Math.min(max, Math.max(min, value + d)))} disabled={value + d < min || value + d > max}
      style={({ pressed }) => [styles.stepBtn, { backgroundColor: c.surface2, opacity: value + d < min || value + d > max ? 0.4 : pressed ? 0.8 : 1 }]} accessibilityLabel={`${label} ${d > 0 ? '+' : '−'}`}>
      <Ionicons name={icon} size={18} color={c.text} />
    </Pressable>
  );
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <View style={styles.stepper}>
        {btn(-1, 'remove')}
        <Text style={[styles.stepValue, { color: c.text }]}>{value}</Text>
        {btn(1, 'add')}
      </View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={styles.line}>
      <Text style={[styles.lineLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.lineValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

function Requirements({ lang, tariffs }: { lang: Lang; tariffs: Tariff[] }) {
  const c = useColors();
  const t = T[lang].driver;
  const cls = (k: string) => (lang === 'ru' ? CLASS_RU[k] : CLASS_NAME[k as keyof typeof CLASS_NAME]);
  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Text style={[styles.h3, { color: c.text }]}>{t.reqTitle}</Text>
      {tariffs.map(tf => {
        const x = EXTRA[tf.id] ?? {};
        const parts = [
          `${MIN_YEAR[tf.id]} ${t.reqYear}`,
          `${t.reqClass}: ${[...new Set(CLASS_OK[tf.id] ?? [])].map(cls).join(' / ')}`,
          x.seats ? `${x.seats} ${t.reqSeats}` : null,
          x.rating ? `${t.reqRating} ${x.rating.toFixed(2)}+` : null,
          x.trips ? `${x.trips}+ ${t.reqTrips}` : null,
        ].filter(Boolean);
        return (
          <View key={tf.id} style={[styles.reqRow, { borderTopColor: c.line }]}>
            <Text style={[styles.reqName, { color: c.text }]}>{tName(lang, tf)}</Text>
            <Text style={[styles.reqText, { color: c.muted }]}>{parts.join(' · ')}</Text>
          </View>
        );
      })}
    </View>
  );
}

function LeadForm({ lang, tariffs }: { lang: Lang; tariffs: Tariff[] }) {
  const c = useColors();
  const t = T[lang].driver;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Toshkent');
  const [car, setCar] = useState<string | undefined>();
  const [year, setYear] = useState('');
  const [trap, setTrap] = useState('');
  const [picking, setPicking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [serverError, setServerError] = useState('');
  const y = Number(year);
  const yearOk = /^\d{4}$/.test(year) && y >= 1990 && y <= new Date().getFullYear() + 1;
  const fit = useMemo(() => carFit(car, yearOk ? y : undefined), [car, y, yearOk]);
  const carItems = useMemo(() => CAR_MODELS.map(m => ({ id: carTitle(m), title: carTitle(m), sub: `${m.seats} o'rin`, group: lang === 'ru' ? CLASS_RU[m.cls] : CLASS_NAME[m.cls] })), [lang]);
  const digits = phone.replace(/\D/g, '');

  const send = async () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = t.errName;
    if (digits.length !== 9) e.phone = t.errPhone;
    if (!car) e.car = t.errCar;
    if (!yearOk) e.year = t.errYear;
    setErrors(e);
    if (Object.keys(e).length) return;
    setState('sending');
    setServerError('');
    const r = await submitLead({ name: name.trim(), phone: '+998' + digits, city: city.trim() || undefined, car, year: y, tariffs: fit.now, lang, website: trap || undefined });
    if ('error' in r) { setServerError(r.error); setState('idle'); return; }
    setState('done');
  };

  if (state === 'done') {
    return (
      <View style={[styles.card, styles.done, { backgroundColor: c.surface, borderColor: c.line }]} accessibilityLabel={t.okTitle}>
        <View style={[styles.doneIcon, { backgroundColor: c.okSoft }]}><Ionicons name="checkmark" size={34} color={c.ok} /></View>
        <Text style={[styles.h3, { color: c.text, textAlign: 'center' }]}>{t.okTitle}</Text>
        <Text style={[styles.body, { color: c.muted, textAlign: 'center' }]}>{t.okText}</Text>
        <Pressable onPress={() => { setState('idle'); setName(''); setPhone(''); setCar(undefined); setYear(''); }} style={[styles.ghost, { borderColor: c.line }]}>
          <Text style={[styles.ghostText, { color: c.text }]}>{t.again}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={{ gap: 4 }}>
        <Text style={[styles.h3, { color: c.text }]}>{t.formTitle}</Text>
        <Text style={[styles.body, { color: c.muted }]}>{t.formSub}</Text>
      </View>
      <Input label={t.name} value={name} onChange={setName} placeholder={t.namePh} error={errors.name} />
      <Input label={t.phone} value={phone} onChange={v => setPhone(maskPhone(v))} placeholder="90 123 45 67" prefix="+998" error={errors.phone} keyboard="phone-pad" />
      <Input label={t.city} value={city} onChange={setCity} placeholder="Toshkent" />
      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: c.muted }]}>{t.car}</Text>
        <Pressable onPress={() => setPicking(true)} style={[styles.input, styles.select, { backgroundColor: c.surface2, borderColor: errors.car ? c.danger : 'transparent' }]} accessibilityLabel={t.car}>
          <Ionicons name="car-sport" size={18} color={c.muted} />
          <Text style={[styles.inputText, { color: car ? c.text : c.faint, flex: 1 }]} numberOfLines={1}>{car ?? t.carPh}</Text>
          <Ionicons name="chevron-down" size={18} color={c.faint} />
        </Pressable>
        {errors.car ? <Text style={[styles.err, { color: c.danger }]}>{errors.car}</Text> : null}
      </View>
      <Input label={t.year} value={year} onChange={v => setYear(v.replace(/\D/g, '').slice(0, 4))} placeholder="2020" error={errors.year} keyboard="number-pad" />
      {/* botlar uchun: odamga ko'rinmaydi */}
      <TextInput value={trap} onChangeText={setTrap} style={styles.trap} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" tabIndex={-1} aria-hidden />
      {car ? (
        <View style={[styles.fits, { backgroundColor: c.surface2 }]} accessibilityLabel={t.fits}>
          <Text style={[styles.label, { color: c.muted }]}>{t.fits}</Text>
          {fit.now.length || fit.later.length ? (
            <View style={styles.chips}>
              {fit.now.map(id => <Badge key={id} text={tName(lang, tariffs.find(x => x.id === id)!)} ok />)}
              {fit.later.map(id => <Badge key={id} text={`${tName(lang, tariffs.find(x => x.id === id)!)} · ${t.later}`} />)}
            </View>
          ) : <Text style={[styles.body, { color: c.danger }]}>{t.none}</Text>}
        </View>
      ) : null}
      {serverError ? <Text style={[styles.err, { color: c.danger }]}>{serverError}</Text> : null}
      <Pressable onPress={send} disabled={state === 'sending'} style={({ pressed }) => [styles.submit, { opacity: pressed ? 0.9 : 1 }]} accessibilityLabel={t.send}>
        {state === 'sending' ? <ActivityIndicator color="#0E1525" /> : <Ionicons name="paper-plane" size={18} color="#0E1525" />}
        <Text style={styles.submitText}>{state === 'sending' ? t.sending : t.send}</Text>
      </Pressable>
      <Text style={[styles.note, { color: c.faint }]}>{t.consent}</Text>
      <PickerModal visible={picking} title={t.car} items={carItems} value={car} onPick={setCar} onClose={() => setPicking(false)} searchPlaceholder={t.carPh} />
    </View>
  );
}

/** «901234567» → «90 123 45 67» */
const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, '').replace(/^998/, '').slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
};

function Input({ label, value, onChange, placeholder, error, prefix, keyboard }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string; prefix?: string; keyboard?: 'phone-pad' | 'number-pad';
}) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <View style={[styles.input, { backgroundColor: c.surface2, borderColor: error ? c.danger : 'transparent' }]}>
        {prefix ? <Text style={[styles.inputText, { color: c.muted }]}>{prefix}</Text> : null}
        <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={c.faint} keyboardType={keyboard}
          style={[styles.inputText, styles.inputField, { color: c.text }]} accessibilityLabel={label} />
      </View>
      {error ? <Text style={[styles.err, { color: c.danger }]}>{error}</Text> : null}
    </View>
  );
}

function Badge({ text, ok }: { text: string; ok?: boolean }) {
  const c = useColors();
  return (
    <View style={[styles.badge, { backgroundColor: ok ? c.okSoft : c.surface3 }]}>
      <Ionicons name={ok ? 'checkmark-circle' : 'time'} size={14} color={ok ? c.ok : c.muted} />
      <Text style={[styles.badgeText, { color: ok ? c.ok : c.muted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, padding: 20, gap: 16 },
  h3: { fontFamily: F.display, fontSize: 20, letterSpacing: -0.4 },
  body: { fontFamily: F.medium, fontSize: 14.5, lineHeight: 21 },
  label: { fontFamily: F.semi, fontSize: 13 },
  row: { flexDirection: 'row', gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, height: 38, borderRadius: 12, justifyContent: 'center' },
  chipText: { fontFamily: F.bold, fontSize: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontFamily: F.heavy, fontSize: 22, minWidth: 34, textAlign: 'center' },
  result: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, borderRadius: 18, padding: 16 },
  big: { fontFamily: F.heavy, fontSize: 28, letterSpacing: -0.8 },
  mid: { fontFamily: F.heavy, fontSize: 18, letterSpacing: -0.4 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  lineLabel: { fontFamily: F.medium, fontSize: 14 },
  lineValue: { fontFamily: F.bold, fontSize: 14 },
  note: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 18 },
  reqRow: { gap: 2, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  reqName: { fontFamily: F.bold, fontSize: 15 },
  reqText: { fontFamily: F.medium, fontSize: 13.5, lineHeight: 19 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, height: 50, borderWidth: 1.5 },
  inputText: { fontFamily: F.semi, fontSize: 15.5 },
  inputField: { flex: 1, height: 48 },
  select: { gap: 10 },
  err: { fontFamily: F.semi, fontSize: 12.5 },
  fits: { borderRadius: 16, padding: 12, gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontFamily: F.bold, fontSize: 13 },
  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 54, borderRadius: 16, backgroundColor: '#FFC800' },
  submitText: { fontFamily: F.heavy, fontSize: 16, color: '#0E1525' },
  trap: { position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 },
  done: { alignItems: 'center', paddingVertical: 36 },
  doneIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  ghost: { paddingHorizontal: 18, height: 44, borderRadius: 14, borderWidth: 1.5, justifyContent: 'center', marginTop: 4 },
  ghostText: { fontFamily: F.bold, fontSize: 14.5 },
});
