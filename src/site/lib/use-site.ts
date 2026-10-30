// Sayt ma'lumotlari va til tanlovi.
import { useEffect, useMemo, useState } from 'react';

import { tariffsWith } from '@/lib/remote-config';
import { useStore } from '@/lib/store';

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

/**
 * Sayt tili — ilova tili bilan bitta: saqlangani, bo'lmasa brauzer tili (5 tildan biri, aks holda o'zbekcha).
 * Almashtirilganda <html lang/dir> ham o'zgaradi — arab tilida sahifa o'ngdan chapga.
 */
export function useLang(): [Lang, (l: Lang) => void] {
  const { lang, setLang } = useStore();
  return [lang, setLang];
}
