import { useSettingsStore } from '../store/settingsStore';
import ko from './ko.json';
import en from './en.json';

export type TranslationKey = keyof typeof ko;
type TParams = Record<string, string | number>;

const translations: Record<string, Record<string, string>> = { ko, en };

function interpolate(template: string, params?: TParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) =>
    k in params ? String(params[k]) : m,
  );
}

function resolve(lang: string, key: TranslationKey, params?: TParams): string {
  const raw = translations[lang]?.[key] ?? translations['en'][key] ?? key;
  return interpolate(raw, params);
}

export function t(key: TranslationKey, params?: TParams): string {
  return resolve(useSettingsStore.getState().language, key, params);
}

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);
  return {
    t: (key: TranslationKey, params?: TParams): string =>
      resolve(language, key, params),
    language,
  };
}
