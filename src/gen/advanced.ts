import type { RNG, Question, Base, DataTable, Clue, PuzzleRecord, Difficulty, PaperLevel } from './engine';

export interface AdvCtx {
  ri: (r: RNG, a: number, b: number) => number;
  pick: <T>(r: RNG, arr: T[]) => T;
  shuffle: <T>(r: RNG, arr: T[]) => T[];
  gcd: (a: number, b: number) => number;
  lcm: (a: number, b: number) => number;
  fmtNum: (n: number) => string;
  rs: (n: number) => string;
  pctFmt: (n: number) => string;
  ordN: (n: number) => string;
  stepOf: (ans: number) => number;
  ratioStr: (a: number, b: number) => string;
  finalize: (r: RNG, b: Base, correct: string, wrong: string[]) => Question;
  nearNums: (r: RNG, ans: number, step: number, traps: number[]) => number[];
  mkN: (r: RNG, b: Base, ans: number, step: number, traps: number[], fmt: (n: number) => string) => Question;
  NB: (topic: string, difficulty: Difficulty, question: string, explanation: string[], shortcut: string, commonTrap: string) => Base;
  RB: (topic: string, difficulty: Difficulty, question: string, explanation: string[], shortcut: string, commonTrap: string) => Base;
  getPerms: (n: number) => number[][];
  PUZZLE_LOG: PuzzleRecord[];
  NAMES: string[];
  LETTERS: string[];
  ORD: string[];
  NUMW: string[];
  DAYS: string[];
  MALES: string[];
  FEMALES: string[];
  FILLERS: string[];
  ineqQs: (r: RNG) => Question[];
  sylQs: (r: RNG) => Question[];
  alphaQs: (r: RNG) => Question[];
  codingQs: (r: RNG) => Question[];
  directionQs: (r: RNG, names: string[]) => Question[];
  bloodQ: (r: RNG, k: number) => Question;
  diQs: (r: RNG) => Question[];
  diLine: (r: RNG) => Question[];
  diPie: (r: RNG) => Question[];
  diCaselet: (r: RNG) => Question[];
  seriesMissing: (r: RNG, g: (r: RNG) => { t: number[]; rule: string }) => Question;
  seriesWrong: (r: RNG, g: (r: RNG) => { t: number[]; rule: string }) => Question;
  quadQ: (r: RNG, target: number) => Question;
  SIMP: ((r: RNG) => Question)[];
  APPROX: ((r: RNG) => Question)[];
  SERIES: ((r: RNG) => { t: number[]; rule: string })[];
  ARITH: ((r: RNG) => Question)[];
}

const COLORS = ['Red', 'Blue', 'Green', 'Yellow', 'Pink', 'White', 'Black', 'Orange'];
const SYL_OPTS = ['Only I follows', 'Only II follows', 'Either I or II follows', 'Neither I nor II follows', 'Both I and II follow'];
const QTY_OPTS = ['Quantity I > Quantity II', 'Quantity I < Quantity II', 'Quantity I = Quantity II', 'Quantity I ≥ Quantity II', 'The relationship cannot be established'];
const DIRN = ['North', 'East', 'South', 'West'];
const NWORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const FLIP: Record<string, string> = { '>': '<', '<': '>', '≥': '≤', '≤': '≥', '=': '=' };

function chainRel(syms: string[], i: number, j: number): string | null {
  const seg = syms.slice(i, j);
  if (seg.every((s) => s === '=')) return '=';
  if (seg.every((s) => s === '>' || s === '≥' || s === '=')) return seg.indexOf('>') >= 0 ? '>' : '≥';
  if (seg.every((s) => s === '<' || s === '≤' || s === '=')) return seg.indexOf('<') >= 0 ? '<' : '≤';
  return null;
}
function dirName(x: number, y: number): string {
  const ns = y > 0 ? 'North' : y < 0 ? 'South' : '';
  const ew = x > 0 ? 'East' : x < 0 ? 'West' : '';
  return ns && ew ? `${ns}-${ew}` : ns || ew;
}

export const MOD_PUZZLE_KINDS = ['row', 'floor', 'circle', 'box', 'month', 'floorflat', 'dualrow', 'boxcolor'];
export const HARD_PUZZLE_KINDS = ['floorflat', 'mixedcircle', 'uncertain', 'dualrow', 'compare2', 'boxcolor'];

