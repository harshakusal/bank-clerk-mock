import { SECTION_ORDER, SECTION_LABEL, SEC_TARGET, groupBy, netOf, accOf, estPercentile, quadOf, fmtNum, type Question, type QR, type GroupStat, type SectionKey, type Quad } from './gen/engine';

export interface ExamResult {
  rows: QR[];
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  attempted: number;
  net: number;
  negLost: number;
  accuracy: number;
  timeSec: number;
  speed: number; // attempted per minute
  percentile: number;
  sections: GroupStat[];
  topics: GroupStat[];
}

export function computeResults(qs: Question[], answers: (number | null)[], times: number[], marked: boolean[], visited: boolean[]): ExamResult {
  const rows: QR[] = qs.map((q, i) => {
    const yours = answers[i];
    const status = yours === null || yours === undefined ? 'skipped' : yours === q.correctIndex ? 'correct' : 'wrong';
    return { idx: i, q, num: i + 1, yours: yours ?? null, status, time: times[i] || 0, marked: !!marked[i], visited: !!visited[i] };
  });
  const correct = rows.filter((r) => r.status === 'correct').length;
  const wrong = rows.filter((r) => r.status === 'wrong').length;
  const skipped = rows.length - correct - wrong;
  const attempted = correct + wrong;
  const net = netOf({ correct, wrong });
  const timeSec = rows.reduce((s, r) => s + r.time, 0);
  const sections = SECTION_ORDER.map((s) => groupBy(rows.filter((r) => r.q.section === s), () => s)[0]).filter(Boolean) as GroupStat[];
  const topics = groupBy(rows, (r) => r.q.topic);
  return {
    rows, total: rows.length, correct, wrong, skipped, attempted, net, negLost: wrong * 0.25,
    accuracy: accOf({ correct, wrong }), timeSec, speed: timeSec ? attempted / (timeSec / 60) : 0,
    percentile: estPercentile(net / Math.max(1, rows.length)), sections, topics,
  };
}

/** Indicative sectional cut-offs (IBPS/SBI Clerk Prelims recent trend, general category). */
export const SECTION_CUTOFF: Record<SectionKey, number> = { English: 8, Numerical: 9, Reasoning: 10 };
export const OVERALL_BAND = { low: 72, high: 78 };

export function readiness(net: number, total: number) {
  const scaled = (net / total) * 100;
  if (scaled >= OVERALL_BAND.high + 4) return { label: 'Safe zone: comfortably above the 72–78 cut-off band', tone: 'good' as const };
  if (scaled >= OVERALL_BAND.low) return { label: 'Borderline: inside the 72–78 cut-off band — push 5–8 more marks', tone: 'warn' as const };
  if (scaled >= 60) return { label: `Below cut-off by ~${fmtNum(OVERALL_BAND.low - scaled)} marks — reachable in 1–2 weeks of focused practice`, tone: 'warn' as const };
  return { label: `Far below the 72–78 band (need +${fmtNum(OVERALL_BAND.low - scaled)}) — rebuild basics and accuracy first`, tone: 'bad' as const };
}

