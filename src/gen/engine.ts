type SectionKey = "Reasoning" | "Numerical";
type Difficulty = "Easy" | "Moderate" | "Tricky";
type Phase = "start" | "instructions" | "exam" | "result";
type QStatus = "correct" | "wrong" | "skipped";
type StatusFilter = "all" | "wrong" | "skipped" | "correct" | "marked";
type SectionFilter = "all" | SectionKey;
type TileState = "answered" | "notAnswered" | "marked" | "answeredMarked" | "notVisited";
type Tone = "success" | "warning" | "danger";
type RNG = () => number;

interface DataTable { title: string; columns: string[]; rows: string[][]; chart?: "bar" | "line" | "pie"; total?: number }
interface Question {
  section: SectionKey; topic: string; difficulty: Difficulty;
  passageTitle?: string; passage?: string; table?: DataTable;
  question: string; options: string[]; correctIndex: number;
  explanation: string[]; shortcut: string; commonTrap: string;
  variant?: string;
}
type Base = Omit<Question, "options" | "correctIndex">;

const SECTION_ORDER: SectionKey[] = ["Reasoning", "Numerical"];
const SECTION_LABEL: Record<SectionKey, string> = { Reasoning: "Reasoning Ability", Numerical: "Numerical Ability" };
const FULL_COUNT: Record<SectionKey, number> = { Reasoning: 40, Numerical: 40 };
const SEC_TIME: Record<SectionKey, number> = { Reasoning: 1500, Numerical: 1200 };
const SEC_TARGET: Record<SectionKey, number> = { Reasoning: 37, Numerical: 30 };
const SEC_LIMIT = 1200;
const LETTERS = ["A", "B", "C", "D", "E"];
const SHIFTS = ["Morning Shift", "Afternoon Shift", "Evening Shift"];
const ORD = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];
const NUMW = ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const NAMES = ["Amit", "Bhavna", "Chetan", "Deepa", "Esha", "Farhan", "Gopal", "Hema", "Irfan", "Jaya", "Kiran", "Lata", "Mohan", "Neha", "Om", "Pooja", "Ravi", "Sara", "Tarun", "Uma", "Varun", "Yash", "Zoya", "Nikhil"];
const MALES = ["Rahul", "Arjun", "Vikram", "Sanjay", "Manoj", "Karan", "Dev", "Rohit"];
const FEMALES = ["Neha", "Priya", "Anita", "Kavya", "Meera", "Sneha", "Ritu", "Divya"];
const shiftName = (n: number): string => (n <= 3 ? SHIFTS[n - 1] : "Fresh Paper");

// ================= PRNG & helpers =================
function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const ri = (r: RNG, a: number, b: number): number => a + Math.floor(r() * (b - a + 1));
function pick<T>(r: RNG, arr: T[]): T { return arr[Math.floor(r() * arr.length)]; }
function shuffle<T>(r: RNG, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = a[i]; a[i] = a[j]; a[j] = tmp; }
  return a;
}
function gcd(a: number, b: number): number { let x = Math.abs(a), y = Math.abs(b); while (y) { const tt = x % y; x = y; y = tt; } return x; }
const lcm = (a: number, b: number): number => (a / gcd(a, b)) * b;
function fmtNum(n: number): string { return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100); }
const rs = (n: number): string => `Rs ${n}`;
const pctFmt = (n: number): string => `${fmtNum(n)}%`;
const ordN = (n: number): string => { const s = ["th", "st", "nd", "rd"]; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const stepOf = (ans: number): number => Math.max(1, Math.round(Math.abs(ans) * 0.05));
const ratioStr = (a: number, b: number): string => { const g = gcd(a, b); return `${a / g} : ${b / g}`; };
const FILLERS = ["None of these", "Cannot be determined", "Data inadequate", "More than one of these"];

function finalize(r: RNG, b: Base, correct: string, wrong: string[]): Question {
  const seen: string[] = [correct];
  const w: string[] = [];
  wrong.forEach((x: string) => { if (w.length < 4 && seen.indexOf(x) < 0) { seen.push(x); w.push(x); } });
  FILLERS.forEach((x: string) => { if (w.length < 4 && seen.indexOf(x) < 0) { seen.push(x); w.push(x); } });
  const opts = shuffle(r, [correct, ...w]);
  return { ...b, options: opts, correctIndex: opts.indexOf(correct) };
}
function nearNums(r: RNG, ans: number, step: number, traps: number[]): number[] {
  const out: number[] = [];
  const push = (v: number): void => { const x = Math.round(v * 100) / 100; if (x !== ans && out.indexOf(x) < 0 && (ans <= 0 || x > 0)) out.push(x); };
  traps.slice(0, 2).forEach(push);
  shuffle(r, [-2, -1, 1, 2, 3, -3, 4, -4, 5, 6]).forEach((o: number) => { if (out.length < 4) push(ans + o * step); });
  return out;
}
function mkN(r: RNG, b: Base, ans: number, step: number, traps: number[], fmt: (n: number) => string): Question {
  return finalize(r, b, fmt(ans), nearNums(r, ans, step, traps).map(fmt));
}
const NB = (topic: string, difficulty: Difficulty, question: string, explanation: string[], shortcut: string, commonTrap: string): Base =>
  ({ section: "Numerical", topic, difficulty, question, explanation, shortcut, commonTrap });
const RB = (topic: string, difficulty: Difficulty, question: string, explanation: string[], shortcut: string, commonTrap: string): Base =>
  ({ section: "Reasoning", topic, difficulty, question, explanation, shortcut, commonTrap });

// ================= NUMERICAL =================
const pert = (r: RNG, n: number): string => (n + pick(r, [-0.03, -0.02, -0.01, 0.01, 0.02, 0.03])).toFixed(2);
const SIMP: ((r: RNG) => Question)[] = [
  (r: RNG): Question => {
    const p = pick(r, [10, 20, 25, 30, 40, 50, 60, 75, 15, 35]); const b = 40 * ri(r, 3, 25);
    const c = ri(r, 11, 25), d = ri(r, 10, 150), x = (p * b) / 100, ans = x + c * c - d;
    return mkN(r, NB("Simplification", "Easy", `Find the value of ?\n\n${p}% of ${b} + ${c}² − ${d} = ?`, [`${p}% of ${b} = ${x}.`, `${c}² = ${c * c}.`, `${x} + ${c * c} − ${d} = ${ans}.`], "Turn percentages into fractions (25% = 1/4) and know squares up to 30 by heart.", `Writing ${c}² as ${2 * c}, or adding ${d} instead of subtracting.`), ans, stepOf(ans), [x + 2 * c - d, x + c * c + d], String);
  },
  (r: RNG): Question => {
    const c = ri(r, 3, 12), m = ri(r, 4, 25), a = c * m, b = ri(r, 3, 19), d = ri(r, 20, 200), e = ri(r, 10, 99), ans = m * b + d - e;
    return mkN(r, NB("Simplification", "Easy", `Find the value of ?\n\n${a} × ${b} ÷ ${c} + ${d} − ${e} = ?`, [`Divide first: ${a} ÷ ${c} = ${m}.`, `${m} × ${b} = ${m * b}.`, `${m * b} + ${d} − ${e} = ${ans}.`], "Cancel the division against the first number before multiplying.", "Adding before multiplying and dividing (breaking BODMAS)."), ans, stepOf(ans), [m * b + d + e], String);
  },
  (r: RNG): Question => {
    const q = pick(r, [3, 4, 5, 6, 8]); const p = pick(r, [1, 2, 3, 5, 7].filter((v: number) => v < q && gcd(v, q) === 1));
    const s = pick(r, [3, 4, 5, 7, 9]); const rr = pick(r, [1, 2, 3, 4, 5, 8].filter((v: number) => v < s && gcd(v, s) === 1));
    const X = q * ri(r, 10, 40), Y = s * ri(r, 10, 40), Z = ri(r, 10, 90);
    const u = (p * X) / q, v = (rr * Y) / s, ans = u + v - Z;
    return mkN(r, NB("Simplification", "Moderate", `Find the value of ?\n\n${p}/${q} of ${X} + ${rr}/${s} of ${Y} − ${Z} = ?`, [`${p}/${q} of ${X} = ${X} ÷ ${q} × ${p} = ${u}.`, `${rr}/${s} of ${Y} = ${Y} ÷ ${s} × ${rr} = ${v}.`, `${u} + ${v} − ${Z} = ${ans}.`], "Divide by the denominator first, then multiply by the numerator.", "Multiplying by the denominator instead of dividing."), ans, stepOf(ans), [u + v + Z], String);
  },
  (r: RNG): Question => {
    const a = ri(r, 6, 15), b = ri(r, 12, 30), c = ri(r, 5, 20), d = ri(r, 5, 20), ans = a ** 3 - b * b + c * d;
    return mkN(r, NB("Simplification", "Moderate", `Find the value of ?\n\n${a}³ − ${b}² + ${c} × ${d} = ?`, [`${a}³ = ${a ** 3}; ${b}² = ${b * b}; ${c} × ${d} = ${c * d}.`, `${a ** 3} − ${b * b} + ${c * d} = ${ans}.`], "Memorise cubes up to 15 and squares up to 30.", "Using a³ = 3a or mixing up the square and cube values."), ans, stepOf(ans), [a ** 3 - b * b - c * d], String);
  },
  (r: RNG): Question => {
    const k = ri(r, 12, 35), Y = ri(r, 8, 19), W = ri(r, 4, 12), Z = W * ri(r, 5, 20), ans = k + Y * Y - Z / W;
    return mkN(r, NB("Simplification", "Easy", `Find the value of ?\n\n√${k * k} + ${Y}² − ${Z} ÷ ${W} = ?`, [`√${k * k} = ${k}; ${Y}² = ${Y * Y}; ${Z} ÷ ${W} = ${Z / W}.`, `${k} + ${Y * Y} − ${Z / W} = ${ans}.`], "Square roots of perfect squares end in a predictable digit: check the unit digit first.", "Doing the subtraction before the division."), ans, stepOf(ans), [k + Y * Y + Z / W], String);
  },
  (r: RNG): Question => {
    const a = ri(r, 3, 15), b = ri(r, 2, 9), m = ri(r, 5, 30), c = b * m, ans = a * m;
    return mkN(r, NB("Simplification", "Easy", `Find the value of ?\n\n? ÷ ${a} × ${b} = ${c}`, [`? ÷ ${a} = ${c} ÷ ${b} = ${m}.`, `? = ${m} × ${a} = ${ans}.`], "Undo the operations in reverse order: divide by the multiplier, then multiply by the divisor.", "Dividing by the divisor instead of multiplying."), ans, stepOf(ans), [Math.round((c * b) / a)], String);
  },
  (r: RNG): Question => {
    const p = pick(r, [12, 15, 24, 35, 45, 64, 72, 85, 16, 28]); const unit = 100 / gcd(p, 100); const A = unit * ri(r, Math.ceil(80 / unit), Math.ceil(900 / unit)); const B = (A * p) / 100;
    return mkN(r, NB("Simplification", "Moderate", `Find the value of ?\n\n?% of ${A} = ${B}`, [`?% = ${B} ÷ ${A} × 100.`, `= ${p}%.`], "Write the percent as B/A × 100 and cancel zeros early.", "Dividing A by B and inverting the fraction."), p, Math.max(2, Math.round(p * 0.1)), [], pctFmt);
  },
  (r: RNG): Question => {
    const a = ri(r, 12, 45), b = ri(r, 3, 19), ans = 4 * a * b;
    return mkN(r, NB("Simplification", "Tricky", `Find the value of ?\n\n(${a} + ${b})² − (${a} − ${b})² = ?`, [`Use (a + b)² − (a − b)² = 4ab.`, `4 × ${a} × ${b} = ${ans}.`], "Never expand: (a + b)² − (a − b)² is always 4ab.", "Using 2ab instead of 4ab."), ans, stepOf(ans), [2 * a * b], String);
  },
];
SIMP.push(
  (r: RNG): Question => {
    const a = pick(r, [2.5, 7.5, 12.5, 17.5, 22.5, 1.5, 4.5]); const b = 2 * ri(r, 6, 24); const c = pick(r, [12.5, 37.5, 62.5, 87.5]); const d = 8 * ri(r, 15, 90); const e = ri(r, 11, 24);
    const ab = a * b, cd = (c * d) / 100, ans = ab + cd - e * e;
    return mkN(r, NB("Simplification", "Tricky", `Find the value of ?\n\n${a} × ${b} + ${c}% of ${d} − ${e}² = ?`, [`${a} × ${b} = ${ab}.`, `${c}% = ${c / 12.5}/8, so ${c}% of ${d} = ${d} ÷ 8 × ${c / 12.5} = ${cd}.`, `${e}² = ${e * e}.`, `${ab} + ${cd} − ${e * e} = ${ans}.`], "Know the fraction values: 12.5% = 1/8, 37.5% = 3/8, 62.5% = 5/8, 87.5% = 7/8; and x.5 × even = half of (2x+1) × even.", "Treating 12.5% as 1/12 or squaring carelessly near the end."), ans, stepOf(ans), [ab + cd + e * e, ab - cd - e * e], String);
  },
  (r: RNG): Question => {
    const a = ri(r, 12, 39), b = ri(r, 11, 29), d = ri(r, 6, 18); let ans = ri(r, 25, 90); while (ans * d - a * b <= 20) ans += 7; const c = ans * d - a * b;
    return mkN(r, NB("Simplification", "Moderate", `Find the value of ?\n\n(${a} × ${b} + ${c}) ÷ ${d} = ?`, [`${a} × ${b} = ${a * b}.`, `${a * b} + ${c} = ${a * b + c}.`, `${a * b + c} ÷ ${d} = ${ans}.`], "Use unit digits: the unit digit of the bracket must be divisible pattern-wise by the divisor; eliminate options fast.", "Dividing only the last term by the divisor."), ans, stepOf(ans), [a * b + Math.round(c / d)], String);
  },
);
const APPROX: ((r: RNG) => Question)[] = [
  (r: RNG): Question => {
    const B = ri(r, 7, 24), k = ri(r, 12, 45), A = B * k, C = ri(r, 9, 19), D = pick(r, [20, 25, 40, 50, 60, 75]); let E = 40 * ri(r, 5, 30); while (k * C - (D * E) / 100 < 40 && E > 40) E -= 40; const ans = k * C - (D * E) / 100;
    return mkN(r, NB("Approximation", "Moderate", `Find the approximate value of ?\n\n${pert(r, A)} ÷ ${pert(r, B)} × ${pert(r, C)} − ${pert(r, D)}% of ${pert(r, E)} ≈ ?`, [`Round: ${A} ÷ ${B} × ${C} − ${D}% of ${E}.`, `${A} ÷ ${B} = ${k}; × ${C} = ${k * C}.`, `${D}% of ${E} = ${(D * E) / 100}; ${k * C} − ${(D * E) / 100} = ${ans}.`], "Round each figure to the nearest integer and look for clean division first.", "Subtracting before multiplying or misreading the percentage."), ans, Math.max(6, Math.round(Math.abs(ans) * 0.08)), [k * C + (D * E) / 100], String);
  },
  (r: RNG): Question => {
    const C = ri(r, 3, 9), A = C * ri(r, 3, 15), B = ri(r, 6, 25), D = ri(r, 50, 400), ans = (A / C) * B + D;
    return mkN(r, NB("Approximation", "Easy", `Find the approximate value of ?\n\n${pert(r, A)} × ${pert(r, B)} ÷ ${pert(r, C)} + ${pert(r, D)} ≈ ?`, [`Round to the nearest whole numbers: ${A} × ${B} ÷ ${C} + ${D}.`, `${A} ÷ ${C} = ${A / C}; × ${B} = ${(A / C) * B}; + ${D} = ${ans}.`], "Round every decimal first; options are far enough apart that the rounding error does not matter.", "Calculating with the decimals and running out of time."), ans, Math.max(5, Math.round(ans * 0.08)), [], String);
  },
  (r: RNG): Question => {
    const P = pick(r, [20, 25, 40, 50, 60, 75]); const Q = 40 * ri(r, 3, 20); const R = ri(r, 11, 25), ans = (P * Q) / 100 + R * R;
    return mkN(r, NB("Approximation", "Easy", `Find the approximate value of ?\n\n${pert(r, P)}% of ${pert(r, Q)} + ${pert(r, R)}² ≈ ?`, [`Round: ${P}% of ${Q} + ${R}².`, `${(P * Q) / 100} + ${R * R} = ${ans}.`], "Round percentages to friendly values like 20%, 25% or 50%.", "Squaring the decimal exactly instead of rounding first."), ans, Math.max(5, Math.round(ans * 0.08)), [], String);
  },
  (r: RNG): Question => {
    const k = ri(r, 12, 40), off = pick(r, [-3, -2, -1, 1, 2, 3]), Z = ri(r, 6, 19), ans = k * Z;
    return mkN(r, NB("Approximation", "Moderate", `Find the approximate value of ?\n\n√${k * k + off} × ${pert(r, Z)} ≈ ?`, [`√${k * k + off} ≈ √${k * k} = ${k}.`, `${k} × ${Z} = ${ans}.`], "Find the nearest perfect square to the number under the root.", "Picking the wrong nearby square, such as (k ± 1)²."), ans, Math.max(5, Math.round(ans * 0.08)), [], String);
  },
];

interface Ser { t: number[]; rule: string }
const SERIES: ((r: RNG) => Ser)[] = [
  (r: RNG): Ser => { let x = ri(r, 5, 40); const d = ri(r, 2, 8), k = ri(r, 2, 6); const t = [x]; const ds: number[] = []; for (let i = 0; i < 6; i++) { const dd = d + i * k; ds.push(dd); x += dd; t.push(x); } return { t, rule: `Differences are ${ds.join(", ")}: each increases by ${k}.` }; },
  (r: RNG): Ser => { const m = pick(r, [2, 3]); let x = ri(r, 4, 9); const c = pick(r, [-3, -2, -1, 1, 2, 3]); const t = [x]; for (let i = 0; i < 6; i++) { x = x * m + c; t.push(x); } return { t, rule: `Each term = previous × ${m} ${c < 0 ? "−" : "+"} ${Math.abs(c)}.` }; },
  (r: RNG): Ser => { let x = ri(r, 1, 6); const sq = r() < 0.5; const t = [x]; for (let i = 1; i <= 6; i++) { x = x * i + (sq ? i * i : i); t.push(x); } return { t, rule: sq ? "Pattern: ×1 + 1², ×2 + 2², ×3 + 3², ×4 + 4², ×5 + 5², ×6 + 6²." : "Pattern: ×1 + 1, ×2 + 2, ×3 + 3, ×4 + 4, ×5 + 5, ×6 + 6." }; },
  (r: RNG): Ser => { const cube = r() < 0.4; const n0 = cube ? ri(r, 2, 4) : ri(r, 3, 9); const k = pick(r, [-2, -1, 1, 2, 3]); const t: number[] = []; for (let i = 0; i < 7; i++) t.push((n0 + i) ** (cube ? 3 : 2) + k); return { t, rule: `Each term = n${cube ? "³" : "²"} ${k < 0 ? "−" : "+"} ${Math.abs(k)} for n = ${n0}, ${n0 + 1}, ${n0 + 2}, ...` }; },
  (r: RNG): Ser => { let x = ri(r, 3, 12); const p = ri(r, 3, 12); const t = [x]; for (let i = 0; i < 6; i++) { x = i % 2 === 0 ? x * 2 : x + p; t.push(x); } return { t, rule: `Operations alternate: ×2, +${p}, ×2, +${p}, ...` }; },
  (r: RNG): Ser => { let x = ri(r, 3, 15); const d = ri(r, 2, 6), m = pick(r, [2, 3]); const t = [x]; const ds: number[] = []; for (let i = 0; i < 6; i++) { const dd = d * m ** i; ds.push(dd); x += dd; t.push(x); } return { t, rule: `Differences are ${ds.join(", ")}: each is ${m} times the previous.` }; },
];
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43];
SERIES.push(
  (r: RNG): Ser => {
    for (let tries = 0; tries < 300; tries++) {
      const x0 = ri(r, 3, 90); const t = [x0]; let ok = true;
      for (let i = 1; i <= 6; i++) { const v = ((t[i - 1] + 1) * i) / 2; if (!Number.isInteger(v)) { ok = false; break; } t.push(v); }
      if (ok) return { t, rule: "Pattern: ×0.5 + 0.5, ×1 + 1, ×1.5 + 1.5, ×2 + 2, ×2.5 + 2.5, ×3 + 3." };
    }
    let x = ri(r, 2, 9); const t = [x]; for (let i = 1; i <= 6; i++) { x = (x + 1) * i; t.push(x); } return { t, rule: "Pattern: ×1 + 1, ×2 + 2, ×3 + 3, ×4 + 4, ×5 + 5, ×6 + 6." };
  },
  (r: RNG): Ser => { const st = ri(r, 0, 5); let x = ri(r, 7, 99); const t = [x]; const ds = PRIMES.slice(st, st + 6); const sq = r() < 0.35; ds.forEach((d: number) => { x += sq ? d * d : d; t.push(x); }); return { t, rule: sq ? `Differences are squares of consecutive primes: ${ds.map((d: number) => `${d}²`).join(", ")}.` : `Differences are consecutive prime numbers: ${ds.join(", ")}.` }; },
  (r: RNG): Ser => {
    const mode = ri(r, 0, 3); const n0 = mode === 2 ? ri(r, 2, 5) : ri(r, 3, 11); const t: number[] = [];
    for (let i = 0; i < 7; i++) { const n = n0 + i; t.push(mode === 0 ? n * n + n : mode === 1 ? n * n - n : mode === 2 ? n ** 3 - n : n * n + (i % 2 === 0 ? 1 : -1)); }
    const rule = mode === 0 ? `Each term = n² + n for n = ${n0}, ${n0 + 1}, ...` : mode === 1 ? `Each term = n² − n for n = ${n0}, ${n0 + 1}, ...` : mode === 2 ? `Each term = n³ − n for n = ${n0}, ${n0 + 1}, ...` : `Terms are n² + 1 and n² − 1 alternately for n = ${n0}, ${n0 + 1}, ...`;
    return { t, rule };
  },
);
function seriesMissing(r: RNG, g: (r: RNG) => Ser): Question {
  const s = g(r); const pos = r() < 0.45 ? ri(r, 2, 5) : 6; const ans = s.t[pos];
  const shown = s.t.map((v: number, i: number) => (i === pos ? "?" : String(v))).join(", ");
  return mkN(r, NB("Number Series", ans > 500 || pos < 6 ? "Moderate" : "Easy", `What will come in place of the question mark (?) in the following series?\n\n${shown}`, [s.rule, `Full series: ${s.t.join(", ")}.`, `Missing term = ${ans}.`], "Test differences first, then ×n ± k, then squares and cubes.", "Spotting the pattern from the first two terms only."), ans, stepOf(ans), [s.t[5] + (s.t[5] - s.t[4])], String);
}
function seriesWrong(r: RNG, g: (r: RNG) => Ser): Question {
  const s = g(r); const w = ri(r, 1, 5); const orig = s.t[w];
  const delta = pick(r, [1, 2, -1, -2, 3]) * Math.max(1, Math.round(Math.abs(orig) * 0.03));
  const t = s.t.slice(); t[w] = orig + delta;
  const wrongVal = String(t[w]);
  const others = shuffle(r, t.filter((v: number, i: number) => i !== w).map(String)).filter((v: string) => v !== wrongVal);
  return finalize(r, NB("Number Series", "Moderate", `Find the wrong number in the following series.\n\n${t.join(", ")}`, [s.rule, `So ${t[w]} should be ${orig}; ${t[w]} is the wrong number.`], "Find the rule from the first three terms, then check every term against it.", "Marking a correct term because the rule was guessed from the wrong pair of terms."), wrongVal, others);
}

