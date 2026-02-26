import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import zh_CN from "./locales/zh_CN.json";

// http://www.lingoes.net/zh/translator/langcode.htm
export const resources = {
  "en": en,
  "zh-CN": zh_CN,
} as const;
i18n.use(initReactI18next).init({
	fallbackLng: "en",
	debug: false,
	interpolation: {
		escapeValue: false,
	},
	resources,
});

export default i18n;
export type Resources = typeof resources;