const TOPIC_TIPS: Record<string, string> = {
  'Reading Comprehension': 'Read the questions before the passage; locate the keyword, then answer strictly from the text. Practise 2 passages daily with a 6-minute cap.',
  'Cloze Test': 'Read the full passage once before filling; check grammar (part of speech, preposition) before meaning.',
  'Error Spotting': 'Revise subject-verb agreement, tense consistency, prepositions (since/for), and pronoun cases. Do 20 sentences daily.',
  'Para Jumbles': 'Find the opener (no pronoun/connector) and the conclusion first; then link pronouns and connectors.',
  'Phrase Replacement': 'Check tense and idiomatic usage; eliminate options that change the meaning.',
  'Word Swap': 'Look for nouns/verbs that are in each other’s place; read the sentence after each swap.',
  'Misspelt Words': 'Revise a list of 150 commonly misspelt words (accommodation, committee, occurrence...).',
  Simplification: 'Memorise squares to 30, cubes to 20, and percentage–fraction equivalents; do 25 questions in 10 minutes daily.',
  Approximation: 'Round every number first and use option gaps; never do exact decimals.',
  'Number Series': 'Check differences → ratios → ×n±k → squares/cubes/primes in that order; solve 15 series daily.',
  'Quadratic Equations': 'Use the sign rule and factor pairs of a×c; practise 20 equations with non-unit coefficients.',
  'Data Interpretation': 'Approximate totals using a working mean; percent more/less is always on the base value.',
  'Profit & Loss': 'Use CP = 100 method and multiplier chains (×1.2 × 0.9).',
  'Interest (SI & CI)': 'Remember CI–SI for 2 years = P(r/100)²; use successive % for CI.',
  'Time & Work': 'Use the LCM (total work) method; efficiency = work per day.',
  'Speed, Time & Distance': 'Relative speed: add for opposite, subtract for same direction; convert km/h × 5/18.',
  'Boats & Streams': 'Downstream = u + v, upstream = u − v; speeds of boat and stream = half sum / half difference.',
  Partnership: 'Profit share ∝ capital × time; count months carefully.',
  'Ratio & Proportion': 'Convert ratios to units and scale with a common multiplier.',
  Ages: 'Use ratio units and add the same years to both.',
  Mixtures: 'Keep the unchanged component constant while forming the new ratio.',
  Mensuration: 'Revise formulas for circle, rectangle, cylinder, cone; use π = 22/7 with multiples of 7.',
  Averages: 'Use deviations from an assumed mean.',
  Percentages: 'Chain successive percentage changes as multipliers.',
  'Linear Seating': 'Draw 8 seats, fix the definite clues first, then branch into at most 2 cases.',
  'Floor Puzzle': 'Draw floors bottom = 1; fix absolute floors, then “immediately above/below” clues.',
  'Scheduling Puzzle': 'Write days 1–7 in a column; treat “before/after” as smaller/larger numbers.',
  Syllogism: 'Draw minimum-overlap Venn diagrams; learn “Only a few” = Some + Some not, and either-or pairs.',
  Inequality: 'Join segments at the common letter; a conclusion holds only if all signs point the same way.',
  'Alphanumeric Series': 'Convert “from the right” using (N + 1 − k); tick matches in one left-to-right scan.',
  'Blood Relation': 'Draw a family tree with gender symbols; decode “only son/daughter” first.',
  'Direction Sense': 'Track (x, y) after every leg; right = clockwise turn.',
  'Coding-Decoding': 'Check letter shifts of the first two letters; memorise EJOTY positions.',
};
export const tipFor = (topic: string) => TOPIC_TIPS[topic] || 'Revise the concept and practise 15 timed questions.';

export interface Insights {
  strengths: string[];
  fixes: { topic: string; why: string; tip: string }[];
  quadrants: { label: string; quad: Quad; acc: number; avg: number }[];
  patterns: string[];
  nextTest: string[];
  roadmap: { day: string; plan: string }[];
}