type Rat = [number, number];
const ratRed = (p: number, q: number): Rat => { const g = gcd(p, q) || 1; return [p / g, q / g]; };
const ratCmp = (a: Rat, b: Rat): number => Math.sign(a[0] * b[1] - b[0] * a[1]);
const ratStr = (a: Rat): string => `${a[0] < 0 ? "−" : ""}${Math.abs(a[0])}${a[1] === 1 ? "" : `/${a[1]}`}`;
function randRat(r: RNG, lo: number, hi: number): Rat { const q = pick(r, [1, 2, 3, 2, 3, 4, 5, 1]); return ratRed(ri(r, lo * q, hi * q), q); }
function quadPoly(a: Rat, b: Rat, v: string): { eq: string; fac: string } {
  const A0 = a[1] * b[1], B0 = -(a[1] * b[0] + b[1] * a[0]), C0 = a[0] * b[0];
  const g = gcd(gcd(A0, B0), C0) || 1; const A = A0 / g, B = B0 / g, C = C0 / g;
  let eq = `${A === 1 ? "" : A}${v}²`;
  if (B !== 0) eq += ` ${B < 0 ? "−" : "+"} ${Math.abs(B) === 1 ? "" : Math.abs(B)}${v}`;
  if (C !== 0) eq += ` ${C < 0 ? "−" : "+"} ${Math.abs(C)}`;
  const f = (x: Rat): string => (x[0] === 0 ? v : `(${x[1] === 1 ? "" : x[1]}${v} ${x[0] > 0 ? "−" : "+"} ${Math.abs(x[0])})`);
  return { eq: `${eq} = 0`, fac: `${f(a)}${f(b)} = 0` };
}
const QUAD_OPTS = ["x > y", "x ≥ y", "x < y", "x ≤ y", "x = y or the relationship cannot be established"];
function quadRel(xs: Rat[], ys: Rat[]): number {
  const mn = (z: Rat[]): Rat => (ratCmp(z[0], z[1]) <= 0 ? z[0] : z[1]); const mx = (z: Rat[]): Rat => (ratCmp(z[0], z[1]) >= 0 ? z[0] : z[1]);
  const a = ratCmp(mn(xs), mx(ys)), b = ratCmp(mx(xs), mn(ys));
  return a > 0 ? 0 : a === 0 ? 1 : b < 0 ? 2 : b === 0 ? 3 : 4;
}
function quadQ(r: RNG, target: number): Question {
  let xs: Rat[] = [[1, 1], [2, 1]], ys: Rat[] = [[-1, 1], [-2, 1]];
  for (let tries = 0; tries < 2000; tries++) {
    const m = randRat(r, -8, 6);
    let cx: Rat[], cy: Rat[];
    if (target === 1 || target === 3) { const hi = randRat(r, -6, 9), lo = randRat(r, -9, 5); cx = target === 1 ? [m, hi] : [m, lo]; cy = target === 1 ? [m, lo] : [m, hi]; }
    else { cx = [randRat(r, -9, 9), randRat(r, -9, 9)]; cy = [randRat(r, -9, 9), randRat(r, -9, 9)]; }
    if (ratCmp(cx[0], cx[1]) === 0 || ratCmp(cy[0], cy[1]) === 0) continue;
    if (quadRel(cx, cy) !== target) continue;
    const fr = [...cx, ...cy].filter((z: Rat) => z[1] > 1).length; if (fr < 1 || fr > 3) continue;
    const big = [...cx, ...cy].some((z: Rat) => Math.abs(z[0]) > 18); if (big) continue;
    xs = shuffle(r, cx); ys = shuffle(r, cy); break;
  }
  const P = quadPoly(xs[0], xs[1], "x"), Q = quadPoly(ys[0], ys[1], "y");
  const verdict = ["every x is greater than every y, so x > y", "the smaller x equals the larger y and the other x is bigger, so x ≥ y", "every x is smaller than every y, so x < y", "the larger x equals the smaller y, so x ≤ y", "the roots overlap, so no single relation holds"][target];
  return { ...NB("Quadratic Equations", target === 1 || target === 3 || target === 4 ? "Tricky" : "Moderate", `In the following question, two equations numbered I and II are given. Solve both the equations and mark the correct relation between x and y.\n\nI. ${P.eq}\nII. ${Q.eq}`, [`I: ${P.eq} factorises as ${P.fac}, so x = ${ratStr(xs[0])}, ${ratStr(xs[1])}.`, `II: ${Q.eq} factorises as ${Q.fac}, so y = ${ratStr(ys[0])}, ${ratStr(ys[1])}.`, `Compare: ${verdict}.`], "Split the middle term using factors of (a × c); for ax² + bx + c the roots are −(factor)/a. Signs: +b,+c → both roots negative; −b,+c → both positive; c negative → one each.", "Forgetting to divide by the leading coefficient, or flipping the sign of a root while factorising."), options: QUAD_OPTS, correctIndex: target };
}

function diQs(r: RNG): Question[] {
  const branches = r() < 0.5;
  const rowsL = branches ? ["P", "Q", "R", "S", "T"] : ["January", "February", "March", "April", "May"];
  const cols = branches ? ["Home loans", "Car loans", "Personal loans"] : ["Savings accounts", "Current accounts", "Fixed deposits"];
  const unit = branches ? " (in Rs crore)" : "";
  const rowName = (i: number): string => (branches ? `branch ${rowsL[i]}` : rowsL[i]);
  const v: number[][] = rowsL.map(() => cols.map(() => 10 * ri(r, 12, 48)));
  const c3 = ri(r, 0, 2); const c4 = (c3 + 1 + ri(r, 0, 1)) % 3;
  const [a3, b3] = shuffle(r, [0, 1, 2, 3, 4]).slice(0, 2);
  const base = 40 * ri(r, 4, 10); const p = pick(r, [10, 20, 25, 50, 75, 12.5, 37.5, 60]);
  v[b3][c3] = base; v[a3][c3] = base + (base * p) / 100;
  const table: DataTable = { chart: "bar", title: branches ? "Loans disbursed (Rs crore) by five branches of a bank in 2025" : "Accounts opened by a bank branch, January to May 2025", columns: [branches ? "Branch" : "Month", ...cols], rows: rowsL.map((n: string, i: number) => [n, ...v[i].map(String)]) };
  const D = (q: string, d: Difficulty, e: string[], s: string, tr: string): Base => ({ ...NB("Data Interpretation", d, q, e, s, tr), table, variant: "bar" });
  const out: Question[] = [];
  const [i1, j1] = shuffle(r, [0, 1, 2, 3, 4]).slice(0, 2); const c1 = ri(r, 0, 2); const sum = v[i1][c1] + v[j1][c1];
  out.push(mkN(r, D(`What is the total number of ${cols[c1].toLowerCase()}${unit} of ${rowName(i1)} and ${rowName(j1)} together?`, "Easy", [`${v[i1][c1]} + ${v[j1][c1]} = ${sum}.`], "Add the two cells directly; check the unit digit of the options first.", "Reading the wrong row or column."), sum, 10, [], String));
  const [i2, j2] = shuffle(r, [0, 1, 2, 3, 4]).slice(0, 2); const ca = ri(r, 0, 2), cb = ri(r, 0, 2); const A = v[i2][ca], Bv = v[j2][cb];
  out.push(finalize(r, D(`What is the ratio of ${cols[ca].toLowerCase()} of ${rowName(i2)} to ${cols[cb].toLowerCase()} of ${rowName(j2)}?`, "Easy", [`${A} : ${Bv}; divide both by ${gcd(A, Bv)}.`, `= ${ratioStr(A, Bv)}.`], "Cancel common zeros first, then divide by the HCF.", "Writing the ratio in reverse order."), ratioStr(A, Bv), [ratioStr(Bv, A), ratioStr(A + 10, Bv), ratioStr(A, Bv + 10), ratioStr(A + 20, Bv)]));
  const less = Math.round(((v[a3][c3] - base) / v[a3][c3]) * 10000) / 100;
  out.push(mkN(r, D(`The number of ${cols[c3].toLowerCase()} of ${rowName(a3)} is what percent more than that of ${rowName(b3)}?`, "Moderate", [`Difference = ${v[a3][c3]} − ${base} = ${v[a3][c3] - base}.`, `% more = ${v[a3][c3] - base} ÷ ${base} × 100 = ${fmtNum(p)}%.`], "Percent more is always measured on the smaller (base) value.", `Dividing by the larger value gives ${fmtNum(less)}%, which is 'percent less'.`), p, 5, [less], pctFmt));
  const tot4 = v.reduce((s: number, row: number[]) => s + row[c4], 0); const avg = tot4 / 5;
  out.push(mkN(r, D(`What is the average number of ${cols[c4].toLowerCase()}${unit} across all five ${branches ? "branches" : "months"}?`, "Moderate", [`Sum = ${v.map((row: number[]) => row[c4]).join(" + ")} = ${tot4}.`, `Average = ${tot4} ÷ 5 = ${avg}.`], "Take a working mean (say 300) and average the deviations.", "Dividing by 4 or adding a wrong column."), avg, 6, [], String));
  const [i5, j5] = shuffle(r, [0, 1, 2, 3, 4]).slice(0, 2); const t5 = v[i5][0] + v[i5][1] + v[i5][2], u5 = v[j5][0] + v[j5][1] + v[j5][2], diff = Math.abs(t5 - u5);
  out.push(mkN(r, D(`What is the difference between the total of all three categories for ${rowName(i5)} and for ${rowName(j5)}?`, diff === 0 ? "Tricky" : "Moderate", [`${rowName(i5)}: ${v[i5].join(" + ")} = ${t5}.`, `${rowName(j5)}: ${v[j5].join(" + ")} = ${u5}.`, `Difference = ${diff}.`], "Subtract column by column and add the differences, which avoids big totals.", "Adding only two of the three categories."), diff, 10, [], String));
  return out;
}

