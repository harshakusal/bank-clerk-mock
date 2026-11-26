import { generatePaper, PUZZLE_LOG, getPerms, hashStr, type Question } from '../src/gen/engine';

const dates = ['2026-11-26', '2026-11-27'];
let failures = 0;
const fail = (msg: string) => { failures++; console.error('  ✗ ' + msg); };
const bad = /NaN|undefined|Infinity|null|\[object|0000000|9999999/;
const paperSigs = new Set<string>();
let totalQ = 0, totalPuzzles = 0;

for (const d of dates) {
  for (const shift of [1, 2, 3]) {
    PUZZLE_LOG.length = 0;
    const qs: Question[] = generatePaper(d, shift, hashStr(d));
    const label = `${d} shift ${shift}`;
    const by = { English: 0, Numerical: 0, Reasoning: 0 } as Record<string, number>;
    qs.forEach((q) => (by[q.section] = (by[q.section] || 0) + 1));
    if (qs.length !== 100) fail(`${label}: ${qs.length} questions`);
    if (by.English !== 30 || by.Numerical !== 35 || by.Reasoning !== 35) fail(`${label}: section split ${JSON.stringify(by)}`);
    qs.forEach((q, i) => {
      const tag = `${label} Q${i + 1} [${q.section}/${q.topic}]`;
      if (q.options.length !== 5) fail(`${tag}: ${q.options.length} options`);
      if (new Set(q.options.map((o) => o.trim())).size !== q.options.length) fail(`${tag}: duplicate options ${JSON.stringify(q.options)}`);
      if (q.options.some((o) => !o || !o.trim())) fail(`${tag}: empty option`);
      if (!(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 4)) fail(`${tag}: correctIndex ${q.correctIndex}`);
      const blob = [q.question, ...q.options, ...q.explanation, q.shortcut, q.commonTrap, q.passage || '', q.table ? JSON.stringify(q.table) : ''].join(' | ');
      const m = blob.match(bad);
      if (m) fail(`${tag}: glitch "${m[0]}" in ${blob.slice(Math.max(0, (m.index || 0) - 60), (m.index || 0) + 40)}`);
      if (!q.explanation.length || !q.shortcut || !q.commonTrap || !q.difficulty) fail(`${tag}: missing explanation/shortcut/trap/difficulty`);
    });
    // puzzles: brute-force uniqueness
    if (PUZZLE_LOG.length !== 3) fail(`${label}: expected 3 puzzles, got ${PUZZLE_LOG.length}`);
    for (const p of PUZZLE_LOG) {
      totalPuzzles++;
      const sols = getPerms(p.names.length).filter((perm) => p.clues.every((c) => c.ok(perm)));
      if (sols.length !== 1) fail(`${label} ${p.kind} puzzle: ${sols.length} solutions`);
      else if (sols[0].join() !== p.t.join()) fail(`${label} ${p.kind} puzzle: solution mismatch`);
    }
    paperSigs.add(qs.map((q) => q.question).join('\n'));
    totalQ += qs.length;
    const kinds = PUZZLE_LOG.map((p) => `${p.kind}(${p.clues.length} clues)`).join(', ');
    console.log(`✓ ${label}: ${qs.length} Qs (E${by.English}/N${by.Numerical}/R${by.Reasoning}); puzzles: ${kinds}`);
  }
}
if (paperSigs.size !== 6) fail(`papers not all distinct (${paperSigs.size}/6)`);
// determinism
const a = generatePaper('2026-11-26', 2, hashStr('2026-11-26')).map((q) => q.question + q.options.join()).join();
const b = generatePaper('2026-11-26', 2, hashStr('2026-11-26')).map((q) => q.question + q.options.join()).join();
if (a !== b) fail('generator is not deterministic for same date+shift');
// stress: 60 extra fresh papers
let stress = 0;
for (let k = 0; k < 60; k++) {
  PUZZLE_LOG.length = 0;
  const qs = generatePaper('2026-12-' + String(1 + (k % 28)).padStart(2, '0'), 4 + k, 12345 + k);
  for (const q of qs) {
    if (q.options.length !== 5 || new Set(q.options).size !== 5 || q.correctIndex < 0 || q.correctIndex > 4) { stress++; if (stress < 6) console.error('  stress option issue:', q.topic, q.options); }
    const blob = [q.question, ...q.options, ...q.explanation].join(' ');
    if (bad.test(blob)) { stress++; if (stress < 6) console.error('  stress glitch:', q.topic, blob.slice(0, 200)); }
  }
  for (const p of PUZZLE_LOG) if (getPerms(p.names.length).filter((perm) => p.clues.every((c) => c.ok(perm))).length !== 1) stress++;
}
if (stress) fail(`stress test (60 fresh papers): ${stress} issues`);
console.log(`\nChecked ${totalQ} questions across ${paperSigs.size} distinct papers, ${totalPuzzles} puzzles brute-force verified unique; stress: 60 fresh papers, ${stress} issues.`);
if (failures) { console.error(`\nFAILED: ${failures} problem(s)`); process.exit(1); }
console.log('ALL CHECKS PASSED');
