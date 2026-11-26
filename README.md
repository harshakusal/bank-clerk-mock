# IBPS RRB Clerk Prelims Mock Exam (Office Assistant – Multipurpose)

Live: https://harshakusal.github.io/bank-clerk-mock/

A fast static web app that recreates the **IBPS RRB Clerk Preliminary CBT**:

- **80 questions · 80 marks · 45 minutes · 5 options (A–E) · +1 / −0.25**
- **Reasoning Ability** — 40 Qs, 25 min: 4 puzzles of 5 Qs each (picked from 6 solver-verified engines: linear row, floor, week, circular table, box stack, month-date), Syllogism (incl. "Only a few" and possibility), multi-segment Inequalities, Alphanumeric-Symbol Series, Blood Relations, Direction Sense, Coding-Decoding
- **Numerical Ability** — 40 Qs, 20 min: 15 Simplification/Approximation, 5 Number Series (3 missing + 2 wrong), 5 Quadratic Equations, 5 Data Interpretation (rotating Table+Bar / Line chart / Pie chart / Caselet), 10 Arithmetic word problems
- Strict Real Exam mode (sectional timers, auto-advance, Submit Section Early) or Practice / Free Switch mode
- 3 daily tests (Morning / Afternoon / Evening, seeded by date + shift) + unlimited Generate New Test
- Authentic CBT UI: 5-state palette, Question Paper popup, A− / A / A+ text size, keyboard shortcuts (1–5 / A–E, Enter, M, Shift+C, ← →)
- Report: scorecard, Safe Zone (≥ 71) / Borderline (64–70.75) / Needs Work (< 64) readiness, sectional qualifying check, topic breakdown, speed-vs-accuracy quadrant, mistake patterns, 7-day plan, full corrections, one-click Print / Save as PDF
- Progress & Analytics: score + accuracy trend, cross-test topic mastery matrix, personal best, average, questions solved, daily streak, JSON export / import (all in `localStorage`)

## Develop

```bash
npm install
npm run dev
npm run verify   # 12 daily papers (4 days × 3 shifts) + 30 fresh papers: counts, options, glitches, unique puzzle solutions, DI types
npm run build
bash scripts/deploy.sh   # verify + build, then publish dist/ to gh-pages
```
