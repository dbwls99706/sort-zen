import { useSettingsStore } from '../store/settingsStore';
import ko from './ko.json';
import en from './en.json';

type TranslationKey = keyof typeof ko;

const translations: Record<string, Record<string, string>> = { ko, en };

export function t(key: TranslationKey): string {
  const lang = useSettingsStore.getState().language;
  return translations[lang]?.[key] ?? translations['en'][key] ?? key;
}

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);
  return {
    t: (key: TranslationKey): string => {
      return translations[language]?.[key] ?? translations['en'][key] ?? key;
    },
    language,
  };
}
