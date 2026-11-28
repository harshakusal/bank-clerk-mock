import { generatePaper, paperPlan, PUZZLE_LOG, PUZZLE_KINDS, MOD_PUZZLE_KINDS, HARD_PUZZLE_KINDS, DI_TYPES, spaceOf, hashStr, PAPER_LEVELS, type Question, type PaperLevel } from '../src/gen/engine';

let failures = 0;
const fail = (msg: string) => { failures++; console.error('  ✗ ' + msg); };
const bad = /NaN|undefined|Infinity|null|\[object|0000000|9999999/;
const ALL_KINDS = [...new Set([...PUZZLE_KINDS, ...MOD_PUZZLE_KINDS, ...HARD_PUZZLE_KINDS])];
const ADV = ['floorflat', 'dualrow', 'boxcolor', 'mixedcircle', 'uncertain', 'compare2'];

const puzzleKindsSeen: Record<PaperLevel, Map<string, number>> = {
  Easy: new Map(), Moderate: new Map(), Hard: new Map(),
};
const diSeen: Record<PaperLevel, Map<string, number>> = {
  Easy: new Map(), Moderate: new Map(), Hard: new Map(),
};
let totalQ = 0, totalPuzzles = 0;
const sigs = new Set<string>();

function paperSig(qs: Question[]) {
  return qs.map((q) => q.question + q.options.join('|')).join('\n');
}

function checkPaper(qs: Question[], label: string, level: PaperLevel, strictLog = true) {
  const by: Record<string, number> = {};
  qs.forEach((q) => (by[q.section] = (by[q.section] || 0) + 1));
  if (qs.length !== 80) fail(`${label}: ${qs.length} questions (expected 80)`);
  if (by.Reasoning !== 40 || by.Numerical !== 40 || Object.keys(by).length !== 2) fail(`${label}: section split ${JSON.stringify(by)}`);
  if (qs.slice(0, 40).some((q) => q.section !== 'Reasoning')) fail(`${label}: Reasoning must come first`);
  const topics: Record<string, number> = {};
  qs.forEach((q, i) => {
    topics[q.topic] = (topics[q.topic] || 0) + 1;
    const tag = `${label} Q${i + 1} [${q.section}/${q.topic}${q.variant ? '/' + q.variant : ''}]`;
    if (q.options.length !== 5) fail(`${tag}: ${q.options.length} options`);
    if (q.options.some((o) => o == null || !String(o).trim())) fail(`${tag}: empty option ${JSON.stringify(q.options)}`);
    if (new Set(q.options.map((o) => String(o || '').trim())).size !== 5) fail(`${tag}: duplicate options ${JSON.stringify(q.options)}`);
    if (!(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 4)) fail(`${tag}: correctIndex ${q.correctIndex}`);
    const blob = [q.question, ...q.options, ...q.explanation, q.shortcut, q.commonTrap, q.passage || '', q.table ? JSON.stringify(q.table) : ''].join(' | ');
    const m = blob.match(bad);
    if (m) fail(`${tag}: glitch "${m[0]}" near ${blob.slice(Math.max(0, (m.index || 0) - 60), (m.index || 0) + 40)}`);
    if (/\\n/.test(blob)) fail(`${tag}: literal \\n in text`);
    if (!q.explanation.length || !q.shortcut || !q.commonTrap || !q.difficulty) fail(`${tag}: missing explanation/shortcut/trap/difficulty`);
    if (q.topic === 'Data Interpretation') {
      if (!q.variant || !DI_TYPES.includes(q.variant)) fail(`${tag}: unknown DI variant`);
      if (q.variant !== 'caselet' && (!q.table || q.table.chart !== q.variant)) fail(`${tag}: DI chart mismatch`);
      if (q.table) q.table.rows.forEach((row) => row.slice(1).forEach((c) => {
        if (c === '—' || c === '–' || c === '?' || c === 'NA') return;
        if (!/^\d+(\.\d+)?$/.test(c)) fail(`${tag}: non-integer DI cell ${c}`);
      }));
      if (q.variant === 'pie' && q.table) {
        const s = q.table.rows.reduce((a, r) => a + (r[1] === '—' || r[1] === '–' ? 0 : Number(r[1])), 0);
        const missing = q.table.rows.some((r) => r[1] === '—' || r[1] === '–');
        if (!missing && s !== 100) fail(`${tag}: pie shares sum to ${s}`);
      }
    }
  });
  const need: Record<string, number> = { Syllogism: 5, Inequality: 5, 'Alphanumeric Series': 5, 'Blood Relation': 2, 'Direction Sense': 2, 'Coding-Decoding': 1, 'Number Series': 5, 'Quadratic Equations': 5, 'Data Interpretation': 5 };
  for (const [t, n] of Object.entries(need)) if (topics[t] !== n) fail(`${label}: ${t} has ${topics[t] || 0} (expected ${n})`);
  const simp = (topics.Simplification || 0) + (topics.Approximation || 0);
  if (simp !== 15) fail(`${label}: Simplification+Approximation = ${simp} (expected ${15})`);
  const puzzleQs = qs.filter((q) => q.section === 'Reasoning' && q.variant && ALL_KINDS.includes(q.variant));
  if (puzzleQs.length !== 20) fail(`${label}: ${puzzleQs.length} puzzle questions (expected 20)`);
  const kinds = [...new Set(puzzleQs.map((q) => q.variant!))];
  if (kinds.length !== 4) fail(`${label}: ${kinds.length} distinct puzzle types (expected 4) — ${kinds.join(', ')}`);
  if (level === 'Moderate' && !kinds.some((k) => ADV.includes(k))) fail(`${label}: Moderate paper has no two-variable / advanced puzzle (${kinds.join(', ')})`);
  if (level === 'Hard' && kinds.some((k) => !HARD_PUZZLE_KINDS.includes(k))) fail(`${label}: Hard paper used a classic-only puzzle (${kinds.join(', ')})`);
  kinds.forEach((k) => puzzleKindsSeen[level].set(k, (puzzleKindsSeen[level].get(k) || 0) + 1));
  const di = qs.find((q) => q.topic === 'Data Interpretation')?.variant || '?';
  diSeen[level].set(di, (diSeen[level].get(di) || 0) + 1);
  if (strictLog && PUZZLE_LOG.length !== 4) fail(`${label}: expected 4 puzzle logs, got ${PUZZLE_LOG.length}`);
  for (const p of PUZZLE_LOG) {
    totalPuzzles++;
    let nSol: number;
    let match = true;
    if (p.solutions) {
      nSol = p.solutions();
    } else {
      const sols = spaceOf(p.kind, p.names.length).filter((perm) => p.clues.every((c) => c.ok(perm)));
      nSol = sols.length;
      if (nSol === 1 && sols[0].join() !== p.t.join()) match = false;
    }
    if (nSol !== 1) fail(`${label} ${p.kind} puzzle: ${nSol} solutions`);
    else if (!match) fail(`${label} ${p.kind} puzzle: solution mismatch`);
  }
  return { kinds, di, topics };
}

function meanExplSteps(qs: Question[]) {
  const rows = qs.filter((q) => q.section === 'Numerical' || q.topic === 'Inequality' || q.topic === 'Direction Sense' || q.topic === 'Coding-Decoding' || q.topic === 'Blood Relation');
  const lens = rows.map((q) => q.explanation.length);
  return lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
}

const dates = ['2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'];
const stepMeans: Record<PaperLevel, number[]> = { Easy: [], Moderate: [], Hard: [] };

for (const level of PAPER_LEVELS) {
  const levelSigs = new Set<string>();
  console.log(`\n=== ${level} ===`);
  for (const d of dates) {
    const dayKinds = new Set<string>();
    for (const shift of [1, 2, 3]) {
      PUZZLE_LOG.length = 0;
      const qs = generatePaper(d, shift, hashStr(d), level);
      const label = `${level} ${d} shift ${shift}`;
      const { kinds, di } = checkPaper(qs, label, level);
      kinds.forEach((k) => dayKinds.add(k));
      const sig = paperSig(qs);
      levelSigs.add(sig);
      sigs.add(level + '::' + sig);
      totalQ += qs.length;
      stepMeans[level].push(meanExplSteps(qs));
      console.log(`✓ ${label}: 80 Qs · puzzles: ${PUZZLE_LOG.map((p) => `${p.kind}(${p.clues.length} clues)`).join(', ')} · DI: ${di}`);
    }
    if (level === 'Easy' && dayKinds.size !== 6) fail(`${level} ${d}: the 3 shifts used only ${dayKinds.size}/6 puzzle engines (${[...dayKinds]})`);
    if (level === 'Hard' && dayKinds.size !== 6) fail(`${level} ${d}: the 3 shifts used only ${dayKinds.size}/6 hard engines (${[...dayKinds]})`);
  }
  if (levelSigs.size !== 12) fail(`${level}: daily papers not all distinct (${levelSigs.size}/12)`);

  const seq = dates.flatMap((d) => [1, 2, 3].map((s) => paperPlan(d, s, hashStr(d), level).diType));
  for (let i = 0; i + 4 <= seq.length; i++) if (new Set(seq.slice(i, i + 4)).size !== 4) fail(`${level} DI rotation window ${i} repeats: ${seq.slice(i, i + 4)}`);
  console.log(`  Daily DI rotation: ${seq.join(' → ')}`);

  for (let k = 0; k < 10; k++) {
    PUZZLE_LOG.length = 0;
    const d = '2026-12-' + String(1 + (k % 28)).padStart(2, '0');
    const qs = generatePaper(d, 4 + k, hashStr(d), level);
    checkPaper(qs, `${level} fresh #${k + 1} (${d})`, level);
    sigs.add(level + '::' + paperSig(qs));
    totalQ += qs.length;
    stepMeans[level].push(meanExplSteps(qs));
  }
}

// same date+shift must differ across levels
for (const d of dates) {
  const [e, m, h] = PAPER_LEVELS.map((lv) => paperSig(generatePaper(d, 1, hashStr(d), lv)));
  if (e === m) fail(`${d} shift 1: Easy and Moderate papers are identical`);
  if (m === h) fail(`${d} shift 1: Moderate and Hard papers are identical`);
  if (e === h) fail(`${d} shift 1: Easy and Hard papers are identical`);
}

// determinism
const a = generatePaper('2026-11-26', 2, hashStr('2026-11-26'), 'Hard').map((q) => q.question + q.options.join()).join();
const b = generatePaper('2026-11-26', 2, hashStr('2026-11-26'), 'Hard').map((q) => q.question + q.options.join()).join();
if (a !== b) fail('generator is not deterministic for same date+shift+level (Hard)');
const c = generatePaper('2026-11-26', 2, hashStr('2026-11-26'), 'Moderate').map((q) => q.question + q.options.join()).join();
if (a === c) fail('Hard and Moderate share the same paper for 2026-11-26 shift 2');

const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
const easySteps = avg(stepMeans.Easy);
const modSteps = avg(stepMeans.Moderate);
const hardSteps = avg(stepMeans.Hard);
console.log(`\nMean explanation steps (quant + misc reasoning): Easy ${easySteps.toFixed(2)} · Moderate ${modSteps.toFixed(2)} · Hard ${hardSteps.toFixed(2)}`);
if (!(hardSteps > easySteps + 0.15)) fail(`Hard is not clearly longer/harder than Easy by explanation-step count (${hardSteps.toFixed(2)} vs ${easySteps.toFixed(2)})`);
if (!(modSteps > easySteps)) fail(`Moderate is not above Easy by explanation-step count (${modSteps.toFixed(2)} vs ${easySteps.toFixed(2)})`);

for (const k of PUZZLE_KINDS) if (!puzzleKindsSeen.Easy.get(k)) fail(`Easy never exercised puzzle engine ${k}`);
for (const k of HARD_PUZZLE_KINDS) if (!puzzleKindsSeen.Hard.get(k)) fail(`Hard never exercised puzzle engine ${k}`);
for (const k of ['floorflat', 'dualrow', 'boxcolor']) if (!puzzleKindsSeen.Moderate.get(k)) fail(`Moderate never exercised advanced engine ${k}`);
for (const level of PAPER_LEVELS) {
  for (const t of DI_TYPES) if (!diSeen[level].get(t)) fail(`${level}: DI type ${t} never exercised`);
  console.log(`${level} puzzles: ${[...puzzleKindsSeen[level]].map(([k, v]) => `${k}×${v}`).join(', ')}`);
  console.log(`${level} DI: ${[...diSeen[level]].map(([k, v]) => `${k}×${v}`).join(', ')}`);
}

// print a few Hard samples for the report / self-review
console.log('\n===== SAMPLE HARD QUESTIONS =====');
PUZZLE_LOG.length = 0;
const sample = generatePaper('2026-11-28', 1, hashStr('2026-11-28'), 'Hard');
const picks: { title: string; q: Question }[] = [];
const want = ['Floor-Flat Puzzle', 'Circular Seating', 'Comparison Puzzle', 'Simplification', 'Quadratic Equations', 'Data Interpretation', 'Time & Work', 'Coding-Decoding', 'Blood Relation', 'Inequality'];
for (const topic of want) {
  const q = sample.find((x) => x.topic === topic && !picks.some((p) => p.q === x));
  if (q) picks.push({ title: topic, q });
}
// keep 5 diverse
picks.slice(0, 6).forEach(({ title, q }, i) => {
  const ans = q.options[q.correctIndex];
  console.log(`\n--- Hard sample ${i + 1}: ${title}${q.variant ? ' / ' + q.variant : ''} ---`);
  if (q.passageTitle) console.log(q.passageTitle);
  if (q.passage) console.log(q.passage.slice(0, 900));
  console.log('Q: ' + q.question);
  q.options.forEach((o, k) => console.log(`  ${'ABCDE'[k]}. ${o}`));
  console.log(`Answer: ${'ABCDE'[q.correctIndex]}. ${ans}`);
  console.log('Explanation: ' + q.explanation.join(' '));
});

console.log(`\nChecked ${totalQ} questions across ${sigs.size} distinct papers; ${totalPuzzles} puzzles uniqueness-checked.`);
if (failures) { console.error(`\nFAILED: ${failures} problem(s)`); process.exit(1); }
console.log('ALL CHECKS PASSED');
