import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import ar from "./locales/ar.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import pt from "./locales/pt.json";
import nl from "./locales/nl.json";
import tr from "./locales/tr.json";
import zh from "./locales/zh.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English",    flag: "🇬🇧", dir: "ltr" },
  { code: "fr", label: "Français",   flag: "🇫🇷", dir: "ltr" },
  { code: "ar", label: "العربية",    flag: "🇸🇦", dir: "rtl" },
  { code: "es", label: "Español",    flag: "🇪🇸", dir: "ltr" },
  { code: "de", label: "Deutsch",    flag: "🇩🇪", dir: "ltr" },
  { code: "it", label: "Italiano",   flag: "🇮🇹", dir: "ltr" },
  { code: "pt", label: "Português",  flag: "🇵🇹", dir: "ltr" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱", dir: "ltr" },
  { code: "tr", label: "Türkçe",     flag: "🇹🇷", dir: "ltr" },
  { code: "zh", label: "中文",        flag: "🇨🇳", dir: "ltr" },
];

export const RTL_LANGUAGES = new Set(["ar"]);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
      es: { translation: es },
      de: { translation: de },
      it: { translation: it },
      pt: { translation: pt },
      nl: { translation: nl },
      tr: { translation: tr },
      zh: { translation: zh },
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "appLanguage",
      caches: ["localStorage"],
    },
    fallbackLng: "en",
    defaultNS: "translation",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
