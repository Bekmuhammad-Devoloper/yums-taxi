// Katalogdagi o'z profilim: kompaniya, mutaxassis yoki investor. Server bitta akkauntga har turdan
// bittadan profil saqlaydi; reyting faqat sharhlardan, «Tasdiqlangan» belgisi esa akkaunt tasdig'idan.
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PickerSheet, SelectField } from '@/components/platform-ui';
import { toast } from '@/components/toast';
import { Button, Card, Chip, Field, Flag, IOSSwitch, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { errorText } from '@/lib/api';
import { confirm } from '@/lib/confirm';
import { pickImage } from '@/lib/media';
import { COUNTRIES, LANGUAGES, SECTORS, STAGES } from '@/lib/platform-data';
import * as papi from '@/lib/platform-api';
import { countryOf, sectorOf, usePlatform } from '@/lib/platform';
import { useStore } from '@/lib/store';
import { tr, tx } from '@/lib/i18n';

type Kind = papi.ProfileKind;
/** Saqlagach qaytiladigan katalog (ekran havola orqali ochilgan bo'lsa) */
const LIST = { specialist: '/tech', company: '/business', investor: '/invest' } as const;
const TITLE: Record<Kind, string> = { company: tx('Kompaniya profili'), specialist: tx('Mutaxassis profili'), investor: tx('Investor profili') };
const INVESTOR_KINDS = [
  { id: 'angel', label: tx('Biznes-farishta') },
  { id: 'fund', label: tx('Venchur fondi') },
  { id: 'corporate', label: tx('Korporativ investor') },
  { id: 'accelerator', label: tx('Akselerator') },
];

const list = (s: string) => s.split(/[,\n]/).map(x => x.trim()).filter(Boolean);
const num = (s: string) => (s.trim() ? Number(s.replace(/\s/g, '')) : undefined);
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export default function DirectoryEdit() {
  const params = useLocalSearchParams<{ type?: string }>();
  const kind: Kind = params.type === 'company' || params.type === 'investor' ? params.type : 'specialist';
  const { colors: c, user } = useStore();
  const p = usePlatform();
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<'country' | 'sector' | 'languages' | 'sectors' | 'stages' | null>(null);

  // umumiy
  const [name, setName] = useState(kind === 'company' ? user?.company ?? '' : user?.name ?? '');
  const [country, setCountry] = useState(user?.country ?? 'UZ');
  const [city, setCity] = useState('');
  const [sector, setSector] = useState('');
  const [about, setAbout] = useState('');
  // mutaxassis
  const [title, setTitle] = useState('');
  const [skills, setSkills] = useState('');
  const [languages, setLanguages] = useState<string[]>(['uz']);
  const [rate, setRate] = useState('');
  const [experience, setExperience] = useState('');
  const [available, setAvailable] = useState(true);
  const [remote, setRemote] = useState(true);
  const [website, setWebsite] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [gender, setGender] = useState<'m' | 'f' | undefined>(undefined);
  // kompaniya
  const [services, setServices] = useState('');
  const [employees, setEmployees] = useState('');
  const [founded, setFounded] = useState('');
  // investor
  const [investorKind, setInvestorKind] = useState('angel');
  const [ticketMin, setTicketMin] = useState('');
  const [ticketMax, setTicketMax] = useState('');
  const [sectors, setSectors] = useState<string[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [licensed, setLicensed] = useState(false);

  // Mavjud profilni yuklash
  useEffect(() => {
    papi.myProfiles()
      .then(all => {
        const mine = all.find(x => x.type === kind.toUpperCase());
        if (!mine) return;
        const d = mine.details;
        setExists(true);
        setName(mine.name); setCountry(mine.country); setCity(mine.city ?? ''); setSector(mine.sector ?? ''); setAbout(mine.about);
        setTitle(str(d.title)); setSkills(arr(d.skills).join(', ')); setLanguages(arr(d.languages).length ? arr(d.languages) : ['uz']);
        setRate(d.rate !== undefined ? String(d.rate) : ''); setExperience(d.experience !== undefined ? String(d.experience) : '');
        setAvailable(d.available !== false); setRemote(d.remote === true); setWebsite(str(d.website));
        setPhoto(str(d.photo) || undefined); setGender(d.gender === 'f' ? 'f' : d.gender === 'm' ? 'm' : undefined);
        setServices(Array.isArray(d.services) ? (d.services as { title: string; price?: string }[]).map(s => (s.price ? `${s.title} — ${s.price}` : s.title)).join('\n') : '');
        setEmployees(str(d.employees)); setFounded(d.founded !== undefined ? String(d.founded) : '');
        setInvestorKind(str(d.kind) || 'angel'); setTicketMin(d.ticketMin !== undefined ? String(d.ticketMin) : '');
        setTicketMax(d.ticketMax !== undefined ? String(d.ticketMax) : ''); setSectors(arr(d.sectors)); setStages(arr(d.stages));
        setLicensed(d.licensed === true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [kind]);

  const details = (): Record<string, unknown> => {
    if (kind === 'specialist') {
      return { title: title.trim(), skills: list(skills), languages, rate: num(rate), experience: num(experience), available, remote, website: website.trim() || undefined, photo, gender };
    }
    if (kind === 'company') {
      const rows = services.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
        const [t, ...price] = l.split(/\s+[—-]\s+/);
        return { title: t.trim(), price: price.join(' — ').trim() || undefined };
      });
      return { services: rows, employees: employees.trim(), founded: num(founded), languages, website: website.trim() || undefined };
    }
    return { kind: investorKind, ticketMin: num(ticketMin), ticketMax: num(ticketMax), sectors, stages, licensed };
  };

  const leave = () => (router.canGoBack() ? router.back() : router.replace(LIST[kind]));

  const valid = name.trim().length >= 2 && about.trim().length >= 10 && (kind !== 'specialist' || title.trim().length >= 2);

  const save = async () => {
    setBusy(true);
    try {
      await papi.saveMyProfile(kind, { name: name.trim(), country, city: city.trim() || undefined, sector: sector || undefined, about: about.trim(), details: details() });
      await p.refresh();
      toast(exists ? tr('Profil yangilandi') : tr('Profil katalogga qo\'shildi'), 'checkmark-circle');
      leave();
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    } finally {
      setBusy(false);
    }
  };

  const removeNow = async () => {
    try {
      await papi.deleteMyProfile(kind);
      await p.refresh();
      toast(tr('Profil katalogdan olib tashlandi'), 'trash');
      leave();
    } catch (error) {
      toast(errorText(error), 'alert-circle');
    }
  };
  const remove = () => confirm(tr('Profilni katalogdan olib tashlaysizmi?'), tr("Suhbatlar saqlanadi, sharhlar o'chadi."), () => { removeNow().catch(() => {}); }, tr("O'chirish"));

  const k = countryOf(country);
  const pickPhoto = async () => {
    const r = await pickImage('avatar');
    if (r.ok) setPhoto(r.uri);
    else if (r.reason === 'error') toast(tr("Rasmni yuklab bo'lmadi"), 'alert-circle');
  };

  if (loading) return <Screen title={tr(TITLE[kind])}><Txt muted>{tr('Yuklanmoqda…')}</Txt></Screen>;

  return (
    <Screen title={tr(TITLE[kind])} subtitle={exists ? tr('Katalogdagi profilingiz') : tr('Katalogga qo\'shilish bepul')}
      footer={<Button title={exists ? tr('Saqlash') : tr('Katalogga qo\'shish')} icon="checkmark" disabled={!valid || busy} loading={busy} onPress={() => { save().catch(() => {}); }} />}>
      {kind === 'specialist' && (
        <Pressable onPress={() => { pickPhoto().catch(() => {}); }} style={{ alignSelf: 'center', alignItems: 'center', gap: 6 }}>
          {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : <View style={[styles.photo, { backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }]}><Txt v="h1" muted>+</Txt></View>}
          <Txt v="small" muted>{photo ? tr("Rasmni o'zgartirish") : tr("Rasm qo'shish")}</Txt>
        </Pressable>
      )}
      <Card style={{ gap: 14 }}>
        <Field label={kind === 'company' ? tr('Kompaniya nomi') : tr('Ism familiya')} value={name} onChangeText={setName} maxLength={120} />
        {kind === 'specialist' && <Field label={tr('Mutaxassislik')} value={title} onChangeText={setTitle} placeholder={tr('Masalan: Mobil dasturchi')} maxLength={80} />}
        <SelectField label={tr('Mamlakat')} value={k.name} left={<Flag code={k.code} size={22} />} placeholder={tr('Mamlakat')} onPress={() => setPicker('country')} />
        {kind !== 'investor' && <Field label={tr('Shahar')} value={city} onChangeText={setCity} maxLength={80} />}
        {kind !== 'investor' && <SelectField label={tr('Soha')} value={sector ? sectorOf(sector).name : undefined} placeholder={tr('Sohani tanlang')} icon="grid-outline" onPress={() => setPicker('sector')} />}
        <Field label={kind === 'company' ? tr('Kompaniya haqida') : kind === 'investor' ? tr('Investitsiya yondashuvi') : tr("O'zingiz haqingizda")} value={about} onChangeText={setAbout} multiline maxLength={2000} hint={`${about.length}/2000`} />
      </Card>

      {kind === 'specialist' && (
        <Card style={{ gap: 14 }}>
          <Field label={tr("Ko'nikmalar")} value={skills} onChangeText={setSkills} placeholder={tr('Vergul bilan: React, NestJS, Figma')} />
          <Row gap={10}>
            <Field style={{ flex: 1 }} label={tr('Stavka ($/soat)')} value={rate} onChangeText={setRate} keyboardType="number-pad" />
            <Field style={{ flex: 1 }} label={tr('Tajriba (yil)')} value={experience} onChangeText={setExperience} keyboardType="number-pad" />
          </Row>
          <Row style={{ justifyContent: 'space-between' }}><Txt>{tr('Buyurtma qabul qilaman')}</Txt><IOSSwitch value={available} onChange={setAvailable} /></Row>
          <Row style={{ justifyContent: 'space-between' }}><Txt>{tr('Masofaviy ishlayman')}</Txt><IOSSwitch value={remote} onChange={setRemote} /></Row>
          <Row gap={8}>
            <Chip label={tr('Erkak')} active={gender === 'm'} onPress={() => setGender('m')} />
            <Chip label={tr('Ayol')} active={gender === 'f'} onPress={() => setGender('f')} />
          </Row>
        </Card>
      )}

      {kind === 'company' && (
        <Card style={{ gap: 14 }}>
          <Field label={tr('Xizmatlar')} value={services} onChangeText={setServices} multiline placeholder={tr('Har qatorda bitta: Veb-sayt — $500 dan')} />
          <Row gap={10}>
            <Field style={{ flex: 1 }} label={tr('Xodimlar soni')} value={employees} onChangeText={setEmployees} placeholder="10–50" maxLength={20} />
            <Field style={{ flex: 1 }} label={tr('Tashkil etilgan yil')} value={founded} onChangeText={setFounded} keyboardType="number-pad" maxLength={4} />
          </Row>
        </Card>
      )}

      {kind === 'investor' && (
        <Card style={{ gap: 14 }}>
          <SectionTitle>{tr('Investor turi')}</SectionTitle>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>{INVESTOR_KINDS.map(x => <Chip key={x.id} label={tr(x.label)} active={investorKind === x.id} onPress={() => setInvestorKind(x.id)} />)}</Row>
          <Row gap={10}>
            <Field style={{ flex: 1 }} label={tr('Chek: dan ($)')} value={ticketMin} onChangeText={setTicketMin} keyboardType="number-pad" />
            <Field style={{ flex: 1 }} label={tr('gacha ($)')} value={ticketMax} onChangeText={setTicketMax} keyboardType="number-pad" />
          </Row>
          <SelectField label={tr('Sohalar')} value={sectors.length ? sectors.map(s => sectorOf(s).name).join(', ') : undefined} placeholder={tr('Sohalarni tanlang')} icon="grid-outline" onPress={() => setPicker('sectors')} />
          <SelectField label={tr('Bosqichlar')} value={stages.length ? stages.map(s => STAGES.find(x => x.id === s)?.name ?? s).join(', ') : undefined} placeholder={tr('Bosqichlarni tanlang')} icon="trending-up" onPress={() => setPicker('stages')} />
          <Row style={{ justifyContent: 'space-between' }}><Txt style={{ flex: 1 }}>{tr('Litsenziyalangan moliyaviy tashkilot')}</Txt><IOSSwitch value={licensed} onChange={setLicensed} /></Row>
        </Card>
      )}

      {kind !== 'investor' && (
        <Card style={{ gap: 14 }}>
          <SelectField label={tr('Tillar')} value={languages.map(l => LANGUAGES.find(x => x.id === l)?.name ?? l).join(', ')} placeholder={tr('Tillarni tanlang')} icon="language-outline" onPress={() => setPicker('languages')} />
          <Field label={tr('Veb-sayt')} value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" placeholder="https://" maxLength={200} />
        </Card>
      )}

      <Txt v="tiny" faint style={{ paddingHorizontal: 4, lineHeight: 16 }}>
        {tr("Reyting faqat siz bilan ishlagan foydalanuvchilarning sharhlaridan hisoblanadi. «Tasdiqlangan» belgisi akkauntingiz tasdiqlangach qo'yiladi.")}
      </Txt>
      {exists && <Button title={tr('Katalogdan olib tashlash')} kind="ghost" icon="trash-outline" onPress={remove} />}

      <PickerSheet visible={picker === 'country'} onClose={() => setPicker(null)} title={tr('Mamlakat')} selected={[country]} onChange={ids => setCountry(ids[0])}
        options={COUNTRIES.map(x => ({ id: x.code, label: x.name, flag: x.code, sub: x.region }))} />
      <PickerSheet visible={picker === 'sector'} onClose={() => setPicker(null)} title={tr('Soha')} selected={sector ? [sector] : []} onChange={ids => setSector(ids[0])}
        options={SECTORS.map(s => ({ id: s.id, label: s.name, icon: s.icon, sub: s.examples }))} />
      <PickerSheet visible={picker === 'languages'} multi onClose={() => setPicker(null)} title={tr('Tillar')} selected={languages} onChange={setLanguages}
        options={LANGUAGES.map(l => ({ id: l.id, label: l.name, flag: l.flag }))} />
      <PickerSheet visible={picker === 'sectors'} multi onClose={() => setPicker(null)} title={tr('Sohalar')} selected={sectors} onChange={setSectors}
        options={SECTORS.map(s => ({ id: s.id, label: s.name, icon: s.icon }))} />
      <PickerSheet visible={picker === 'stages'} multi onClose={() => setPicker(null)} title={tr('Bosqichlar')} selected={stages} onChange={setStages}
        options={STAGES.map(s => ({ id: s.id, label: s.name, icon: s.icon }))} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: 96, height: 96, borderRadius: 30 },
});