function diLine(r: RNG): Question[] {
  const years = r() < 0.5;
  const rowsL = years ? ["2021", "2022", "2023", "2024", "2025"] : ["Jan", "Feb", "Mar", "Apr", "May"];
  const cols = pick(r, [["Deposits mobilised", "Loans disbursed"], ["Savings accounts opened", "Current accounts opened"], ["Home loans", "Vehicle loans"]]);
  const unit = cols[0].indexOf("accounts") >= 0 ? "" : " (Rs crore)";
  const v: number[][] = rowsL.map(() => cols.map(() => 10 * ri(r, 16, 58)));
  const [ia, ja] = shuffle(r, [0, 1, 2, 3, 4]).slice(0, 2).sort((x: number, y: number) => x - y);
  const base = 40 * ri(r, 4, 10); const pc = pick(r, [10, 20, 25, 30, 40, 50, 60, 75]);
  v[ia][0] = base; v[ja][0] = base + (base * pc) / 100;
  const table: DataTable = { chart: "line", title: `${cols[0]} and ${cols[1]}${unit} of a bank, ${years ? "2021–2025" : "January–May 2025"}`, columns: [years ? "Year" : "Month", ...cols], rows: rowsL.map((nm: string, i: number) => [nm, ...v[i].map(String)]) };
  const D = (q: string, d: Difficulty, e: string[], sc: string, tr: string): Base => ({ ...NB("Data Interpretation", d, q, e, sc, tr), table, variant: "line" });
  const out: Question[] = [];
  const [y1, y2, y3] = shuffle(r, [0, 1, 2, 3, 4]).slice(0, 3); const s1 = v[y1][1] + v[y2][1] + v[y3][1];
  out.push(mkN(r, D(`What is the total ${cols[1].toLowerCase()}${unit} in ${rowsL[y1]}, ${rowsL[y2]} and ${rowsL[y3]} together?`, "Easy", [`${v[y1][1]} + ${v[y2][1]} + ${v[y3][1]} = ${s1}.`], "Read the data labels on the line directly; add hundreds first, then tens.", "Reading the value from the other line."), s1, 10, [], String));
  const i2 = ri(r, 0, 4); let j2 = ri(r, 0, 4); if (j2 === i2) j2 = (j2 + 1) % 5; const A = v[i2][0], Bv = v[j2][1];
  out.push(finalize(r, D(`What is the ratio of ${cols[0].toLowerCase()} in ${rowsL[i2]} to ${cols[1].toLowerCase()} in ${rowsL[j2]}?`, "Easy", [`${A} : ${Bv}; divide both by ${gcd(A, Bv)}.`, `= ${ratioStr(A, Bv)}.`], "Cancel common zeros, then divide by the HCF.", "Writing the ratio in reverse order."), ratioStr(A, Bv), [ratioStr(Bv, A), ratioStr(A + 10, Bv), ratioStr(A, Bv + 10), ratioStr(A - 10, Bv)]));
  out.push(mkN(r, D(`By what percent did ${cols[0].toLowerCase()} increase from ${rowsL[ia]} to ${rowsL[ja]}?`, "Moderate", [`Increase = ${v[ja][0]} − ${base} = ${v[ja][0] - base}.`, `% increase = ${v[ja][0] - base} ÷ ${base} × 100 = ${pc}%.`], "Percent change is always on the earlier (base) value.", "Dividing by the later value."), pc, 5, [Math.round(((v[ja][0] - base) / v[ja][0]) * 10000) / 100], pctFmt));
  const tot = v.reduce((x: number, row: number[]) => x + row[1], 0); const avg = tot / 5;
  out.push(mkN(r, D(`What is the average ${cols[1].toLowerCase()}${unit} over the five ${years ? "years" : "months"}?`, "Moderate", [`Sum = ${v.map((row: number[]) => row[1]).join(" + ")} = ${tot}.`, `Average = ${tot} ÷ 5 = ${fmtNum(avg)}.`], "Use a working mean and average the deviations.", "Dividing by 4 or picking the wrong line."), avg, 6, [], fmtNum));
  const cnt = v.filter((row: number[]) => row[1] > row[0]).length;
  const yrs = rowsL.filter((_: string, i: number) => v[i][1] > v[i][0]);
  out.push(finalize(r, D(`In how many ${years ? "years" : "months"} were ${cols[1].toLowerCase()} more than ${cols[0].toLowerCase()}?`, "Easy", [`Compare the two lines point by point: ${rowsL.map((nm: string, i: number) => `${nm} ${v[i][1]} vs ${v[i][0]}`).join("; ")}.`, cnt ? `${cols[1]} were higher in ${yrs.join(", ")}: ${cnt}.` : "In no period were they higher: 0."], "Look where the second line lies above the first.", "Counting periods where the values are equal or reversed."), String(cnt), [0, 1, 2, 3, 4, 5].filter((x: number) => x !== cnt).map(String)));
  return out;
}

function diPie(r: RNG): Question[] {
  const names = ["P", "Q", "R", "S", "T"];
  let pcs: number[] = [];
  for (let z = 0; z < 200; z++) { pcs = [0, 1, 2, 3].map(() => ri(r, 8, 30)); const last = 100 - pcs.reduce((a: number, b: number) => a + b, 0); if (last >= 8 && last <= 32 && new Set([...pcs, last]).size === 5) { pcs.push(last); break; } pcs = []; }
  if (pcs.length !== 5) pcs = [24, 16, 28, 12, 20];
  const k = ri(r, 6, 16); const T = 500 * k;
  const [noun, verb] = pick(r, [["home loans", "sanctioned"], ["new accounts", "opened"], ["credit cards", "issued"], ["gold loans", "disbursed"]]); const what = `${noun} ${verb}`;
  const table: DataTable = { chart: "pie", total: T, title: `Percentage distribution of ${T} ${what} by five branches (P–T) of a bank in 2025`, columns: ["Branch", "Share (%)"], rows: names.map((nm: string, i: number) => [nm, String(pcs[i])]) };
  const D = (q: string, d: Difficulty, e: string[], sc: string, tr: string): Base => ({ ...NB("Data Interpretation", d, q, e, sc, tr), table, variant: "pie" });
  const val = (i: number): number => (T * pcs[i]) / 100;
  const out: Question[] = [];
  const i1 = ri(r, 0, 4);
  out.push(mkN(r, D(`How many ${noun} were ${verb} by branch ${names[i1]}?`, "Easy", [`${pcs[i1]}% of ${T} = ${T} × ${pcs[i1]} ÷ 100 = ${val(i1)}.`], "1% of the total = total ÷ 100; multiply by the share.", "Using the percentage itself as the number."), val(i1), Math.max(5, k * 5), [], String));
  const [a2, b2] = shuffle(r, [0, 1, 2, 3, 4]).slice(0, 2); const d2 = Math.abs(val(a2) - val(b2));
  out.push(mkN(r, D(`What is the difference between the number of ${noun} ${verb} by branch ${names[a2]} and by branch ${names[b2]}?`, "Easy", [`Difference in share = |${pcs[a2]} − ${pcs[b2]}| = ${Math.abs(pcs[a2] - pcs[b2])}%.`, `${Math.abs(pcs[a2] - pcs[b2])}% of ${T} = ${d2}.`], "Subtract the percentages first, then convert once.", "Converting both values separately and making an arithmetic slip."), d2, Math.max(5, k * 5), [], String));
  const [x3, y3, z3] = shuffle(r, [0, 1, 2, 3, 4]).slice(0, 3); const n3 = pcs[x3] + pcs[y3];
  out.push(finalize(r, D(`What is the ratio of the total ${noun} ${verb} by branches ${names[x3]} and ${names[y3]} together to those ${verb} by branch ${names[z3]}?`, "Moderate", [`(${pcs[x3]} + ${pcs[y3]})% : ${pcs[z3]}% = ${n3} : ${pcs[z3]}.`, `= ${ratioStr(n3, pcs[z3])} (the total cancels).`], "In a pie chart, ratios can be taken directly from the percentages.", "Converting to numbers unnecessarily and making errors."), ratioStr(n3, pcs[z3]), [ratioStr(pcs[z3], n3), ratioStr(n3 + 2, pcs[z3]), ratioStr(n3, pcs[z3] + 3), ratioStr(n3 - 1, pcs[z3])]));
  const i4 = ri(r, 0, 4); const ang = (36 * pcs[i4]) / 10;
  out.push(mkN(r, D(`What is the central angle (in degrees) of the sector representing branch ${names[i4]}?`, "Moderate", [`Central angle = share × 360 ÷ 100 = ${pcs[i4]} × 3.6.`, `= ${fmtNum(ang)}°.`], "1% of a pie = 3.6°.", "Multiplying by 3.6 with a decimal slip, or using 100 instead of 360."), ang, 3.6, [], (x: number) => `${fmtNum(Math.round(x * 10) / 10)}°`));
  const i5 = ri(r, 0, 4); const nx = (6 * k * pcs[i5]);
  out.push(mkN(r, D(`Next year the total number of ${noun} ${verb} increases by 20% and branch ${names[i5]}'s share remains the same. How many ${noun} will branch ${names[i5]} have ${verb} next year?`, "Tricky", [`This year: ${pcs[i5]}% of ${T} = ${val(i5)}.`, `Next year: ${val(i5)} × 1.2 = ${nx}.`], "Same share ⇒ the branch grows by the same 20% as the total.", "Adding 20 percentage points to the share instead of increasing the total."), nx, Math.max(6, k * 6), [val(i5) + 20, (T * (pcs[i5] + 20)) / 100], String));
  return out;
}

function diCaselet(r: RNG): Question[] {
  const k = ri(r, 3, 8); const P = 120 * k;
  const fr = pick(r, [[1, 3], [5, 12], [1, 4], [7, 12], [2, 5]]); const Pc = (P * fr[0]) / fr[1], Ps = P - Pc;
  const inc = pick(r, [20, 25, 50]); const Q = P + (P * inc) / 100;
  const ratios = shuffle(r, [[3, 2], [7, 5], [5, 3], [2, 1], [5, 4], [4, 3]]); const rq = ratios.find((x: number[]) => Q % (x[0] + x[1]) === 0) || [1, 1];
  const Qs = (Q / (rq[0] + rq[1])) * rq[0], Qc = Q - Qs;
  const R = 20 * Math.floor((Q - ri(r, 60, 200)) / 20); const dR = Q - R;
  const pct = pick(r, [40, 45, 55, 60, 65, 70, 75]); const Rs = (R * pct) / 100, Rc = R - Rs;
  const city = pick(r, ["Nagpur", "Guntur", "Indore", "Mysuru", "Varanasi", "Nashik"]);
  const passage = `Three branches P, Q and R of a regional rural bank in ${city} opened savings and current accounts in 2025.\nBranch P opened a total of ${P} accounts, of which ${fr[0]}/${fr[1]} were current accounts and the rest were savings accounts.\nBranch Q opened ${inc}% more accounts than branch P, and the ratio of savings to current accounts in branch Q was ${rq[0]} : ${rq[1]}.\nBranch R opened ${dR} fewer accounts than branch Q, and ${pct}% of the accounts of branch R were savings accounts.`;
  const sol = [`P: total ${P}; current = ${fr[0]}/${fr[1]} × ${P} = ${Pc}; savings = ${Ps}.`, `Q: total = ${P} × ${(100 + inc) / 100} = ${Q}; savings = ${Q} × ${rq[0]}/${rq[0] + rq[1]} = ${Qs}; current = ${Qc}.`, `R: total = ${Q} − ${dR} = ${R}; savings = ${pct}% of ${R} = ${Rs}; current = ${Rc}.`];
  const D = (q: string, d: Difficulty, e: string[], sc: string, tr: string): Base => ({ ...NB("Data Interpretation", d, q, e, sc, tr), passageTitle: "Directions: Read the following information carefully and answer the questions that follow.", passage, variant: "caselet" });
  const SC = "Convert the paragraph into a 3 × 2 table (branch × savings/current) before answering any question.";
  const out: Question[] = [];
  const ts = Ps + Qs + Rs;
  out.push(mkN(r, D("What is the total number of savings accounts opened by the three branches together?", "Moderate", [...sol, `Total savings = ${Ps} + ${Qs} + ${Rs} = ${ts}.`], SC, "Adding total accounts instead of only savings accounts."), ts, 10, [P + Q + R - ts], String));
  out.push(finalize(r, D("What is the ratio of current accounts opened by branch P to those opened by branch R?", "Moderate", [...sol, `${Pc} : ${Rc} = ${ratioStr(Pc, Rc)}.`], SC, "Using savings accounts of one branch by mistake."), ratioStr(Pc, Rc), [ratioStr(Rc, Pc), ratioStr(Ps, Rs), ratioStr(Pc + 10, Rc), ratioStr(Pc, Rc + 10)]));
  const d3 = Math.abs(Qs - Pc);
  out.push(mkN(r, D("What is the difference between the savings accounts of branch Q and the current accounts of branch P?", "Moderate", [...sol, `|${Qs} − ${Pc}| = ${d3}.`], SC, "Comparing savings with savings."), d3, 6, [Math.abs(Qs - Ps)], String));
  const av = (Pc + Qc) / 2;
  out.push(mkN(r, D("What is the average number of current accounts opened by branches P and Q?", "Moderate", [...sol, `(${Pc} + ${Qc}) ÷ 2 = ${fmtNum(av)}.`], SC, "Averaging total accounts instead of current accounts."), av, 4, [], fmtNum));
  const tc = Pc + Qc + Rc;
  out.push(mkN(r, D("What is the total number of current accounts opened by the three branches together?", "Easy", [...sol, `${Pc} + ${Qc} + ${Rc} = ${tc}.`], SC, "Forgetting to subtract the savings accounts of branch R."), tc, 10, [P + Q + R - tc], String));
  return out;
}

