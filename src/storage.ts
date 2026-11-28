import type { SectionKey, PaperLevel } from './gen/engine';
import type { TopicStat } from './analysis';

export interface HistoryEntry {
  id: string;
  at: string; // ISO time
  dateKey: string;
  testNo: number;
  label: string;
  mode: 'strict' | 'free';
  exam?: 'rrb-clerk'; // missing on legacy (100-mark) attempts
  maxMarks?: number;
  level?: PaperLevel;
  net: number;
  correct: number;
  wrong: number;
  skipped: number;
  attempted: number;
  accuracy: number;
  timeSec: number;
  sections: Partial<Record<string, { net: number; correct: number; wrong: number; attempted: number }>>;
  weakTopics: string[];
  topicStats?: TopicStat[];
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

export const isRRB = (h: HistoryEntry) => h.exam === 'rrb-clerk';
export const loadHistory = (): HistoryEntry[] => {
  const h = safeGet<HistoryEntry[]>(HKEY, []);
  return Array.isArray(h) ? h.filter((x) => x && typeof x.net === 'number' && typeof x.id === 'string') : [];
};
export function saveHistory(e: HistoryEntry) {
  const h = loadHistory().filter((x) => x.id !== e.id);
  h.push(e);
  safeSet(HKEY, h.slice(-300));
}
export function clearHistory() {
  safeSet(HKEY, []);
}
export function exportHistoryJSON(): string {
  return JSON.stringify({ app: 'rrb-clerk-mock', version: 2, exportedAt: new Date().toISOString(), history: loadHistory() }, null, 2);
}
/** Merge imported attempts (by id). Returns number of new attempts added. */
export function importHistoryJSON(text: string): number {
  const data = JSON.parse(text);
  const list: HistoryEntry[] = Array.isArray(data) ? data : data?.history;
  if (!Array.isArray(list)) throw new Error('No attempt history found in this file.');
  const cur = loadHistory();
  const ids = new Set(cur.map((x) => x.id));
  const fresh = list.filter((x) => x && typeof x.id === 'string' && typeof x.net === 'number' && !ids.has(x.id));
  const merged = [...cur, ...fresh].sort((a, b) => a.at.localeCompare(b.at));
  safeSet(HKEY, merged.slice(-300));
  return fresh.length;
}

export interface Prefs { name: string; mode: 'strict' | 'free'; fontScale?: number; level?: PaperLevel }
export const loadPrefs = (): Prefs => ({ name: '', mode: 'strict', fontScale: 1, level: 'Moderate', ...safeGet<Partial<Prefs>>(PKEY, {}) });
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

/** Consecutive days (ending today or yesterday) with at least one RRB attempt. */
export function dailyStreak(history: HistoryEntry[], today = todayKey()): number {
  const days = new Set(history.filter(isRRB).map((h) => h.dateKey));
  const d = new Date(today + 'T00:00:00');
  if (!days.has(todayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(todayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export type { SectionKey };
