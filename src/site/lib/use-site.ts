// Sayt ma'lumotlari va til tanlovi.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { tariffsWith } from '@/lib/remote-config';

import { fetchPublic, type PublicData } from './api';
import { mergeContent, type Lang } from './content';

/** Narxlar, matn va jonli ko'rsatkichlar — ochilganda va har 30 soniyada yangilanadi */
export function useSiteData() {
  const [data, setData] = useState<PublicData | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => fetchPublic().then(d => { if (alive) setData(d); });
    load();
    const iv = setInterval(load, 30000);
    return () => { alive = false; clearInterval(iv); };
  }, []);
  const content = useMemo(() => mergeContent(data?.content), [data]);
  const tariffs = useMemo(() => tariffsWith(data?.config), [data]);
  return { ready: !!data, content, config: data?.config ?? null, tariffs, stats: data?.stats ?? null };
}

const LANG_KEY = 'yums:site:lang';
const browserLang = (): Lang => (typeof navigator !== 'undefined' && /^ru\b/i.test(navigator.language ?? '') ? 'ru' : 'uz');

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>(browserLang);
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then(v => { if (v === 'uz' || v === 'ru') setLangState(v); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
  }, []);
  return [lang, setLang];
}