const ARITH: ((r: RNG) => Question)[] = [
  (r: RNG): Question => {
    let m = 20, d = 10, num = 0;
    do { m = pick(r, [20, 25, 30, 40, 50, 60]); d = pick(r, [10, 12, 15, 20, 25]); num = (100 + m) * (100 - d) - 10000; } while (num <= 0);
    let cp = 100 * ri(r, 2, 20); while ((cp * num) % 10000 !== 0) cp += 100;
    const profit = (cp * num) / 10000, pct = num / 100, mult = ((100 + m) * (100 - d)) / 10000;
    return mkN(r, NB("Profit & Loss", "Moderate", `A shopkeeper marks an article ${m}% above its cost price and allows a discount of ${d}% on the marked price. If he gains Rs ${profit}, what is the cost price of the article?`, [`Let CP = 100. Marked price = ${100 + m}; SP = ${100 + m} × ${(100 - d) / 100} = ${fmtNum(mult * 100)}.`, `Profit = ${fmtNum(pct)}% of CP.`, `${fmtNum(pct)}% of CP = ${profit}, so CP = ${profit} × 100 ÷ ${fmtNum(pct)} = ${cp}.`], `One multiplier: ${(100 + m) / 100} × ${(100 - d) / 100} = ${mult}, so profit is ${fmtNum(pct)}%.`, `Taking profit as ${m}% − ${d}% = ${m - d}%.`), cp, Math.max(20, Math.round(cp * 0.06 / 10) * 10), m !== d ? [Math.round((profit * 100) / (m - d))] : [], rs);
  },
  (r: RNG): Question => {
    if (r() < 0.5) {
      const rate = pick(r, [5, 10, 4, 8, 12, 15, 20]); let k = ri(r, 5, 50); while ((k * 1000 * rate * rate) % 10000 !== 0) k++;
      const P = k * 1000, diff = (P * rate * rate) / 10000;
      return mkN(r, NB("Interest (SI & CI)", "Easy", `What is the difference between the compound interest (compounded annually) and the simple interest on Rs ${P} for 2 years at ${rate}% per annum?`, ["For 2 years, CI − SI = P × (r/100)².", `= ${P} × ${rate * rate} ÷ 10000 = ${diff}.`], "Memorise: 2-year CI − SI = P(r/100)²; 3-year = P(r/100)²(3 + r/100).", "Using the 3-year formula, or computing CI and SI fully and slipping."), diff, stepOf(diff), [diff * 2], rs);
    }
    const P = 1000 * ri(r, 2, 50), rate = ri(r, 4, 12), tt = ri(r, 2, 5), si = (P * rate * tt) / 100;
    return mkN(r, NB("Interest (SI & CI)", "Easy", `A sum of money earns a simple interest of Rs ${si} in ${tt} years at ${rate}% per annum. What is the sum?`, ["SI = P × R × T ÷ 100, so P = SI × 100 ÷ (R × T).", `P = ${si} × 100 ÷ (${rate} × ${tt}) = ${P}.`], "P = SI × 100 ÷ (R × T); cancel before multiplying.", "Forgetting to divide by the time."), P, stepOf(P), [Math.round((si * 100) / rate)], rs);
  },
  (r: RNG): Question => {
    let a = 12, b = 18, k = 4, L = 36, ea = 3, eb = 2, days = 8;
    for (let i = 0; i < 500; i++) {
      const A = ri(r, 8, 24), B = ri(r, 10, 30); if (A === B) continue; const LL = lcm(A, B); const xa = LL / A, xb = LL / B; const K = ri(r, 2, 6); const done = K * (xa + xb);
      if (done >= LL || (LL - done) % xb !== 0) continue; a = A; b = B; k = K; L = LL; ea = xa; eb = xb; days = (LL - done) / xb; break;
    }
    const [X, Y] = shuffle(r, NAMES).slice(0, 2);
    return mkN(r, NB("Time & Work", "Moderate", `${X} can finish a piece of work in ${a} days and ${Y} in ${b} days. They work together for ${k} days, and then ${X} leaves. In how many more days will ${Y} finish the remaining work?`, [`Total work = LCM(${a}, ${b}) = ${L} units. ${X} does ${ea} units/day, ${Y} does ${eb} units/day.`, `Together for ${k} days: (${ea} + ${eb}) × ${k} = ${k * (ea + eb)} units.`, `Remaining = ${L - k * (ea + eb)} units; ${Y} alone takes ${L - k * (ea + eb)} ÷ ${eb} = ${days} days.`], "Take the LCM of the days as total work so every rate is a whole number.", `Forgetting the ${k} days already worked.`), days, 1, [b - k], String);
  },
  (r: RNG): Question => {
    if (r() < 0.5) {
      const u = ri(r, 8, 20), v = ri(r, 2, u - 3), t1 = ri(r, 2, 6), t2 = ri(r, 2, 6), D1 = (u + v) * t1, D2 = (u - v) * t2;
      return mkN(r, NB("Speed, Time & Distance", "Moderate", `A boat covers ${D1} km downstream in ${t1} hours and ${D2} km upstream in ${t2} hours. What is the speed of the boat in still water (in km/h)?`, [`Downstream speed = ${D1} ÷ ${t1} = ${u + v} km/h; upstream speed = ${D2} ÷ ${t2} = ${u - v} km/h.`, `Speed in still water = (${u + v} + ${u - v}) ÷ 2 = ${u} km/h.`], "Boat speed = (downstream + upstream) ÷ 2; stream speed = (downstream − upstream) ÷ 2.", "Giving the stream speed instead of the boat speed."), u, 1, [v], String);
    }
    const ms = 5 * ri(r, 2, 6), s = (ms * 18) / 5, tt = ri(r, 8, 25), L = ms * tt;
    return mkN(r, NB("Speed, Time & Distance", "Easy", `A train running at ${s} km/h crosses a pole in ${tt} seconds. What is the length of the train (in metres)?`, [`${s} km/h = ${s} × 5/18 = ${ms} m/s.`, `Length = speed × time = ${ms} × ${tt} = ${L} m.`], "Multiply km/h by 5/18 to get m/s.", "Forgetting to convert km/h into m/s."), L, stepOf(L), [s * tt], String);
  },
  (r: RNG): Question => {
    const cp = (): number[] => { let a = ri(r, 2, 7), b = ri(r, 2, 7); while (a === b || gcd(a, b) !== 1) { a = ri(r, 2, 7); b = ri(r, 2, 7); } return [a, b]; };
    const [p, q] = cp(); const [r2, s2] = cp();
    const A0 = p * r2, B0 = q * r2, C0 = q * s2, g = gcd(gcd(A0, B0), C0), A = A0 / g, B = B0 / g, C = C0 / g, T = A + B + C, k = 10 * ri(r, 5, 60), total = T * k;
    const [X, Y, Z] = shuffle(r, NAMES).slice(0, 3);
    return mkN(r, NB("Ratio & Proportion", "Moderate", `The ratio of ${X}'s share to ${Y}'s share is ${p} : ${q}, and the ratio of ${Y}'s share to ${Z}'s share is ${r2} : ${s2}. If Rs ${total} is divided among them in these ratios, what is ${Z}'s share?`, [`Make ${Y}'s term common: ${X} : ${Y} : ${Z} = ${A0} : ${B0} : ${C0}${g > 1 ? ` = ${A} : ${B} : ${C}` : ""}.`, `Total parts = ${T}; one part = ${total} ÷ ${T} = ${k}.`, `${Z}'s share = ${C} × ${k} = ${C * k}.`], "Multiply the first ratio by the second ratio's first term and the second by the first ratio's second term.", "Adding the two ratios directly without making the common term equal."), C * k, stepOf(C * k), [Math.round((total * s2) / (p + q + s2))], rs);
  },
  (r: RNG): Question => {
    const x = 1000 * ri(r, 10, 60), y = 1000 * ri(r, 10, 60), m = ri(r, 2, 8);
    const a = x * 12, b = y * (12 - m), g = gcd(a, b), pa = a / g, pb = b / g; const unit = ri(r, 2, 30) * 100 / gcd(pa + pb, 100) ; const k = Math.max(1, Math.round(unit)); const P = (pa + pb) * k;
    const [X, Y] = shuffle(r, NAMES).slice(0, 2);
    return mkN(r, NB("Partnership", "Moderate", `${X} starts a business with Rs ${x}. After ${m} months, ${Y} joins with Rs ${y}. At the end of the year, the total profit is Rs ${P}. What is ${Y}'s share of the profit?`, [`Profit ratio = ${x} × 12 : ${y} × ${12 - m} = ${pa} : ${pb}.`, `${Y}'s share = ${P} × ${pb} ÷ ${pa + pb} = ${pb * k}.`], "Profit share = capital × months; cancel common zeros early.", `Ignoring the ${m} months that ${Y} was not in the business.`), pb * k, stepOf(pb * k), [Math.round((P * y) / (x + y))], rs);
  },
  (r: RNG): Question => {
    let p = 2, q = 3; while (p === q || gcd(p, q) !== 1) { p = ri(r, 2, 9); q = ri(r, 2, 9); }
    const k = ri(r, 2, 8), n = ri(r, 2, 10), a = p * k, b = q * k;
    const [X, Y] = shuffle(r, NAMES).slice(0, 2);
    return mkN(r, NB("Ages", "Moderate", `The present ages of ${X} and ${Y} are in the ratio ${p} : ${q}. After ${n} years, their ages will be in the ratio ${ratioStr(a + n, b + n)}. What is ${X}'s present age (in years)?`, [`Let the ages be ${p}k and ${q}k. Then (${p}k + ${n}) : (${q}k + ${n}) = ${ratioStr(a + n, b + n)}.`, `Solving gives k = ${k}.`, `${X}'s present age = ${p} × ${k} = ${a} years.`], "Test the options: only the right one keeps both ratios true.", `Giving ${Y}'s age or the age after ${n} years.`), a, 2, [b, a + n], String);
  },
  (r: RNG): Question => {
    let p = 3, q = 2; while (p === q || gcd(p, q) !== 1) { p = ri(r, 3, 9); q = ri(r, 1, 6); }
    const u = ri(r, 2, 10), e = ri(r, 1, 3), V = (p + q) * u, add = e * u;
    return mkN(r, NB("Mixtures", "Moderate", `A ${V}-litre mixture contains milk and water in the ratio ${p} : ${q}. How many litres of water must be added to make the ratio ${ratioStr(p, q + e)}?`, [`Milk = ${V} × ${p}/${p + q} = ${p * u} L; water = ${q * u} L.`, `Milk stays ${p * u} L. For ratio ${ratioStr(p, q + e)}, water must be ${(q + e) * u} L.`, `Water to add = ${(q + e) * u} − ${q * u} = ${add} L.`], "Keep the unchanged ingredient (milk) fixed and scale the ratio to it.", "Scaling the total mixture instead of the unchanged milk."), add, Math.max(1, u), [(q + e) * u], String);
  },
  (r: RNG): Question => {
    if (r() < 0.5) {
      const k = ri(r, 1, 6), C = 44 * k, area = 154 * k * k;
      return mkN(r, NB("Mensuration", "Moderate", `The circumference of a circle is ${C} cm. What is its area (in sq cm)? (Take π = 22/7.)`, [`2πr = ${C}, so r = ${C} × 7 ÷ 44 = ${7 * k} cm.`, `Area = 22/7 × ${7 * k} × ${7 * k} = ${area} sq cm.`], "Circumference 44 means r = 7; scale from there.", "Using the diameter in place of the radius."), area, stepOf(area), [4 * area], String);
    }
    let p = 3, q = 2; while (p <= q || gcd(p, q) !== 1) { p = ri(r, 2, 9); q = ri(r, 1, 7); }
    const u = ri(r, 2, 12), P = 2 * (p + q) * u, area = p * q * u * u;
    return mkN(r, NB("Mensuration", "Easy", `The length and breadth of a rectangular plot are in the ratio ${p} : ${q} and its perimeter is ${P} m. What is its area (in sq m)?`, [`2(${p}x + ${q}x) = ${P}, so x = ${u}.`, `Length = ${p * u} m, breadth = ${q * u} m; area = ${area} sq m.`], "Perimeter ÷ 2 = length + breadth; split it in the given ratio.", "Forgetting to halve the perimeter."), area, stepOf(area), [area * 4], String);
  },
  (r: RNG): Question => {
    if (r() < 0.5) {
      const n = ri(r, 5, 12), B = ri(r, 20, 60); let X = ri(r, B + 5, B + 60); while ((X + (n - 1) * B) % n !== 0) X++;
      const A = (X + (n - 1) * B) / n;
      return mkN(r, NB("Averages", "Moderate", `The average of ${n} numbers is ${A}. When one number is removed, the average of the remaining numbers becomes ${B}. What is the number removed?`, [`Sum of ${n} numbers = ${n} × ${A} = ${n * A}.`, `Sum of ${n - 1} numbers = ${n - 1} × ${B} = ${(n - 1) * B}.`, `Removed number = ${n * A} − ${(n - 1) * B} = ${X}.`], "Removed number = new average + n × (fall in average).", "Subtracting the two averages directly."), X, stepOf(X), [A - B, n * (A - B)], String);
    }
    const p = pick(r, [10, 20, 25, 30, 40]), q = pick(r, [10, 20, 25, 30, 40]); let k = ri(r, 20, 90); while ((k * (100 - p) * (100 - q)) % 10 !== 0) k++;
    const S = 1000 * k, V = (S * (100 - p) * (100 - q)) / 10000; const name = pick(r, NAMES);
    return mkN(r, NB("Percentages", "Moderate", `${name} spends ${p}% of his salary on rent and ${q}% of the remaining amount on food. If he saves Rs ${V}, what is his salary?`, [`After rent, ${100 - p}% is left; after food, ${100 - q}% of that is saved.`, `Savings = S × ${(100 - p) / 100} × ${(100 - q) / 100} = ${V}.`, `S = ${V} ÷ ${((100 - p) * (100 - q)) / 10000} = ${S}.`], "Chain the remaining percentages as multipliers.", `Subtracting ${p}% + ${q}% from 100% as if both were on the full salary.`), S, stepOf(S), [p + q < 100 ? Math.round((V * 100) / (100 - p - q)) : S * 2], rs);
  },
];

const DI_TYPES = ["bar", "line", "pie", "caselet"];
function buildNumerical(r: RNG, diType: string): Question[] {
  const simp = shuffle(r, [...shuffle(r, SIMP).map((g: (r: RNG) => Question) => g(r)), ...[...APPROX, pick(r, APPROX)].map((g: (r: RNG) => Question) => g(r))]);
  const sGens = shuffle(r, SERIES);
  const series = [seriesMissing(r, sGens[0]), seriesMissing(r, sGens[1]), seriesMissing(r, sGens[2]), seriesWrong(r, sGens[3]), seriesWrong(r, sGens[4])];
  const quads = shuffle(r, [0, 1, 2, 3, 4, pick(r, [0, 2, 4]), pick(r, [1, 3])]).slice(0, 5).map((t: number) => quadQ(r, t));
  const di = diType === "line" ? diLine(r) : diType === "pie" ? diPie(r) : diType === "caselet" ? diCaselet(r) : diQs(r);
  const arith = shuffle(r, ARITH.map((g: (r: RNG) => Question) => g(r)));
  return [...simp, ...series, ...quads, ...di, ...arith];
}

