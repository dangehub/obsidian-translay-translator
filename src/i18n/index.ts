import { getLanguage } from "obsidian";
import { en } from "./locales/en";
import { zh } from "./locales/zh";

export type LocaleDict = Record<string, string>;

const locales: Record<string, LocaleDict> = {
	en,
	zh,
};

const languageDisplay: Record<string, { name: string; native: string }> = {
	en: { name: "English", native: "English" },
	"en-gb": { name: "English (GB)", native: "English (GB)" },
	af: { name: "Afrikaans", native: "Afrikaans" },
	am: { name: "Amharic", native: "አማርኛ" },
	ar: { name: "Arabic", native: "العربية" },
	eu: { name: "Basque", native: "Euskara" },
	be: { name: "Belarusian", native: "Беларуская мова" },
	bg: { name: "Bulgarian", native: "български език" },
	bn: { name: "Bengali", native: "বাংলা" },
	ca: { name: "Catalan", native: "català" },
	cs: { name: "Czech", native: "čeština" },
	da: { name: "Danish", native: "Dansk" },
	de: { name: "German", native: "Deutsch" },
	dv: { name: "Dhivehi", native: "ދިވެހި" },
	el: { name: "Greek", native: "Ελληνικά" },
	eo: { name: "Esperanto", native: "Esperanto" },
	es: { name: "Spanish", native: "Español" },
	fa: { name: "Persian", native: "فارسی" },
	"fi-fi": { name: "Finnish", native: "suomi" },
	fr: { name: "French", native: "français" },
	gl: { name: "Galician", native: "Galego" },
	he: { name: "Hebrew", native: "עברית" },
	hi: { name: "Hindi", native: "हिन्दी" },
	hu: { name: "Hungarian", native: "Magyar nyelv" },
	id: { name: "Indonesian", native: "Bahasa Indonesia" },
	it: { name: "Italian", native: "Italiano" },
	ja: { name: "Japanese", native: "日本語" },
	ko: { name: "Korean", native: "한국어" },
	lv: { name: "Latvian", native: "Latviešu" },
	ml: { name: "Malayalam", native: "മലയാളം" },
	ms: { name: "Malay", native: "Bahasa Melayu" },
	ne: { name: "Nepali", native: "नेपाली" },
	nl: { name: "Dutch", native: "Nederlands" },
	no: { name: "Norwegian", native: "Norsk" },
	oc: { name: "Occitan", native: "Occitan" },
	pl: { name: "Polish", native: "język polski" },
	pt: { name: "Portuguese", native: "Português" },
	"pt-br": { name: "Brazilian Portuguese", native: "Portugues do Brasil" },
	ro: { name: "Romanian", native: "Română" },
	ru: { name: "Russian", native: "Русский" },
	sa: { name: "Sanskrit", native: "संस्कृतम्" },
	si: { name: "Sinhalese", native: "සිංහල" },
	sk: { name: "Slovak", native: "Slovenčina" },
	sq: { name: "Albanian", native: "Shqip" },
	sr: { name: "Serbian", native: "српски језик" },
	sv: { name: "Swedish", native: "Svenska" },
	ta: { name: "Tamil", native: "தமிழ்" },
	te: { name: "Telugu", native: "తెలుగు" },
	th: { name: "Thai", native: "ไทย" },
	tl: { name: "Filipino (Tagalog)", native: "Tagalog" },
	tr: { name: "Turkish", native: "Türkçe" },
	uk: { name: "Ukrainian", native: "Українська" },
	ur: { name: "Urdu", native: "اردو" },
	vi: { name: "Vietnamese", native: "Tiếng Việt" },
	zh: { name: "Chinese (Simplified)", native: "简体中文" },
	"zh-tw": { name: "Chinese (Traditional)", native: "繁體中文" },
};

export function normalizeLang(lang?: string) {
	const raw = (lang || getLanguage?.() || "en").toLowerCase();
	if (locales[raw]) return raw;
	const primary = raw.split("-")[0];
	if (locales[primary]) return primary;
	return "en";
}

export function t(lang: string, key: string, params?: Record<string, string | number>) {
	const code = normalizeLang(lang);
	const table = locales[code] || locales.en;
	const fallback = locales.en[key] || key;
	let str = table[key] || fallback;
	if (params) {
		for (const [k, v] of Object.entries(params)) {
			str = str.replace(new RegExp(`{${k}}`, "g"), String(v));
		}
	}
	return str;
}

export function formatLangLabel(code: string | undefined | null) {
	const key = (code || "").toLowerCase();
	if (!key) return "default";
	const hit = languageDisplay[key];
	if (hit) return `${hit.native} (${hit.name})`;
	return code || "default";
}
