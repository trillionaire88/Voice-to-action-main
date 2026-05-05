import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import ar from "@/locales/ar.json";
import pt from "@/locales/pt.json";
import hi from "@/locales/hi.json";
import zh from "@/locales/zh.json";

const VTA_LANGUAGE_KEY = "vta_language";
const SUPPORTED = ["en", "es", "fr", "ar", "pt", "hi", "zh"];

if (typeof localStorage !== "undefined") {
  try {
    if (!localStorage.getItem(VTA_LANGUAGE_KEY)) {
      const legacy = localStorage.getItem("i18nextLng");
      if (legacy) {
        const base = legacy.split("-")[0].toLowerCase();
        if (SUPPORTED.includes(base)) {
          localStorage.setItem(VTA_LANGUAGE_KEY, base);
        }
      }
    }
  } catch {
    /* ignore */
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: SUPPORTED,
    detection: {
      order: ["localStorage"],
      lookupLocalStorage: VTA_LANGUAGE_KEY,
      caches: ["localStorage"],
    },
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      ar: { translation: ar },
      pt: { translation: pt },
      hi: { translation: hi },
      zh: { translation: zh },
    },
    interpolation: { escapeValue: false },
  });

if (typeof document !== "undefined") {
  document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
  i18n.on("languageChanged", (lng) => {
    document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
  });
}

export default i18n;
