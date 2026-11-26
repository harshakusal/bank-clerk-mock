import type { SectionKey } from './gen/engine';

export interface HistoryEntry {
  id: string;
  at: string; // ISO time
  dateKey: string;
  testNo: number;
  label: string;
  mode: 'strict' | 'free';
  net: number;
  correct: number;
  wrong: number;
  skipped: number;
  attempted: number;
  accuracy: number;
  timeSec: number;
  sections: Record<SectionKey, { net: number; correct: number; wrong: number; attempted: number }>;
  weakTopics: string[];
}

const HKEY = 'bcm.history.v1';
const PKEY = 'bcm.prefs.v1';
const FKEY = 'bcm.freshCounter.v1';

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function safeSet(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage full or disabled */
  }
}

export const loadHistory = (): HistoryEntry[] => safeGet<HistoryEntry[]>(HKEY, []);
export function saveHistory(e: HistoryEntry) {
  const h = loadHistory().filter((x) => x.id !== e.id);
  h.push(e);
  safeSet(HKEY, h.slice(-200));
}
export function clearHistory() {
  safeSet(HKEY, []);
}

export interface Prefs { name: string; mode: 'strict' | 'free' }
export const loadPrefs = (): Prefs => safeGet<Prefs>(PKEY, { name: '', mode: 'strict' });
export const savePrefs = (p: Prefs) => safeSet(PKEY, p);

export function nextFreshTestNo(dateKey: string): number {
  const c = safeGet<Record<string, number>>(FKEY, {});
  const n = (c[dateKey] || 3) + 1;
  c[dateKey] = n;
  safeSet(FKEY, c);
  return n;
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