// ================= REASONING =================
type PKind = "row" | "floor" | "week";
interface Clue { text: string; ok: (p: number[]) => boolean; abs: boolean }
const PERMS: Record<number, number[][]> = {};
function getPerms(n: number): number[][] {
  if (PERMS[n]) return PERMS[n];
  const out: number[][] = []; const a: number[] = Array.from({ length: n }, (_: unknown, i: number) => i);
  const rec = (k: number): void => {
    if (k === n) { out.push(a.slice()); return; }
    for (let i = k; i < n; i++) { let tmp = a[k]; a[k] = a[i]; a[i] = tmp; rec(k + 1); tmp = a[k]; a[k] = a[i]; a[i] = tmp; }
  };
  rec(0); PERMS[n] = out; return out;
}
function posPhrase(kind: PKind, pos: number, n: number): string {
  if (kind === "row") return pos < n / 2 ? `sits ${ORD[pos]} from the left end` : `sits ${ORD[n - 1 - pos]} from the right end`;
  if (kind === "floor") return `lives on floor ${pos + 1}`;
  return `has the seminar on ${DAYS[pos]}`;
}
function makeClue(r: RNG, kind: PKind, t: number[], names: string[]): Clue {
  const n = names.length; const who = (pos: number): number => t.indexOf(pos);
  const types = kind === "row" ? ["adj", "adj", "off", "gap", "gap", "before", "notadj", "end", "abs"] : ["adj", "off", "gap", "gap", "before", "notadj", "end", "abs", "thr"];
  const ty = pick(r, types);
  const two = (): number[] => { const i = ri(r, 0, n - 1); let j = ri(r, 0, n - 2); if (j >= i) j++; return [i, j]; };
  if (ty === "adj") {
    const i = who(ri(r, 0, n - 2)), j = who(t[i] + 1), X = names[i], Y = names[j];
    return { text: kind === "row" ? `${X} sits immediately to the left of ${Y}.` : kind === "floor" ? `${X} lives immediately below ${Y}.` : `${X}'s seminar is on the day immediately before ${Y}'s.`, ok: (p: number[]) => p[j] === p[i] + 1, abs: false };
  }
  if (ty === "off") {
    const d = pick(r, [2, 3]); const i = who(ri(r, 0, n - 1 - d)), j = who(t[i] + d), X = names[i], Y = names[j];
    return { text: kind === "row" ? `${X} sits ${ORD[d - 1]} to the left of ${Y}.` : kind === "floor" ? `${X} lives ${d} floors below ${Y}.` : `${Y}'s seminar is ${d} days after ${X}'s.`, ok: (p: number[]) => p[j] === p[i] + d, abs: false };
  }
  if (ty === "gap") {
    const [i, j] = two(); const k = Math.abs(t[i] - t[j]) - 1, X = names[i], Y = names[j];
    if (k === 0) return { text: kind === "row" ? `${X} sits next to ${Y}.` : kind === "floor" ? `${X} and ${Y} live on adjacent floors.` : `${X} and ${Y} have seminars on consecutive days.`, ok: (p: number[]) => Math.abs(p[i] - p[j]) === 1, abs: false };
    const verb = kind === "row" ? (k === 1 ? "Only one person sits" : `${NUMW[k]} persons sit`) : kind === "floor" ? (k === 1 ? "Only one person lives" : `${NUMW[k]} persons live`) : (k === 1 ? "Only one person has a seminar" : `${NUMW[k]} persons have seminars`);
    return { text: `${verb} between ${X} and ${Y}.`, ok: (p: number[]) => Math.abs(p[i] - p[j]) - 1 === k, abs: false };
  }
  if (ty === "before") {
    let [i, j] = two(); if (t[i] > t[j]) { const tmp = i; i = j; j = tmp; } const X = names[i], Y = names[j];
    return { text: kind === "row" ? `${X} sits somewhere to the left of ${Y}.` : kind === "floor" ? `${X} lives on a floor below ${Y}.` : `${X}'s seminar is on some day before ${Y}'s.`, ok: (p: number[]) => p[i] < p[j], abs: false };
  }
  if (ty === "notadj") {
    let [i, j] = two(); for (let z = 0; z < 10 && Math.abs(t[i] - t[j]) === 1; z++) [i, j] = two();
    if (Math.abs(t[i] - t[j]) !== 1) { const X = names[i], Y = names[j]; return { text: kind === "row" ? `${X} does not sit next to ${Y}.` : kind === "floor" ? `${X} and ${Y} do not live on adjacent floors.` : `${X} and ${Y} do not have seminars on consecutive days.`, ok: (p: number[]) => Math.abs(p[i] - p[j]) !== 1, abs: false }; }
  }
  if (ty === "end") {
    const i = who(pick(r, [0, n - 1])), X = names[i];
    return { text: kind === "row" ? `${X} sits at one of the extreme ends.` : kind === "floor" ? `${X} lives either on the top floor or on the bottom floor.` : `${X}'s seminar is either on Monday or on Sunday.`, ok: (p: number[]) => p[i] === 0 || p[i] === n - 1, abs: false };
  }
  if (ty === "thr") {
    const i = ri(r, 0, n - 1), X = names[i];
    if (t[i] > 3) return { text: kind === "floor" ? `${X} lives above floor 4.` : `${X}'s seminar is after Thursday.`, ok: (p: number[]) => p[i] > 3, abs: false };
    if (t[i] < 3) return { text: kind === "floor" ? `${X} lives below floor 4.` : `${X}'s seminar is before Thursday.`, ok: (p: number[]) => p[i] < 3, abs: false };
  }
  const i = ri(r, 0, n - 1), ti = t[i];
  return { text: `${names[i]} ${posPhrase(kind, ti, n)}.`, ok: (p: number[]) => p[i] === ti, abs: true };
}
export interface PuzzleRecord { kind: string; names: string[]; t: number[]; clues: Clue[] }
export const PUZZLE_LOG: PuzzleRecord[] = [];
function solvePuzzle(r: RNG, kind: PKind, names: string[]): { t: number[]; clues: string[] } {
  const n = names.length; const all = getPerms(n); const t = all[Math.floor(r() * all.length)];
  let cands = all; const clues: Clue[] = []; let absN = 0;
  for (let tries = 0; tries < 300 && cands.length > 1; tries++) {
    const c = makeClue(r, kind, t, names);
    if (clues.some((x: Clue) => x.text === c.text) || (c.abs && absN >= 1)) continue;
    const nx = cands.filter((p: number[]) => c.ok(p));
    if (nx.length < cands.length) { clues.push(c); cands = nx; if (c.abs) absN++; }
  }
  for (let i = 0; i < n && cands.length > 1; i++) {
    const ti = t[i];
    if (cands.some((p: number[]) => p[i] !== ti)) { clues.push({ text: `${names[i]} ${posPhrase(kind, ti, n)}.`, ok: (p: number[]) => p[i] === ti, abs: true }); cands = cands.filter((p: number[]) => p[i] === ti); }
  }
  PUZZLE_LOG.push({ kind, names: names.slice(), t: t.slice(), clues: clues.slice() });
  return { t, clues: clues.map((c: Clue) => c.text) };
}
function puzzleQs(r: RNG, kind: PKind, names: string[], topic: string): Question[] {
  const n = names.length; const { t, clues } = solvePuzzle(r, kind, names);
  const at = (pos: number): string => names[t.indexOf(pos)];
  const order = Array.from({ length: n }, (_: unknown, p: number) => at(p));
  const arrangement = kind === "row" ? `left to right: ${order.join(", ")}` : kind === "floor" ? `floor 7 (top) to floor 1: ${order.slice().reverse().join(", ")}` : order.map((x: string, p: number) => `${DAYS[p]}: ${x}`).join(", ");
  const intro = kind === "row" ? `Eight persons ${names.join(", ")} sit in a straight row, all facing north, not necessarily in the same order.` : kind === "floor" ? `Seven persons ${names.join(", ")} live on different floors of a seven-storey building. The bottom floor is numbered 1 and the top floor is numbered 7.` : `Seven persons ${names.join(", ")} attend a seminar on different days of the same week, from Monday to Sunday.`;
  const passage = `${intro}\n\n${clues.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}`;
  const title = kind === "row" ? "Puzzle: Linear seating arrangement" : kind === "floor" ? "Puzzle: Floor arrangement" : "Puzzle: Weekly seminar schedule";
  const sc = kind === "row" ? "For people facing north, their left is your left: number the seats 1 to 8 from the left and turn every clue into seat numbers." : kind === "floor" ? "Number floors from the bottom and treat 'above' and 'below' as larger and smaller numbers." : "Write the days as 1 to 7 and treat 'after' and 'before' as larger and smaller numbers.";
  const tr = kind === "row" ? "Reading 'second to the left of' as 'two persons between'." : kind === "floor" ? "Confusing 'immediately above' with 'somewhere above'." : "Counting the two end persons when asked how many are between them.";
  const base = (q: string, d: Difficulty, line: string): Base => ({ section: "Reasoning", topic, variant: kind, difficulty: d, passageTitle: title, passage, question: q, explanation: ["Place the definite clues first (exact positions, ends, immediate neighbours), then test the remaining cases; exactly one arrangement satisfies every clue.", `Final arrangement, ${arrangement}.`, line], shortcut: sc, commonTrap: tr });
  const otherNames = (c: string): string[] => shuffle(r, names.filter((x: string) => x !== c));
  const out: Question[] = [];
  const p1 = ri(r, 0, n - 1); const right = kind === "row" && r() < 0.5;
  const q1 = kind === "row" ? `Who sits ${ORD[right ? n - 1 - p1 : p1]} from the ${right ? "right" : "left"} end?` : kind === "floor" ? `Who lives on floor ${p1 + 1}?` : `Whose seminar is on ${DAYS[p1]}?`;
  out.push(finalize(r, base(q1, "Easy", `So the answer is ${at(p1)}.`), at(p1), otherNames(at(p1))));
  let [i2, j2] = shuffle(r, Array.from({ length: n }, (_: unknown, i: number) => i)).slice(0, 2);
  for (let z = 0; z < 10 && Math.abs(t[i2] - t[j2]) < 2; z++) [i2, j2] = shuffle(r, Array.from({ length: n }, (_: unknown, i: number) => i)).slice(0, 2);
  const k2 = Math.abs(t[i2] - t[j2]) - 1; const st = Math.max(0, Math.min(k2 - ri(r, 0, 4), n - 6));
  const q2 = kind === "row" ? `How many persons sit between ${names[i2]} and ${names[j2]}?` : kind === "floor" ? `How many persons live between ${names[i2]} and ${names[j2]}?` : `How many persons have seminars between ${names[i2]}'s and ${names[j2]}'s?`;
  out.push(finalize(r, base(q2, "Moderate", `Between them: ${k2 === 0 ? "nobody" : order.slice(Math.min(t[i2], t[j2]) + 1, Math.max(t[i2], t[j2])).join(", ")}, so the answer is ${NUMW[k2]}.`), NUMW[k2], [0, 1, 2, 3, 4].map((d: number) => NUMW[st + d]).filter((w: string) => w !== NUMW[k2])));
  const p3 = ri(r, 0, n - 2); const X3 = at(p3);
  const q3 = kind === "row" ? `Who sits immediately to the right of ${X3}?` : kind === "floor" ? `Who lives immediately above ${X3}?` : `Whose seminar is on the day immediately after ${X3}'s?`;
  out.push(finalize(r, base(q3, "Moderate", `The answer is ${at(p3 + 1)}.`), at(p3 + 1), otherNames(at(p3 + 1)).filter((x: string) => x !== X3).concat([X3])));
  const i4 = ri(r, 0, n - 1);
  if (kind === "row") { const c = `${ordN(n - t[i4])}`; out.push(finalize(r, base(`What is the position of ${names[i4]} from the right end?`, "Moderate", `${names[i4]} is in seat ${t[i4] + 1} from the left, which is ${c} from the right (${n} + 1 − ${t[i4] + 1}).`), c, shuffle(r, Array.from({ length: n }, (_: unknown, i: number) => ordN(i + 1))))); }
  else if (kind === "floor") { const c = `Floor ${t[i4] + 1}`; out.push(finalize(r, base(`On which floor does ${names[i4]} live?`, "Moderate", `${names[i4]} lives on floor ${t[i4] + 1}.`), c, shuffle(r, Array.from({ length: n }, (_: unknown, i: number) => `Floor ${i + 1}`)))); }
  else { const c = DAYS[t[i4]]; out.push(finalize(r, base(`On which day is ${names[i4]}'s seminar?`, "Moderate", `${names[i4]}'s seminar is on ${c}.`), c, shuffle(r, DAYS.slice()))); }
  let truth = makeClue(r, kind, t, names);
  for (let z = 0; z < 20 && (clues.indexOf(truth.text) >= 0 || truth.abs); z++) truth = makeClue(r, kind, t, names);
  const falses: string[] = []; const all = getPerms(n);
  for (let z = 0; z < 400 && falses.length < 4; z++) { const c = makeClue(r, kind, all[Math.floor(r() * all.length)], names); if (!c.ok(t) && falses.indexOf(c.text) < 0) falses.push(c.text); }
  out.push(finalize(r, base("Which of the following statements is true according to the arrangement?", "Tricky", `Only "${truth.text}" matches the final arrangement; the other statements contradict it.`), truth.text, falses));
  return out;
}

