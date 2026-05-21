import { en } from './en';
import { gu } from './gu';
import { useStore } from '../store/useStore';
import type { Language } from '../types';

const maps: Record<Language, Record<string, string>> = { en, gu };

export function translate(lang: Language, key: string): string {
  return maps[lang][key] ?? maps.en[key] ?? key;
}

export function useT() {
  const lang = useStore((s) => s.settings?.language ?? 'en');
  return (key: string) => translate(lang, key);
}