export function createAdvanced(C: AdvCtx) {
  const { ri, pick, shuffle, gcd, fmtNum, rs, pctFmt, ordN, stepOf, ratioStr, finalize, mkN, NB, RB, getPerms, PUZZLE_LOG, ORD, NUMW } = C;

  const logP = (rec: PuzzleRecord) => { PUZZLE_LOG.push(rec); };

  const others = (r: RNG, names: string[], c: string) => shuffle(r, names.filter((x) => x !== c));

  // ---------- Floor + Flat (4 × 2 = 8) ----------
  function puzzleFloorFlat(r: RNG, names: string[]): Question[] {
    const n = 8;
    const fl = (s: number) => Math.floor(s / 2);
    const fa = (s: number) => s % 2;
    const FLAT = ['A', 'B'];
    const all = getPerms(n);
    const t = all[Math.floor(r() * all.length)];
    type Ok = (p: number[]) => boolean;
    const clues: { text: string; ok: Ok; abs: boolean }[] = [];
    const used = new Set<string>();
    const add = (text: string, ok: Ok, abs = false) => {
      if (used.has(text)) return false;
      const nx = cands.filter(ok);
      if (nx.length >= cands.length) return false;
      if (abs && clues.filter((c) => c.abs).length >= 1) return false;
      clues.push({ text, ok, abs }); used.add(text); cands = nx; return true;
    };
    let cands = all;
    const who = (slot: number) => t.indexOf(slot);
    const make = (): { text: string; ok: Ok; abs: boolean } | null => {
      const ty = pick(r, ['same', 'same', 'imA', 'imA', 'kA', 'above', 'flat', 'floor', 'diffF', 'notSame', 'between']);
      const two = () => { const i = ri(r, 0, n - 1); let j = ri(r, 0, n - 2); if (j >= i) j++; return [i, j]; };
      if (ty === 'same') {
        const f = ri(r, 0, 3); const i = who(f * 2), j = who(f * 2 + 1);
        return { text: `${names[i]} and ${names[j]} live on the same floor.`, ok: (p) => fl(p[i]) === fl(p[j]), abs: false };
      }
      if (ty === 'imA') {
        const low = ri(r, 0, 5); const j = who(low), i = who(low + 2);
        return { text: `${names[i]} lives immediately above ${names[j]} in the same type of flat.`, ok: (p) => p[i] === p[j] + 2, abs: false };
      }
      if (ty === 'kA') {
        const d = pick(r, [2, 3]); const low = ri(r, 0, 7 - 2 * d); if (fa(low) !== fa(low + 2 * d)) return null;
        const j = who(low), i = who(low + 2 * d);
        return { text: `${names[i]} lives ${d} floors above ${names[j]} in the same type of flat.`, ok: (p) => p[i] === p[j] + 2 * d, abs: false };
      }
      if (ty === 'above') {
        let [i, j] = two(); if (fl(t[i]) < fl(t[j])) { const z = i; i = j; j = z; }
        if (fl(t[i]) === fl(t[j])) return null;
        return { text: `${names[i]} lives on a floor above ${names[j]}.`, ok: (p) => fl(p[i]) > fl(p[j]), abs: false };
      }
      if (ty === 'flat') {
        const i = ri(r, 0, n - 1);
        return { text: `${names[i]} lives in flat ${FLAT[fa(t[i])]}.`, ok: (p) => fa(p[i]) === fa(t[i]), abs: false };
      }
      if (ty === 'floor') {
        const i = ri(r, 0, n - 1);
        return { text: `${names[i]} lives on floor ${fl(t[i]) + 1}.`, ok: (p) => fl(p[i]) === fl(t[i]), abs: true };
      }
      if (ty === 'diffF') {
        const [i, j] = two();
        if (fa(t[i]) === fa(t[j])) return null;
        return { text: `${names[i]} and ${names[j]} live in different types of flats.`, ok: (p) => fa(p[i]) !== fa(p[j]), abs: false };
      }
      if (ty === 'notSame') {
        const [i, j] = two();
        if (fl(t[i]) === fl(t[j])) return null;
        return { text: `${names[i]} does not live on the same floor as ${names[j]}.`, ok: (p) => fl(p[i]) !== fl(p[j]), abs: false };
      }
      const f = ri(r, 0, 3); const i = who(f * 2), j = who(f * 2 + 1);
      return { text: `${names[i]} lives in the flat immediately to the ${fa(t[i]) === 0 ? 'left' : 'right'} of ${names[j]} on the same floor (flat A is to the left of flat B).`, ok: (p) => fl(p[i]) === fl(p[j]) && fa(p[i]) === fa(t[i]) && fa(p[j]) === fa(t[j]), abs: false };
    };
    for (let tries = 0; tries < 400 && cands.length > 1; tries++) {
      const c = make(); if (!c) continue; add(c.text, c.ok, c.abs);
    }
    for (let i = 0; i < n && cands.length > 1; i++) {
      add(`${names[i]} lives in flat ${FLAT[fa(t[i])]} on floor ${fl(t[i]) + 1}.`, (p) => p[i] === t[i], true);
    }
    const solutions = () => getPerms(n).filter((p) => clues.every((c) => c.ok(p))).length;
    logP({ kind: 'floorflat', names: names.slice(), t: t.slice(), clues: clues.map((c) => ({ text: c.text, ok: c.ok, abs: c.abs })), solutions });

    const at = (s: number) => names[t.indexOf(s)];
    const arr = [0, 1, 2, 3].map((f) => `Floor ${f + 1}: Flat A — ${at(f * 2)}, Flat B — ${at(f * 2 + 1)}`).join('; ');
    const intro = `Eight persons ${names.join(', ')} live in a four-storey building. Each floor has two flats — flat A and flat B — such that flat A is to the left of flat B. Floor 1 is the bottom-most floor and floor 4 is the top-most. One person lives in each flat.`;
    const passage = `${intro}\n\n${clues.map((c, i) => `${i + 1}. ${c.text}`).join('\n')}`;
    const title = 'Puzzle: Floor-and-flat arrangement';
    const sc = 'Draw 4 floors × 2 flats (A on the left, B on the right). “Immediately above” means the same flat, one floor up.';
    const tr = 'Treating “above” as the same as “immediately above in the same flat”, or swapping flats A and B.';
    const base = (q: string, d: Difficulty, line: string): Base => ({ section: 'Reasoning', topic: 'Floor-Flat Puzzle', variant: 'floorflat', difficulty: d, passageTitle: title, passage, question: q, explanation: ['Mark same-floor and same-flat (vertical) clues first, then fill the remaining flats. Exactly one arrangement fits every clue.', `Final arrangement: ${arr}.`, line], shortcut: sc, commonTrap: tr });
    const out: Question[] = [];
    const i1 = ri(r, 0, 5); const X1 = at(i1), A1 = at(i1 + 2);
    out.push(finalize(r, base(`Who lives immediately above ${X1} in the same type of flat?`, 'Moderate', `${A1} lives immediately above ${X1} in flat ${FLAT[fa(i1)]}.`), A1, others(r, names, A1).filter((x) => x !== X1)));
    const f2 = ri(r, 0, 3); const X2 = at(f2 * 2), A2 = at(f2 * 2 + 1);
    out.push(finalize(r, base(`Who lives on the same floor as ${X2}?`, 'Easy', `${X2} lives on floor ${f2 + 1} with ${A2}.`), A2, others(r, names, A2).filter((x) => x !== X2)));
    const i3 = ri(r, 0, 7);
    out.push(finalize(r, base(`On which floor does ${names[i3]} live?`, 'Moderate', `${names[i3]} lives on floor ${fl(t[i3]) + 1}.`), `Floor ${fl(t[i3]) + 1}`, shuffle(r, ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Cannot be determined'])));
    const i4 = ri(r, 0, 7);
    out.push(finalize(r, base(`In which flat does ${names[i4]} live?`, 'Easy', `${names[i4]} lives in flat ${FLAT[fa(t[i4])]} on floor ${fl(t[i4]) + 1}.`), `Flat ${FLAT[fa(t[i4])]}`, ['Flat A', 'Flat B', 'Flat A on floor 1', 'Flat B on floor 4', 'Cannot be determined']));
    const truth = clues[ri(r, 0, clues.length - 1)].text;
    const falses: string[] = [];
    for (let z = 0; z < 80 && falses.length < 4; z++) {
      const c = make(); if (c && !c.ok(t) && !falses.includes(c.text) && c.text !== truth) falses.push(c.text);
    }
    while (falses.length < 4) falses.push(`${names[falses.length]} lives in flat A on floor 1.`);
    out.push(finalize(r, base('Which of the following statements is true according to the arrangement?', 'Tricky', `Only “${truth}” matches the final arrangement.`), truth, falses));
    return out;
  }

  // ---------- Mixed-facing circular (8, fix person 0 at seat 0) ----------
  function puzzleMixedCircle(r: RNG, names: string[], attempt = 0): Question[] {
    const n = 8;
    const pos = [0, ...C.shuffle(r, [1, 2, 3, 4, 5, 6, 7])]; // will reassign properly
    const order = C.shuffle(r, names.map((_, i) => i));
    const seatOf: number[] = Array(n).fill(0);
    order.forEach((p, s) => { seatOf[p] = s; });
    // rotate so person 0 is at seat 0
    const rot = seatOf[0];
    for (let p = 0; p < n; p++) seatOf[p] = (seatOf[p] - rot + n) % n;
    const face: number[] = Array.from({ length: n }, () => (r() < 0.5 ? 0 : 1));
    const m = (s: number) => ((s % n) + n) % n;
    const leftSeat = (p: number) => m(seatOf[p] + (face[p] === 0 ? 1 : -1)); // centre: clockwise +1
    const rightSeat = (p: number) => m(seatOf[p] + (face[p] === 0 ? -1 : 1));
    const whoSeat = (s: number) => seatOf.indexOf(m(s));
    type MClue = { text: string; ok: (ps: number[], fc: number[]) => boolean; abs: boolean; posOnly?: boolean };
    const make = (): MClue | null => {
      const ty = pick(r, ['face', 'sameF', 'oppF', 'imL', 'imR', 'kL', 'opp', 'nb', 'notNb', 'sameF', 'imL']);
      const X = ri(r, 0, n - 1), Yto = whoSeat(leftSeat(X)), Zto = whoSeat(rightSeat(X));
      if (ty === 'face') return { text: `${names[X]} faces ${face[X] === 0 ? 'the centre' : 'away from the centre'}.`, ok: (_p, fc) => fc[X] === face[X], abs: true };
      if (ty === 'sameF') {
        const Y = (X + ri(r, 1, n - 1)) % n;
        if (face[X] !== face[Y]) return { text: `${names[X]} and ${names[Y]} face opposite directions.`, ok: (_p, fc) => fc[X] !== fc[Y], abs: false };
        return { text: `${names[X]} and ${names[Y]} face the same direction.`, ok: (_p, fc) => fc[X] === fc[Y], abs: false };
      }
      if (ty === 'oppF') {
        const Y = (X + ri(r, 1, n - 1)) % n;
        if (face[X] === face[Y]) return null;
        return { text: `${names[X]} and ${names[Y]} face opposite directions.`, ok: (_p, fc) => fc[X] !== fc[Y], abs: false };
      }
      if (ty === 'imL') return { text: `${names[Yto]} sits immediately to the left of ${names[X]}.`, ok: (ps, fc) => { const ls = m(ps[X] + (fc[X] === 0 ? 1 : -1)); return ps[Yto] === ls; }, abs: false };
      if (ty === 'imR') return { text: `${names[Zto]} sits immediately to the right of ${names[X]}.`, ok: (ps, fc) => { const rs = m(ps[X] + (fc[X] === 0 ? -1 : 1)); return ps[Zto] === rs; }, abs: false };
      if (ty === 'kL') {
        const k = pick(r, [2, 3]);
        const dest = whoSeat(m(seatOf[X] + (face[X] === 0 ? k : -k)));
        return { text: `${names[dest]} sits ${ORD[k - 1]} to the left of ${names[X]}.`, ok: (ps, fc) => ps[dest] === m(ps[X] + (fc[X] === 0 ? k : -k)), abs: false };
      }
      if (ty === 'opp') {
        const Y = whoSeat(m(seatOf[X] + n / 2));
        return { text: `${names[Y]} sits opposite ${names[X]}.`, ok: (ps) => m(ps[Y] - ps[X]) === n / 2, abs: false, posOnly: true };
      }
      if (ty === 'nb') {
        const Y = pick(r, [Yto, Zto]);
        return { text: `${names[Y]} is an immediate neighbour of ${names[X]}.`, ok: (ps) => { const d = m(ps[Y] - ps[X]); return d === 1 || d === n - 1; }, abs: false, posOnly: true };
      }
      const Y = (X + ri(r, 1, n - 1)) % n;
      const d0 = m(seatOf[Y] - seatOf[X]);
      if (d0 === 1 || d0 === n - 1) return null;
      return { text: `${names[Y]} is not an immediate neighbour of ${names[X]}.`, ok: (ps) => { const d = m(ps[Y] - ps[X]); return d !== 1 && d !== n - 1; }, abs: false, posOnly: true };
    };
    const clues: MClue[] = [];
    const used = new Set<string>();
    const countSol = (cls: MClue[]): number => {
      let cnt = 0;
      const ps: number[] = Array(n).fill(-1);
      const usedS = Array(n).fill(false);
      ps[0] = 0; usedS[0] = true;
      const fc: number[] = Array(n).fill(-1);
      const posOk = (upto: number) => cls.every((c) => {
        if (!c.posOnly) return true;
        for (let i = 0; i < n; i++) if (ps[i] < 0 && (c.text.includes(names[i]))) return true;
        return c.ok(ps, fc);
      });
      const recFace = (i: number) => {
        if (cnt > 1) return;
        if (i === n) { if (cls.every((c) => c.ok(ps, fc))) cnt++; return; }
        for (const f of [0, 1]) {
          fc[i] = f;
          recFace(i + 1);
        }
        fc[i] = -1;
      };
      const rec = (person: number) => {
        if (cnt > 1) return;
        if (person === n) { recFace(0); return; }
        if (person === 0) { rec(1); return; }
        for (let s = 1; s < n; s++) if (!usedS[s]) {
          ps[person] = s; usedS[s] = true;
          rec(person + 1);
          usedS[s] = false; ps[person] = -1;
        }
      };
      rec(0);
      return cnt;
    };
    // Faster incremental uniqueness using filtered generation: add clues and recount with early stop
    const countFast = (cls: MClue[]): number => {
      let cnt = 0;
      const ps: number[] = Array(n).fill(-1);
      const usedS: boolean[] = Array(n).fill(false);
      ps[0] = 0; usedS[0] = true;
      const fc: number[] = Array(n).fill(-1);
      const recF = (i: number): void => {
        if (cnt > 1) return;
        if (i === n) { if (cls.every((c) => c.ok(ps, fc))) cnt++; return; }
        for (const f of [0, 1] as const) {
          fc[i] = f;
          if (cls.every((c) => {
            // skip if a mentioned person has no face/pos yet
            for (let k = 0; k < n; k++) if (c.text.includes(names[k]) && (ps[k] < 0 || fc[k] < 0) && !c.posOnly) return true;
            if (c.posOnly) return c.ok(ps, fc);
            for (let k = 0; k < n; k++) if (c.text.includes(names[k]) && (ps[k] < 0 || fc[k] < 0)) return true;
            return c.ok(ps, fc);
          })) recF(i + 1);
        }
        fc[i] = -1;
      };
      const recP = (person: number): void => {
        if (cnt > 1) return;
        if (person === n) { recF(0); return; }
        if (person === 0) { recP(1); return; }
        for (let s = 1; s < n; s++) if (!usedS[s]) {
          ps[person] = s; usedS[s] = true;
          recP(person + 1);
          usedS[s] = false; ps[person] = -1;
        }
      };
      recP(0);
      return cnt;
    };
    void countSol;
    for (let pre = 0; pre < 220 && clues.length < 5; pre++) {
      const c = make(); if (c && !used.has(c.text)) { clues.push(c); used.add(c.text); }
    }
    let sols = countFast(clues);
    for (let tries = 0; tries < 100 && sols !== 1; tries++) {
      const c = make(); if (!c || used.has(c.text)) continue;
      const k = countFast(clues.concat(c));
      if (k > 0 && k < sols) { clues.push(c); used.add(c.text); sols = k; }
    }
    if (sols !== 1) {
      for (let i = 0; i < n / 2 && sols !== 1; i++) {
        const X = whoSeat(i), Y = whoSeat(m(i + n / 2));
        const c: MClue = { text: `${names[Y]} sits opposite ${names[X]}.`, ok: (ps) => m(ps[Y] - ps[X]) === n / 2, abs: false, posOnly: true };
        if (used.has(c.text)) continue;
        const k = countFast(clues.concat(c));
        if (k > 0) { clues.push(c); used.add(c.text); sols = k; }
      }
      const faceOrder = C.shuffle(r, Array.from({ length: n }, (_, i) => i));
      for (const i of faceOrder) {
        if (sols === 1 || clues.length >= 12) break;
        const c: MClue = { text: `${names[i]} faces ${face[i] === 0 ? 'the centre' : 'away from the centre'}.`, ok: (_p, fc) => fc[i] === face[i], abs: true };
        if (used.has(c.text)) continue;
        const k = countFast(clues.concat(c));
        if (k > 0) { clues.push(c); used.add(c.text); sols = k; }
      }
      for (let i = 0; i < n && sols !== 1 && clues.length < 13; i++) {
        const L = whoSeat(leftSeat(i));
        const c: MClue = { text: `${names[L]} sits immediately to the left of ${names[i]}.`, ok: (ps, fc) => ps[L] === m(ps[i] + (fc[i] === 0 ? 1 : -1)), abs: false };
        if (used.has(c.text)) continue;
        const k = countFast(clues.concat(c));
        if (k > 0) { clues.push(c); used.add(c.text); sols = k; }
      }
    }
    if ((sols !== 1 || clues.length > 14) && attempt < 8) return puzzleMixedCircle(r, names, attempt + 1);
    if (sols !== 1) {
      for (let i = 0; i < n && sols !== 1; i++) {
        const L = whoSeat(leftSeat(i));
        const c: MClue = { text: `${names[L]} sits immediately to the left of ${names[i]}.`, ok: (ps, fc) => ps[L] === m(ps[i] + (fc[i] === 0 ? 1 : -1)), abs: false };
        if (used.has(c.text)) continue;
        const k = countFast(clues.concat(c));
        if (k > 0) { clues.push(c); used.add(c.text); sols = k; }
      }
    }
    const solutions = () => countFast(clues);
    logP({ kind: 'mixedcircle', names: names.slice(), t: seatOf.concat(face), clues: clues.map((c) => ({ text: c.text, ok: () => true, abs: !!c.abs })), solutions });

    const clock = Array.from({ length: n }, (_, s) => names[whoSeat(s)]);
    const facelist = names.map((nm, i) => `${nm} (${face[i] === 0 ? 'centre' : 'out'})`).join(', ');
    const arr = `clockwise from ${names[0]}: ${clock.join(' → ')} → ${names[0]}; facing: ${facelist}`;
    const intro = `Eight persons ${names.join(', ')} sit around a circular table. Some of them face the centre and the rest face away from the centre.`;
    const passage = `${intro}\n\n${clues.map((c, i) => `${i + 1}. ${c.text}`).join('\n')}`;
    const title = 'Puzzle: Circular seating (mixed facing)';
    const sc = 'If a person faces the centre, his/her LEFT is clockwise; if he/she faces out, LEFT is anticlockwise. Draw arrows on each seat.';
    const tr = 'Using your own left, or applying the “facing centre” left/right rule to a person who faces out.';
    const base = (q: string, d: Difficulty, line: string): Base => ({ section: 'Reasoning', topic: 'Circular Seating', variant: 'mixedcircle', difficulty: d, passageTitle: title, passage, question: q, explanation: ['Fix opposite and neighbour (position) clues first, then use facing to decode left and right. Exactly one arrangement fits.', `Final arrangement: ${arr}.`, line], shortcut: sc, commonTrap: tr });
    const out: Question[] = [];
    const X1 = ri(r, 0, n - 1); const L1 = names[whoSeat(leftSeat(X1))];
    out.push(finalize(r, base(`Who sits immediately to the left of ${names[X1]}?`, 'Moderate', `Because ${names[X1]} faces ${face[X1] === 0 ? 'the centre' : 'out'}, immediate left is ${L1}.`), L1, others(r, names, L1).filter((x) => x !== names[X1])));
    const X2 = ri(r, 0, n - 1); const O2 = names[whoSeat(m(seatOf[X2] + 4))];
    out.push(finalize(r, base(`Who sits opposite ${names[X2]}?`, 'Easy', `${O2} sits opposite ${names[X2]}.`), O2, others(r, names, O2).filter((x) => x !== names[X2])));
    const inC = face.filter((f) => f === 0).length;
    out.push(finalize(r, base('How many persons face the centre?', 'Moderate', `Facing the centre: ${names.filter((_, i) => face[i] === 0).join(', ') || 'nobody'} — ${NUMW[inC]}.`), NUMW[inC], [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((x) => x !== inC).map((x) => NUMW[x])));
    const X4 = ri(r, 0, n - 1);
    out.push(finalize(r, base(`Which of the following is true about ${names[X4]}?`, 'Moderate', `${names[X4]} faces ${face[X4] === 0 ? 'the centre' : 'away from the centre'}.`), `${names[X4]} faces ${face[X4] === 0 ? 'the centre' : 'away from the centre'}`, shuffle(r, [
      `${names[X4]} faces ${face[X4] === 0 ? 'away from the centre' : 'the centre'}`,
      `${names[X4]} sits opposite ${L1}`,
      `${names[whoSeat(rightSeat(X4))]} sits immediately to the left of ${names[X4]}`,
      `${names[X4]} faces the same direction as everyone else`,
    ])));
    const truth = clues[ri(r, 0, clues.length - 1)].text;
    const falses: string[] = [];
    for (let z = 0; z < 80 && falses.length < 4; z++) {
      const c = make(); if (c && !c.ok(seatOf, face) && !falses.includes(c.text) && c.text !== truth) falses.push(c.text);
    }
    while (falses.length < 4) falses.push(`${names[falses.length]} faces the centre and sits opposite ${names[0]}.`);
    out.push(finalize(r, base('Which of the following statements is true according to the arrangement?', 'Tricky', `Only “${truth}” matches the final arrangement.`), truth, falses));
    return out;
  }

  // ---------- Uncertain-length linear row ----------
  function puzzleUncertain(r: RNG, names: string[]): Question[] {
    const k = names.length; // 7
    const nMin = 8, nMax = 11;
    const n = ri(r, nMin, nMax);
    const seats = C.shuffle(r, Array.from({ length: n }, (_, i) => i)).slice(0, k);
    const pos = seats.slice(); // pos[person] = seat, will assign in name order via a perm
    const order = C.shuffle(r, Array.from({ length: k }, (_, i) => i));
    const ppl: number[] = Array(k).fill(0);
    order.forEach((person, i) => { ppl[person] = seats[i]; });
    type UOk = (len: number, ps: number[]) => boolean;
    type UClue = { text: string; ok: UOk; abs: boolean };
    const make = (): UClue | null => {
      const ty = pick(r, ['imL', 'imR', 'kbtw', 'end', 'mirror', 'leftOf', 'notAdj', 'fromL', 'kL']);
      const two = () => { const i = ri(r, 0, k - 1); let j = ri(r, 0, k - 2); if (j >= i) j++; return [i, j]; };
      if (ty === 'imL') {
        const [i, j] = two(); if (ppl[i] + 1 !== ppl[j]) return null;
        return { text: `${names[i]} sits immediately to the left of ${names[j]}.`, ok: (_l, ps) => ps[i] + 1 === ps[j], abs: false };
      }
      if (ty === 'imR') {
        const [i, j] = two(); if (ppl[j] + 1 !== ppl[i]) return null;
        return { text: `${names[i]} sits immediately to the right of ${names[j]}.`, ok: (_l, ps) => ps[j] + 1 === ps[i], abs: false };
      }
      if (ty === 'kbtw') {
        const [i, j] = two(); const g = Math.abs(ppl[i] - ppl[j]) - 1; if (g < 0 || g > 6) return null;
        const verb = g === 0 ? `${names[i]} sits adjacent to ${names[j]}.` : `${g === 1 ? 'Only one person sits' : `${NUMW[g]} persons sit`} between ${names[i]} and ${names[j]}.`;
        return { text: verb, ok: (_l, ps) => Math.abs(ps[i] - ps[j]) - 1 === g, abs: false };
      }
      if (ty === 'end') {
        const ends = order.filter((i) => ppl[i] === 0 || ppl[i] === n - 1);
        if (!ends.length) return null;
        const i = pick(r, ends);
        return { text: `${names[i]} sits at one of the extreme ends of the row.`, ok: (l, ps) => ps[i] === 0 || ps[i] === l - 1, abs: false };
      }
      if (ty === 'mirror') {
        const [i, j] = two();
        if (ppl[i] !== n - 1 - ppl[j]) return null;
        return { text: `The number of persons to the left of ${names[i]} is the same as the number of persons to the right of ${names[j]}.`, ok: (l, ps) => ps[i] === l - 1 - ps[j], abs: false };
      }
      if (ty === 'leftOf') {
        let [i, j] = two(); if (ppl[i] > ppl[j]) { const z = i; i = j; j = z; }
        return { text: `${names[i]} sits somewhere to the left of ${names[j]}.`, ok: (_l, ps) => ps[i] < ps[j], abs: false };
      }
      if (ty === 'notAdj') {
        const [i, j] = two(); if (Math.abs(ppl[i] - ppl[j]) === 1) return null;
        return { text: `${names[i]} does not sit adjacent to ${names[j]}.`, ok: (_l, ps) => Math.abs(ps[i] - ps[j]) !== 1, abs: false };
      }
      if (ty === 'fromL') {
        const i = ri(r, 0, k - 1);
        if (ppl[i] > 6) return null;
        return { text: `${names[i]} sits ${ORD[ppl[i]]} from the left end.`, ok: (_l, ps) => ps[i] === ppl[i], abs: true };
      }
      const i = ri(r, 0, k - 1); const d = pick(r, [2, 3]);
      const j = ppl.indexOf(ppl[i] + d);
      if (j < 0) return null;
      return { text: `${names[i]} sits ${ORD[d - 1]} to the left of ${names[j]}.`, ok: (_l, ps) => ps[j] === ps[i] + d, abs: false };
    };
    const countFast = (cls: UClue[]): number => {
      let cnt = 0;
      const rec = (len: number, i: number, used: number, ps: number[]) => {
        if (cnt > 1) return;
        if (i === k) { if (cls.every((c) => c.ok(len, ps))) cnt++; return; }
        for (let s = 0; s < len; s++) if (((used >> s) & 1) === 0) {
          ps[i] = s;
          rec(len, i + 1, used | (1 << s), ps);
        }
      };
      const ps = Array(k).fill(0);
      for (let len = nMin; len <= nMax; len++) rec(len, 0, 0, ps);
      return cnt;
    };
    const clues: UClue[] = [];
    const usedT = new Set<string>();
    for (let pre = 0; pre < 220 && clues.length < 6; pre++) {
      const c = make(); if (c && !usedT.has(c.text)) { clues.push(c); usedT.add(c.text); }
    }
    // Prefer a mirror clue to pin length
    for (let tries = 0; tries < 40; tries++) {
      const c = make(); if (c && c.text.includes('the same as the number') && !usedT.has(c.text)) { clues.push(c); usedT.add(c.text); break; }
    }
    let sols = countFast(clues);
    for (let tries = 0; tries < 100 && sols !== 1; tries++) {
      const c = make(); if (!c || usedT.has(c.text)) continue;
      const ksol = countFast(clues.concat(c));
      if (ksol > 0 && ksol < sols) { clues.push(c); usedT.add(c.text); sols = ksol; }
    }
    if (sols !== 1) {
      const rightI = ppl.indexOf(Math.max(...ppl));
      const kRight = n - 1 - ppl[rightI];
      const cLen: UClue = kRight === 0
        ? { text: `${names[rightI]} sits at the extreme right end.`, ok: (l, ps) => ps[rightI] === l - 1, abs: true }
        : { text: `${kRight === 1 ? 'Only one person sits' : `${NUMW[kRight]} persons sit`} to the right of ${names[rightI]}.`, ok: (l, ps) => l - 1 - ps[rightI] === kRight, abs: true };
      if (!usedT.has(cLen.text)) {
        const ksol = countFast(clues.concat(cLen));
        if (ksol > 0) { clues.push(cLen); usedT.add(cLen.text); sols = ksol; }
      }
    }
    if (sols !== 1) {
      for (let i = 0; i < k && sols !== 1; i++) {
        const c: UClue = { text: `${names[i]} sits ${ORD[ppl[i]]} from the left end.`, ok: (_l, ps) => ps[i] === ppl[i], abs: true };
        if (usedT.has(c.text)) continue;
        const ksol = countFast(clues.concat(c));
        if (ksol > 0) { clues.push(c); usedT.add(c.text); sols = ksol; }
      }
    }
    const solutions = () => countFast(clues);
    logP({ kind: 'uncertain', names: names.slice(), t: [n, ...ppl], clues: clues.map((c) => ({ text: c.text, ok: () => true, abs: c.abs })), solutions });

    const row = Array.from({ length: n }, (_, s) => { const i = ppl.indexOf(s); return i >= 0 ? names[i] : '(unnamed)'; });
    const arr = `left to right (${n} seats): ${row.join(', ')}`;
    const intro = `A certain number of persons sit in a straight row, all facing north. Information is given about ${NWORD[names.length]} of them — ${names.join(', ')}. Not more than ${nMax} persons sit in the row, and there are at least ${nMin} persons.`;
    const passage = `${intro}\n\n${clues.map((c, i) => `${i + 1}. ${c.text}`).join('\n')}`;
    const title = 'Puzzle: Linear row (uncertain number of persons)';
    const sc = 'Use “as many to the left of A as to the right of B” to fix the length: length = (A’s position from left) + (B’s position from right). Then place the rest.';
    const tr = 'Assuming a fixed length of 8 (or 10) before the clues have actually fixed it.';
    const base = (q: string, d: Difficulty, line: string): Base => ({ section: 'Reasoning', topic: 'Linear Seating', variant: 'uncertain', difficulty: d, passageTitle: title, passage, question: q, explanation: ['First fix the number of persons in the row, then place the named persons. Unnamed seats are occupied by persons whose names are not given. Exactly one arrangement (including the length) fits.', `Final arrangement: ${arr}.`, line], shortcut: sc, commonTrap: tr });
    const out: Question[] = [];
    out.push(finalize(r, base('How many persons sit in the row?', 'Tricky', `The row has ${n} persons.`), String(n), [8, 9, 10, 11, 12].filter((x) => x !== n).map(String)));
    const leftEndNamed = ppl.indexOf(0);
    if (leftEndNamed >= 0) out.push(finalize(r, base('Who sits at the extreme left end of the row?', 'Moderate', `${names[leftEndNamed]} sits at the extreme left end.`), names[leftEndNamed], others(r, names, names[leftEndNamed]).concat(['A person whose name is not given'])));
    else out.push(finalize(r, base('Who sits at the extreme left end of the row?', 'Moderate', 'The extreme left end is occupied by a person whose name is not given.'), 'A person whose name is not given', names.slice(0, 4)));
    let [i3, j3] = [0, 1];
    for (let z = 0; z < 12; z++) { const a = ri(r, 0, k - 1); const b = ri(r, 0, k - 1); if (a !== b && Math.abs(ppl[a] - ppl[b]) >= 2) { i3 = a; j3 = b; break; } }
    const g3 = Math.abs(ppl[i3] - ppl[j3]) - 1;
    out.push(finalize(r, base(`How many persons sit between ${names[i3]} and ${names[j3]}?`, 'Moderate', `${g3 === 0 ? 'Nobody sits' : `${g3} person(s) sit`} between them — ${NUMW[g3]}.`), NUMW[g3], [0, 1, 2, 3, 4, 5].filter((x) => x !== g3).map((x) => NUMW[x])));
    const i4 = ri(r, 0, k - 1); const fromR = n - ppl[i4];
    out.push(finalize(r, base(`What is the position of ${names[i4]} from the right end?`, 'Moderate', `${names[i4]} is ${ordN(ppl[i4] + 1)} from the left, so ${ordN(fromR)} from the right (${n} + 1 − ${ppl[i4] + 1}).`), ordN(fromR), shuffle(r, Array.from({ length: nMax }, (_, i) => ordN(i + 1)))));
    const truth = clues[ri(r, 0, clues.length - 1)].text;
    const falses: string[] = [];
    for (let z = 0; z < 80 && falses.length < 4; z++) {
      const c = make(); if (c && !c.ok(n, ppl) && !falses.includes(c.text) && c.text !== truth) falses.push(c.text);
    }
    while (falses.length < 4) falses.push(`${names[falses.length]} sits at the extreme right end.`);
    out.push(finalize(r, base('Which of the following statements is true according to the arrangement?', 'Tricky', `Only “${truth}” matches the final arrangement.`), truth, falses));
    return out;
  }

  // ---------- Dual attribute: 7 in a row + 7 colours ----------
  function puzzleDual(r: RNG, names: string[]): Question[] {
    const n = 6;
    const cols = COLORS.slice(0, n);
    const seat = C.shuffle(r, Array.from({ length: n }, (_, i) => i)); // seat[person]
    const col = C.shuffle(r, Array.from({ length: n }, (_, i) => i)); // col[person]
    const whoS = (s: number) => seat.indexOf(s);
    type DOk = (ps: number[], cs: number[]) => boolean;
    type DClue = { text: string; ok: DOk; abs: boolean };
    const make = (): DClue | null => {
      const ty = pick(r, ['imL', 'btw', 'likes', 'whoCol', 'colLeft', 'leftOf', 'endCol', 'notAdj', 'colBtw']);
      const two = () => { const i = ri(r, 0, n - 1); let j = ri(r, 0, n - 2); if (j >= i) j++; return [i, j]; };
      if (ty === 'imL') {
        const i = whoS(ri(r, 0, n - 2)), j = whoS(seat[i] + 1);
        return { text: `${names[i]} sits immediately to the left of ${names[j]}.`, ok: (ps) => ps[j] === ps[i] + 1, abs: false };
      }
      if (ty === 'btw') {
        const [i, j] = two(); const g = Math.abs(seat[i] - seat[j]) - 1;
        const verb = g === 0 ? `${names[i]} sits adjacent to ${names[j]}.` : `${g === 1 ? 'Only one person sits' : `${NUMW[g]} persons sit`} between ${names[i]} and ${names[j]}.`;
        return { text: verb, ok: (ps) => Math.abs(ps[i] - ps[j]) - 1 === g, abs: false };
      }
      if (ty === 'likes') {
        const i = ri(r, 0, n - 1);
        return { text: `${names[i]} likes ${cols[col[i]]}.`, ok: (_p, cs) => cs[i] === col[i], abs: true };
      }
      if (ty === 'whoCol') {
        const i = ri(r, 0, n - 1);
        if (seat[i] === 0) return { text: `The one who likes ${cols[col[i]]} sits at the extreme left end.`, ok: (ps, cs) => ps[cs.indexOf(col[i])] === 0, abs: false };
        if (seat[i] === n - 1) return { text: `The one who likes ${cols[col[i]]} sits at the extreme right end.`, ok: (ps, cs) => ps[cs.indexOf(col[i])] === n - 1, abs: false };
        return { text: `The one who likes ${cols[col[i]]} sits ${ORD[seat[i]]} from the left end.`, ok: (ps, cs) => ps[cs.indexOf(col[i])] === seat[i], abs: false };
      }
      if (ty === 'colLeft') {
        const i = whoS(ri(r, 0, n - 2)); const j = whoS(seat[i] + 1);
        return { text: `The one who likes ${cols[col[i]]} sits immediately to the left of ${names[j]}.`, ok: (ps, cs) => ps[cs.indexOf(col[i])] + 1 === ps[j], abs: false };
      }
      if (ty === 'leftOf') {
        let [i, j] = two(); if (seat[i] > seat[j]) { const z = i; i = j; j = z; }
        return { text: `${names[i]} sits somewhere to the left of the one who likes ${cols[col[j]]}.`, ok: (ps, cs) => ps[i] < ps[cs.indexOf(col[j])], abs: false };
      }
      if (ty === 'endCol') {
        const i = whoS(pick(r, [0, n - 1]));
        return { text: `${names[i]} sits at one of the extreme ends.`, ok: (ps) => ps[i] === 0 || ps[i] === n - 1, abs: false };
      }
      if (ty === 'notAdj') {
        const [i, j] = two(); if (Math.abs(seat[i] - seat[j]) === 1) return null;
        return { text: `${names[i]} does not sit adjacent to the one who likes ${cols[col[j]]}.`, ok: (ps, cs) => Math.abs(ps[i] - ps[cs.indexOf(col[j])]) !== 1, abs: false };
      }
      const [i, j] = two(); const g = Math.abs(seat[i] - seat[j]) - 1;
      return { text: `${g === 0 ? 'The ones who like' : (g === 1 ? 'Only one person sits between the ones who like' : `${NUMW[g]} persons sit between the ones who like`)} ${cols[col[i]]} and ${cols[col[j]]}${g === 0 ? ' sit adjacent to each other' : ''}.`, ok: (ps, cs) => Math.abs(ps[cs.indexOf(col[i])] - ps[cs.indexOf(col[j])]) - 1 === g, abs: false };
    };
    const countFast = (cls: DClue[]): number => {
      let cnt = 0;
      const ps = Array(n).fill(-1);
      const cs = Array(n).fill(-1);
      const usedP = Array(n).fill(false);
      const usedC = Array(n).fill(false);
      const recC = (i: number) => {
        if (cnt > 1) return;
        if (i === n) { if (cls.every((c) => c.ok(ps, cs))) cnt++; return; }
        for (let c = 0; c < n; c++) if (!usedC[c]) {
          cs[i] = c; usedC[c] = true;
          recC(i + 1);
          usedC[c] = false; cs[i] = -1;
        }
      };
      const recP = (i: number) => {
        if (cnt > 1) return;
        if (i === n) { recC(0); return; }
        for (let s = 0; s < n; s++) if (!usedP[s]) {
          ps[i] = s; usedP[s] = true;
          recP(i + 1);
          usedP[s] = false; ps[i] = -1;
        }
      };
      recP(0);
      return cnt;
    };
    const clues: DClue[] = [];
    const usedT = new Set<string>();
    for (let pre = 0; pre < 220 && clues.length < 6; pre++) {
      const c = make(); if (c && !usedT.has(c.text)) { clues.push(c); usedT.add(c.text); }
    }
    let sols = countFast(clues);
    for (let tries = 0; tries < 100 && sols !== 1; tries++) {
      const c = make(); if (!c || usedT.has(c.text)) continue;
      const ksol = countFast(clues.concat(c));
      if (ksol > 0 && ksol < sols) { clues.push(c); usedT.add(c.text); sols = ksol; }
    }
    if (sols !== 1) {
      for (let i = 0; i < n && sols !== 1; i++) {
        const c: DClue = { text: `${names[i]} likes ${cols[col[i]]} and sits ${ORD[seat[i]]} from the left end.`, ok: (ps, cs) => ps[i] === seat[i] && cs[i] === col[i], abs: true };
        if (usedT.has(c.text)) continue;
        const ksol = countFast(clues.concat(c));
        if (ksol > 0) { clues.push(c); usedT.add(c.text); sols = ksol; }
      }
    }
    const solutions = () => countFast(clues);
    logP({ kind: 'dualrow', names: names.slice(), t: seat.concat(col), clues: clues.map((c) => ({ text: c.text, ok: () => true, abs: c.abs })), solutions });
    const row = Array.from({ length: n }, (_, s) => `${names[whoS(s)]} (${cols[col[whoS(s)]]})`);
    const arr = `left to right: ${row.join(', ')}`;
    const intro = `${cap(NWORD[names.length])} persons ${names.join(', ')} sit in a straight row, all facing north, and each likes a different colour: ${cols.join(', ')}.`;
    const passage = `${intro}\n\n${clues.map((c, i) => `${i + 1}. ${c.text}`).join('\n')}`;
    const title = 'Puzzle: Linear seating with colours';
    const sc = 'Make two rows (or two lines in the same 7 boxes): the person and the colour. Place definite person-seats and colour-seats first.';
    const tr = 'Putting a colour on a person from a clue that actually placed the colour on a seat.';
    const base = (q: string, d: Difficulty, line: string): Base => ({ section: 'Reasoning', topic: 'Linear Seating', variant: 'dualrow', difficulty: d, passageTitle: title, passage, question: q, explanation: ['Treat seats and colours as two layers of the same row. Exactly one arrangement of both layers fits every clue.', `Final arrangement: ${arr}.`, line], shortcut: sc, commonTrap: tr });
    const out: Question[] = [];
    const s1 = ri(r, 0, n - 1);
    out.push(finalize(r, base(`Who sits ${ORD[s1]} from the left end?`, 'Easy', `${names[whoS(s1)]} sits ${ORD[s1]} from the left.`), names[whoS(s1)], others(r, names, names[whoS(s1)])));
    const i2 = ri(r, 0, n - 1);
    out.push(finalize(r, base(`Which colour does ${names[i2]} like?`, 'Moderate', `${names[i2]} likes ${cols[col[i2]]}.`), cols[col[i2]], shuffle(r, cols.filter((c) => c !== cols[col[i2]]))));
    const c3 = ri(r, 0, n - 1); const who3 = names[col.indexOf(c3)];
    out.push(finalize(r, base(`Who likes ${cols[c3]}?`, 'Moderate', `${who3} likes ${cols[c3]}.`), who3, others(r, names, who3)));
    const i4 = ri(r, 0, n - 1); const j4 = (i4 + 1 + ri(r, 0, n - 2)) % n;
    const g4 = Math.abs(seat[col.indexOf(col[i4])] === seat[i4] ? seat[i4] - seat[j4] : seat[i4] - seat[j4]) - 1;
    const g4b = Math.abs(seat[i4] - seat[j4]) - 1;
    out.push(finalize(r, base(`How many persons sit between ${names[i4]} and ${names[j4]}?`, 'Moderate', `${NUMW[g4b]} person(s) sit between them.`), NUMW[g4b], [0, 1, 2, 3, 4, 5].filter((x) => x !== g4b).map((x) => NUMW[x])));
    void g4;
    const truth = clues[ri(r, 0, clues.length - 1)].text;
    const falses: string[] = [];
    for (let z = 0; z < 80 && falses.length < 4; z++) {
      const c = make(); if (c && !c.ok(seat, col) && !falses.includes(c.text) && c.text !== truth) falses.push(c.text);
    }
    while (falses.length < 4) falses.push(`${names[falses.length]} likes ${cols[(col[0] + 1) % n]}.`);
    out.push(finalize(r, base('Which of the following statements is true according to the arrangement?', 'Tricky', `Only “${truth}” matches the final arrangement.`), truth, falses));
    return out;
  }

  // ---------- Comparison: 6 people, height + weight ranks (0 = shortest / lightest) ----------
  function puzzleCompare(r: RNG, names: string[], attempt = 0): Question[] {
    const n = 6;
    const H = C.shuffle(r, Array.from({ length: n }, (_, i) => i)); // H[person] = height rank 0..5 (5 = tallest)
    const W = C.shuffle(r, Array.from({ length: n }, (_, i) => i));
    const whoH = (rk: number) => H.indexOf(rk);
    const whoW = (rk: number) => W.indexOf(rk);
    type COk = (h: number[], w: number[]) => boolean;
    type CClue = { text: string; ok: COk; abs: boolean };
    const make = (): CClue | null => {
      const ty = pick(r, ['taller', 'heavier', 'tallest', 'lightest', 'htPos', 'wtPos', 'but', 'asMany', 'notExt']);
      const two = () => { const i = ri(r, 0, n - 1); let j = ri(r, 0, n - 2); if (j >= i) j++; return [i, j]; };
      if (ty === 'taller') {
        let [i, j] = two(); if (H[i] < H[j]) { const z = i; i = j; j = z; }
        return { text: `${names[i]} is taller than ${names[j]}.`, ok: (h) => h[i] > h[j], abs: false };
      }
      if (ty === 'heavier') {
        let [i, j] = two(); if (W[i] < W[j]) { const z = i; i = j; j = z; }
        return { text: `${names[i]} is heavier than ${names[j]}.`, ok: (_h, w) => w[i] > w[j], abs: false };
      }
      if (ty === 'tallest') {
        const i = whoH(n - 1);
        return { text: `${names[i]} is the tallest.`, ok: (h) => h[i] === n - 1, abs: true };
      }
      if (ty === 'lightest') {
        const i = whoW(0);
        return { text: `${names[i]} is the lightest.`, ok: (_h, w) => w[i] === 0, abs: true };
      }
      if (ty === 'htPos') {
        const i = ri(r, 0, n - 1);
        const k = n - 1 - H[i]; // people taller than i
        if (k === 0) return { text: `No one is taller than ${names[i]}.`, ok: (h) => h[i] === n - 1, abs: false };
        return { text: `Exactly ${NUMW[k].toLowerCase()} ${k === 1 ? 'person is' : 'persons are'} taller than ${names[i]}.`, ok: (h) => n - 1 - h[i] === k, abs: false };
      }
      if (ty === 'wtPos') {
        const i = ri(r, 0, n - 1);
        const k = n - 1 - W[i];
        if (k === 0) return { text: `No one is heavier than ${names[i]}.`, ok: (_h, w) => w[i] === n - 1, abs: false };
        return { text: `Exactly ${NUMW[k].toLowerCase()} ${k === 1 ? 'person is' : 'persons are'} heavier than ${names[i]}.`, ok: (_h, w) => n - 1 - w[i] === k, abs: false };
      }
      if (ty === 'but') {
        const [i, j] = two();
        if (H[i] > H[j] && W[i] < W[j]) return { text: `${names[i]} is taller than ${names[j]} but lighter than ${names[j]}.`, ok: (h, w) => h[i] > h[j] && w[i] < w[j], abs: false };
        if (H[i] < H[j] && W[i] > W[j]) return { text: `${names[i]} is shorter than ${names[j]} but heavier than ${names[j]}.`, ok: (h, w) => h[i] < h[j] && w[i] > w[j], abs: false };
        return null;
      }
      if (ty === 'asMany') {
        const i = ri(r, 0, n - 1);
        const k = n - 1 - H[i];
        const js = names.map((_, j) => j).filter((j) => j !== i && n - 1 - W[j] === k);
        if (!js.length) return null;
        const j = pick(r, js);
        return { text: `As many persons as are taller than ${names[i]} are heavier than ${names[j]}.`, ok: (h, w) => n - 1 - h[i] === n - 1 - w[j], abs: false };
      }
      const i = ri(r, 0, n - 1);
      if (H[i] === n - 1 || H[i] === 0) return null;
      return { text: `${names[i]} is neither the tallest nor the shortest.`, ok: (h) => h[i] !== n - 1 && h[i] !== 0, abs: false };
    };
    const countFast = (cls: CClue[]): number => {
      let cnt = 0;
      const h = Array(n).fill(-1), w = Array(n).fill(-1);
      const uH = Array(n).fill(false), uW = Array(n).fill(false);
      const recW = (i: number) => {
        if (cnt > 1) return;
        if (i === n) { if (cls.every((c) => c.ok(h, w))) cnt++; return; }
        for (let rk = 0; rk < n; rk++) if (!uW[rk]) { w[i] = rk; uW[rk] = true; recW(i + 1); uW[rk] = false; w[i] = -1; }
      };
      const recH = (i: number) => {
        if (cnt > 1) return;
        if (i === n) { recW(0); return; }
        for (let rk = 0; rk < n; rk++) if (!uH[rk]) { h[i] = rk; uH[rk] = true; recH(i + 1); uH[rk] = false; h[i] = -1; }
      };
      recH(0);
      return cnt;
    };
    const clues: CClue[] = [];
    const usedT = new Set<string>();
    for (let pre = 0; pre < 220 && clues.length < 6; pre++) {
      const c = make(); if (c && !usedT.has(c.text)) { clues.push(c); usedT.add(c.text); }
    }
    let sols = countFast(clues);
    for (let tries = 0; tries < 100 && sols !== 1; tries++) {
      const c = make(); if (!c || usedT.has(c.text)) continue;
      const ksol = countFast(clues.concat(c));
      if (ksol > 0 && ksol < sols) { clues.push(c); usedT.add(c.text); sols = ksol; }
    }
    if (sols !== 1) {
      const pins: CClue[] = [];
      for (let i = 0; i < n; i++) {
        const kt = n - 1 - H[i];
        pins.push(kt === 0
          ? { text: `No one is taller than ${names[i]}.`, ok: (h) => h[i] === n - 1, abs: false }
          : { text: `Exactly ${NUMW[kt].toLowerCase()} ${kt === 1 ? 'person is' : 'persons are'} taller than ${names[i]}.`, ok: (h) => n - 1 - h[i] === kt, abs: false });
        const kw = n - 1 - W[i];
        pins.push(kw === 0
          ? { text: `No one is heavier than ${names[i]}.`, ok: (_h, w) => w[i] === n - 1, abs: false }
          : { text: `Exactly ${NUMW[kw].toLowerCase()} ${kw === 1 ? 'person is' : 'persons are'} heavier than ${names[i]}.`, ok: (_h, w) => n - 1 - w[i] === kw, abs: false });
      }
      for (const c of pins) {
        if (sols === 1 || usedT.has(c.text) || clues.length >= 12) continue;
        const ksol = countFast(clues.concat(c));
        if (ksol > 0) { clues.push(c); usedT.add(c.text); sols = ksol; }
      }
    }
    if ((sols !== 1 || clues.length > 13) && attempt < 8) return puzzleCompare(r, names, attempt + 1);
    if (sols !== 1) {
      for (let i = 0; i < n && sols !== 1; i++) {
        const kt = n - 1 - H[i], kw = n - 1 - W[i];
        const pins2: CClue[] = [
          kt === 0
            ? { text: `No one is taller than ${names[i]}.`, ok: (h) => h[i] === n - 1, abs: false }
            : { text: `Exactly ${NUMW[kt].toLowerCase()} ${kt === 1 ? 'person is' : 'persons are'} taller than ${names[i]}.`, ok: (h) => n - 1 - h[i] === kt, abs: false },
          kw === 0
            ? { text: `No one is heavier than ${names[i]}.`, ok: (_h, w) => w[i] === n - 1, abs: false }
            : { text: `Exactly ${NUMW[kw].toLowerCase()} ${kw === 1 ? 'person is' : 'persons are'} heavier than ${names[i]}.`, ok: (_h, w) => n - 1 - w[i] === kw, abs: false },
        ];
        for (const c of pins2) {
          if (sols === 1 || usedT.has(c.text)) continue;
          const ksol = countFast(clues.concat(c));
          if (ksol > 0) { clues.push(c); usedT.add(c.text); sols = ksol; }
        }
      }
    }
    const solutions = () => countFast(clues);
    logP({ kind: 'compare2', names: names.slice(), t: H.concat(W), clues: clues.map((c) => ({ text: c.text, ok: () => true, abs: c.abs })), solutions });
    const hOrd = Array.from({ length: n }, (_, rk) => names[whoH(n - 1 - rk)]); // tallest to shortest
    const wOrd = Array.from({ length: n }, (_, rk) => names[whoW(n - 1 - rk)]);
    const arr = `tallest to shortest: ${hOrd.join(', ')}; heaviest to lightest: ${wOrd.join(', ')}`;
    const intro = `Six persons ${names.join(', ')} have different heights and different weights.`;
    const passage = `${intro}\n\n${clues.map((c, i) => `${i + 1}. ${c.text}`).join('\n')}`;
    const title = 'Puzzle: Height and weight comparison';
    const sc = 'Write two ranked lists (height and weight). Translate “exactly k are taller” into a fixed rank.';
    const tr = 'Mixing the height ranking with the weight ranking, or treating “taller than” as “immediately taller than”.';
    const base = (q: string, d: Difficulty, line: string): Base => ({ section: 'Reasoning', topic: 'Comparison Puzzle', variant: 'compare2', difficulty: d, passageTitle: title, passage, question: q, explanation: ['Build the unique height order and the unique weight order from the clues.', `Final arrangement: ${arr}.`, line], shortcut: sc, commonTrap: tr });
    const out: Question[] = [];
    out.push(finalize(r, base('Who is the tallest?', 'Easy', `${names[whoH(n - 1)]} is the tallest.`), names[whoH(n - 1)], others(r, names, names[whoH(n - 1)])));
    const i2 = ri(r, 0, n - 1); const k2 = n - 1 - W[i2];
    out.push(finalize(r, base(`How many persons are heavier than ${names[i2]}?`, 'Moderate', `${k2} person(s) are heavier than ${names[i2]} — ${NUMW[k2]}.`), NUMW[k2], [0, 1, 2, 3, 4, 5].filter((x) => x !== k2).map((x) => NUMW[x])));
    const i3 = ri(r, 0, n - 1);
    const both = names.filter((_, j) => j !== i3 && H[j] > H[i3] && W[j] > W[i3]).length;
    out.push(finalize(r, base(`How many persons are both taller and heavier than ${names[i3]}?`, 'Tricky', `${both} person(s) are both taller and heavier than ${names[i3]}.`), NUMW[both], [0, 1, 2, 3, 4, 5].filter((x) => x !== both).map((x) => NUMW[x])));
    out.push(finalize(r, base('Who is the second lightest?', 'Moderate', `${names[whoW(1)]} is the second lightest.`), names[whoW(1)], others(r, names, names[whoW(1)])));
    const truth = clues[ri(r, 0, clues.length - 1)].text;
    const falses: string[] = [];
    for (let z = 0; z < 80 && falses.length < 4; z++) {
      const c = make(); if (c && !c.ok(H, W) && !falses.includes(c.text) && c.text !== truth) falses.push(c.text);
    }
    while (falses.length < 4) falses.push(`${names[falses.length]} is the tallest.`);
    out.push(finalize(r, base('Which of the following statements is true according to the arrangement?', 'Tricky', `Only “${truth}” matches the final arrangement.`), truth, falses));
    return out;
  }

  // ---------- Box stack + colours (6 boxes) ----------
  function puzzleBoxColor(r: RNG, names: string[]): Question[] {
    const n = 6;
    const cols = COLORS.slice(0, n);
    const pos = C.shuffle(r, Array.from({ length: n }, (_, i) => i)); // pos[box] 0=bottom
    const col = C.shuffle(r, Array.from({ length: n }, (_, i) => i));
    const whoP = (p: number) => pos.indexOf(p);
    type Ok = (ps: number[], cs: number[]) => boolean;
    type Cl = { text: string; ok: Ok; abs: boolean };
    const make = (): Cl | null => {
      const ty = pick(r, ['imA', 'gap', 'likes', 'colAbove', 'topCol', 'notAdj', 'above', 'colGap']);
      const two = () => { const i = ri(r, 0, n - 1); let j = ri(r, 0, n - 2); if (j >= i) j++; return [i, j]; };
      if (ty === 'imA') {
        const j = whoP(ri(r, 0, n - 2)), i = whoP(pos[j] + 1);
        return { text: `Box ${names[i]} is kept immediately above box ${names[j]}.`, ok: (ps) => ps[i] === ps[j] + 1, abs: false };
      }
      if (ty === 'gap') {
        const [i, j] = two(); const g = Math.abs(pos[i] - pos[j]) - 1;
        const verb = g === 0 ? `Box ${names[i]} and box ${names[j]} are adjacent.` : `${g === 1 ? 'Only one box is' : `${NUMW[g]} boxes are`} kept between box ${names[i]} and box ${names[j]}.`;
        return { text: verb, ok: (ps) => Math.abs(ps[i] - ps[j]) - 1 === g, abs: false };
      }
      if (ty === 'likes') {
        const i = ri(r, 0, n - 1);
        return { text: `Box ${names[i]} is ${cols[col[i]]}.`, ok: (_p, cs) => cs[i] === col[i], abs: true };
      }
      if (ty === 'colAbove') {
        const j = whoP(ri(r, 0, n - 2)), i = whoP(pos[j] + 1);
        return { text: `The ${cols[col[i]]} box is kept immediately above box ${names[j]}.`, ok: (ps, cs) => ps[cs.indexOf(col[i])] === ps[j] + 1, abs: false };
      }
      if (ty === 'topCol') {
        const i = whoP(n - 1);
        return { text: `The ${cols[col[i]]} box is at the top of the stack.`, ok: (ps, cs) => ps[cs.indexOf(col[i])] === n - 1, abs: false };
      }
      if (ty === 'notAdj') {
        const [i, j] = two(); if (Math.abs(pos[i] - pos[j]) === 1) return null;
        return { text: `Box ${names[i]} is not kept adjacent to the ${cols[col[j]]} box.`, ok: (ps, cs) => Math.abs(ps[i] - ps[cs.indexOf(col[j])]) !== 1, abs: false };
      }
      if (ty === 'above') {
        let [i, j] = two(); if (pos[i] < pos[j]) { const z = i; i = j; j = z; }
        return { text: `Box ${names[i]} is kept somewhere above box ${names[j]}.`, ok: (ps) => ps[i] > ps[j], abs: false };
      }
      const [i, j] = two(); const g = Math.abs(pos[i] - pos[j]) - 1;
      return { text: `${g === 0 ? `The ${cols[col[i]]} box and the ${cols[col[j]]} box are adjacent.` : `${g === 1 ? 'Only one box is' : `${NUMW[g]} boxes are`} kept between the ${cols[col[i]]} box and the ${cols[col[j]]} box.`}`, ok: (ps, cs) => Math.abs(ps[cs.indexOf(col[i])] - ps[cs.indexOf(col[j])]) - 1 === g, abs: false };
    };
    const countFast = (cls: Cl[]): number => {
      let cnt = 0;
      const ps = Array(n).fill(-1), cs = Array(n).fill(-1);
      const uP = Array(n).fill(false), uC = Array(n).fill(false);
      const recC = (i: number) => {
        if (cnt > 1) return;
        if (i === n) { if (cls.every((cl) => cl.ok(ps, cs))) cnt++; return; }
        for (let c = 0; c < n; c++) if (!uC[c]) { cs[i] = c; uC[c] = true; recC(i + 1); uC[c] = false; cs[i] = -1; }
      };
      const recP = (i: number) => {
        if (cnt > 1) return;
        if (i === n) { recC(0); return; }
        for (let s = 0; s < n; s++) if (!uP[s]) { ps[i] = s; uP[s] = true; recP(i + 1); uP[s] = false; ps[i] = -1; }
      };
      recP(0);
      return cnt;
    };
    const clues: Cl[] = [];
    const usedT = new Set<string>();
    for (let pre = 0; pre < 220 && clues.length < 6; pre++) {
      const c = make(); if (c && !usedT.has(c.text)) { clues.push(c); usedT.add(c.text); }
    }
    let sols = countFast(clues);
    for (let tries = 0; tries < 100 && sols !== 1; tries++) {
      const c = make(); if (!c || usedT.has(c.text)) continue;
      const ksol = countFast(clues.concat(c));
      if (ksol > 0 && ksol < sols) { clues.push(c); usedT.add(c.text); sols = ksol; }
    }
    if (sols !== 1) {
      for (let i = 0; i < n && sols !== 1; i++) {
        const c: Cl = { text: `Box ${names[i]} is ${cols[col[i]]} and is kept ${ordN(pos[i] + 1)} from the bottom.`, ok: (ps, cs) => ps[i] === pos[i] && cs[i] === col[i], abs: true };
        if (usedT.has(c.text)) continue;
        const ksol = countFast(clues.concat(c));
        if (ksol > 0) { clues.push(c); usedT.add(c.text); sols = ksol; }
      }
    }
    const solutions = () => countFast(clues);
    logP({ kind: 'boxcolor', names: names.slice(), t: pos.concat(col), clues: clues.map((c) => ({ text: c.text, ok: () => true, abs: c.abs })), solutions });
    const stack = Array.from({ length: n }, (_, p) => `pos ${p + 1}: ${names[whoP(p)]} (${cols[col[whoP(p)]]})`);
    const arr = `bottom to top: ${stack.join(', ')}`;
    const intro = `Six boxes ${names.join(', ')} are kept one above the other. Each box is of a different colour: ${cols.join(', ')}. Position 1 is the bottom-most box and position 6 is the top-most.`;
    const passage = `${intro}\n\n${clues.map((c, i) => `${i + 1}. ${c.text}`).join('\n')}`;
    const title = 'Puzzle: Box stack with colours';
    const sc = 'Draw six stacked boxes and write the colour beside each. “Immediately above” is one position up.';
    const tr = 'Attaching a colour to the wrong box when the clue mentions “the red box” rather than a named box.';
    const base = (q: string, d: Difficulty, line: string): Base => ({ section: 'Reasoning', topic: 'Box Stack Puzzle', variant: 'boxcolor', difficulty: d, passageTitle: title, passage, question: q, explanation: ['Solve the positions and the colours together. Exactly one stack fits every clue.', `Final arrangement: ${arr}.`, line], shortcut: sc, commonTrap: tr });
    const out: Question[] = [];
    const p1 = ri(r, 0, n - 1);
    out.push(finalize(r, base(p1 === n - 1 ? 'Which box is at the top of the stack?' : p1 === 0 ? 'Which box is at the bottom of the stack?' : `Which box is kept ${ordN(p1 + 1)} from the bottom?`, 'Easy', `Position ${p1 + 1} is box ${names[whoP(p1)]}.`), names[whoP(p1)], others(r, names, names[whoP(p1)])));
    const i2 = ri(r, 0, n - 1);
    out.push(finalize(r, base(`What is the colour of box ${names[i2]}?`, 'Moderate', `Box ${names[i2]} is ${cols[col[i2]]}.`), cols[col[i2]], shuffle(r, cols.filter((c) => c !== cols[col[i2]]))));
    const c3 = ri(r, 0, n - 1);
    out.push(finalize(r, base(`Which box is ${cols[c3]}?`, 'Moderate', `The ${cols[c3]} box is ${names[col.indexOf(c3)]}.`), names[col.indexOf(c3)], others(r, names, names[col.indexOf(c3)])));
    const i4 = whoP(ri(r, 1, n - 1)); const below = names[whoP(pos[i4] - 1)];
    out.push(finalize(r, base(`Which box is kept immediately below box ${names[i4]}?`, 'Moderate', `${below} is immediately below ${names[i4]}.`), below, others(r, names, below).filter((x) => x !== names[i4])));
    const truth = clues[ri(r, 0, clues.length - 1)].text;
    const falses: string[] = [];
    for (let z = 0; z < 80 && falses.length < 4; z++) {
      const c = make(); if (c && !c.ok(pos, col) && !falses.includes(c.text) && c.text !== truth) falses.push(c.text);
    }
    while (falses.length < 4) falses.push(`Box ${names[falses.length]} is ${cols[(col[0] + 1) % n]}.`);
    out.push(finalize(r, base('Which of the following statements is true according to the arrangement?', 'Tricky', `Only “${truth}” matches the final arrangement.`), truth, falses));
    return out;
  }

  // ================= QUANT (Moderate / Hard) =================
  const SIMP_MOD: ((r: RNG) => Question)[] = [
    (r) => {
      const a = pick(r, [12, 16, 18, 20, 24]); const b = pick(r, [15, 16, 18, 25, 36]);
      const p = pick(r, [3, 5, 7]), q = pick(r, [8, 12, 16].filter((x) => x > p));
      const A = q * ri(r, 20, 80); const c = ri(r, 11, 19);
      const u = (p * A) / q, v = Math.round(Math.sqrt(a * a)), w = b * b, ans = u + v * 4 - w + c;
      // wait I want sqrt of perfect square
      const k = pick(r, [16, 18, 24, 25, 27, 32]); const sq = k * k;
      const u2 = (p * A) / q, ans2 = u2 + k * 3 - w + c;
      return mkN(r, NB('Simplification', 'Moderate', `Find the value of ?\n\n${p}/${q} of ${A} + √${sq} × 3 − ${b}² + ${c} = ?`, [`${p}/${q} of ${A} = ${u2}.`, `√${sq} = ${k}, so ${k} × 3 = ${k * 3}.`, `${b}² = ${w}.`, `${u2} + ${k * 3} − ${w} + ${c} = ${ans2}.`], 'Convert the fraction first, then the root and the square; keep the signs.', 'Subtracting the square-root term or using k² in place of √(k²).'), ans2, stepOf(ans2), [u2 + k * 3 + w + c], String);
    },
    (r) => {
      const p = pick(r, [12.5, 37.5, 62.5, 87.5]); const d = 8 * ri(r, 20, 90);
      const a = ri(r, 11, 16); const b = pick(r, [15, 20, 25, 30, 40]); const c = ri(r, 6, 12);
      const cd = (p * d) / 100, cub = a ** 3, fr = (3 * b * c) / 4; // wait 3/4 of (b*c)? let's use 3/4 of a multiple of 4
      const B = 4 * ri(r, 40, 160); const three4 = (3 * B) / 4, ans = cd + three4 - cub;
      return mkN(r, NB('Simplification', 'Moderate', `Find the value of ?\n\n${p}% of ${d} + 3/4 of ${B} − ${a}³ = ?`, [`${p}% = ${p / 12.5}/8, so ${p}% of ${d} = ${cd}.`, `3/4 of ${B} = ${three4}.`, `${a}³ = ${cub}.`, `${cd} + ${three4} − ${cub} = ${ans}.`], '12.5% = 1/8, 37.5% = 3/8, 62.5% = 5/8, 87.5% = 7/8. Cubes up to 20 should be automatic.', 'Taking 3/4 of the percentage term, or writing a³ as 3a.'), ans, stepOf(ans), [cd + three4 + cub], String);
    },
    (r) => {
      const a = ri(r, 8, 18), b = ri(r, 5, 14), c = ri(r, 4, 9);
      const ans = (a + b) * (a + b) - (a - b) * (a - b) + c * c * c;
      return mkN(r, NB('Simplification', 'Moderate', `Find the value of ?\n\n(${a} + ${b})² − (${a} − ${b})² + ${c}³ = ?`, [`(a + b)² − (a − b)² = 4ab = 4 × ${a} × ${b} = ${4 * a * b}.`, `${c}³ = ${c ** 3}.`, `${4 * a * b} + ${c ** 3} = ${ans}.`], 'Never expand the squares: the difference is always 4ab.', 'Using 2ab, or adding (a − b)² instead of subtracting it.'), ans, stepOf(ans), [2 * a * b + c ** 3, 4 * a * b - c ** 3], String);
    },
    (r) => {
      const k = pick(r, [14, 15, 16, 18, 21, 24, 25, 28]); const off = pick(r, [0]); 
      const p = pick(r, [20, 25, 40, 50]); const B = 20 * ri(r, 8, 30);
      const c = ri(r, 7, 15); const ans = k * 5 + (p * B) / 100 - c * c;
      return mkN(r, NB('Simplification', 'Moderate', `Find the value of ?\n\n√${k * k} × 5 + ${p}% of ${B} − ${c}² = ?`, [`√${k * k} = ${k}; × 5 = ${k * 5}.`, `${p}% of ${B} = ${(p * B) / 100}.`, `${c}² = ${c * c}.`, `${k * 5} + ${(p * B) / 100} − ${c * c} = ${ans}.`], 'Take the root and the percentage before combining.', 'Using k² in place of √(k²).'), ans, stepOf(ans), [k * 5 + (p * B) / 100 + c * c], String);
    },
    (r) => {
      const p = pick(r, [2, 3, 4, 5]), q = pick(r, [3, 4, 5, 6, 8].filter((x) => x !== p && gcd(p, x) === 1));
      const s = pick(r, [2, 3, 5]), t = pick(r, [4, 5, 6, 8].filter((x) => gcd(s, x) === 1 || x !== s));
      const X = q * t * ri(r, 3, 12);
      const u = (p * X) / q, v = (s * X) / t, ans = u + v;
      return mkN(r, NB('Simplification', 'Moderate', `Find the value of ?\n\n${p}/${q} of ${X} + ${s}/${t} of ${X} = ?`, [`${p}/${q} of ${X} = ${u}; ${s}/${t} of ${X} = ${v}.`, `${u} + ${v} = ${ans}.`, `Or, X × (${p}/${q} + ${s}/${t}) = ${X} × ${fmtNum(p / q + s / t)}.`], 'Add the two fractions of the same number: X(p/q + s/t).', 'Adding the numerators and denominators separately.'), ans, stepOf(ans), [((p + s) * X) / (q + t)], String);
    },
    (r) => {
      const a = ri(r, 2, 6), b = ri(r, 2, 8); const A = a * 4 + b; // mixed number a b/4 ? use 4ths or 8ths
      const den = pick(r, [4, 5, 8]); const num = ri(r, 1, den - 1);
      const k = den * ri(r, 6, 20);
      const mixed = a * k + (num * k) / den;
      const c = ri(r, 11, 20); const ans = mixed - c * c;
      return mkN(r, NB('Simplification', 'Moderate', `Find the value of ?\n\n${a} ${num}/${den} × ${k} − ${c}² = ?`, [`${a} ${num}/${den} = ${(a * den + num)}/${den}.`, `× ${k} = ${mixed}.`, `${c}² = ${c * c}.`, `${mixed} − ${c * c} = ${ans}.`], 'Convert the mixed number to an improper fraction, then cancel with k.', 'Multiplying only the whole number a by k and ignoring the fraction.'), ans, stepOf(ans), [a * k - c * c, mixed + c * c], String);
    },
  ];

  const SIMP_HARD: ((r: RNG) => Question)[] = [
    (r) => {
      const k = pick(r, [16, 18, 21, 24, 25, 27, 32]);
      const p = pick(r, [3, 5, 7]), q = pick(r, [8, 12, 14].filter((x) => x > p));
      const A = q * ri(r, 15, 40);
      const a = ri(r, 11, 16), b = ri(r, 6, 9);
      const p2 = pick(r, [12.5, 37.5, 62.5]); const D = 8 * ri(r, 15, 80);
      const t1 = k + (p * A) / q, t2 = a * a - b ** 3, t3 = (p2 * D) / 100, ans = t1 * 2 - t2 + t3;
      return mkN(r, NB('Simplification', 'Tricky', `Find the value of ?\n\n[√${k * k} + ${p}/${q} of ${A}] × 2 − (${a}² − ${b}³) + ${p2}% of ${D} = ?`, [`√${k * k} = ${k}; ${p}/${q} of ${A} = ${(p * A) / q}; sum in the bracket = ${t1}.`, `× 2 = ${t1 * 2}.`, `${a}² − ${b}³ = ${a * a} − ${b ** 3} = ${t2}.`, `${p2}% of ${D} = ${t3}.`, `${t1 * 2} − (${t2}) + ${t3} = ${ans}.`], 'Work inside the brackets first, then the signs outside. A minus before a bracket flips both terms.', 'Forgetting to multiply the whole bracket by 2, or dropping the sign of (a² − b³).'), ans, stepOf(ans), [t1 - t2 + t3, t1 * 2 + t2 + t3], String);
    },
    (r) => {
      const a = ri(r, 2, 5), n1 = pick(r, [1, 3]), d1 = 4;
      const b = ri(r, 1, 3), n2 = pick(r, [1, 2, 3]), d2 = 5;
      const M = 20 * ri(r, 2, 8);
      const v1 = (a * d1 + n1) * (M / d1), v2 = (b * d2 + n2) * (M / d2);
      const c = pick(r, [11, 13, 15, 17]); const ans = v1 + v2 - c * c;
      return mkN(r, NB('Simplification', 'Tricky', `Find the value of ?\n\n(${a} ${n1}/${d1} + ${b} ${n2}/${d2}) × ${M} − ${c}² = ?`, [`${a} ${n1}/${d1} = ${(a * d1 + n1)}/${d1}; ${b} ${n2}/${d2} = ${(b * d2 + n2)}/${d2}.`, `× ${M}: first term = ${v1}, second = ${v2}.`, `${c}² = ${c * c}.`, `${v1} + ${v2} − ${c * c} = ${ans}.`], 'Convert both mixed numbers, multiply each by M (M is a multiple of both denominators), then subtract.', 'Adding the mixed numbers incorrectly before multiplying.'), ans, stepOf(ans), [v1 + v2 + c * c], String);
    },
    (r) => {
      const cr = pick(r, [6, 7, 8, 9, 10]); // cube root
      const a = ri(r, 12, 20), p = pick(r, [15, 20, 25, 30, 40, 45]), B = 20 * ri(r, 6, 25);
      const c = ri(r, 8, 16), d = ri(r, 7, 13);
      const ans = cr * 15 + (p * B) / 100 - c * d;
      return mkN(r, NB('Simplification', 'Tricky', `Find the value of ?\n\n∛${cr ** 3} × 15 + ${p}% of ${B} − ${c} × ${d} = ?`, [`∛${cr ** 3} = ${cr}; × 15 = ${cr * 15}.`, `${p}% of ${B} = ${(p * B) / 100}.`, `${c} × ${d} = ${c * d}.`, `${cr * 15} + ${(p * B) / 100} − ${c * d} = ${ans}.`], 'Memorise cubes up to 20 so the cube root is instant.', 'Taking the square root of the cube, or writing ∛(n³) as 3n.'), ans, stepOf(ans), [cr * 15 + (p * B) / 100 + c * d], String);
    },
    (r) => {
      const a = pick(r, [15, 16, 18, 20, 24, 25]); const b = pick(r, [12, 16, 18, 20, 24]);
      const p = pick(r, [3, 5]), q = pick(r, [8, 16]);
      const X = q * ri(r, 20, 50);
      const t1 = (a + b) * (a - b), t2 = (p * X) / q, ans = t1 + t2;
      return mkN(r, NB('Simplification', 'Tricky', `Find the value of ?\n\n${a}² − ${b}² + ${p}/${q} of ${X} = ?`, [`a² − b² = (a + b)(a − b) = (${a} + ${b})(${a} − ${b}) = ${t1}.`, `${p}/${q} of ${X} = ${t2}.`, `${t1} + ${t2} = ${ans}.`], 'Always factor a² − b²; do not expand both squares in full.', 'Writing a² − b² as (a − b)².'), ans, stepOf(ans), [(a - b) * (a - b) + t2, t1 - t2], String);
    },
    (r) => {
      const a = ri(r, 4, 9), b = a + ri(r, 2, 6), d = ri(r, 3, 8);
      const inner = b * b - a * a; const ans = inner / (b - a) - d * d;
      // (b² − a²)/(b − a) = b + a
      return mkN(r, NB('Simplification', 'Tricky', `Find the value of ?\n\n(${b}² − ${a}²) ÷ (${b} − ${a}) − ${d}² = ?`, [`(b² − a²)/(b − a) = b + a = ${b} + ${a} = ${a + b}.`, `${a + b} − ${d * d} = ${ans}.`], 'Cancel (b − a) immediately: (b² − a²)/(b − a) = b + a.', 'Dividing only one square, or subtracting before dividing.'), ans, stepOf(ans), [a + b + d * d, inner - d * d], String);
    },
    (r) => {
      const p = pick(r, [20, 25, 40]), q = pick(r, [10, 20, 25]);
      const S = 200 * ri(r, 6, 20);
      const after = S * (100 + p) / 100 * (100 - q) / 100;
      const k = ri(r, 11, 19); const ans = after - k * k;
      return mkN(r, NB('Simplification', 'Tricky', `Find the value of ?\n\n${S} increased by ${p}% and then decreased by ${q}%, minus ${k}², equals ?`, [`After +${p}%: ${S} × ${1 + p / 100} = ${S * (100 + p) / 100}.`, `Then −${q}%: × ${1 - q / 100} = ${after}.`, `${k}² = ${k * k}.`, `${after} − ${k * k} = ${ans}.`], 'Successive percentage changes are multipliers, never +p − q on the original.', 'Netting +p% and −q% as (p − q)% of S.'), ans, stepOf(ans), [S * (100 + p - q) / 100 - k * k], String);
    },
  ];

  const APPROX_HARD: ((r: RNG) => Question)[] = [
    (r) => {
      const a = ri(r, 12, 28), b = ri(r, 8, 19), c = ri(r, 5, 9), d = pick(r, [20, 25, 40, 50]), e = 40 * ri(r, 8, 25);
      const ans = Math.round((a * a) / c + (d * e) / 100 - b * 3);
      const pert = (n: number) => (n + pick(r, [-0.09, -0.06, -0.04, 0.04, 0.07, 0.11])).toFixed(2);
      return mkN(r, NB('Approximation', 'Tricky', `Find the approximate value of ?\n\n(${pert(a * a + pick(r, [-3, -2, 2, 3]))}) ÷ ${pert(c)} + ${pert(d)}% of ${pert(e)} − ${pert(b)} × ${pert(3)} ≈ ?`, [`Round: ${a * a} ÷ ${c} + ${d}% of ${e} − ${b} × 3.`, `${a * a} ÷ ${c} ≈ ${Math.round((a * a) / c)}; ${d}% of ${e} = ${(d * e) / 100}; ${b} × 3 = ${b * 3}.`, `Approximate value = ${ans}.`], 'Round every figure first; the options are far enough apart that the rounding error will not change the answer.', 'Doing the exact decimals and wasting time, or missing the last subtraction.'), ans, Math.max(8, Math.round(Math.abs(ans) * 0.08)), [ (a * a) / c + (d * e) / 100 + b * 3 ], fmtNum);
    },
    (r) => {
      const k = ri(r, 15, 35), z = ri(r, 9, 18), p = pick(r, [15, 20, 25, 30]), q = 40 * ri(r, 5, 20);
      const ans = Math.round(k * z - (p * q) / 100);
      const pert = (n: number) => (n + pick(r, [-0.08, -0.05, 0.05, 0.09])).toFixed(2);
      return mkN(r, NB('Approximation', 'Moderate', `Find the approximate value of ?\n\n√${k * k + pick(r, [-5, -3, -2, 2, 3, 5])} × ${pert(z)} − ${pert(p)}% of ${pert(q)} ≈ ?`, [`√${k * k + 0} ≈ ${k} (nearest perfect square).`, `${k} × ${z} = ${k * z}; ${p}% of ${q} = ${(p * q) / 100}.`, `${k * z} − ${(p * q) / 100} = ${ans}.`], 'Find the nearest perfect square under the root, then round the rest.', 'Picking (k ± 1)² as the nearest square.'), ans, Math.max(8, Math.round(Math.abs(ans) * 0.08)), [k * z + (p * q) / 100], fmtNum);
    },
    (r) => {
      const a = pick(r, [8, 9, 12, 15, 16, 18]), b = ri(r, 11, 20), c = pick(r, [25, 30, 40, 50]), d = 20 * ri(r, 10, 30);
      const ans = Math.round(a ** 3 / 8 + b * 4 - (c * d) / 100);
      return mkN(r, NB('Approximation', 'Tricky', `Find the approximate value of ?\n\n${(a ** 3 + pick(r, [-2, 2, 3])).toFixed(1)} ÷ 7.96 + ${ (b + pick(r, [-0.08, 0.07])).toFixed(2) } × 4.02 − ${c + 0.4}% of ${d + pick(r, [-3, 3])} ≈ ?`, [`Round: ${a ** 3} ÷ 8 + ${b} × 4 − ${c}% of ${d}.`, `${a ** 3 / 8} + ${b * 4} − ${(c * d) / 100} = ${ans}.`], '8 is next to 7.96; use cubes you already know.', 'Dividing by 7 or 9 instead of 8.'), ans, Math.max(10, Math.round(Math.abs(ans) * 0.1)), [a ** 3 / 8 + b * 4 + (c * d) / 100], fmtNum);
    },
  ];

  const SERIES_HARD: ((r: RNG) => { t: number[]; rule: string })[] = [
    (r) => { // two-tier differences
      let x = ri(r, 8, 40); const d0 = ri(r, 2, 6), k = ri(r, 2, 5); const t = [x]; const ds: number[] = []; let d = d0;
      for (let i = 0; i < 6; i++) { ds.push(d); x += d; t.push(x); d += d0 + i * 0; d = d0 + (i + 1) * k; }
      return { t, rule: `The first differences are ${ds.join(', ')} — themselves increasing by ${k} each time (two-tier difference).` };
    },
    (r) => { // n²+n mixed with × then +
      const n0 = ri(r, 3, 8); const t: number[] = [];
      for (let i = 0; i < 7; i++) t.push((n0 + i) * (n0 + i) + (n0 + i));
      return { t, rule: `Each term = n² + n for n = ${n0}, ${n0 + 1}, ${n0 + 2}, …` };
    },
    (r) => { // ×k + k, k increases
      let x = ri(r, 2, 8); const t = [x]; const desc: string[] = [];
      for (let i = 1; i <= 6; i++) { const k = i + 1; desc.push(`×${k} + ${k}`); x = x * k + k; t.push(x); }
      return { t, rule: `Pattern: ${desc.join(', ')} (that is, ×(n+1) + (n+1) at each step).` };
    },
    (r) => { // interleaved: odd terms +p growing, even ×q
      let x = ri(r, 4, 15); const p0 = ri(r, 3, 8), q = pick(r, [2, 3]); const t = [x]; const desc: string[] = [];
      for (let i = 0; i < 6; i++) {
        if (i % 2 === 0) { x = x * q; desc.push(`×${q}`); }
        else { const add = p0 + ((i - 1) / 2) * p0; x = x + add; desc.push(`+${add}`); }
        t.push(x);
      }
      return { t, rule: `Operations alternate: ${desc.join(', ')}.` };
    },
    (r) => { // primes added to squares
      const pr = [2, 3, 5, 7, 11, 13, 17]; const n0 = ri(r, 4, 9); const t: number[] = [];
      for (let i = 0; i < 7; i++) t.push((n0 + i) * (n0 + i) + pr[i]);
      return { t, rule: `Each term = n² + p, where n = ${n0}, ${n0 + 1}, … and p runs through the primes ${pr.slice(0, 7).join(', ')}.` };
    },
    (r) => { // ×0.5+0.5 style already exists; use ×1.5+1.5 chain which is (3n+3)/2 needing integers
      let x = pick(r, [2, 4, 6, 8, 10, 12]); const t = [x];
      for (let i = 1; i <= 6; i++) { x = (x * 3 + 3) / 1; /* ×3+3 */ t.push(x); }
      return { t, rule: 'Each term = previous × 3 + 3.' };
    },
  ];

  function qtyQ(r: RNG): Question {
    type Pair = { i: number; ii: number; e1: string[]; e2: string[]; qi: string; qii: string; cnd?: boolean };
    const makers: ((r: RNG) => Pair)[] = [
      (r) => {
        const p = pick(r, [20, 25, 40, 50]); const A = 40 * ri(r, 4, 20); const c = ri(r, 11, 20);
        const i = (p * A) / 100 + c * c; const a = ri(r, 6, 12), b = ri(r, 8, 15); const ii = a * b + 10;
        return { i, ii, qi: `${p}% of ${A} + ${c}²`, qii: `${a} × ${b} + 10`, e1: [`${p}% of ${A} = ${(p * A) / 100}; ${c}² = ${c * c}; Quantity I = ${i}.`], e2: [`${a} × ${b} + 10 = ${ii}.`] };
      },
      (r) => {
        const a = ri(r, 8, 18), b = ri(r, 5, 12); const i = 4 * a * b;
        const c = ri(r, 10, 16); const ii = c * c + 20;
        return { i, ii, qi: `(${a} + ${b})² − (${a} − ${b})²`, qii: `${c}² + 20`, e1: [`(a+b)² − (a−b)² = 4ab = ${i}.`], e2: [`${c}² + 20 = ${ii}.`] };
      },
      (r) => {
        const P = 1000 * ri(r, 2, 12), rate = pick(r, [8, 10, 12, 15]); const t = 2;
        const si = (P * rate * t) / 100; const d = (P * rate * rate) / 10000;
        return { i: si, ii: si + d, qi: `Simple interest on Rs ${P} at ${rate}% p.a. for 2 years`, qii: `Compound interest on the same sum, rate and time (annual compounding)`, e1: [`SI = P×R×T/100 = ${si}.`], e2: [`CI − SI for 2 years = P(R/100)² = ${d}, so CI = ${si + d}.`] };
      },
      (r) => {
        const a = ri(r, 6, 12), b = ri(r, 8, 15); // work
        const i = (a * b) / gcd(a, b); // days together? LCM is total work if a,b are days - together days = ab/(a+b)
        const tog = (a * b) / (a + b);
        const ii = tog + 2;
        // make tog integer
        return { i: tog, ii, qi: `Days taken by A and B together to finish a work, if A alone takes ${a} days and B alone takes ${b} days`, qii: `${fmtNum(ii)}`, e1: [`Together = ${a}×${b}/(${a}+${b}) = ${fmtNum(tog)} days.`], e2: [`Quantity II = ${fmtNum(ii)}.`] };
      },
    ];
    let pair = pick(r, makers)(r);
    if (!Number.isInteger(pair.i) || !Number.isInteger(pair.ii)) {
      const a = 12, b = 6; const tog = 4; const add = pick(r, [0, 1, 2, 3]);
      pair = { i: tog, ii: tog + add, qi: `Days taken by A and B together if A takes ${a} days and B takes ${b} days`, qii: `${tog + add}`, e1: [`Together = ${a}×${b}/(${a}+${b}) = ${tog} days.`], e2: [`Quantity II = ${tog + add}.`] };
    }
    let idx = pair.i > pair.ii ? 0 : pair.i < pair.ii ? 1 : 2;
    return { ...NB('Quadratic Equations', 'Tricky', `Quantity I: ${pair.qi}\nQuantity II: ${pair.qii}\n\nCompare the two quantities.`, [...pair.e1, ...pair.e2, `Quantity I = ${fmtNum(pair.i)}, Quantity II = ${fmtNum(pair.ii)}, so ${QTY_OPTS[idx]}.`], 'Evaluate both quantities cleanly, then compare. Do not stop at a first-step figure.', 'Comparing intermediate values (for example SI with CI-SI) instead of the finished quantities.'), options: QTY_OPTS, correctIndex: idx };
  }

  const ARITH_HARD: ((r: RNG) => Question)[] = [
    (r) => {
      const a = pick(r, [10, 12, 15, 16, 18, 20]); const b = pick(r, [12, 15, 18, 20, 24, 30].filter((x) => x !== a));
      const c = pick(r, [24, 30, 36, 40, 48].filter((x) => x !== a && x !== b));
      const l = C.lcm(C.lcm(a, b), c); const rate = l / a + l / b - l / c;
      if (rate <= 0 || l % rate !== 0) {
        return mkN(r, NB('Time & Work', 'Tricky', 'Pipe A can fill a tank in 12 hours and pipe B in 18 hours. A leak can empty the full tank in 36 hours. If both pipes and the leak are opened together, in how many hours will the tank be full?',
          ['Take the tank as 36 units. A fills 3 units/h, B fills 2, the leak empties 1.', 'Net = 3 + 2 − 1 = 4 units/h.', 'Time = 36 ÷ 4 = 9 hours.'], 'LCM as capacity; treat the leak as a negative rate.', 'Adding the leak instead of subtracting it.'), 9, 1, [36 / 6, 8, 12], String);
      }
      const ans = l / rate;
      return mkN(r, NB('Time & Work', 'Tricky', `Pipe A can fill a tank in ${a} hours and pipe B in ${b} hours. A leak can empty the full tank in ${c} hours. If both pipes and the leak are opened together, in how many hours will the tank be full?`,
        [`Take the tank as ${l} units. A fills ${l / a} units/h, B fills ${l / b}, the leak empties ${l / c}.`, `Net = ${l / a} + ${l / b} − ${l / c} = ${rate} units/h.`, `Time = ${l} ÷ ${rate} = ${ans} hours.`], 'LCM as capacity; treat the leak as a negative rate.', 'Adding the leak instead of subtracting it.'), ans, stepOf(ans), [l / (l / a + l / b + l / c)], String);
    },
    (r) => {
      const u = pick(r, [8, 10, 12, 15, 16, 18]); const v = pick(r, [2, 3, 4, 5, 6].filter((x) => x < u));
      const down = u + v, up = u - v;
      const k = ri(r, 2, 6); const D = k * C.lcm(C.lcm(down, up), u);
      const still = D / u;
      const name = pick(r, C.NAMES);
      return mkN(r, NB('Boats & Streams', 'Tricky', `${name} rows ${D} km downstream in ${D / down} hours and the same distance upstream in ${D / up} hours. How many hours will ${name} take to row ${D} km in still water?`,
        [`Downstream speed = ${D} ÷ ${D / down} = ${down} km/h; upstream = ${D} ÷ ${D / up} = ${up} km/h.`, `Speed in still water = (${down} + ${up}) ÷ 2 = ${u} km/h.`, `Time for ${D} km in still water = ${D} ÷ ${u} = ${still} hours.`], 'Still-water speed is the average of the downstream and upstream speeds.', 'Using only the downstream speed for the still-water trip.'), still, stepOf(still), [D / down, D / up], String);
    },
    (r) => {
      const x = 1000 * ri(r, 4, 12), y = 1000 * ri(r, 4, 12); const m = pick(r, [3, 4, 5, 6]);
      const unitsA = x * 12, unitsB = y * (12 - m); const totU = unitsA + unitsB;
      const g0 = gcd(unitsA, unitsB), rA = unitsA / g0, rB = unitsB / g0, rT = rA + rB;
      const tP = ri(r, 2, 12); const P0 = 10 * rT * tP; const rest = 9 * rT * tP; const ans = 9 * rB * tP;
      const X = pick(r, C.MALES); const Y = pick(r, C.MALES.filter((n) => n !== X));
      return mkN(r, NB('Partnership', 'Tricky', `${X} starts a business with Rs ${x}. After ${m} months ${Y} joins with Rs ${y}. At the end of the year the profit is Rs ${P0}, of which 10% is given to charity and the rest is shared in the ratio of their capital × time. What is ${Y}'s share?`,
        [`Capital-time: ${X} = ${x} × 12 = ${unitsA}; ${Y} = ${y} × ${12 - m} = ${unitsB}.`, `Ratio = ${unitsA} : ${unitsB}.`, `Profit after charity = 90% of ${P0} = ${rest}.`, `${Y}'s share = ${rest} × ${unitsB} ÷ ${totU} = ${ans}.`], 'Always take charity off the profit first, then split the remainder in the capital-time ratio.', 'Splitting the full profit and then deducting 10% from one partner only.'), ans, stepOf(ans), [(P0 * unitsB) / totU, (rest * unitsA) / totU], rs);
    },
    (r) => {
      const r1 = pick(r, [20, 25, 30, 40]); const r2 = pick(r, [10, 15, 20, 25].filter((x) => x !== r1));
      let milk = 20 * ri(r, 3, 12);
      // after adding w water, new % = r2: milk stays, total = milk*100/r2, water added = that - original total
      // original: milk is r1% of T, T = milk*100/r1
      if ((milk * 100) % r1 !== 0) milk += r1 - (milk * 100) % r1;
      const T = (milk * 100) / r1;
      const T2 = (milk * 100) / r2;
      const w = T2 - T;
      return mkN(r, NB('Mixtures', 'Tricky', `A mixture of ${T} litres contains ${r1}% milk and the rest water. How many litres of water must be added so that the mixture contains ${r2}% milk?`,
        [`Milk is unchanged: ${r1}% of ${T} = ${milk} litres.`, `After adding water this ${milk} litres is ${r2}% of the new volume, so new volume = ${milk} × 100 ÷ ${r2} = ${T2} litres.`, `Water added = ${T2} − ${T} = ${w} litres.`], 'The milk stays put; only the total volume grows. New volume = milk ÷ new %.', 'Increasing the milk percentage, or adding the same % of water to the original volume.'), w, stepOf(w), [T * (r1 - r2) / 100, T2], String);
    },
    (r) => {
      const rate = pick(r, [8, 10, 12, 15, 16, 20]); let k = ri(r, 4, 25);
      while ((k * 1000 * rate * rate) % 10000 !== 0) k++;
      const P = k * 1000; const diff = (P * rate * rate) / 10000;
      const ci = (P * rate * 2) / 100 + diff;
      return mkN(r, NB('Interest (SI & CI)', 'Tricky', `The difference between the compound interest and the simple interest on a sum for 2 years at ${rate}% per annum is Rs ${diff}. What is the compound interest on the same sum for 2 years at the same rate?`,
        [`For 2 years, CI − SI = P(R/100)², so P = ${diff} × 10000 ÷ ${rate * rate} = ${P}.`, `SI for 2 years = ${P} × ${rate} × 2 ÷ 100 = ${(P * rate * 2) / 100}.`, `CI = SI + difference = ${(P * rate * 2) / 100} + ${diff} = ${ci}.`], 'CI − SI for 2 years is P(R/100)²; add that difference back to the SI to get CI.', 'Reporting the principal, or the difference itself, as the CI.'), ci, stepOf(ci), [P, (P * rate * 2) / 100], rs);
    },
    (r) => {
      // ages: 4 years ago ratio a:b, 6 years hence c:d
      const a = pick(r, [3, 4, 5]), b = a + pick(r, [1, 2]);
      const c = a + pick(r, [1, 2]), d = b + pick(r, [1, 2]);
      // (a k - 4)/(b k - 4) wait 4 years ago: ages were a u, b u. Now au+4, bu+4. In 6 years au+10, bu+10 = c v, d v.
      // (au+10)/(bu+10) = c/d
      // d(au+10) = c(bu+10) => d a u - c b u = 10c - 10d => u (da - cb) = 10(c-d)
      const num = 10 * (c - d), den = d * a - c * b;
      if (den === 0 || num % den !== 0) {
        // known working: 4 yrs ago 2:3, 6 hence 4:5. u*(5*2-4*3)=10(4-5) => u(10-12)= -10 => u=5. Now 9 and 14, sum 23
        return mkN(r, NB('Ages', 'Tricky', 'Four years ago the ratio of the ages of A and B was 2 : 3. Six years from now the ratio will be 4 : 5. What is the sum of their present ages?',
          ['4 years ago: 2u and 3u. Present: 2u+4, 3u+4. In 6 years: 2u+10, 3u+10.', '(2u+10)/(3u+10) = 4/5 ⇒ 5(2u+10) = 4(3u+10) ⇒ 10u + 50 = 12u + 40 ⇒ u = 5.', 'Present ages 14 and 19; sum = 33.'], 'Convert both given ratios to the same timeline and clear the cross-multiply.', 'Adding 4 and 6 to the ratio terms themselves (2:3 becoming 12:13).'), 33, 2, [23, 28, 30], String);
      }
      const u = num / den; if (u <= 0 || a * u - 4 <= 0) {
        return mkN(r, NB('Ages', 'Tricky', 'Four years ago the ratio of the ages of A and B was 2 : 3. Six years from now the ratio will be 4 : 5. What is the sum of their present ages?',
          ['4 years ago: 2u and 3u. In 6 years: 2u+10 and 3u+10.', '(2u+10)/(3u+10) = 4/5 ⇒ u = 5.', 'Present ages 14 and 19; sum = 33.'], 'Cross-multiply after shifting both ages to the same future date.', 'Adding the years to the ratio terms.'), 33, 2, [23, 27, 28], String);
      }
      const sum = a * u + 4 + (b * u + 4);
      return mkN(r, NB('Ages', 'Tricky', `Four years ago the ratio of the ages of A and B was ${a} : ${b}. Six years from now the ratio will be ${c} : ${d}. What is the sum of their present ages?`,
        [`4 years ago: ${a}u and ${b}u. In 6 years: ${a}u+10 and ${b}u+10.`, `(${a}u+10)/(${b}u+10) = ${c}/${d} ⇒ u = ${u}.`, `Present ages ${a * u + 4} and ${b * u + 4}; sum = ${sum}.`], 'Shift both ages to the same date, then cross-multiply.', 'Adding 4 and 6 to the ratio terms themselves.'), sum, stepOf(sum), [a * u + b * u], String);
    },
    (r) => {
      const cp = 100 * ri(r, 8, 30); const m = pick(r, [20, 25, 30, 40, 50]); const d = pick(r, [10, 12, 15, 20]);
      const mp = cp * (100 + m) / 100; const sp = mp * (100 - d) / 100;
      const vat = pick(r, [5, 8, 10, 12]);
      const paid = sp * (100 + vat) / 100;
      // ensure integers
      if (!Number.isInteger(sp) || !Number.isInteger(paid)) {
        const cp2 = 400, m2 = 25, d2 = 10, vat2 = 10; const sp2 = 400 * 1.25 * 0.9; const paid2 = sp2 * 1.1;
        return mkN(r, NB('Profit & Loss', 'Tricky', `A shopkeeper marks an article 25% above Rs 400 and allows a discount of 10%. If VAT of 10% is then charged on the selling price, how much does the customer pay?`,
          ['MP = 400 × 1.25 = 500; SP after discount = 500 × 0.9 = 450.', 'VAT 10% on 450 = 45.', 'Amount paid = 450 + 45 = 495.'], 'Discount first (on MP), then VAT on the discounted SP — never add VAT to the marked price.', 'Charging VAT on the marked price, or taking discount after VAT.'), 495, 15, [550, 440, 500], rs);
      }
      return mkN(r, NB('Profit & Loss', 'Tricky', `A shopkeeper marks an article ${m}% above Rs ${cp} and allows a discount of ${d}%. If VAT of ${vat}% is then charged on the selling price, how much does the customer pay?`,
        [`MP = ${cp} × ${1 + m / 100} = ${mp}; SP after discount = ${mp} × ${1 - d / 100} = ${sp}.`, `VAT = ${vat}% of ${sp} = ${paid - sp}.`, `Amount paid = ${sp} + ${paid - sp} = ${paid}.`], 'Discount first on the marked price, then VAT on the discounted selling price.', 'Charging VAT on the marked price, or taking the discount after VAT.'), paid, stepOf(paid), [mp * (100 + vat) / 100, sp], rs);
    },
    (r) => {
      const a = pick(r, [8, 10, 12, 15, 16, 18, 20]); const b = pick(r, [12, 15, 16, 18, 20, 24].filter((x) => x !== a));
      const l = C.lcm(a, b); const ra = l / a, rb = l / b;
      const k = ri(r, 2, Math.min(6, a - 2));
      const left = l - ra * k; const days = left / rb;
      if (!Number.isInteger(days) || days <= 0) {
        return mkN(r, NB('Time & Work', 'Tricky', 'A can finish a work in 12 days and B in 18 days. They work together for 4 days, then A leaves. In how many more days will B finish the remaining work?',
          ['Total work = 36 units. A does 3 units/day, B does 2.', 'In 4 days together: 5 × 4 = 20 units; 16 remain.', 'B needs 16 ÷ 2 = 8 more days.'], 'LCM as total work; subtract the work already done before splitting the remainder.', 'Dividing the remaining days as if both were still working.'), 8, 1, [6, 10, 14], String);
      }
      const X = pick(r, C.NAMES), Y = pick(r, C.NAMES.filter((n) => n !== X));
      return mkN(r, NB('Time & Work', 'Tricky', `${X} can finish a work in ${a} days and ${Y} in ${b} days. They work together for ${k} days, then ${X} leaves. In how many more days will ${Y} finish the remaining work?`,
        [`Total work = ${l} units. ${X} does ${ra} units/day, ${Y} does ${rb}.`, `In ${k} days together: ${(ra + rb) * k} units; ${left} remain.`, `${Y} needs ${left} ÷ ${rb} = ${days} more days.`], 'LCM as total work; subtract what is already done, then use only the remaining person.', 'Dividing the remainder by their combined rate.'), days, stepOf(days), [left / (ra + rb)], String);
    },
    (r) => {
      const sp1 = 5 * ri(r, 8, 24), sp2 = 5 * ri(r, 8, 24);
      // average speed: 2ab/(a+b) for equal distances
      const num = 2 * sp1 * sp2, den = sp1 + sp2;
      if (num % den !== 0) {
        return mkN(r, NB('Speed, Time & Distance', 'Tricky', 'A car travels from A to B at 40 km/h and returns from B to A at 60 km/h. What is its average speed for the whole journey (in km/h)?',
          ['For equal distances, average speed = 2xy/(x+y) = 2×40×60/(40+60) = 4800/100 = 48 km/h.'], 'Never take the arithmetic mean of the two speeds when the distances are equal.', 'Answering (40+60)/2 = 50 km/h.'), 48, 2, [50, 45, 52], String);
      }
      const ans = num / den;
      return mkN(r, NB('Speed, Time & Distance', 'Tricky', `A car travels from A to B at ${sp1} km/h and returns from B to A at ${sp2} km/h. What is its average speed for the whole journey (in km/h)?`,
        [`Equal distances, so average speed = 2xy/(x+y) = 2×${sp1}×${sp2}/(${sp1}+${sp2}) = ${ans} km/h.`], 'Harmonic mean for equal distances: 2xy/(x+y). Never (x+y)/2.', `Answering (${sp1}+${sp2})/2 = ${(sp1 + sp2) / 2}.`), ans, stepOf(ans), [(sp1 + sp2) / 2], String);
    },
    (r) => {
      const r1 = pick(r, [7, 14, 21]); const h = pick(r, [8, 10, 12, 15, 16, 20]);
      // cylinder volume 22/7 r^2 h, plus a cone or remaining after cutting
      const vol = (22 * r1 * r1 * h) / 7;
      return mkN(r, NB('Mensuration', 'Tricky', `The internal radius of a cylindrical tank is ${r1} cm and its height is ${h} cm. How many litres of water (approx. 1000 cm³ = 1 litre) can it hold? (Take π = 22/7.)`,
        [`Volume = πr²h = 22/7 × ${r1} × ${r1} × ${h} = ${vol} cm³.`, `${vol} ÷ 1000 = ${vol / 1000} litres.`], 'Keep π = 22/7 when the radius is a multiple of 7; convert cm³ to litres at the end (÷ 1000).', 'Forgetting to divide by 1000, or using 2πrh (the surface) instead of the volume.'), vol / 1000, Math.max(0.5, vol / 10000), [vol, vol / 100, (2 * 22 * r1 * h) / 7 / 1000], (n) => fmtNum(n));
    },
  ];

  function multiStepDI(r: RNG, kind: string): Question[] {
    const baseQs = kind === 'line' ? C.diLine(r) : kind === 'pie' ? C.diPie(r) : kind === 'caselet' ? C.diCaselet(r) : C.diQs(r);
    // Replace mid questions with a 2-step variant when a table exists
    const q0 = baseQs[0];
    if (!q0.table || !q0.table.rows.length) return baseQs.map((q, i) => i >= 2 ? hardenDIQ(r, q) : q);
    const table = q0.table;
    const rows = table.rows.map((row) => row.map((c, i) => (i === 0 ? c : Number(c))) as [string, ...number[]]);
    const cols = table.columns.slice(1);
    const nR = rows.length;
    const c0 = 0, c1 = Math.min(1, cols.length - 1);
    const iA = 0, iB = Math.min(1, nR - 1), iC = Math.min(2, nR - 1);
    const totA = rows[iA].slice(1).reduce((s: number, v) => s + Number(v), 0);
    const totB = rows[iB].slice(1).reduce((s: number, v) => s + Number(v), 0);
    const avgC = rows.reduce((s, row) => s + Number(row[c0 + 1]), 0) / nR;
    const inc = pick(r, [10, 20, 25]);
    const newA = Number(rows[iA][c0 + 1]) * (100 + inc) / 100;
    const qNew: Question[] = baseQs.slice();
    // Q3-like: ratio of totals
    const g = gcd(totA, totB);
    qNew[2] = finalize(r, { ...C.NB('Data Interpretation', 'Tricky', `What is the ratio of the total of all categories for ${rows[iA][0]} to that for ${rows[iB][0]}?`, [`${rows[iA][0]} total = ${rows[iA].slice(1).join(' + ')} = ${totA}.`, `${rows[iB][0]} total = ${rows[iB].slice(1).join(' + ')} = ${totB}.`, `Ratio = ${totA / g} : ${totB / g}.`], 'Total each row first, then cancel the HCF.', 'Comparing a single column instead of the row totals.'), table, variant: q0.variant }, ratioStr(totA, totB), [ratioStr(totB, totA), ratioStr(totA + 10, totB), ratioStr(Number(rows[iA][c0 + 1]), Number(rows[iB][c0 + 1])), ratioStr(totA, totB + 10)]);
    if (Number.isInteger(newA)) {
      const den = Number(rows[iC][c0 + 1]);
      if (den) {
        const pct = Math.round((newA / den) * 10000) / 100;
        qNew[3] = mkN(r, { ...C.NB('Data Interpretation', 'Tricky', `If ${cols[c0].toLowerCase()} of ${rows[iA][0]} increases by ${inc}%, it becomes what percent of the present ${cols[c0].toLowerCase()} of ${rows[iC][0]}?`, [`New value = ${rows[iA][c0 + 1]} × ${100 + inc}/100 = ${newA}.`, `Required % = ${newA} ÷ ${den} × 100 = ${fmtNum(pct)}%.`], 'Apply the increase first, then divide by the unchanged base.', 'Taking the % increase itself as the answer, or dividing by the old value.'), table, variant: q0.variant }, pct, 5, [inc, Math.round((Number(rows[iA][c0 + 1]) / den) * 100)], pctFmt);
      }
    }
    void avgC;
    return qNew;
  }
  function hardenDIQ(r: RNG, q: Question): Question { return q; }

  function missingBarDI(r: RNG): Question[] {
    const qs = C.diQs(r);
    const q0 = qs[0];
    if (!q0.table) return qs;
    const table = { ...q0.table, rows: q0.table.rows.map((row) => row.slice()) };
    const ri0 = table.rows.length - 1;
    const ci = table.columns.length - 1; // last numeric col index in row (including label at 0)
    const hidden = table.rows[ri0][ci];
    const colVals = table.rows.map((row) => Number(row[ci]));
    const avg = colVals.reduce((a, b) => a + b, 0) / table.rows.length;
    table.rows[ri0][ci] = '—';
    const note = `The average ${table.columns[ci].toLowerCase()} across all ${table.rows.length} ${table.columns[0].toLowerCase() === 'branch' ? 'branches' : 'rows'} is ${fmtNum(avg)}.`;
    const passage = `${table.title}. ${note} (The missing entry is marked “—”.)`;
    const fill = [`The missing entry is determined from the average: sum = ${fmtNum(avg)} × ${table.rows.length} = ${colVals.reduce((a, b) => a + b, 0)}.`, `Missing ${table.columns[ci]} of ${table.rows[ri0][0]} = ${hidden}.`];
    return qs.map((q, i) => ({
      ...q,
      table,
      passageTitle: 'Directions: Study the table (one entry is missing) and answer the questions.',
      passage: (q.passage ? q.passage + '\n\n' : '') + passage,
      explanation: i === 0 ? [...fill, ...q.explanation] : q.explanation,
      variant: 'bar',
      difficulty: 'Tricky' as Difficulty,
    }));
  }

  // ================= REASONING MISC (Moderate / Hard) =================
  function codedIneqQs(r: RNG, longer: boolean): Question[] {
    const ops = ['>', '≥', '=', '<', '≤'] as const;
    const glyphs = C.shuffle(r, ['@', '#', '$', '%', '&', '©', '*']).slice(0, 5);
    const map: Record<string, string> = {}; const inv: Record<string, string> = {};
    ops.forEach((op, i) => { map[glyphs[i]] = op; inv[op] = glyphs[i]; });
    const key = glyphs.map((g) => `${g} means ${map[g]}`).join(', ');
    const out: Question[] = [];
    for (let q = 0; q < 5; q++) {
      const target = pick(r, [0, 1, 2, 3, 4, 0, 1, 3]);
      let done = false;
      for (let tries = 0; tries < 200 && !done; tries++) {
        const L = longer ? ri(r, 6, 7) : ri(r, 5, 6);
        const lets = C.shuffle(r, 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('')).slice(0, L);
        const syms = Array.from({ length: L - 1 }, () => pick(r, ['>', '≥', '=', '<', '≤', '≥', '≤']));
        const pairs: number[][] = [];
        for (let i = 0; i < L; i++) for (let j = i + 1; j < L; j++) if (j - i >= 2) pairs.push([i, j]);
        const def = pairs.filter((p) => chainRel(syms, p[0], p[1]) !== null);
        const mixed = pairs.filter((p) => chainRel(syms, p[0], p[1]) === null);
        const weak = def.filter((p) => { const x = chainRel(syms, p[0], p[1]); return x === '≥' || x === '≤'; });
        type Conc = { a: number; b: number; op: string };
        const trueC = (p: number[]): Conc => ({ a: p[0], b: p[1], op: chainRel(syms, p[0], p[1]) as string });
        const falseC = (): Conc | null => {
          if (mixed.length && r() < 0.6) { const p = pick(r, mixed); return { a: p[0], b: p[1], op: pick(r, ['>', '<', '≥', '≤']) }; }
          if (!def.length) return null;
          const p = pick(r, def); const x = chainRel(syms, p[0], p[1]) as string;
          const bad: Record<string, string[]> = { '>': ['<', '≤', '='], '≥': ['<'], '=': ['>', '<'], '<': ['>', '≥', '='], '≤': ['>'] };
          return { a: p[0], b: p[1], op: pick(r, bad[x]) };
        };
        let c1: Conc | null = null, c2: Conc | null = null;
        if (target === 2) { if (!weak.length) continue; const p = pick(r, weak); const x = chainRel(syms, p[0], p[1]) as string; c1 = { a: p[0], b: p[1], op: x === '≥' ? '>' : '<' }; c2 = { a: p[0], b: p[1], op: '=' }; if (r() < 0.5) { const tmp = c1; c1 = c2; c2 = tmp; } }
        else if (target === 4) { if (def.length < 2) continue; const [p, s] = C.shuffle(r, def).slice(0, 2); c1 = trueC(p); c2 = trueC(s); }
        else if (target === 3) { c1 = falseC(); c2 = falseC(); }
        else { if (!def.length) continue; const tc = trueC(pick(r, def)); const fc = falseC(); if (target === 0) { c1 = tc; c2 = fc; } else { c1 = fc; c2 = tc; } }
        if (!c1 || !c2) continue;
        const show = (c: Conc) => `${lets[c.a]} ${inv[c.op] || c.op} ${lets[c.b]}`;
        const chain = lets.map((l, i) => (i < L - 1 ? `${l} ${inv[syms[i]]} ` : l)).join('');
        const why = (c: Conc, lab: string) => {
          const x = chainRel(syms, c.a, c.b);
          return `${lab}: between ${lets[c.a]} and ${lets[c.b]} the decoded signs give ${x ? `${lets[c.a]} ${x} ${lets[c.b]}` : 'no definite relation'} — so “${lets[c.a]} ${c.op} ${lets[c.b]}” ${x && (x === c.op || (x === '>' && c.op === '≥') === false && x === c.op) ? 'follows' : (x === c.op ? 'follows' : 'does not follow')}.`;
        };
        // simpler why
        const why2 = (c: Conc, lab: string) => {
          const x = chainRel(syms, c.a, c.b);
          const holds = x === c.op || (c.op === '≥' && (x === '>' || x === '=' || x === '≥')) || (c.op === '≤' && (x === '<' || x === '=' || x === '≤')) || (c.op === '>' && x === '>') || (c.op === '<' && x === '<') || (c.op === '=' && x === '=');
          // For target construction we already know which follow. Don't use this loose implication for ≥ from >... actually I follows > means ≥ also follows? In IBPS, if we derive A > B, then A ≥ B also follows. Our targets already set exact ops. Keep the explanation descriptive.
          return `${lab}: decoded relation between ${lets[c.a]} and ${lets[c.b]} is ${x ?? 'not definite'}. Conclusion ${lets[c.a]} ${c.op} ${lets[c.b]} ${x === c.op ? 'follows' : (target === 2 && (c.op === '>' || c.op === '<' || c.op === '=') ? 'is one side of the complementary pair' : 'does not follow')}.`;
        };
        void why; void why2;
        const expl = [
          `Decode the symbols: ${key}.`,
          `The statement is ${lets.map((l, i) => (i < L - 1 ? `${l} ${syms[i]} ` : l)).join('')}.`,
          `I. ${lets[c1.a]} ${c1.op} ${lets[c1.b]} — ${target === 0 || target === 4 || (target === 2) ? 'see the complementary/definite check below.' : ''}${['follows in “Only I” / “Both” cases as built', ''][0]}`,
          `Answer: ${SYL_OPTS[target]}.`,
        ];
        // cleaner explanations:
        const dec = (c: Conc) => {
          const x = chainRel(syms, Math.min(c.a, c.b), Math.max(c.a, c.b));
          return x ? `${lets[Math.min(c.a, c.b)]} ${x} ${lets[Math.max(c.a, c.b)]}` : 'no definite relation';
        };
        out.push({
          ...C.RB('Inequality', 'Tricky', `In the following questions, the symbols ${glyphs.slice(0, 5).join(', ')} are used with the following meanings:\n${key}.\n\nStatement: ${chain}\n\nConclusions:\nI. ${show(c1)}\nII. ${show(c2)}`,
            [`Decoded statement: ${lets.map((l, i) => (i < L - 1 ? `${l} ${syms[i]} ` : l)).join('')}.`, `I (${lets[c1.a]} ${c1.op} ${lets[c1.b]}): ${dec(c1)}.`, `II (${lets[c2.a]} ${c2.op} ${lets[c2.b]}): ${dec(c2)}.`, target === 2 ? 'I and II are complementary on the same pair (the derived relation is ≥ or ≤), so either I or II follows.' : `Answer: ${SYL_OPTS[target]}.`],
            'Write the decoded chain first; a conclusion follows only if every sign between the two letters points the same way.',
            'Comparing letters across a break in the chain, or forgetting what a coded symbol means.'),
          options: SYL_OPTS,
          correctIndex: target,
        });
        done = true;
      }
      if (!done) out.push(C.ineqQs(r)[0]);
    }
    return out.slice(0, 5);
  }

  function sylHard(r: RNG): Question[] {
    type T = { s: string[]; c: string[]; a: number; e: string[] };
    const extra: T[] = [
      { s: ['Only a few A are B.', 'All B are C.', 'No C is D.'], c: ['Some A are not D.', 'All A being D is a possibility.'], a: 0, e: ['The A that are B lie inside C, which is outside D, so those A are not D: I follows.', 'Those same A can never be D, so “all A being D” is impossible: II does not follow.'] },
      { s: ['Only a few A are B.', 'No B is C.', 'All C are D.'], c: ['Some A are not C.', 'All D being A is a possibility.'], a: 4, e: ['The A that are B cannot be C, so some A are not C: I follows.', 'D (outside the B part) may overlap the remaining A: II is a possibility.'] },
      { s: ['All A are B.', 'Only a few B are C.', 'No C is D.'], c: ['Some B are not D.', 'All A being D is a possibility.'], a: 4, e: ['The B that are C cannot be D, so some B are not D: I follows.', 'A can lie in the part of B that is outside C, and that part may be D: II is a possibility.'] },
      { s: ['Some A are B.', 'All B are C.', 'No C is D.'], c: ['Some A are not D.', 'All D being A is a possibility.'], a: 0, e: ['The A that are B (hence C) cannot be D, so some A are not D: I follows.', 'No D can be C, but some A are C, so those A can never be D; “all D being A” can still hold for other A — actually D cannot be those A that are C; D can still be the remaining A. II is a possibility... wait let us set a=4 if II follows.'] },
    ];
    // Fix the last template: All D being A is a possibility — yes D can overlap A outside B. So both follow, a=4.
    extra[3] = { s: ['Some A are B.', 'All B are C.', 'No C is D.'], c: ['Some A are not D.', 'All D being A is a possibility.'], a: 4, e: ['The A that are B (and therefore C) cannot be D, so some A are not D: I follows.', 'D can still overlap the A that are not B: “all D being A” is a possibility. II follows.'] };
    extra.push(
      { s: ['All A are B.', 'All B are C.', 'Only a few C are D.'], c: ['Some A are D.', 'All A being D is a possibility.'], a: 1, e: ['A lie inside C, but only a few C are D, so some A may or may not be D: I does not follow.', 'A can lie entirely inside the D part of C: II is a possibility.'] },
      { s: ['No A is B.', 'Only a few B are C.', 'All C are D.'], c: ['Some B are not A.', 'Some D are not A.'], a: 4, e: ['“No A is B” converts to some B are not A (in fact all B are not A): I follows.', 'The C (hence some D) that are B cannot be A, so some D are not A: II follows.'] },
    );
    const bank = extra;
    const words: [string, string][][] = [
      [['clerks', 'clerk'], ['officers', 'officer'], ['managers', 'manager'], ['loans', 'loan']],
      [['banks', 'bank'], ['branches', 'branch'], ['accounts', 'account'], ['deposits', 'deposit']],
    ];
    const art = (s: string) => (/^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`);
    const fill = (s0: string, w: [string, string][]) => {
      let s = s0;
      s = s.replace(/A/g, '∎A∎').replace(/B/g, '∎B∎').replace(/C/g, '∎C∎').replace(/D/g, '∎D∎');
      s = s.replace(/∎A∎/g, w[0][0]).replace(/∎B∎/g, w[1][0]).replace(/∎C∎/g, w[2][0]).replace(/∎D∎/g, w[3][0]);
      return s;
    };
    // The replace of A/B/C in sentences will smash words like "All" if we're not careful. Use {A} tokens instead.
    const fill2 = (s0: string, w: [string, string][]) => s0
      .replace(/\{A\}/g, w[0][0]).replace(/\{B\}/g, w[1][0]).replace(/\{C\}/g, w[2][0]).replace(/\{D\}/g, w[3][0])
      .replace(/\{a\}/g, art(w[0][1])).replace(/\{b\}/g, art(w[1][1])).replace(/\{c\}/g, art(w[2][1])).replace(/\{d\}/g, art(w[3][1]));
    void fill;
    const tok = (arr: string[]) => arr.map((s) => s.replace(/\bA\b/g, '{A}').replace(/\bB\b/g, '{B}').replace(/\bC\b/g, '{C}').replace(/\bD\b/g, '{D}'));
    return C.shuffle(r, bank).slice(0, 5).map((tpl) => {
      const w = (pick(r, words));
      const four: [string, string][] = w.length >= 4 ? w.slice(0, 4) : [...w, ['files', 'file'], ['cheques', 'cheque']];
      const f = (s: string) => fill2(s, four);
      const S = tok(tpl.s).map(f); const Cns = tok(tpl.c).map(f); const E = tok(tpl.e).map(f);
      return { ...C.RB('Syllogism', 'Tricky', `Statements:\n${S.join('\n')}\n\nConclusions:\nI. ${Cns[0]}\nII. ${Cns[1]}`, [...E, `Answer: ${SYL_OPTS[tpl.a]}.`], 'Draw the minimum-overlap Venn; “Only a few X are Y” means Some X are Y AND Some X are not Y.', 'Treating a possibility as a certainty, or ignoring the “some are not” hidden in “only a few”.'), options: SYL_OPTS, correctIndex: tpl.a };
    });
  }

  function codedBlood(r: RNG): Question {
    const [m1, m2, m3] = C.shuffle(r, C.MALES).slice(0, 3);
    const [f1, f2] = C.shuffle(r, C.FEMALES).slice(0, 2);
    const T: { q: string; a: string; e: string[] }[] = [
      { q: `A + B means A is the father of B; A − B means A is the mother of B; A × B means A is the brother of B; A ÷ B means A is the sister of B.\n\nIf ${m1} + ${f1} × ${m2}, how is ${m1} related to ${m2}?`, a: 'Father', e: [`${f1} × ${m2} means ${f1} is the sister of ${m2}, so they are siblings.`, `${m1} + ${f1} means ${m1} is the father of ${f1}, hence also the father of ${m2}.`] },
      { q: `A + B means A is the father of B; A − B means A is the mother of B; A × B means A is the brother of B; A ÷ B means A is the sister of B.\n\nIf ${f1} − ${m1} × ${f2}, how is ${f1} related to ${f2}?`, a: 'Mother', e: [`${m1} × ${f2} means ${m1} is the brother of ${f2}.`, `${f1} − ${m1} means ${f1} is the mother of ${m1}, hence also the mother of ${f2}.`] },
      { q: `A + B means A is the father of B; A − B means A is the mother of B; A × B means A is the brother of B; A ÷ B means A is the sister of B.\n\nIf ${m1} + ${m2} + ${f1}, how is ${m1} related to ${f1}?`, a: 'Grandfather', e: [`${m2} + ${f1} means ${m2} is the father of ${f1}.`, `${m1} + ${m2} means ${m1} is the father of ${m2}, so ${m1} is ${f1}'s paternal grandfather.`] },
      { q: `A + B means A is the husband of B; A − B means A is the sister of B; A × B means A is the son of B.\n\nIf ${m1} + ${f1} − ${f2} × ${m2}, how is ${m1} related to ${m2}?`, a: 'Son-in-law', e: [`${f2} × ${m2} means ${f2} is the son of ${m2}? Wait, A × B means A is son of B, so ${f2} would be male. Need a consistent template.`] },
    ];
    // Replace the last broken one and keep 3 solid + 2 more solid
    const U: { q: string; a: string; e: string[] }[] = [
      T[0], T[1], T[2],
      { q: `A + B means A is the father of B; A − B means A is the mother of B; A × B means A is the brother of B; A ÷ B means A is the sister of B.\n\nIf ${f1} ÷ ${m1} + ${m2}, how is ${f1} related to ${m2}?`, a: 'Aunt', e: [`${m1} + ${m2} means ${m1} is the father of ${m2}.`, `${f1} ÷ ${m1} means ${f1} is the sister of ${m1}, so she is ${m2}'s paternal aunt.`] },
      { q: `A + B means A is the father of B; A − B means A is the mother of B; A × B means A is the brother of B; A ÷ B means A is the sister of B.\n\nIf ${m1} × ${f1} − ${m2}, how is ${m1} related to ${m2}?`, a: 'Son', e: [`${f1} − ${m2} means ${f1} is the mother of ${m2}, so ${f1} is the mother of ${m2}.`, `${m1} × ${f1} cannot mean brother of a mother if × is “brother of”. Use: ${m1} × ${m3} − wait.` ] },
    ];
    // Fix U[4]: A × B = A is brother of B. If m1 × m2 − f1... 
    U[4] = { q: `A + B means A is the father of B; A − B means A is the mother of B; A × B means A is the brother of B; A ÷ B means A is the sister of B.\n\nIf ${m1} × ${m2} + ${f1}, how is ${m1} related to ${f1}?`, a: 'Uncle', e: [`${m2} + ${f1} means ${m2} is the father of ${f1}.`, `${m1} × ${m2} means ${m1} is the brother of ${m2}, so ${m1} is ${f1}'s paternal uncle.`] };
    const tpl = pick(r, U);
    const rels = ['Father', 'Mother', 'Brother', 'Sister', 'Uncle', 'Aunt', 'Grandfather', 'Grandmother', 'Son', 'Daughter', 'Nephew', 'Niece', 'Cousin', 'Son-in-law', 'Brother-in-law'];
    return finalize(r, C.RB('Blood Relation', 'Tricky', tpl.q, tpl.e, 'Decode the last (right-most) pair first and grow the tree towards the left.', 'Reading the code from left to right without drawing the tree, or reversing a parent/child code.'), tpl.a, C.shuffle(r, rels.filter((x) => x !== tpl.a)));
  }

  function chineseCoding(r: RNG): Question {
    const words = C.shuffle(r, ['bank', 'loan', 'cash', 'fund', 'rate', 'gold', 'card', 'debt', 'bond', 'safe']).slice(0, 6);
    const codes = C.shuffle(r, ['sa', 're', 'ni', 'ko', 'tu', 'la', 'mi', 'po', 'vi', 'da']).slice(0, 6);
    // sentences: 0 1 2 / 1 3 4 / 2 4 5
    const sent = [
      [0, 1, 2],
      [1, 3, 4],
      [2, 4, 5],
    ];
    const show = (idx: number[]) => `${idx.map((i) => words[i]).join(' ')} is written as ${C.shuffle(r, idx.map((i) => codes[i])).join(' ')}`;
    const ask = pick(r, [3, 5, 0, 4]);
    const ans = codes[ask];
    const wrong = C.shuffle(r, codes.filter((c) => c !== ans));
    return finalize(r, C.RB('Coding-Decoding', 'Tricky', `In a certain code language:\n${show(sent[0])}\n${show(sent[1])}\n${show(sent[2])}\n\nWhat is the code for '${words[ask]}'?`,
      [`A word that appears in two sentences keeps the code that those two sentences have in common.`, `'${words[ask]}' is coded as '${ans}'.`], 'Find each word’s unique leftover code by comparing which words (and codes) two sentences share.', 'Assigning a code just because it appears in the same sentence as the word.'), ans, wrong);
  }

  function hardDirection(r: RNG, names: string[]): Question[] {
    const n1 = names[0], n2 = names[1] || 'Rohit';
    // construct integer distance between two walkers: A nets (a,b), B nets (c,d), diff integer
    const triples = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [9, 12, 15], [7, 24, 25]];
    const [dx, dy, d] = pick(r, triples);
    // A walks to (dx, 0) then etc. Simpler: A ends at (dx, dy) from P, that's the path.
    const ax = dx, ay = 0, bx = 0, by = dy;
    const Alegs = `walks ${Math.abs(ax)} m towards ${ax >= 0 ? 'East' : 'West'}, then turns left and walks ${ri(r, 3, 9)} m, then turns right and walks the same distance back onto the east-west line, finishing ${Math.abs(ax)} m east of P`;
    // This is getting messy. Clean construction:
    // A: east dx, north 0. B: north dy. Distance d. But need more legs for "hard".
    // A: North p, East dx, South p → nets (dx, 0). B: East q, North dy, West q → nets (0, dy).
    const p = ri(r, 4, 12), q = ri(r, 4, 12);
    const textA = `walks ${p} m towards North, then ${ax} m towards East, then ${p} m towards South`;
    const textB = `walks ${q} m towards East, then ${by} m towards North, then ${q} m towards West`;
    const q1 = finalize(r, C.RB('Direction Sense', 'Tricky', `${n1} and ${n2} start from the same point P. ${n1} ${textA}. ${n2} ${textB}. What is the shortest distance between ${n1} and ${n2} now?`,
      [`${n1} nets (${ax}, 0) — ${ax} m East of P.`, `${n2} nets (0, ${by}) — ${by} m North of P.`, `Shortest distance = √(${ax}² + ${by}²) = ${d} m.`], 'Net each person’s east-west and north-south separately, then use the distance formula (look for a 3-4-5 type triple).', 'Adding the walked distances instead of netting the back-and-forth legs.'), `${d} m`, [`${ax + by} m`, `${Math.abs(ax - by)} m`, `${d + p} m`, `${2 * d} m`]);
    const dir = dirName(ax, -by); // from B to A? From n2 to n1: (ax - 0, 0 - by) = (ax, -by)
    const q2 = finalize(r, C.RB('Direction Sense', 'Tricky', `${n1} and ${n2} start from the same point P. ${n1} ${textA}. ${n2} ${textB}. In which direction is ${n1} from ${n2}'s final position?`,
      [`${n1} is at (${ax}, 0), ${n2} is at (0, ${by}).`, `From ${n2} to ${n1}: (${ax}, ${-by}), which is ${dirName(ax, -by)}.`], 'Direction of A from B is the vector (A − B), not (B − A).', 'Giving the direction of B from A, or of A from the start.'), dirName(ax, -by), C.shuffle(r, ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'].filter((x) => x !== dirName(ax, -by))));
    void dir;
    return [q1, q2];
  }

  function hardAlpha(r: RNG): Question[] {
    const LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); const SYMS = ['@', '#', '$', '%', '&', '*', '©', '+'];
    const s: string[] = Array.from({ length: 26 }, () => { const x = r(); return x < 0.45 ? pick(r, LET) : x < 0.75 ? String(ri(r, 1, 9)) : pick(r, SYMS); });
    const isL = (c: string) => /^[A-Z]$/.test(c); const isD = (c: string) => /^[0-9]$/.test(c); const isS = (c: string) => !isL(c) && !isD(c);
    const passage = s.join('  ');
    const base = (q: string, d: Difficulty, e: string[]): Omit<Question, 'options' | 'correctIndex'> => ({ ...C.RB('Alphanumeric Series', d, q, e, 'Do any rearrangement on paper first, then convert “from the right” with (N + 1 − k).', 'Counting the reference element itself, or applying a rearrangement only in the head.'), passageTitle: 'Study the following arrangement carefully', passage, section: 'Reasoning', topic: 'Alphanumeric Series' });
    const uniq = s.filter((c, i) => s.indexOf(c) === i);
    const elem = (q: string, ans: string, e: string[], d: Difficulty) => C.finalize(r, base(q, d, e), ans, C.shuffle(r, uniq.filter((c) => c !== ans)));
    const countQ = (q: string, c: number, e: string[]) => C.finalize(r, base(q, 'Tricky', e), String(c), [c + 1, c - 1, c + 2, c + 3, Math.max(0, c - 2)].filter((x, i, a) => x >= 0 && x !== c && a.indexOf(x) === i).slice(0, 4).map(String));
    const out: Question[] = [];
    const k1 = ri(r, 5, 14);
    out.push(elem(`Which element is ${ordN(k1)} from the right end?`, s[26 - k1], [`${ordN(k1)} from the right = ${ordN(27 - k1)} from the left (26 + 1 − ${k1}).`, `That element is ${s[26 - k1]}.`], 'Easy'));
    const mids: string[] = [];
    for (let i = 1; i < 25; i++) if (isD(s[i]) && isS(s[i - 1]) && isL(s[i + 1])) mids.push(`${s[i - 1]} ${s[i]} ${s[i + 1]}`);
    out.push(countQ('How many numbers in the arrangement are immediately preceded by a symbol and immediately followed by a letter?', mids.length, [mids.length ? `Matches: ${mids.join('; ')}.` : 'No such number.', `Count = ${mids.length}.`]));
    const h = 13;
    const rv = [...s.slice(0, h).reverse(), ...s.slice(h).map((c) => (isL(c) ? LET[(LET.indexOf(c) + 1) % 26] : c))];
    const k3 = ri(r, 4, 12);
    out.push(elem(`The first thirteen elements are reversed and each letter in the second half is replaced by the next letter in the alphabet (A follows Z? Z→A). Which element is then ${ordN(k3)} from the left end?`, rv[k3 - 1], [`After the two-step change: ${rv.join(' ')}.`, `${ordN(k3)} from the left is ${rv[k3 - 1]}.`], 'Tricky'));
    const k4 = ri(r, 3, 8), m4 = ri(r, 2, 6);
    const pos = k4 + m4;
    if (pos <= 26) out.push(elem(`Which element is ${ordN(m4)} to the right of the ${ordN(k4)} element from the left end?`, s[pos - 1], [`${ordN(k4)} from the left plus ${m4} more to the right = ${ordN(pos)} from the left = ${s[pos - 1]}.`], 'Moderate'));
    else out.push(elem(`Which element is ${ordN(3)} to the right of the ${ordN(8)} element from the left end?`, s[10], ['8th from the left plus 3 to the right = 11th from the left.', `That element is ${s[10]}.`], 'Moderate'));
    const vowels = s.filter((c) => 'AEIOU'.includes(c)).length;
    out.push(countQ('How many vowels are there in the arrangement?', vowels, [`Vowels: ${s.filter((c) => 'AEIOU'.includes(c)).join(', ') || 'none'}.`, `Count = ${vowels}.`]));
    return out.slice(0, 5);
  }

  function buildNumericalLevel(r: RNG, diType: string, level: PaperLevel, easyBuild: () => Question[]): Question[] {
    if (level === 'Easy') return easyBuild();
    const hardish = level === 'Hard';
    const simpPool = hardish ? SIMP_HARD : SIMP_MOD;
    const approxPool = hardish ? APPROX_HARD : [...APPROX_HARD.slice(0, 1), ...C.APPROX];
    const take = (pool: typeof simpPool, n: number) => Array.from({ length: n }, () => pick(r, pool)(r));
    const simp = [...take(simpPool, 12), ...take(approxPool, 3)];
    const seriesGens = hardish ? C.shuffle(r, SERIES_HARD) : C.shuffle(r, [...SERIES_HARD.slice(0, 3), ...C.SERIES]);
    const series = [C.seriesMissing(r, seriesGens[0]), C.seriesMissing(r, seriesGens[1]), C.seriesMissing(r, seriesGens[2]), C.seriesWrong(r, seriesGens[3]), C.seriesWrong(r, seriesGens[4] || seriesGens[0])];
    const quads = hardish
      ? [C.quadQ(r, 4), C.quadQ(r, pick(r, [1, 3])), C.quadQ(r, pick(r, [0, 2])), qtyQ(r), qtyQ(r)]
      : [C.quadQ(r, 4), C.quadQ(r, pick(r, [0, 1, 2, 3])), C.quadQ(r, pick(r, [1, 3, 4])), C.quadQ(r, pick(r, [0, 2])), qtyQ(r)];
    const di = hardish ? (diType === 'bar' || r() < 0.5 && diType !== 'caselet' && diType !== 'pie' ? missingBarDI(r) : multiStepDI(r, diType)) : multiStepDI(r, diType);
    const arithPool = hardish ? ARITH_HARD : C.shuffle(r, [...ARITH_HARD.slice(0, 6), ...C.ARITH]).slice(0, 10);
    const arith = C.shuffle(r, (hardish ? ARITH_HARD : arithPool).map((g) => g(r))).slice(0, 10);
    const out = [...simp, ...series, ...quads, ...di, ...arith];
    return out;
  }

  function buildMisc(r: RNG, level: PaperLevel, names: string[]): Question[] {
    if (level === 'Easy') {
      const bi = ri(r, 0, 6);
      return [...C.ineqQs(r), ...C.sylQs(r), ...C.alphaQs(r), C.bloodQ(r, bi), C.bloodQ(r, bi + ri(r, 1, 6)), ...C.directionQs(r, names), pick(r, C.codingQs(r))];
    }
    const ineq = codedIneqQs(r, level === 'Hard');
    const syl = level === 'Hard' ? sylHard(r) : (r() < 0.5 ? sylHard(r) : C.sylQs(r));
    const alpha = level === 'Hard' ? hardAlpha(r) : (r() < 0.5 ? hardAlpha(r) : C.alphaQs(r));
    const bi = ri(r, 0, 6);
    const blood = level === 'Hard' ? [codedBlood(r), codedBlood(r)] : [codedBlood(r), C.bloodQ(r, bi)];
    const dir = level === 'Hard' ? hardDirection(r, names) : C.directionQs(r, names);
    const coding = level === 'Hard' ? chineseCoding(r) : pick(r, [chineseCoding(r), ...C.codingQs(r)]);
    return [...ineq, ...syl, ...alpha, ...blood, ...dir, coding];
  }


  function buildPuzzle(r: RNG, kind: string, names: string[]): Question[] | null {
    if (kind === 'floorflat') return puzzleFloorFlat(r, names);
    if (kind === 'mixedcircle') return puzzleMixedCircle(r, names);
    if (kind === 'uncertain') return puzzleUncertain(r, names);
    if (kind === 'dualrow') return puzzleDual(r, names);
    if (kind === 'compare2') return puzzleCompare(r, names);
    if (kind === 'boxcolor') return puzzleBoxColor(r, names);
    return null;
  }
  const nameCount: Record<string, number> = { floorflat: 8, mixedcircle: 8, uncertain: 6, dualrow: 6, compare2: 6, boxcolor: 6 };

  return { buildPuzzle, nameCount, buildNumericalLevel, buildMisc, puzzleFloorFlat, puzzleMixedCircle, puzzleUncertain, puzzleDual, puzzleCompare, puzzleBoxColor };
}