// ---------- new puzzle engines: circle (8, facing centre), box stack (7), month-date (3 × 2) ----------
type PKind2 = "circle" | "box" | "month";
const SLOTS = ["7 March", "18 March", "7 April", "18 April", "7 May", "18 May"];
const MONTHS3 = ["March", "April", "May"];
let CANON8: number[][] | null = null;
function spaceOf(kind: string, n: number): number[][] {
  if (kind === "circle") { if (!CANON8 || CANON8[0].length !== n) CANON8 = getPerms(n).filter((p: number[]) => p[0] === 0); return CANON8; }
  return getPerms(n);
}
const NUMS = (k: number, one: string, many: string): string => (k === 1 ? `Only one ${one}` : `${NUMW[k]} ${many}`);
function makeClue2(r: RNG, kind: PKind2, t: number[], names: string[]): Clue {
  const n = names.length; const who = (pos: number): number => t.indexOf(pos);
  const two = (): number[] => { const i = ri(r, 0, n - 1); let j = ri(r, 0, n - 2); if (j >= i) j++; return [i, j]; };
  if (kind === "circle") {
    const m = (x: number): number => ((x % n) + n) % n; const wc = (pos: number): number => t.indexOf(m(pos));
    const ty = pick(r, ["imL", "imR", "kL", "kR", "opp", "nb", "notnb", "btw", "notOpp", "kL", "kR"]);
    const Y = ri(r, 0, n - 1), y = names[Y];
    if (ty === "imL") { const X = wc(t[Y] + 1); return { text: `${names[X]} sits immediately to the left of ${y}.`, ok: (p: number[]) => p[X] === m(p[Y] + 1), abs: false }; }
    if (ty === "imR") { const X = wc(t[Y] - 1); return { text: `${names[X]} sits immediately to the right of ${y}.`, ok: (p: number[]) => p[X] === m(p[Y] - 1), abs: false }; }
    if (ty === "kL") { const k = pick(r, [2, 3]); const X = wc(t[Y] + k); return { text: `${names[X]} sits ${ORD[k - 1]} to the left of ${y}.`, ok: (p: number[]) => p[X] === m(p[Y] + k), abs: false }; }
    if (ty === "kR") { const k = pick(r, [2, 3]); const X = wc(t[Y] - k); return { text: `${names[X]} sits ${ORD[k - 1]} to the right of ${y}.`, ok: (p: number[]) => p[X] === m(p[Y] - k), abs: false }; }
    if (ty === "nb") { const X = wc(t[Y] + pick(r, [1, -1])); return { text: `${names[X]} is an immediate neighbour of ${y}.`, ok: (p: number[]) => { const d = m(p[X] - p[Y]); return d === 1 || d === n - 1; }, abs: false }; }
    if (ty === "notnb") { const X = (Y + ri(r, 1, n - 1)) % n; const d0 = m(t[X] - t[Y]); if (d0 !== 1 && d0 !== n - 1) return { text: `${names[X]} is not an immediate neighbour of ${y}.`, ok: (p: number[]) => { const d = m(p[X] - p[Y]); return d !== 1 && d !== n - 1; }, abs: false }; }
    if (ty === "btw") { const k = pick(r, [1, 2]); const Z = wc(t[Y] + k + 1); return { text: `${k === 1 ? "Only one person sits" : "Two persons sit"} between ${y} and ${names[Z]} when counted from the left of ${y}.`, ok: (p: number[]) => p[Z] === m(p[Y] + k + 1), abs: false }; }
    if (ty === "notOpp") { const X = (Y + ri(r, 1, n - 1)) % n; if (m(t[X] - t[Y]) !== n / 2) return { text: `${names[X]} does not sit opposite ${y}.`, ok: (p: number[]) => m(p[X] - p[Y]) !== n / 2, abs: false }; }
    const X = wc(t[Y] + n / 2); return { text: `${names[X]} sits opposite ${y}.`, ok: (p: number[]) => p[X] === m(p[Y] + n / 2), abs: false };
  }
  if (kind === "box") {
    const ty = pick(r, ["imA", "imA", "gap", "gapA", "above", "end", "notadj", "cnt", "abs"]);
    if (ty === "imA") { const Y = who(ri(r, 0, n - 2)), X = who(t[Y] + 1); return { text: `Box ${names[X]} is kept immediately above box ${names[Y]}.`, ok: (p: number[]) => p[X] === p[Y] + 1, abs: false }; }
    if (ty === "gap") { const [i, j] = two(); const k = Math.abs(t[i] - t[j]) - 1; if (k === 0) return { text: `Box ${names[i]} and box ${names[j]} are kept adjacent to each other.`, ok: (p: number[]) => Math.abs(p[i] - p[j]) === 1, abs: false }; return { text: `${NUMS(k, "box is", "boxes are")} kept between box ${names[i]} and box ${names[j]}.`, ok: (p: number[]) => Math.abs(p[i] - p[j]) - 1 === k, abs: false }; }
    if (ty === "gapA") { const d = pick(r, [2, 3]); const Y = who(ri(r, 0, n - 1 - d)), X = who(t[Y] + d); return { text: `${d === 2 ? "Only one box is" : "Two boxes are"} kept between box ${names[X]} and box ${names[Y]}, and box ${names[X]} is kept above box ${names[Y]}.`, ok: (p: number[]) => p[X] === p[Y] + d, abs: false }; }
    if (ty === "above") { let [i, j] = two(); if (t[i] < t[j]) { const z = i; i = j; j = z; } return { text: `Box ${names[i]} is kept somewhere above box ${names[j]}.`, ok: (p: number[]) => p[i] > p[j], abs: false }; }
    if (ty === "end") { const i = who(pick(r, [0, n - 1])); return { text: `Box ${names[i]} is kept either at the top or at the bottom of the stack.`, ok: (p: number[]) => p[i] === 0 || p[i] === n - 1, abs: false }; }
    if (ty === "notadj") { const [i, j] = two(); if (Math.abs(t[i] - t[j]) !== 1) return { text: `Box ${names[i]} is not kept adjacent to box ${names[j]}.`, ok: (p: number[]) => Math.abs(p[i] - p[j]) !== 1, abs: false }; }
    const i = ri(r, 0, n - 1), ti = t[i];
    if (ty === "cnt") { const k = n - 1 - ti; return { text: k === 0 ? `No box is kept above box ${names[i]}.` : `${NUMS(k, "box is", "boxes are")} kept above box ${names[i]}.`, ok: (p: number[]) => p[i] === ti, abs: true }; }
    return { text: `Box ${names[i]} is kept ${ordN(ti + 1)} from the bottom.`, ok: (p: number[]) => p[i] === ti, abs: true };
  }
  // month-date: slots 0..5 = 7 Mar, 18 Mar, 7 Apr, 18 Apr, 7 May, 18 May
  const mo = (x: number): number => Math.floor(x / 2);
  const ty = pick(r, ["imB", "gap", "same", "diffm", "d31", "date", "before", "abs", "same", "date"]);
  if (ty === "imB") { const X = who(ri(r, 0, n - 2)), Y = who(t[X] + 1); return { text: `${names[Y]} has a meeting immediately after ${names[X]}.`, ok: (p: number[]) => p[Y] === p[X] + 1, abs: false }; }
  if (ty === "gap") { const [i, j] = two(); const k = Math.abs(t[i] - t[j]) - 1; if (k === 0) return { text: `${names[i]} and ${names[j]} have meetings on consecutive dates.`, ok: (p: number[]) => Math.abs(p[i] - p[j]) === 1, abs: false }; return { text: `${NUMS(k, "person has", "persons have")} a meeting between ${names[i]} and ${names[j]}.`, ok: (p: number[]) => Math.abs(p[i] - p[j]) - 1 === k, abs: false }; }
  if (ty === "same") { const mm = ri(r, 0, 2); const i = who(2 * mm), j = who(2 * mm + 1); return { text: `${names[i]} and ${names[j]} have meetings in the same month.`, ok: (p: number[]) => mo(p[i]) === mo(p[j]), abs: false }; }
  if (ty === "diffm") { const [i, j] = two(); if (mo(t[i]) !== mo(t[j])) return { text: `${names[i]} does not have a meeting in the same month as ${names[j]}.`, ok: (p: number[]) => mo(p[i]) !== mo(p[j]), abs: false }; }
  if (ty === "d31") { const i = ri(r, 0, n - 1); if (mo(t[i]) === 1) return { text: `${names[i]} has a meeting in a month having 30 days.`, ok: (p: number[]) => mo(p[i]) === 1, abs: false }; return { text: `${names[i]} has a meeting in a month having 31 days.`, ok: (p: number[]) => mo(p[i]) !== 1, abs: false }; }
  if (ty === "date") { const i = ri(r, 0, n - 1); const e = t[i] % 2; return { text: `${names[i]} has a meeting on the ${e ? "18th" : "7th"} of a month.`, ok: (p: number[]) => p[i] % 2 === e, abs: false }; }
  if (ty === "before") { let [i, j] = two(); if (t[i] > t[j]) { const z = i; i = j; j = z; } return { text: `${names[i]}'s meeting is on some date before ${names[j]}'s.`, ok: (p: number[]) => p[i] < p[j], abs: false }; }
  const i = ri(r, 0, n - 1), ti = t[i];
  return { text: `${names[i]} has a meeting on ${SLOTS[ti]}.`, ok: (p: number[]) => p[i] === ti, abs: true };
}
function solvePuzzle2(r: RNG, kind: PKind2, names: string[]): { t: number[]; clues: string[] } {
  const n = names.length; const all = spaceOf(kind, n); const t = all[Math.floor(r() * all.length)];
  let cands = all; const clues: Clue[] = []; let absN = 0;
  for (let tries = 0; tries < 400 && cands.length > 1; tries++) {
    const c = makeClue2(r, kind, t, names);
    if (clues.some((x: Clue) => x.text === c.text) || (c.abs && absN >= 1)) continue;
    const nx = cands.filter((p: number[]) => c.ok(p));
    if (nx.length < cands.length) { clues.push(c); cands = nx; if (c.abs) absN++; }
  }
  for (let i = 0; i < n && cands.length > 1; i++) {
    const ti = t[i];
    if (!cands.some((p: number[]) => p[i] !== ti)) continue;
    let c: Clue;
    if (kind === "circle") { const j = t.indexOf((ti + 1) % n); c = { text: `${names[j]} sits immediately to the left of ${names[i]}.`, ok: (p: number[]) => p[j] === (p[i] + 1) % n, abs: false }; }
    else if (kind === "box") c = { text: `Box ${names[i]} is kept ${ordN(ti + 1)} from the bottom.`, ok: (p: number[]) => p[i] === ti, abs: true };
    else c = { text: `${names[i]} has a meeting on ${SLOTS[ti]}.`, ok: (p: number[]) => p[i] === ti, abs: true };
    if (clues.some((x: Clue) => x.text === c.text)) continue;
    clues.push(c); cands = cands.filter((p: number[]) => c.ok(p));
  }
  const order = shuffle(r, clues);
  PUZZLE_LOG.push({ kind, names: names.slice(), t: t.slice(), clues: order.slice() });
  return { t, clues: order.map((c: Clue) => c.text) };
}
function puzzleQs2(r: RNG, kind: PKind2, names: string[], topic: string): Question[] {
  const n = names.length; const { t, clues } = solvePuzzle2(r, kind, names);
  const m = (x: number): number => ((x % n) + n) % n;
  const at = (pos: number): string => names[t.indexOf(kind === "circle" ? m(pos) : pos)];
  const order = Array.from({ length: n }, (_: unknown, p: number) => at(p));
  const arrangement = kind === "circle" ? `going clockwise (towards each person's left) from ${order[0]}: ${order.join(" → ")} → back to ${order[0]}` : kind === "box" ? `top to bottom: ${order.slice().reverse().join(", ")}` : order.map((x: string, p: number) => `${SLOTS[p]}: ${x}`).join(", ");
  const intro = kind === "circle" ? `Eight persons ${names.join(", ")} are sitting around a circular table, all facing the centre, not necessarily in the same order.` : kind === "box" ? `Seven boxes ${names.join(", ")} are kept one above the other in a single stack, not necessarily in the same order. The bottom-most box is position 1 and the top-most box is position 7.` : `Six persons ${names.join(", ")} have meetings on six different dates — on the 7th and the 18th of March, April and May of the same year — not necessarily in the same order. Only one person has a meeting on each date.`;
  const passage = `${intro}\n\n${clues.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}`;
  const title = kind === "circle" ? "Puzzle: Circular seating (facing centre)" : kind === "box" ? "Puzzle: Box stack" : "Puzzle: Month and date schedule";
  const sc = kind === "circle" ? "Facing the centre, a person's LEFT is clockwise and RIGHT is anticlockwise. Fix one person at the top and place everyone else relative to them." : kind === "box" ? "Draw positions 1 (bottom) to 7 (top); fix the definite positions first, then 'immediately above' pairs." : "Draw a 6-row table: Mar 7, Mar 18, Apr 7, Apr 18, May 7, May 18. March and May have 31 days, April has 30.";
  const tr = kind === "circle" ? "Using your own left instead of the seated person's left (they face the centre)." : kind === "box" ? "Counting the box itself when asked how many boxes are above it." : "Forgetting that April has only 30 days, or treating '18th' as the second month.";
  const base = (q: string, d: Difficulty, line: string): Base => ({ section: "Reasoning", topic, variant: kind, difficulty: d, passageTitle: title, passage, question: q, explanation: ["Fix the definite clues first, branch into cases on the rest, and eliminate cases that break any clue; exactly one arrangement survives.", `Final arrangement, ${arrangement}.`, line], shortcut: sc, commonTrap: tr });
  const others = (c: string): string[] => shuffle(r, names.filter((x: string) => x !== c));
  const idx = shuffle(r, Array.from({ length: n }, (_: unknown, i: number) => i));
  const out: Question[] = [];
  const cntQ = (q: string, k: number, line: string): Question => { const st = Math.max(0, Math.min(k - ri(r, 0, 4), n - 6)); return finalize(r, base(q, "Moderate", line), NUMW[k], [0, 1, 2, 3, 4, 5].map((d: number) => NUMW[st + d]).filter((w: string) => w !== NUMW[k])); };
  if (kind === "circle") {
    const X1 = idx[0]; const a1 = at(t[X1] + n / 2);
    out.push(finalize(r, base(`Who sits opposite ${names[X1]}?`, "Easy", `Opposite ${names[X1]} (4 seats away) is ${a1}.`), a1, others(a1).filter((x: string) => x !== names[X1])));
    const X2 = idx[1], k2 = pick(r, [2, 3]); const a2 = at(t[X2] + k2);
    out.push(finalize(r, base(`Who sits ${ORD[k2 - 1]} to the left of ${names[X2]}?`, "Moderate", `Move ${k2} seats clockwise from ${names[X2]}: ${a2}.`), a2, others(a2).filter((x: string) => x !== names[X2]).concat([at(t[X2] - k2)]).reverse()));
    const X3 = idx[2]; const a3 = at(t[X3] - 1);
    out.push(finalize(r, base(`Who sits immediately to the right of ${names[X3]}?`, "Moderate", `One seat anticlockwise from ${names[X3]} is ${a3}.`), a3, [at(t[X3] + 1), ...others(a3).filter((x: string) => x !== names[X3])]));
    const X4 = idx[3], Y4 = idx[4]; const k4 = m(t[Y4] - t[X4]) - 1;
    out.push(cntQ(`How many persons sit between ${names[X4]} and ${names[Y4]} when counted from the left of ${names[X4]}?`, k4, `Going clockwise from ${names[X4]} to ${names[Y4]}: ${k4 === 0 ? "nobody in between" : Array.from({ length: k4 }, (_: unknown, z: number) => at(t[X4] + 1 + z)).join(", ")} — ${NUMW[k4]}.`));
  } else if (kind === "box") {
    const p1 = ri(r, 0, n - 1); const a1 = at(p1);
    out.push(finalize(r, base(p1 === n - 1 ? "Which box is kept at the top of the stack?" : p1 === 0 ? "Which box is kept at the bottom of the stack?" : `Which box is kept ${ordN(p1 + 1)} from the bottom?`, "Easy", `Position ${p1 + 1} holds box ${a1}.`), a1, others(a1)));
    let [i2, j2] = [idx[0], idx[1]]; for (let z = 0; z < 10 && Math.abs(t[i2] - t[j2]) < 2; z++) [i2, j2] = shuffle(r, idx).slice(0, 2);
    const k2 = Math.abs(t[i2] - t[j2]) - 1;
    out.push(cntQ(`How many boxes are kept between box ${names[i2]} and box ${names[j2]}?`, k2, `Between them: ${k2 === 0 ? "none" : order.slice(Math.min(t[i2], t[j2]) + 1, Math.max(t[i2], t[j2])).join(", ")} — ${NUMW[k2]}.`));
    const p3 = ri(r, 1, n - 1); const X3 = at(p3), a3 = at(p3 - 1);
    out.push(finalize(r, base(`Which box is kept immediately below box ${X3}?`, "Moderate", `Below ${X3} (position ${p3 + 1}) is ${a3}.`), a3, [p3 < n - 1 ? at(p3 + 1) : at(0), ...others(a3).filter((x: string) => x !== X3)]));
    const X4 = idx[2]; const k4 = n - 1 - t[X4];
    out.push(cntQ(`How many boxes are kept above box ${names[X4]}?`, k4, `Box ${names[X4]} is at position ${t[X4] + 1}, so ${n} − ${t[X4] + 1} = ${k4} boxes are above it.`));
  } else {
    const p1 = ri(r, 0, n - 1); const a1 = at(p1);
    out.push(finalize(r, base(`Who has a meeting on ${SLOTS[p1]}?`, "Easy", `${SLOTS[p1]}: ${a1}.`), a1, others(a1)));
    const X2 = idx[0]; const a2 = SLOTS[t[X2]];
    out.push(finalize(r, base(`On which date does ${names[X2]} have a meeting?`, "Moderate", `${names[X2]}: ${a2}.`), a2, shuffle(r, SLOTS.filter((x: string) => x !== a2))));
    let [i3, j3] = [idx[1], idx[2]]; for (let z = 0; z < 10 && Math.abs(t[i3] - t[j3]) < 2; z++) [i3, j3] = shuffle(r, idx).slice(0, 2);
    const k3 = Math.abs(t[i3] - t[j3]) - 1;
    out.push(cntQ(`How many persons have meetings between ${names[i3]} and ${names[j3]}?`, k3, `Between them: ${k3 === 0 ? "nobody" : order.slice(Math.min(t[i3], t[j3]) + 1, Math.max(t[i3], t[j3])).join(", ")} — ${NUMW[k3]}.`));
    const X4 = idx[3]; const a4 = at(t[X4] ^ 1);
    out.push(finalize(r, base(`Who has a meeting in the same month as ${names[X4]}?`, "Moderate", `${names[X4]}'s month is ${MONTHS3[Math.floor(t[X4] / 2)]}; the other person that month is ${a4}.`), a4, others(a4).filter((x: string) => x !== names[X4])));
  }
  let truth = makeClue2(r, kind, t, names);
  for (let z = 0; z < 30 && (clues.indexOf(truth.text) >= 0 || truth.abs); z++) truth = makeClue2(r, kind, t, names);
  const falses: string[] = []; const all = spaceOf(kind, n);
  for (let z = 0; z < 600 && falses.length < 4; z++) { const c = makeClue2(r, kind, all[Math.floor(r() * all.length)], names); if (!c.ok(t) && falses.indexOf(c.text) < 0) falses.push(c.text); }
  out.push(finalize(r, base("Which of the following statements is true according to the arrangement?", "Tricky", `Only "${truth.text}" matches the final arrangement; the other statements contradict it.`), truth.text, falses));
  return out;
}

