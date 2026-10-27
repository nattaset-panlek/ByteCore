import { create } from "zustand";
import en from "./en";

// Localization: every UI string goes through t(key, vars). English is the only language for now;
// add a dictionary to LOCALES to add one (missing keys fall back to English).

type EnKey = keyof typeof en;
/** "x_one" | "x_other" -> "x" so plural keys are called by their base name. */
type BaseKey<K> = K extends `${infer B}_one` ? B : K extends `${infer B}_other` ? B : K;
export type TKey = BaseKey<EnKey>;
export type Vars = Record<string, string | number>;

export const LOCALES = {
  en: { label: "English", intl: "en-GB", dict: en as Record<string, string> },
} as const;
export type Locale = keyof typeof LOCALES;

const STORAGE_KEY = "bytecore.locale";

function initialLocale(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && v in LOCALES) return v as Locale;
  } catch {
    /* storage unavailable */
  }
  return "en";
}

export const useI18n = create<{ locale: Locale; setLocale: (l: Locale) => void }>((set) => ({
  locale: initialLocale(),
  setLocale: (locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* storage unavailable */
    }
    set({ locale });
  },
}));

const intl = () => LOCALES[useI18n.getState().locale].intl;
let plural = new Intl.PluralRules(intl());
let pluralFor = intl();

function lookup(key: string): string | undefined {
  return LOCALES[useI18n.getState().locale].dict[key] ?? (en as Record<string, string>)[key];
}

/**
 * Translate. Vars replace {name} placeholders; numbers are formatted for the locale.
 * With a numeric `count` var, "key_one" / "key_other" are used when present.
 * Unknown keys return the key itself (so old saves with plain English labels still show).
 */
export function t(key: TKey | string, vars?: Vars): string {
  let s: string | undefined;
  if (vars && typeof vars.count === "number") {
    if (pluralFor !== intl()) {
      pluralFor = intl();
      plural = new Intl.PluralRules(pluralFor);
    }
    s = lookup(`${key}_${plural.select(vars.count)}`) ?? lookup(`${key}_other`);
  }
  s ??= lookup(key) ?? key;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = vars[name];
    if (v === undefined) return m;
    return typeof v === "number" ? fmt.number(v) : v;
  });
}

/** Re-render on language change. Use in components: const t = useT(); */
export function useT(): typeof t {
  useI18n((s) => s.locale);
  return t;
}

/** Locale-aware formatting. */
export const fmt = {
  number: (n: number, digits = 0) => n.toLocaleString(intl(), { maximumFractionDigits: digits, minimumFractionDigits: 0 }),
  credits: (n: number) => `₵ ${Math.round(n).toLocaleString(intl())}`,
  signedCredits: (n: number) => `${n >= 0 ? "+" : "-"}₵ ${Math.abs(Math.round(n)).toLocaleString(intl())}`,
  date: (ts: number) => new Date(ts).toLocaleDateString(intl(), { day: "numeric", month: "short", year: "numeric" }),
  time: (ts: number) => new Date(ts).toLocaleTimeString(intl(), { hour: "2-digit", minute: "2-digit" }),
  dateTime: (ts: number) => `${fmt.date(ts)} ${fmt.time(ts)}`,
  /** Short numeric date for the taskbar: 27/10/2026 */
  shortDate: (ts: number) => new Date(ts).toLocaleDateString(intl(), { day: "2-digit", month: "2-digit", year: "numeric" }),
};

/** A translatable message carried by game results and saved data. */
export interface Msg {
  key: string;
  vars?: Vars;
}
export const msg = (key: TKey, vars?: Vars): Msg => ({ key, vars });
export const tm = (m: Msg) => t(m.key, m.vars);
