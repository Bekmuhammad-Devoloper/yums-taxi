import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PickerSheet, SectorIcon, SelectField } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Button, Card, Chip, Field, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { COUNTRIES, LANGUAGES, SECTORS, SEEKS, STAGES, type Attachment, type ContactMethod, type Seek, type Stage } from '@/lib/platform-data';
import { countryOf, fileSize, flagged, sectorOf, usePlatform, type ProjectInput } from '@/lib/platform';
import { haptic, useStore } from '@/lib/store';
import { F } from '@/lib/theme';

const FREE_LIMIT = 3;
const num = (s: string) => Number(s.replace(/[^\d]/g, '')) || 0;
const fmt = (n: number) => (n ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '');

export default function EditProject() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors: c, user } = useStore();
  const p = usePlatform();
  const existing = id ? p.projects.find(x => x.id === id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [summary, setSummary] = useState(existing?.summary ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [goal, setGoal] = useState(existing?.goal ?? '');
  const [sector, setSector] = useState(existing?.sector ?? '');
  const [stage, setStage] = useState<Stage>(existing?.stage ?? 'idea');
  const [country, setCountry] = useState(existing?.country ?? user?.country ?? 'UZ');
  const [city, setCity] = useState(existing?.city ?? '');
  const [languages, setLanguages] = useState<string[]>(existing?.languages ?? ['uz']);
  const [bMin, setBMin] = useState(fmt(existing?.budgetMin ?? 0));
  const [bMax, setBMax] = useState(fmt(existing?.budgetMax ?? 0));
  const [months, setMonths] = useState(existing ? String(existing.durationMonths) : '12');
  const [team, setTeam] = useState(existing ? String(existing.team) : '1');
  const [seeking, setSeeking] = useState<Seek[]>(existing?.seeking ?? []);
  const [contact, setContact] = useState<ContactMethod>(existing?.contact ?? 'chat');
  const [contactValue, setContactValue] = useState(existing?.contactValue ?? '');
  const [files, setFiles] = useState<Attachment[]>(existing?.attachments ?? []);
  const [picker, setPicker] = useState<'sector' | 'country' | 'lang' | null>(null);
  const [tried, setTried] = useState(false);

  const errors: Record<string, string | undefined> = {
    title: title.trim().length < 6 ? 'Kamida 6 ta belgi' : undefined,
    summary: summary.trim().length < 20 ? 'Kamida 20 ta belgi' : undefined,
    description: description.trim().length < 40 ? 'Batafsilroq yozing (kamida 40 belgi)' : undefined,
    goal: goal.trim().length < 10 ? 'Maqsadni yozing' : undefined,
    sector: !sector ? 'Sohani tanlang' : undefined,
    city: !city.trim() ? 'Shaharni kiriting' : undefined,
    budget: num(bMax) < num(bMin) || !num(bMax) ? "Byudjet oralig'ini to'g'ri kiriting" : undefined,
    seeking: !seeking.length ? 'Kamida bittasini tanlang' : undefined,
    contact: contact !== 'chat' && contactValue.trim().length < 5 ? 'Aloqa ma\'lumotini kiriting' : undefined,
  };
  const valid = Object.values(errors).every(e => !e);
  const err = (k: string) => (tried ? errors[k] : undefined);
  const banned = flagged(title, summary, description, goal);
  const activeCount = p.myProjects.filter(x => x.status !== 'draft' && x.id !== id).length;
  const overLimit = p.plan === 'free' && activeCount >= FREE_LIMIT;

  const input = (): ProjectInput => ({
    title: title.trim(), summary: summary.trim(), description: description.trim(), goal: goal.trim(), sector, stage, country, city: city.trim(), languages,
    budgetMin: num(bMin), budgetMax: num(bMax), durationMonths: Math.max(1, num(months)), team: Math.max(1, num(team)), seeking, contact,
    contactValue: contact === 'chat' ? undefined : contactValue.trim(), attachments: files,
  });

  const save = (submit: boolean) => {
    setTried(true);
    if (submit && !valid) { toast("Belgilangan maydonlarni to'ldiring", 'alert-circle'); return; }
    if (!submit && title.trim().length < 3) { toast('Qoralama uchun kamida sarlavha kiriting', 'alert-circle'); return; }
    if (submit && overLimit) { toast(`Free tarifda ${FREE_LIMIT} tagacha faol loyiha — Pro tarifga o'ting`, 'diamond'); router.push('/plans'); return; }
    const pid = p.saveProject(input(), { id, submit });
    haptic.success();
    toast(submit ? (banned.length ? "Yuborildi — moderator qo'lda tekshiradi" : 'Moderatsiyaga yuborildi') : 'Qoralama saqlandi', submit ? 'send' : 'save');
    router.dismissTo({ pathname: '/project/[id]', params: { id: pid } });
  };

  const attach = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: ['application/pdf', 'application/*', 'image/*', 'text/*'] });
      if (r.canceled) return;
      const big = r.assets.filter(a => (a.size ?? 0) > 25e6);
      if (big.length) toast('25 MB dan katta fayllar qo\'shilmadi', 'alert-circle');
      setFiles(f => [...f, ...r.assets.filter(a => (a.size ?? 0) <= 25e6).map(a => ({ id: 'f' + a.lastModified + a.name, name: a.name, size: a.size, mime: a.mimeType, uri: a.uri }))].slice(0, 10));
    } catch {
      toast('Fayl tanlab bo\'lmadi', 'alert-circle');
    }
  };

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  const k = countryOf(country);
  const sec = sector ? sectorOf(sector) : null;

  return (
    <Screen
      title={existing ? 'Loyihani tahrirlash' : 'Yangi loyiha'}
      subtitle="YUMS PROJECT"
      footer={
        <Row gap={10}>
          <Button title="Qoralama" kind="ghost" icon="save-outline" style={{ flex: 1 }} onPress={() => save(false)} />
          <Button title="Yuborish" icon="send" style={{ flex: 1.4 }} onPress={() => save(true)} />
        </Row>
      }>
      {overLimit && (
        <Pressable onPress={() => router.push('/plans')} style={[styles.note, { backgroundColor: c.violetSoft }]}>
          <Ionicons name="diamond" size={18} color={c.violet} />
          <Txt v="small" color={c.violet} style={{ flex: 1, fontFamily: F.bold }}>Free tarifda {FREE_LIMIT} tagacha faol loyiha. Qoralama saqlash mumkin, yuborish uchun Pro tarif kerak.</Txt>
        </Pressable>
      )}

      <SectionTitle>Asosiy ma'lumot</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Field label="Sarlavha" value={title} onChangeText={setTitle} maxLength={80} placeholder="Masalan: Aqlli issiqxona tizimi" error={err('title')} hint={`${title.length}/80`} />
        <Field label="Qisqa tavsif" value={summary} onChangeText={setSummary} maxLength={160} multiline placeholder="Loyiha bir-ikki jumlada" error={err('summary')} hint={`${summary.length}/160 — katalogda ko'rinadi`} inputStyle={{ minHeight: 60 }} />
        <SelectField label="Soha" value={sec?.name} placeholder="Sohani tanlang" icon={sec?.icon ?? 'grid-outline'} onPress={() => setPicker('sector')} />
        {err('sector') ? <Txt v="tiny" color={c.danger}>{err('sector')}</Txt> : null}
        <View style={{ gap: 6 }}>
          <Txt v="small" muted style={{ fontFamily: F.bold, marginLeft: 2 }}>Bosqich</Txt>
          <View style={styles.wrap}>{STAGES.map(s => <Chip key={s.id} label={s.name} icon={s.icon} active={stage === s.id} onPress={() => setStage(s.id)} />)}</View>
        </View>
      </Card>

      <SectionTitle>Batafsil</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Field label="Loyiha tavsifi" value={description} onChangeText={setDescription} multiline placeholder="Muammo, yechim, hozirgi natijalar, bozor…" error={err('description')} inputStyle={{ minHeight: 120 }} />
        <Field label="Maqsad" value={goal} onChangeText={setGoal} multiline placeholder="Qanday natijaga erishmoqchisiz va qachongacha?" error={err('goal')} inputStyle={{ minHeight: 60 }} />
      </Card>

      <SectionTitle>Hudud va til</SectionTitle>
      <Card style={{ gap: 14 }}>
        <SelectField label="Mamlakat" value={`${k.flag} ${k.name}`} placeholder="Mamlakat" onPress={() => setPicker('country')} />
        <Field label="Shahar / hudud" value={city} onChangeText={setCity} placeholder="Masalan: Toshkent" error={err('city')} />
        <SelectField label="Loyiha tillari" value={languages.map(l => LANGUAGES.find(x => x.id === l)?.name).join(', ')} placeholder="Tillarni tanlang" icon="language-outline" onPress={() => setPicker('lang')} />
      </Card>

      <SectionTitle>Byudjet va muddat (USD)</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Row gap={10} style={{ alignItems: 'flex-start' }}>
          <Field label="Byudjet, dan" prefix="$" value={bMin} onChangeText={v => setBMin(fmt(num(v)))} keyboardType="number-pad" placeholder="10 000" style={{ flex: 1 }} />
          <Field label="gacha" prefix="$" value={bMax} onChangeText={v => setBMax(fmt(num(v)))} keyboardType="number-pad" placeholder="50 000" style={{ flex: 1 }} />
        </Row>
        {err('budget') ? <Txt v="tiny" color={c.danger}>{err('budget')}</Txt> : null}
        <Row gap={10}>
          <Field label="Muddat, oy" value={months} onChangeText={v => setMonths(String(num(v) || ''))} keyboardType="number-pad" style={{ flex: 1 }} />
          <Field label="Jamoa, kishi" value={team} onChangeText={v => setTeam(String(num(v) || ''))} keyboardType="number-pad" style={{ flex: 1 }} />
        </Row>
      </Card>

      <SectionTitle>Nima izlayapsiz</SectionTitle>
      <Card style={{ gap: 10 }}>
        <View style={styles.wrap}>{SEEKS.map(s => <Chip key={s.id} label={s.name} icon={s.icon} active={seeking.includes(s.id)} onPress={() => setSeeking(x => toggle(x, s.id))} />)}</View>
        {err('seeking') ? <Txt v="tiny" color={c.danger}>{err('seeking')}</Txt> : null}
        {seeking.includes('investment') && (
          <View style={[styles.note, { backgroundColor: c.warnSoft }]}>
            <Ionicons name="shield-half-outline" size={18} color={c.warn} />
            <Txt v="small" color={c.warn} style={{ flex: 1 }}>Platforma faqat loyiha haqida ma'lumot joylashtiradi. «Kafolatlangan daromad» va'da qilish taqiqlangan; mablag' qabul qilish litsenziyalangan hamkorlar orqali amalga oshiriladi.</Txt>
          </View>
        )}
      </Card>

      <SectionTitle>Aloqa usuli</SectionTitle>
      <Card style={{ gap: 12 }}>
        <Row gap={8}>
          {([['chat', 'YUMS chat', 'chatbubbles-outline'], ['email', 'Email', 'mail-outline'], ['phone', 'Telefon', 'call-outline']] as const).map(([v, l, i]) => (
            <Chip key={v} label={l} icon={i} active={contact === v} onPress={() => setContact(v)} />
          ))}
        </Row>
        {contact !== 'chat' && (
          <Field value={contactValue} onChangeText={setContactValue} placeholder={contact === 'email' ? 'name@company.com' : '+998 90 123 45 67'} keyboardType={contact === 'email' ? 'email-address' : 'phone-pad'} autoCapitalize="none" error={err('contact')} />
        )}
      </Card>

      <SectionTitle>Fayllar va taqdimot</SectionTitle>
      <Card style={{ gap: 10 }}>
        {files.map(f => (
          <Row key={f.id} style={[styles.file, { backgroundColor: c.surface2 }]}>
            <Ionicons name={f.name.toLowerCase().endsWith('.pdf') ? 'document-text' : 'document-attach'} size={22} color={c.accent} />
            <View style={{ flex: 1 }}>
              <Txt v="small" style={{ fontFamily: F.bold }} numberOfLines={1}>{f.name}</Txt>
              <Txt v="tiny" faint>{fileSize(f.size) || 'fayl'}</Txt>
            </View>
            <Pressable hitSlop={10} onPress={() => setFiles(x => x.filter(y => y.id !== f.id))}><Ionicons name="close-circle" size={22} color={c.faint} /></Pressable>
          </Row>
        ))}
        <Pressable onPress={attach} style={[styles.drop, { borderColor: c.line }]}>
          <Ionicons name="cloud-upload-outline" size={26} color={c.muted} />
          <Txt v="small" style={{ fontFamily: F.bold }}>Pitch-deck, biznes-reja yoki rasm qo'shish</Txt>
          <Txt v="tiny" faint>PDF, DOCX, XLSX, rasm · 25 MB gacha · 10 tagacha</Txt>
        </Pressable>
      </Card>

      {banned.length > 0 && (
        <View style={[styles.note, { backgroundColor: c.dangerSoft }]}>
          <Ionicons name="warning" size={18} color={c.danger} />
          <Txt v="small" color={c.danger} style={{ flex: 1 }}>«{banned.join('», «')}» iborasi platforma qoidalariga zid bo'lishi mumkin. Loyiha moderator tomonidan qo'lda tekshiriladi.</Txt>
        </View>
      )}
      {sec && (
        <Row gap={10} style={{ paddingHorizontal: 4 }}>
          <SectorIcon id={sec.id} size={34} />
          <Txt v="tiny" faint style={{ flex: 1 }}>Yuborish orqali siz Foydalanish shartlari va platforma qoidalariga rozilik bildirasiz. Barcha loyihalar moderatsiyadan o'tadi.</Txt>
        </Row>
      )}

      <PickerSheet visible={picker === 'sector'} onClose={() => setPicker(null)} title="Soha" selected={sector ? [sector] : []} onChange={ids => setSector(ids[0])}
        options={SECTORS.map(s => ({ id: s.id, label: s.name, icon: s.icon, sub: s.examples }))} />
      <PickerSheet visible={picker === 'country'} onClose={() => setPicker(null)} title="Mamlakat" selected={[country]} onChange={ids => setCountry(ids[0])}
        options={COUNTRIES.map(x => ({ id: x.code, label: x.name, emoji: x.flag, sub: x.region }))} />
      <PickerSheet visible={picker === 'lang'} onClose={() => setPicker(null)} title="Loyiha tillari" multi selected={languages} onChange={ids => setLanguages(ids.length ? ids : languages)}
        options={LANGUAGES.map(l => ({ id: l.id, label: l.name }))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14 },
  file: { padding: 12, borderRadius: 14 },
  drop: { alignItems: 'center', gap: 4, paddingVertical: 20, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed' },
});