const SYL_OPTS = ["Only I follows", "Only II follows", "Either I or II follows", "Neither I nor II follows", "Both I and II follow"];
const SW: [string, string][] = [["banks", "bank"], ["offices", "office"], ["branches", "branch"], ["loans", "loan"], ["bonds", "bond"], ["shares", "share"], ["coins", "coin"], ["notes", "note"], ["cheques", "cheque"], ["cards", "card"], ["wallets", "wallet"], ["lockers", "locker"], ["vaults", "vault"], ["ledgers", "ledger"], ["files", "file"], ["clerks", "clerk"], ["officers", "officer"], ["managers", "manager"], ["accounts", "account"], ["deposits", "deposit"]];
interface SylT { s: string[]; c: string[]; a: number; e: string[] }
const SYL: SylT[] = [
  { s: ["All {A} are {B}.", "All {B} are {C}."], c: ["All {A} are {C}.", "Some {C} are {A}."], a: 4, e: ["{A} lie inside {B}, and {B} inside {C}, so all {A} are {C}: I follows.", "Since all {A} are {C}, some {C} are {A}: II follows."] },
  { s: ["All {A} are {B}.", "Some {B} are {C}."], c: ["Some {A} are {C}.", "Some {C} are {B}."], a: 1, e: ["The {B} that are {C} need not be {A}: I does not follow.", "'Some {B} are {C}' converts to 'Some {C} are {B}': II follows."] },
  { s: ["Some {A} are {B}.", "No {b} is {c}."], c: ["Some {A} are not {C}.", "No {a} is {c}."], a: 0, e: ["The {A} that are {B} cannot be {C}, so some {A} are not {C}: I follows.", "Other {A} may still be {C}: II does not follow."] },
  { s: ["All {A} are {B}.", "No {b} is {c}."], c: ["No {a} is {c}.", "Some {C} are {A}."], a: 0, e: ["{A} lie inside {B}, which is fully outside {C}, so no {a} is {c}: I follows.", "II contradicts I: it does not follow."] },
  { s: ["Some {A} are {B}.", "Some {B} are {C}."], c: ["Some {A} are {C}.", "No {a} is {c}."], a: 2, e: ["No definite relation between {A} and {C}, so neither is certain alone.", "I and II are a complementary pair (Some / No) on the same terms: either I or II follows."] },
  { s: ["No {a} is {b}.", "All {B} are {C}."], c: ["Some {C} are not {A}.", "All {A} being {C} is a possibility."], a: 4, e: ["The {B} part of {C} is not {A}, so some {C} are not {A}: I follows.", "{A} can lie inside {C} but outside {B}; nothing prevents it: II follows."] },
  { s: ["Some {A} are {B}.", "All {B} are {C}."], c: ["Some {A} are {C}.", "All {C} are {A}."], a: 0, e: ["The {A} that are {B} are also {C}: I follows.", "Nothing says every {c} is {a}: II does not follow."] },
  { s: ["All {A} are {B}.", "All {C} are {B}."], c: ["Some {A} are {C}.", "Some {B} are {A}."], a: 1, e: ["{A} and {C} are both inside {B} but need not overlap: I does not follow.", "All {A} are {B}, so some {B} are {A}: II follows."] },
  { s: ["No {a} is {b}.", "No {b} is {c}."], c: ["No {a} is {c}.", "Some {A} are {C}."], a: 2, e: ["No relation between {A} and {C} can be fixed.", "'No {a} is {c}' and 'Some {A} are {C}' are a complementary pair: either I or II follows."] },
  { s: ["All {A} are {B}.", "No {c} is {b}."], c: ["Some {A} are {C}.", "All {C} being {A} is a possibility."], a: 3, e: ["{A} are inside {B} and {C} are outside {B}, so no {a} is {c}: I does not follow.", "{C} can never lie inside {A}: II does not follow."] },
  { s: ["Some {A} are {B}.", "All {B} are {C}."], c: ["No {a} is {c}.", "Some {C} are {A}."], a: 1, e: ["Some {A} are {B} and all {B} are {C}, so some {A} are {C}; 'No {a} is {c}' is false: I does not follow.", "Some {A} are {C} converts to some {C} are {A}: II follows."] },
  { s: ["Some {A} are {B}.", "No {b} is {c}."], c: ["All {A} being {C} is a possibility.", "Some {B} are {A}."], a: 1, e: ["The {A} that are {B} can never be {C}: I does not follow.", "'Some {A} are {B}' converts to 'Some {B} are {A}': II follows."] },
];
const ONLYFEW: SylT[] = [
  { s: ["Only a few {A} are {B}.", "All {B} are {C}."], c: ["Some {A} are {C}.", "All {A} are {B}."], a: 0, e: ["The {A} that are {B} lie inside {C}, so some {A} are {C}: I follows.", "'Only a few {A} are {B}' means some {A} are definitely not {B}, so 'All {A} are {B}' is false: II does not follow."] },
  { s: ["Only a few {A} are {B}.", "No {b} is {c}."], c: ["Some {A} are not {C}.", "Some {C} are not {B}."], a: 4, e: ["The {A} that are {B} can never be {C}, so some {A} are not {C}: I follows.", "'No {b} is {c}' means no {c} is {b}, so some {C} are not {B}: II follows."] },
  { s: ["All {A} are {B}.", "Only a few {B} are {C}."], c: ["Some {B} are not {C}.", "All {A} being {C} is a possibility."], a: 4, e: ["'Only a few {B} are {C}' itself tells us some {B} are not {C}: I follows.", "{A} can lie completely inside the part of {B} that is {C}: the possibility exists, II follows."] },
  { s: ["Only a few {A} are {B}.", "Some {B} are {C}."], c: ["All {A} being {B} is a possibility.", "Some {C} being {A} is a possibility."], a: 1, e: ["'Only a few' rules out all {A} being {B}: I does not follow.", "Nothing prevents {C} and {A} from overlapping: II follows as a possibility."] },
  { s: ["Some {A} are {B}.", "Only a few {B} are {C}."], c: ["Some {B} are not {C}.", "No {a} is {c}."], a: 0, e: ["'Only a few {B} are {C}' means some {B} are not {C}: I follows.", "{A} and {C} may or may not overlap, so 'No {a} is {c}' is not certain: II does not follow."] },
  { s: ["Only a few {A} are {B}.", "Only a few {B} are {C}."], c: ["Some {A} are not {B}.", "All {C} are {B}."], a: 0, e: ["'Only a few {A} are {B}' means some {A} are not {B}: I follows.", "All {C} being {B} is only a possibility, not a certainty: II does not follow."] },
  { s: ["No {a} is {b}.", "Only a few {C} are {B}."], c: ["Some {C} are not {A}.", "All {A} being {C} is a possibility."], a: 4, e: ["The {C} that are {B} can never be {A}, so some {C} are not {A}: I follows.", "{A} can lie inside the part of {C} that is not {B}: II follows as a possibility."] },
];
const art = (s: string): string => (/^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`);
function fillSyl(s0: string, w: [string, string][]): string {
  const s = s0.replace(/\b(No|no) \{a\}/g, `$1 ${w[0][1]}`).replace(/\b(No|no) \{b\}/g, `$1 ${w[1][1]}`).replace(/\b(No|no) \{c\}/g, `$1 ${w[2][1]}`);
  const out = s.replace(/\{A\}/g, w[0][0]).replace(/\{B\}/g, w[1][0]).replace(/\{C\}/g, w[2][0]).replace(/\{a\}/g, art(w[0][1])).replace(/\{b\}/g, art(w[1][1])).replace(/\{c\}/g, art(w[2][1]));
  return out.charAt(0).toUpperCase() + out.slice(1);
}
function sylQs(r: RNG): Question[] {
  return shuffle(r, [...shuffle(r, ONLYFEW).slice(0, 2), ...shuffle(r, SYL).slice(0, 3)]).map((tpl: SylT) => {
    const w = shuffle(r, SW).slice(0, 3); const f = (s: string): string => fillSyl(s, w);
    return { ...RB("Syllogism", tpl.a === 2 || tpl.a === 3 ? "Tricky" : "Moderate", `Statements:\n${tpl.s.map(f).join("\n")}\n\nConclusions:\nI. ${f(tpl.c[0])}\nII. ${f(tpl.c[1])}`, [...tpl.e.map(f), `Answer: ${SYL_OPTS[tpl.a]}.`], "Draw the minimum-overlap Venn diagram; a definite conclusion must hold in every possible diagram.", "Treating a possibility as a certainty, or missing an either-or pair."), options: SYL_OPTS, correctIndex: tpl.a };
  });
}

const FLIP: Record<string, string> = { ">": "<", "<": ">", "≥": "≤", "≤": "≥", "=": "=" };
function chainRel(syms: string[], i: number, j: number): string | null {
  const seg = syms.slice(i, j);
  if (seg.every((s: string) => s === "=")) return "=";
  if (seg.every((s: string) => s === ">" || s === "≥" || s === "=")) return seg.indexOf(">") >= 0 ? ">" : "≥";
  if (seg.every((s: string) => s === "<" || s === "≤" || s === "=")) return seg.indexOf("<") >= 0 ? "<" : "≤";
  return null;
}
interface Conc { a: number; b: number; op: string }
function ineqQs(r: RNG): Question[] {
  const out: Question[] = [];
  for (let q = 0; q < 5; q++) {
    const target = pick(r, [0, 1, 2, 3, 4, 0, 1, 3]);
    for (let tries = 0; tries < 200; tries++) {
      const L = ri(r, 5, 6); const lets = shuffle(r, "ABCDEFGHJKLMNPQRSTUVWXYZ".split("")).slice(0, L);
      const syms = Array.from({ length: L - 1 }, () => pick(r, [">", "≥", "=", "<", "≤", "≥", "≤"]));
      const pairs: number[][] = []; for (let i = 0; i < L; i++) for (let j = i + 1; j < L; j++) if (j - i >= 2) pairs.push([i, j]);
      const def = pairs.filter((p: number[]) => chainRel(syms, p[0], p[1]) !== null);
      const mixed = pairs.filter((p: number[]) => chainRel(syms, p[0], p[1]) === null);
      const weak = def.filter((p: number[]) => { const x = chainRel(syms, p[0], p[1]); return x === "≥" || x === "≤"; });
      const trueC = (p: number[]): Conc => ({ a: p[0], b: p[1], op: chainRel(syms, p[0], p[1]) as string });
      const falseC = (): Conc | null => {
        if (mixed.length && r() < 0.6) { const p = pick(r, mixed); return { a: p[0], b: p[1], op: pick(r, [">", "<", "≥", "≤"]) }; }
        if (!def.length) return null; const p = pick(r, def); const x = chainRel(syms, p[0], p[1]) as string;
        const bad: Record<string, string[]> = { ">": ["<", "≤", "="], "≥": ["<"], "=": [">", "<"], "<": [">", "≥", "="], "≤": [">"] };
        return { a: p[0], b: p[1], op: pick(r, bad[x]) };
      };
      let c1: Conc | null = null, c2: Conc | null = null;
      if (target === 2) { if (!weak.length) continue; const p = pick(r, weak); const x = chainRel(syms, p[0], p[1]) as string; c1 = { a: p[0], b: p[1], op: x === "≥" ? ">" : "<" }; c2 = { a: p[0], b: p[1], op: "=" }; if (r() < 0.5) { const tmp = c1; c1 = c2; c2 = tmp; } }
      else if (target === 4) { if (def.length < 2) continue; const [p, s] = shuffle(r, def).slice(0, 2); c1 = trueC(p); c2 = trueC(s); }
      else if (target === 3) { c1 = falseC(); c2 = falseC(); }
      else { if (!def.length) continue; const tc = trueC(pick(r, def)); const fc = falseC(); if (target === 0) { c1 = tc; c2 = fc; } else { c1 = fc; c2 = tc; } }
      if (!c1 || !c2 || (c1.a === c2.a && c1.b === c2.b && target !== 2)) continue;
      const show = (c: Conc): string => (r() < 0.4 ? `${lets[c.b]} ${FLIP[c.op]} ${lets[c.a]}` : `${lets[c.a]} ${c.op} ${lets[c.b]}`);
      const cuts = L >= 6 && r() < 0.5 ? [0, 2, 4, L - 1] : [0, ri(r, 2, L - 3), L - 1];
      const segTxt = (a: number, b: number): string => { if (r() < 0.4) { let z = lets[b]; for (let i = b - 1; i >= a; i--) z += ` ${FLIP[syms[i]]} ${lets[i]}`; return z; } let z = lets[a]; for (let i = a; i < b; i++) z += ` ${syms[i]} ${lets[i + 1]}`; return z; };
      const chain = cuts.slice(0, -1).map((c0: number, k: number) => segTxt(c0, cuts[k + 1])).filter((x: string) => x.length > 1).join(", ");
      const why = (c: Conc, label: string): string => { const x = chainRel(syms, c.a, c.b); const seg = lets.slice(c.a, c.b + 1).map((l: string, i: number) => (i < c.b - c.a ? `${l} ${syms[c.a + i]} ` : l)).join(""); return `${label}: ${seg} → ${x ? `${lets[c.a]} ${x} ${lets[c.b]}` : "the signs point in opposite directions, so no definite relation"}.`; };
      out.push({ ...RB("Inequality", target === 2 ? "Tricky" : "Moderate", `Statement: ${chain}\n\nConclusions:\nI. ${show(c1)}\nII. ${show(c2)}`, [why(c1, "I"), why(c2, "II"), target === 2 ? "I and II are on the same pair and together cover the derived '≥/≤': either I or II follows." : `Answer: ${SYL_OPTS[target]}.`], "A conclusion follows only if every sign between the two letters points the same way; '=' never breaks the chain.", "Reading the chain left to right and assuming the first letter is larger than everything after it."), options: SYL_OPTS, correctIndex: target });
      break;
    }
  }
  while (out.length < 5) out.push({ ...RB("Inequality", "Easy", "Statement: P > Q ≥ R = S < T ≤ U\n\nConclusions:\nI. P > S\nII. Q > U", ["I: P > Q ≥ R = S, so P > S: follows.", "II: the signs change direction at S, so no relation: does not follow."], "Check the direction of every sign between the two letters.", "Assuming Q is larger than U."), options: SYL_OPTS, correctIndex: 0 });
  return out;
}

function alphaQs(r: RNG): Question[] {
  const LET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""); const SYMS = ["@", "#", "$", "%", "&", "*", "©", "+"];
  const s: string[] = Array.from({ length: 26 }, () => { const x = r(); return x < 0.45 ? pick(r, LET) : x < 0.75 ? String(ri(r, 1, 9)) : pick(r, SYMS); });
  const isL = (c: string): boolean => /^[A-Z]$/.test(c); const isD = (c: string): boolean => /^[0-9]$/.test(c); const isS = (c: string): boolean => !isL(c) && !isD(c);
  const uniq = s.filter((c: string, i: number) => s.indexOf(c) === i);
  const elemQ = (q: string, ans: string, e: string[], d: Difficulty): Question => finalize(r, { ...RB("Alphanumeric Series", d, q, e, "Convert 'from the right' to 'from the left' with (total + 1 − position) before counting.", "Counting the reference element itself, or counting from the wrong end."), passageTitle: "Study the following arrangement carefully", passage: s.join("  ") }, ans, shuffle(r, uniq.filter((c: string) => c !== ans)));
  const countQ = (q: string, c: number, e: string[]): Question => { const w = [c + 1, c - 1, c + 2, c - 2, c + 3, c + 4].filter((x: number) => x >= 0).slice(0, 4).map(String); return finalize(r, { ...RB("Alphanumeric Series", "Moderate", q, e, "Scan once from left to right and tick each match; do not recount.", "Missing a match at the start or end of the series."), passageTitle: "Study the following arrangement carefully", passage: s.join("  ") }, String(c), w); };
  const out: Question[] = [];
  const k1 = ri(r, 4, 12); out.push(elemQ(`Which element is ${ordN(k1)} from the right end of the arrangement?`, s[26 - k1], [`${ordN(k1)} from the right = ${ordN(27 - k1)} from the left (26 + 1 − ${k1}).`, `That element is ${s[26 - k1]}.`], "Easy"));
  const m1: string[] = []; for (let i = 1; i < 25; i++) if (isD(s[i]) && isL(s[i - 1]) && isS(s[i + 1])) m1.push(`${s[i - 1]} ${s[i]} ${s[i + 1]}`);
  out.push(countQ("How many numbers in the arrangement are immediately preceded by a letter and immediately followed by a symbol?", m1.length, [m1.length ? `Matches: ${m1.join("; ")}.` : "No number has a letter before it and a symbol after it.", `Count = ${m1.length}.`]));
  const p = ri(r, 10, 20), m = ri(r, 3, 7); out.push(elemQ(`Which element is ${ordN(m)} to the left of the ${ordN(p)} element from the left end?`, s[p - 1 - m], [`${ordN(m)} to the left of the ${ordN(p)} from the left = ${ordN(p - m)} from the left.`, `That element is ${s[p - 1 - m]}.`], "Moderate"));
  const f = s.filter((c: string) => !isS(c)); const k4 = ri(r, 5, Math.min(12, f.length)); out.push(elemQ(`If all the symbols are removed from the arrangement, which element will be ${ordN(k4)} from the left end?`, f[k4 - 1], [`Without symbols: ${f.join(" ")}.`, `${ordN(k4)} from the left is ${f[k4 - 1]}.`], "Moderate"));
  const mode5 = ri(r, 0, 2);
  if (mode5 === 2) { const h = 13; const rv = [...s.slice(0, h).reverse(), ...s.slice(h)]; const k5 = ri(r, 3, 11), m5 = ri(r, 2, 6); const pos = k5 + m5; out.push(elemQ(`If the first thirteen elements of the arrangement are written in reverse order, which element will be ${ordN(m5)} to the right of the ${ordN(k5)} element from the left end?`, rv[pos - 1], [`After reversing the first 13: ${rv.join(" ")}.`, `${ordN(m5)} to the right of the ${ordN(k5)} from the left = ${ordN(pos)} from the left = ${rv[pos - 1]}.`], "Tricky")); }
  else if (mode5 === 0) { const v = s.filter((c: string) => "AEIOU".indexOf(c) >= 0).length; out.push(countQ("How many vowels are there in the arrangement?", v, [`Vowels: ${s.filter((c: string) => "AEIOU".indexOf(c) >= 0).join(", ") || "none"}.`, `Count = ${v}.`])); }
  else { const m5: string[] = []; for (let i = 0; i < 25; i++) if (isS(s[i]) && isD(s[i + 1])) m5.push(`${s[i]} ${s[i + 1]}`); out.push(countQ("How many symbols in the arrangement are immediately followed by a number?", m5.length, [m5.length ? `Matches: ${m5.join("; ")}.` : "No symbol is followed by a number.", `Count = ${m5.length}.`])); }
  return out;
}

const CWORDS = ["BANK", "LOAN", "CASH", "FUND", "RATE", "DEBT", "BOND", "GOLD", "SAFE", "CARD", "TAXES", "CREDIT", "LEDGER", "CHEQUE", "BRANCH", "DEPOSIT", "VAULT", "PAYEE", "AUDIT", "MONEY"];
const sh = (c: string, k: number): string => String.fromCharCode(((c.charCodeAt(0) - 65 + k + 260) % 26) + 65);
const RULES: { name: string; f: (w: string, k: number) => string }[] = [
  { name: "each letter moves +k", f: (w: string, k: number) => w.split("").map((c: string) => sh(c, k)).join("") },
  { name: "letters move +k and −k alternately", f: (w: string, k: number) => w.split("").map((c: string, i: number) => sh(c, i % 2 ? -k : k)).join("") },
  { name: "the word is reversed and each letter moves +k", f: (w: string, k: number) => w.split("").reverse().map((c: string) => sh(c, k)).join("") },
];
function codingQs(r: RNG): Question[] {
  const [w1, w2, w3] = shuffle(r, CWORDS).slice(0, 3); const ri0 = ri(r, 0, 2); const k = ri(r, 1, 3); const rule = RULES[ri0];
  const ans = rule.f(w2, k);
  const wrong = [RULES[(ri0 + 1) % 3].f(w2, k), RULES[(ri0 + 2) % 3].f(w2, k), rule.f(w2, k + 1), rule.f(w2, k === 1 ? 2 : k - 1)];
  const q1 = finalize(r, RB("Coding-Decoding", "Moderate", `In a certain code language, ${w1} is written as ${rule.f(w1, k)}. How is ${w2} written in that code language?`, [`${w1} → ${rule.f(w1, k)}: ${rule.name.replace("k", String(k)).replace("k", String(k))}.`, `Applying the same rule to ${w2} gives ${ans}.`], "Check the shift of the first two letters; it reveals whether the rule is constant, alternating or reversed.", "Assuming the same shift for every letter when it alternates."), ans, wrong);
  const rev = r() < 0.5; const val = (w: string): number => w.split("").reduce((s: number, c: string) => s + (rev ? 27 - (c.charCodeAt(0) - 64) : c.charCodeAt(0) - 64), 0);
  const q2 = mkN(r, RB("Coding-Decoding", "Moderate", `In a certain code, ${w1} is written as ${val(w1)} and ${w2} is written as ${val(w2)}. What is the code for ${w3}?`, [`Each letter is replaced by its ${rev ? "reverse alphabet position (A = 26, Z = 1)" : "alphabet position (A = 1, Z = 26)"} and the values are added.`, `${w3}: ${w3.split("").map((c: string) => (rev ? 27 - (c.charCodeAt(0) - 64) : c.charCodeAt(0) - 64)).join(" + ")} = ${val(w3)}.`], "Memorise EJOTY (E = 5, J = 10, O = 15, T = 20, Y = 25) to get positions fast.", "Using forward positions when the code uses reverse positions, or vice versa."), val(w3), 2, [], String);
  return [q1, q2];
}
const DIRN = ["North", "East", "South", "West"];
const dirName = (x: number, y: number): string => { const ns = y > 0 ? "North" : y < 0 ? "South" : ""; const ew = x > 0 ? "East" : x < 0 ? "West" : ""; return ns && ew ? `${ns}-${ew}` : ns || ew; };
const DIR8 = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"];
function walk(r: RNG): { text: string; x: number; y: number; h: number; trace: string[] } {
  for (let tries = 0; tries < 600; tries++) {
    let h = ri(r, 0, 3), x = 0, y = 0; const legs: string[] = []; const trace: string[] = []; const nl = ri(r, 3, 4);
    for (let k = 0; k < nl; k++) {
      const len = ri(r, 2, 15);
      if (k > 0) { const turn = pick(r, ["left", "right"]); h = (h + (turn === "right" ? 1 : 3)) % 4; legs.push(`turns ${turn} and walks ${len} m`); } else legs.push(`walks ${len} m towards ${DIRN[h]}`);
      x += [0, 1, 0, -1][h] * len; y += [1, 0, -1, 0][h] * len; trace.push(`${len} m ${DIRN[h]} → (${x}, ${y})`);
    }
    const d2 = x * x + y * y, d = Math.round(Math.sqrt(d2));
    if (d2 === 0 || d * d !== d2) continue;
    if ((x === 0 || y === 0) && r() < 0.7 && tries < 500) continue;
    return { text: legs.join(", then "), x, y, h, trace };
  }
  return { text: "walks 10 m towards North, then turns right and walks 6 m, then turns right and walks 18 m", x: 6, y: -8, h: 2, trace: ["10 m North → (0, 10)", "6 m East → (6, 10)", "18 m South → (6, -8)"] };
}
function directionQs(r: RNG, names: string[]): Question[] {
  const w1 = walk(r); const d = Math.round(Math.sqrt(w1.x * w1.x + w1.y * w1.y)); const dir = dirName(w1.x, w1.y); const n1 = names[0];
  const opp = dirName(-w1.x, -w1.y); const rot = dirName(-w1.y, w1.x);
  const q1 = finalize(r, RB("Direction Sense", "Moderate", `Starting from point P, ${n1} ${w1.text}. How far and in which direction is ${n1} now from point P?`, [`Take P as (0, 0): ${w1.trace.join("; ")}.`, `Distance = √(${w1.x * w1.x} + ${w1.y * w1.y}) = ${d} m, towards ${dir}.`], "Net the north-south and east-west moves separately, then look for a 3-4-5 type triple.", "Turning the wrong way after a right or left turn."), `${d} m ${dir}`, [`${d} m ${opp}`, `${Math.abs(w1.x) + Math.abs(w1.y)} m ${dir}`, `${d} m ${rot}`, `${d + 2} m ${dir}`]);
  const w2 = walk(r); const n2 = names[1];
  let q2: Question;
  if (r() < 0.5) {
    const c = dirName(-w2.x, -w2.y);
    q2 = finalize(r, RB("Direction Sense", "Moderate", `Starting from point Q, ${n2} ${w2.text}. In which direction is point Q with respect to ${n2}'s final position?`, [`Take Q as (0, 0): ${w2.trace.join("; ")}.`, `${n2} is ${dirName(w2.x, w2.y)} of Q, so Q is ${c} of ${n2}.`], "The direction of the start from the end is the opposite of the end from the start.", "Giving the direction of the final point from the start instead."), c, [dirName(w2.x, w2.y), ...shuffle(r, DIR8)]);
  } else {
    q2 = finalize(r, RB("Direction Sense", "Easy", `Starting from point Q, ${n2} ${w2.text}. In which direction is ${n2} facing at the end?`, [`Track only the heading: ${w2.trace.map((s: string) => s.split(" → ")[0]).join(", ")}.`, `Final heading: ${DIRN[w2.h]}.`], "Right turn = clockwise by 90°, left turn = anticlockwise by 90°.", "Mixing up clockwise and anticlockwise turns."), DIRN[w2.h], [...DIRN, "Cannot be determined"]);
  }
  return [q1, q2];
}
const RELS = ["Brother", "Son", "Cousin", "Uncle", "Father", "Nephew", "Grandmother", "Mother", "Aunt", "Sister", "Wife", "Sister-in-law", "Son-in-law", "Brother-in-law", "Grandfather", "Granddaughter", "Daughter", "Niece"];
function bloodQ(r: RNG, k: number): Question {
  const [m1, m2, m3] = shuffle(r, MALES).slice(0, 3); const [f1, f2, f3] = shuffle(r, FEMALES).slice(0, 3);
  const T: { q: string; a: string; e: string[] }[] = [
    { q: `Pointing to a man, ${f1} said, "He is the son of the only son of my paternal grandfather." How is the man related to ${f1}?`, a: "Brother", e: [`The only son of ${f1}'s paternal grandfather is ${f1}'s father.`, `The man is the son of ${f1}'s father, so he is her brother.`] },
    { q: `${m1} is the brother of ${f1}. ${f1} is the daughter of ${f2}. ${m2} is the husband of ${f2}. How is ${m1} related to ${m2}?`, a: "Son", e: [`${f2} is the mother of ${f1} and ${m1}; ${m2}, her husband, is their father.`, `So ${m1} is the son of ${m2}.`] },
    { q: `${f1} is the mother of ${f2}. ${f2} is the sister of ${m1}. ${m1} is the father of ${m2}. How is ${f1} related to ${m2}?`, a: "Grandmother", e: [`${f1} is the mother of ${f2} and ${m1}.`, `${m1} is ${m2}'s father, so ${f1} is ${m2}'s grandmother.`] },
    { q: `${m1} is the son of ${f1}. ${f1} is the sister of ${m2}. ${m2} is the father of ${m3}. How is ${m1} related to ${m3}?`, a: "Cousin", e: [`${m1}'s mother ${f1} and ${m3}'s father ${m2} are siblings.`, `So ${m1} and ${m3} are cousins.`] },
    { q: `Introducing a woman, ${m1} said, "She is the wife of the only son of my mother." How is the woman related to ${m1}?`, a: "Wife", e: [`The only son of ${m1}'s mother is ${m1} himself.`, `So the woman is ${m1}'s wife.`] },
    { q: `${m1} is the father of ${f1}. ${f1} is the wife of ${m2}. How is ${m2} related to ${m1}?`, a: "Son-in-law", e: [`${m2} is the husband of ${m1}'s daughter.`, `So ${m2} is ${m1}'s son-in-law.`] },
    { q: `${f3} is the sister of ${m1}. ${m1} is the son of ${m2}. ${m2} is the only son of ${f2}. How is ${f3} related to ${f2}?`, a: "Granddaughter", e: [`${m2} is ${f2}'s son and the father of ${m1} and ${f3}.`, `So ${f3} is ${f2}'s granddaughter.`] },
  ];
  const tpl = T[k % T.length];
  return finalize(r, RB("Blood Relation", "Moderate", tpl.q, tpl.e, "Draw a quick family tree with + for male and − for female; decode 'only son' first.", "Assuming a gender that the question never states, or treating 'only son' as a different person."), tpl.a, shuffle(r, RELS.filter((x: string) => x !== tpl.a)));
}
const PUZZLE_KINDS = ["row", "floor", "week", "circle", "box", "month"];
function buildReasoning(r: RNG, kinds: string[]): Question[] {
  const letters = shuffle(r, "ABCDEFGHJKLMNPQRSTUVWXYZ".split(""));
  const pool = shuffle(r, NAMES);
  let li = 0, pi = 0;
  const L = (k: number): string[] => { const x = letters.slice(li, li + k).sort(); li += k; if (li > 16) li = 0; return x; };
  const P = (k: number): string[] => { const x = pool.slice(pi, pi + k).sort(); pi += k; if (pi > 16) pi = 0; return x; };
  const puzzle = (kind: string): Question[] => {
    if (kind === "row") return puzzleQs(r, "row", L(8), "Linear Seating");
    if (kind === "floor") return puzzleQs(r, "floor", P(7), "Floor Puzzle");
    if (kind === "week") return puzzleQs(r, "week", P(7), "Scheduling Puzzle");
    if (kind === "circle") return puzzleQs2(r, "circle", L(8), "Circular Seating");
    if (kind === "box") return puzzleQs2(r, "box", L(7), "Box Stack Puzzle");
    return puzzleQs2(r, "month", P(6), "Month-Date Puzzle");
  };
  const pz = kinds.map(puzzle);
  const misc = (() => { const bi = ri(r, 0, 6); const dn = shuffle(r, NAMES).slice(0, 2); return [bloodQ(r, bi), bloodQ(r, bi + ri(r, 1, 6)), ...directionQs(r, dn), pick(r, codingQs(r))]; })();
  return [...ineqQs(r), ...pz[0], ...sylQs(r), ...pz[1], ...alphaQs(r), ...pz[2], ...misc, ...pz[3]];
}

