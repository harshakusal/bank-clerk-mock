import { generatePaper, paperPlan, PUZZLE_LOG, PUZZLE_KINDS, DI_TYPES, spaceOf, hashStr, type Question } from '../src/gen/engine';

let failures = 0;
const fail = (msg: string) => { failures++; console.error('  ✗ ' + msg); };
const bad = /NaN|undefined|Infinity|null|\[object|0000000|9999999/;
const sigs = new Set<string>();
const puzzleKindsSeen = new Map<string, number>();
const diSeen = new Map<string, number>();
let totalQ = 0, totalPuzzles = 0;

function checkPaper(qs: Question[], label: string, strictLog = true) {
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
    if (new Set(q.options.map((o) => o.trim())).size !== 5) fail(`${tag}: duplicate options ${JSON.stringify(q.options)}`);
    if (q.options.some((o) => !o || !o.trim())) fail(`${tag}: empty option`);
    if (!(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 4)) fail(`${tag}: correctIndex ${q.correctIndex}`);
    const blob = [q.question, ...q.options, ...q.explanation, q.shortcut, q.commonTrap, q.passage || '', q.table ? JSON.stringify(q.table) : ''].join(' | ');
    const m = blob.match(bad);
    if (m) fail(`${tag}: glitch "${m[0]}" near ${blob.slice(Math.max(0, (m.index || 0) - 60), (m.index || 0) + 40)}`);
    if (/\\n/.test(blob)) fail(`${tag}: literal \\n in text`);
    if (!q.explanation.length || !q.shortcut || !q.commonTrap || !q.difficulty) fail(`${tag}: missing explanation/shortcut/trap/difficulty`);
    if (q.topic === 'Data Interpretation') {
      if (!q.variant || !DI_TYPES.includes(q.variant)) fail(`${tag}: unknown DI variant`);
      if (q.variant !== 'caselet' && (!q.table || q.table.chart !== q.variant)) fail(`${tag}: DI chart mismatch`);
      if (q.table) q.table.rows.forEach((row) => row.slice(1).forEach((c) => { if (!/^\d+$/.test(c)) fail(`${tag}: non-integer DI cell ${c}`); }));
      if (q.variant === 'pie' && q.table) { const s = q.table.rows.reduce((a, r) => a + Number(r[1]), 0); if (s !== 100) fail(`${tag}: pie shares sum to ${s}`); }
    }
  });
  const need: Record<string, number> = { Syllogism: 5, Inequality: 5, 'Alphanumeric Series': 5, 'Blood Relation': 2, 'Direction Sense': 2, 'Coding-Decoding': 1, 'Number Series': 5, 'Quadratic Equations': 5, 'Data Interpretation': 5 };
  for (const [t, n] of Object.entries(need)) if (topics[t] !== n) fail(`${label}: ${t} has ${topics[t] || 0} (expected ${n})`);
  const simp = (topics.Simplification || 0) + (topics.Approximation || 0);
  if (simp !== 15) fail(`${label}: Simplification+Approximation = ${simp} (expected 15)`);
  const puzzleQs = qs.filter((q) => q.section === 'Reasoning' && q.variant && PUZZLE_KINDS.includes(q.variant));
  if (puzzleQs.length !== 20) fail(`${label}: ${puzzleQs.length} puzzle questions (expected 20)`);
  const kinds = [...new Set(puzzleQs.map((q) => q.variant!))];
  if (kinds.length !== 4) fail(`${label}: ${kinds.length} distinct puzzle types (expected 4)`);
  kinds.forEach((k) => puzzleKindsSeen.set(k, (puzzleKindsSeen.get(k) || 0) + 1));
  const di = qs.find((q) => q.topic === 'Data Interpretation')?.variant || '?';
  diSeen.set(di, (diSeen.get(di) || 0) + 1);
  if (strictLog && PUZZLE_LOG.length !== 4) fail(`${label}: expected 4 puzzle logs, got ${PUZZLE_LOG.length}`);
  for (const p of PUZZLE_LOG) {
    totalPuzzles++;
    const sols = spaceOf(p.kind, p.names.length).filter((perm) => p.clues.every((c) => c.ok(perm)));
    if (sols.length !== 1) fail(`${label} ${p.kind} puzzle: ${sols.length} solutions`);
    else if (sols[0].join() !== p.t.join()) fail(`${label} ${p.kind} puzzle: solution mismatch`);
  }
  return { kinds, di };
}

const dates = ['2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'];
for (const d of dates) {
  const dayKinds = new Set<string>();
  for (const shift of [1, 2, 3]) {
    PUZZLE_LOG.length = 0;
    const qs = generatePaper(d, shift, hashStr(d));
    const label = `${d} shift ${shift}`;
    const { kinds, di } = checkPaper(qs, label);
    kinds.forEach((k) => dayKinds.add(k));
    sigs.add(qs.map((q) => q.question + q.options.join('|')).join('\n'));
    totalQ += qs.length;
    console.log(`✓ ${label}: 80 Qs (R40/N40) · puzzles: ${PUZZLE_LOG.map((p) => `${p.kind}(${p.clues.length} clues)`).join(', ')} · DI: ${di}`);
  }
  if (dayKinds.size !== 6) fail(`${d}: the 3 shifts used only ${dayKinds.size}/6 puzzle engines`);
}
if (sigs.size !== 12) fail(`daily papers not all distinct (${sigs.size}/12)`);
// DI rotation: within 4 consecutive daily tests all 4 DI types should appear
const seq = dates.flatMap((d) => [1, 2, 3].map((s) => paperPlan(d, s, hashStr(d)).diType));
for (let i = 0; i + 4 <= seq.length; i++) if (new Set(seq.slice(i, i + 4)).size !== 4) fail(`DI rotation window ${i} repeats: ${seq.slice(i, i + 4)}`);
// determinism
const a = generatePaper('2026-11-26', 2, hashStr('2026-11-26')).map((q) => q.question + q.options.join()).join();
const b = generatePaper('2026-11-26', 2, hashStr('2026-11-26')).map((q) => q.question + q.options.join()).join();
if (a !== b) fail('generator is not deterministic for same date+shift');
// fresh papers
for (let k = 0; k < 30; k++) {
  PUZZLE_LOG.length = 0;
  const d = '2026-12-' + String(1 + (k % 28)).padStart(2, '0');
  const qs = generatePaper(d, 4 + k, hashStr(d));
  checkPaper(qs, `fresh #${k + 1} (${d})`);
  sigs.add(qs.map((q) => q.question).join('\n'));
  totalQ += qs.length;
}
for (const k of PUZZLE_KINDS) if (!puzzleKindsSeen.get(k)) fail(`puzzle engine ${k} never exercised`);
for (const t of DI_TYPES) if (!diSeen.get(t)) fail(`DI type ${t} never exercised`);
console.log(`\nPuzzle engines exercised: ${[...puzzleKindsSeen].map(([k, v]) => `${k}×${v}`).join(', ')}`);
console.log(`DI types exercised: ${[...diSeen].map(([k, v]) => `${k}×${v}`).join(', ')}`);
console.log(`Daily DI rotation: ${seq.join(' → ')}`);
console.log(`Checked ${totalQ} questions in ${sigs.size} distinct papers (12 daily + 30 fresh); ${totalPuzzles} puzzles brute-force verified unique.`);
if (failures) { console.error(`\nFAILED: ${failures} problem(s)`); process.exit(1); }
console.log('ALL CHECKS PASSED');
