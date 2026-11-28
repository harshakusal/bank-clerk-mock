# IBPS RRB Clerk Prelims Mock Exam (Office Assistant – Multipurpose)

Live: https://harshakusal.github.io/bank-clerk-mock/

A fast static web app that recreates the **IBPS RRB Clerk Preliminary CBT**:

- **80 questions · 80 marks · 45 minutes · 5 options (A–E) · +1 / −0.25**
- **Reasoning Ability** — 40 Qs, 25 min: 4 puzzles of 5 Qs each, Syllogism (incl. "Only a few" and possibility), Inequalities, Alphanumeric-Symbol Series, Blood Relations, Direction Sense, Coding-Decoding
- **Numerical Ability** — 40 Qs, 20 min: 15 Simplification/Approximation, 5 Number Series (3 missing + 2 wrong), 5 Quadratic Equations (Hard also includes Quantity I / II), 5 Data Interpretation (Table+Bar / Line / Pie / Caselet), 10 Arithmetic
- **Difficulty selector** on the dashboard — **Easy**, **Moderate** (default, real IBPS RRB / IBPS Clerk Prelims level) or **Hard** (tougher than the real Prelims). Each level is a different paper (the seed includes the level). Today’s 3 shifts can be taken once per difficulty.
  - Easy: the six classic puzzle engines, shorter calculations, more direct clues
  - Moderate: real-exam standard, always at least one two-variable puzzle (floor+flat, row+colour, box+colour), coded inequalities, harder simplification and 2-step DI
  - Hard: floor-flat, mixed-facing circular, uncertain-length rows, comparison (height+weight), box+colour; coded blood relations, Chinese coding, missing-data DI, combined arithmetic
- Cut-off guidance is per level: Easy Safe ≥ 74 / Borderline 68–73.75; Moderate Safe ≥ 71 / Borderline 64–70.75; Hard (approximate, tougher than the actual exam) Safe ≥ 62 / Borderline 54–61.75
- Strict Real Exam mode (sectional timers, auto-advance, Submit Section Early) or Practice / Free Switch mode
- 3 daily tests (Morning / Afternoon / Evening, seeded by date + shift + difficulty) + unlimited Generate New Test
- Authentic CBT UI: 5-state palette, Question Paper popup, A− / A / A+ text size, keyboard shortcuts (1–5 / A–E, Enter, M, Shift+C or Delete to clear, ← →)
- Report: scorecard, level-aware Safe Zone / Borderline / Needs Work readiness, sectional qualifying check, topic breakdown, speed-vs-accuracy quadrant, mistake patterns, 7-day plan, full corrections, one-click Print / Save as PDF
- Progress & Analytics: filterable by difficulty, score + accuracy trend, cross-test topic mastery matrix, personal best, average, questions solved, daily streak, JSON export / import (all in `localStorage`)

## Develop

```bash
npm install
npm run dev
npm run verify   # 3 levels × (12 daily + 10 fresh) papers: counts, options, glitches, unique puzzle solutions, distinct papers per level
npm run build
bash scripts/deploy.sh   # verify + build, then publish dist/ to gh-pages
```