/** Daily shifts (1–3) rotate puzzle engines and DI types deterministically from the date; fresh tests (4+) pick from their own seed. */
function paperPlan(dateKey: string, testNo: number, dayHash: number): { kinds: string[]; diType: string } {
  const seed = hashStr(`${dateKey}#${testNo}`);
  const r = mulberry32(seed ^ 0x5151);
  if (testNo <= 3) {
    const dayOrder = shuffle(mulberry32(dayHash ^ 0x777), PUZZLE_KINDS);
    const kinds = [0, 1, 2, 3].map((k: number) => dayOrder[(2 * (testNo - 1) + k) % 6]);
    const dayIdx = Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / 86400000);
    return { kinds: shuffle(r, kinds), diType: DI_TYPES[(((dayIdx * 3 + testNo - 1) % 4) + 4) % 4] };
  }
  return { kinds: shuffle(r, PUZZLE_KINDS).slice(0, 4), diType: pick(r, DI_TYPES) };
}
function generatePaper(dateKey: string, testNo: number, dayHash: number): Question[] {
  const seed = hashStr(`${dateKey}#${testNo}`);
  const plan = paperPlan(dateKey, testNo, dayHash);
  return [...buildReasoning(mulberry32(seed ^ 0x3333), plan.kinds), ...buildNumerical(mulberry32(seed ^ 0x2222), plan.diType)];
}

// ================= analysis =================
interface QR { idx: number; q: Question; num: number; yours: number | null; status: QStatus; time: number; marked: boolean; visited: boolean }
interface GroupStat { label: string; section: SectionKey; total: number; correct: number; wrong: number; skipped: number; time: number }
function groupBy(res: QR[], keyFn: (x: QR) => string): GroupStat[] {
  const out: GroupStat[] = [];
  res.forEach((x: QR) => {
    const k = keyFn(x); let g = out.find((y: GroupStat) => y.label === k);
    if (!g) { g = { label: k, section: x.q.section, total: 0, correct: 0, wrong: 0, skipped: 0, time: 0 }; out.push(g); }
    g.total += 1; g.time += x.time;
    if (x.status === "correct") g.correct += 1; else if (x.status === "wrong") g.wrong += 1; else g.skipped += 1;
  });
  return out;
}
const netOf = (g: { correct: number; wrong: number }): number => g.correct - 0.25 * g.wrong;
const accOf = (g: { correct: number; wrong: number }): number => (g.correct + g.wrong ? (g.correct / (g.correct + g.wrong)) * 100 : 0);
function fmtClock(s: number): string { const v = Math.max(0, s); return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`; }
function fmtDur(s: number): string { const m = Math.floor(s / 60), x = s % 60; return m ? `${m}m ${x}s` : `${x}s`; }
function estPercentile(frac: number): number {
  const pts: number[][] = [[0, 5], [0.3, 30], [0.45, 55], [0.6, 75], [0.72, 88], [0.78, 93], [0.85, 97], [0.92, 99], [1, 99.9]];
  const f = Math.max(0, Math.min(1, frac));
  for (let i = 1; i < pts.length; i++) if (f <= pts[i][0]) return Math.round((pts[i - 1][1] + ((f - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0])) * (pts[i][1] - pts[i - 1][1])) * 10) / 10;
  return 99.9;
}
type Quad = "Fast & Accurate" | "Slow & Accurate" | "Fast & Guessy" | "Time Sink";
function quadOf(g: GroupStat): Quad | null {
  if (g.correct + g.wrong === 0) return null;
  const fast = g.time / g.total <= SEC_TARGET[g.section]; const acc = accOf(g) >= 80;
  return acc ? (fast ? "Fast & Accurate" : "Slow & Accurate") : fast ? "Fast & Guessy" : "Time Sink";
}
const QUAD_TONE: Record<Quad, Tone> = { "Fast & Accurate": "success", "Slow & Accurate": "warning", "Fast & Guessy": "danger", "Time Sink": "danger" };


export { generatePaper, paperPlan, spaceOf, PUZZLE_KINDS, DI_TYPES, SEC_TIME, SECTION_ORDER, SECTION_LABEL, FULL_COUNT, SEC_TARGET, SEC_LIMIT, LETTERS, SHIFTS, shiftName, groupBy, netOf, accOf, fmtNum, fmtClock, fmtDur, estPercentile, quadOf, hashStr, getPerms };
export type { Question, SectionKey, Difficulty, DataTable, QR, GroupStat, Quad, QStatus, Tone, Clue, PKind };