export function buildInsights(res: ExamResult, qs: Question[]): Insights {
  const topics = res.topics.slice();
  const strengths = topics
    .filter((t) => t.correct + t.wrong >= 2 && accOf(t) >= 80 && t.correct >= Math.ceil(t.total * 0.6))
    .sort((a, b) => accOf(b) - accOf(a))
    .slice(0, 5)
    .map((t) => `${t.label} — ${t.correct}/${t.total} correct (${fmtNum(accOf(t))}% accuracy)`);
  const lost = (t: GroupStat) => t.total - netOf(t);
  const fixes = topics
    .filter((t) => netOf(t) < t.total * 0.6)
    .sort((a, b) => lost(b) - lost(a))
    .slice(0, 5)
    .map((t) => ({
      topic: t.label,
      why: `${t.correct}/${t.total} correct, ${t.wrong} wrong, ${t.skipped} skipped — ${fmtNum(lost(t))} marks left on the table`,
      tip: tipFor(t.label),
    }));
  const quadrants = topics
    .map((t) => ({ t, q: quadOf(t) }))
    .filter((x) => x.q)
    .map((x) => ({ label: x.t.label, quad: x.q as Quad, acc: accOf(x.t), avg: x.t.time / x.t.total }));

  const patterns: string[] = [];
  const wrongRows = res.rows.filter((r) => r.status === 'wrong');
  const fastWrong = wrongRows.filter((r) => r.time > 0 && r.time < SEC_TARGET[r.q.section] * 0.4).length;
  const slowRows = res.rows.filter((r) => r.time > SEC_TARGET[r.q.section] * 2.5);
  const markedWrong = res.rows.filter((r) => r.marked && r.status === 'wrong').length;
  const hardWrong = wrongRows.filter((r) => r.q.difficulty === 'Tricky').length;
  const easyWrong = wrongRows.filter((r) => r.q.difficulty === 'Easy').length;
  if (fastWrong >= 3) patterns.push(`${fastWrong} wrong answers were given in under ${Math.round(SEC_TARGET.Numerical * 0.4)} seconds — that is guessing/rushing; read the full question before marking.`);
  if (slowRows.length >= 3) patterns.push(`${slowRows.length} questions took more than 2.5× the target time (e.g. Q${slowRows.slice(0, 3).map((r) => r.num).join(', Q')}). Use the 2-pass strategy: skip anything that is not clear in 40 seconds.`);
  if (res.wrong > 0 && res.negLost >= 3) patterns.push(`Negative marking cost you ${fmtNum(res.negLost)} marks (${res.wrong} wrong). Halving your wrong answers alone would save ${fmtNum(res.negLost / 2)} marks of penalty.`);
  if (easyWrong >= 3) patterns.push(`${easyWrong} Easy-level questions went wrong — these are silly mistakes; re-check calculations and option letters.`);
  if (hardWrong >= 3) patterns.push(`${hardWrong} Tricky questions went wrong — attempt them only in the second pass after the sure-shot ones.`);
  if (markedWrong >= 2) patterns.push(`${markedWrong} answers marked for review turned out wrong — when unsure, your first instinct was weak; revisit concepts rather than guessing.`);
  if (res.skipped > 30) patterns.push(`${res.skipped} questions were skipped. Clerk cut-offs need ~75 attempts with 90%+ accuracy — increase attempts in your strong topics first.`);
  for (const s of res.sections) {
    const cut = SECTION_CUTOFF[s.label as SectionKey];
    if (netOf(s) < cut) patterns.push(`${SECTION_LABEL[s.label as SectionKey]} net ${fmtNum(netOf(s))} is below the typical sectional cut-off (~${cut}) — sectional cut-offs can eliminate you even with a good total.`);
  }
  if (!patterns.length) patterns.push('No major error pattern detected — keep your current approach and increase attempts gradually.');

  const weakest = fixes.map((f) => f.topic);
  const secByNet = res.sections.slice().sort((a, b) => netOf(a) / a.total - netOf(b) / b.total);
  const weakSec = secByNet[0]?.label as SectionKey | undefined;
  const nextTest: string[] = [
    'English (20 min): Cloze, Error Spotting, Phrase Replacement first (~8 min), then Para Jumbles, then RC last.',
    'Numerical (20 min): Simplification/Approximation (6 min) → Quadratics (3 min) → Series (3 min) → DI → Arithmetic.',
    'Reasoning (20 min): Inequality, Syllogism, Alphanumeric, Coding, Direction, Blood Relation first (~9 min), then the 3 puzzles (choose the easiest first).',
    `Target for the next test: ${Math.min(100, Math.round(res.attempted + 6))} attempts with ≥ ${Math.max(85, Math.round(res.accuracy) + 3)}% accuracy.`,
  ];
  if (weakSec) nextTest.push(`Give the first 2 minutes of ${SECTION_LABEL[weakSec]} to its easiest question types to secure the sectional cut-off.`);

  const w = (i: number) => weakest[i % Math.max(1, weakest.length)] || ['Simplification', 'Puzzles', 'Error Spotting'][i % 3];
  const roadmap = [
    { day: 'Day 1', plan: `Concept repair: ${w(0)} — ${tipFor(w(0))}` },
    { day: 'Day 2', plan: `Concept repair: ${w(1)} — ${tipFor(w(1))}` },
    { day: 'Day 3', plan: 'Speed day: 30 simplification + 15 approximation + 15 series in 25 min; 3 puzzles in 15 min.' },
    { day: 'Day 4', plan: `Concept repair: ${w(2)}. Plus 2 RC passages and 20 error-spotting sentences.` },
    { day: 'Day 5', plan: 'Take all 3 daily mocks on this platform; analyse every wrong answer for 30 minutes.' },
    { day: 'Day 6', plan: 'Sectional drills: 3 × 20-min sections at full exam pressure; retry wrong & skipped from earlier mocks.' },
    { day: 'Day 7', plan: 'Full mock + revision of formula sheet, idioms list and syllogism rules. Rest well.' },
  ];
  void qs;
  return { strengths, fixes, quadrants, patterns, nextTest, roadmap };
}
