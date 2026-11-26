# Bank Clerk Prelims Mock Exam (IBPS / SBI Clerk CBT)

A fast, static web app that simulates the **IBPS Clerk / SBI Junior Associate Preliminary exam** exactly:

- **100 questions · 60 minutes · 5 options (A–E) · +1 / −0.25**
- **English Language** (30 Qs, 20 min) → **Numerical Ability** (35 Qs, 20 min) → **Reasoning Ability** (35 Qs, 20 min)
- **Strict Real Exam mode** (sections unlock in order, auto-advance on timer expiry, "Submit Section Early") or **Practice / Free Switch** mode
- Authentic CBT UI: sectional + overall timers (amber < 5 min, red < 3 min), Question Paper modal, split-pane passages, 5-state question palette
- **3 fresh daily tests** (Morning / Afternoon / Evening shifts, seeded by date + shift) + unlimited **Generate New Test**
- Procedurally generated Quant & Reasoning (series, rational-root quadratics, DI with charts, arithmetic, solver-verified unique puzzles, "Only a few" syllogisms, multi-segment inequalities, 26-element alphanumeric series…) and 3 distinct English sets
- After-exam **scorecard, sectional cut-off check, topic breakdown, speed-vs-accuracy quadrant, mistake patterns, 7-day plan, full corrections with step-by-step solutions, shortcuts & common traps**
- Attempt history and score trend saved in `localStorage` (never leaves the browser)

## Develop

```bash
npm install
npm run dev        # local dev server
npm run verify     # generates 6 full papers (3 shifts x 2 dates) + 60 stress papers and asserts correctness
npm run build      # type-check + production build into dist/
```

## Deploy (GitHub Pages)

`dist/` is a fully static site built with `base: './'`, so it can be published to the `gh-pages` branch as is:

```bash
npm run build
bash scripts/deploy.sh   # pushes dist/ to the gh-pages branch of the 'origin' remote
```
