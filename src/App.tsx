import { useMemo, useState } from 'react';
import { generatePaper, hashStr, shiftName, SECTION_ORDER, SECTION_LABEL, FULL_COUNT, SEC_TIME, fmtNum, PAPER_LEVELS, LEVEL_LABEL, LEVEL_BLURB, type Question, type SectionKey, type PaperLevel } from './gen/engine';
import { loadHistory, loadPrefs, savePrefs, nextFreshTestNo, todayKey, clearHistory, dailyStreak, isRRB, type HistoryEntry, type Prefs } from './storage';
import Progress from './Progress';
import { Sparkline } from './ui';
import Exam, { type ExamOutcome } from './Exam';
import Report from './Report';

export interface Paper {
  dateKey: string;
  testNo: number;
  label: string;
  mode: 'strict' | 'free';
  questions: Question[];
  level?: PaperLevel;
  drill?: boolean;
}

type Phase = 'dashboard' | 'instructions' | 'exam' | 'report' | 'progress';

const SHIFT_INFO = [
  { icon: '🌅', time: '9:00 AM slot' },
  { icon: '☀️', time: '1:00 PM slot' },
  { icon: '🌆', time: '5:00 PM slot' },
];

export function makePaper(dateKey: string, testNo: number, mode: 'strict' | 'free', level: PaperLevel = 'Moderate'): Paper {
  const label = testNo <= 3 ? `Daily Mock ${testNo} · ${shiftName(testNo)} ${testNo}` : `Fresh Mock #${testNo - 3}`;
  return { dateKey, testNo, label, mode, level, questions: generatePaper(dateKey, testNo, hashStr(dateKey), level) };
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('dashboard');
  const [prefs, setPrefs] = useState(loadPrefs());
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory());
  const [paper, setPaper] = useState<Paper | null>(null);
  const [outcome, setOutcome] = useState<ExamOutcome | null>(null);
  const [agree, setAgree] = useState(false);
  const today = todayKey();

  const updatePrefs = (p: Partial<Prefs>) => {
    const n = { ...prefs, ...p };
    setPrefs(n);
    savePrefs(n);
  };
  const start = (p: Paper) => {
    setPaper(p);
    setAgree(false);
    setPhase(p.drill ? 'exam' : 'instructions');
    window.scrollTo(0, 0);
  };
  const level: PaperLevel = prefs.level || 'Moderate';
  const startDaily = (n: number) => start(makePaper(today, n, prefs.mode, level));
  const startFresh = () => start(makePaper(today, nextFreshTestNo(today), prefs.mode, level));

  const onFinish = (o: ExamOutcome) => {
    setOutcome(o);
    setHistory(loadHistory());
    setPhase('report');
    window.scrollTo(0, 0);
  };

  const todayDone = (n: number) => history.filter((h) => isRRB(h) && h.dateKey === today && h.testNo === n && (h.level || 'Moderate') === (prefs.level || 'Moderate')).slice(-1)[0];
  const nextDaily = [1, 2, 3].find((n) => !todayDone(n));

  if (phase === 'exam' && paper) return <Exam paper={paper} candidate={prefs.name || 'Candidate'} fontScale={prefs.fontScale || 1} setFontScale={(f) => updatePrefs({ fontScale: f })} onFinish={onFinish} onQuit={() => setPhase('dashboard')} />;
  if (phase === 'report' && outcome && paper)
    return (
      <Report
        paper={paper}
        outcome={outcome}
        candidate={prefs.name || 'Candidate'}
        history={history}
        onHome={() => { setPhase('dashboard'); window.scrollTo(0, 0); }}
        onDrill={(qs) => start({ ...paper, label: `Retry Drill · ${paper.label}`, mode: 'free', questions: qs, drill: true })}
        onNextDaily={nextDaily ? () => startDaily(nextDaily) : undefined}
        onFresh={startFresh}
        onHistory={() => { setPhase('progress'); window.scrollTo(0, 0); }}
      />
    );

  return (
    <div className="app-shell">
      <TopBrand />
      {phase === 'instructions' && paper ? (
        <Instructions paper={paper} agree={agree} setAgree={setAgree} name={prefs.name} onBack={() => setPhase('dashboard')} onBegin={() => { setPhase('exam'); window.scrollTo(0, 0); }} />
      ) : phase === 'progress' ? (
        <Progress history={history} onBack={() => setPhase('dashboard')} onChanged={() => setHistory(loadHistory())} onClear={() => { if (confirm('Delete all saved attempts from this browser? Export them first if you want a backup.')) { clearHistory(); setHistory([]); } }} />
      ) : (
        <Dashboard
          today={today}
          prefs={prefs}
          updatePrefs={updatePrefs}
          history={history}
          todayDone={todayDone}
          onDaily={startDaily}
          onFresh={startFresh}
          onHistory={() => { setPhase('progress'); window.scrollTo(0, 0); }}
        />
      )}
      <footer className="foot">
        Practice platform modelled on the IBPS RRB Office Assistant (Multipurpose) / RRB Clerk Preliminary CBT pattern (80 Qs · 80 marks · 45 min · sectional timing · ¼ negative marking). Not affiliated with IBPS. Your attempts are stored only in this browser.
      </footer>
    </div>
  );
}

function TopBrand() {
  return (
    <header className="brand-bar">
      <div className="brand-inner">
        <div className="logo">RRB</div>
        <div>
          <div className="brand-title">IBPS RRB Clerk Prelims — Online Mock Test</div>
          <div className="brand-sub">Office Assistant (Multipurpose) · Reasoning + Quant · CBT Practice Portal</div>
        </div>
      </div>
    </header>
  );
}

function Dashboard(props: {
  today: string;
  prefs: Prefs;
  updatePrefs: (p: Partial<Prefs>) => void;
  history: HistoryEntry[];
  todayDone: (n: number) => HistoryEntry | undefined;
  onDaily: (n: number) => void;
  onFresh: () => void;
  onHistory: () => void;
}) {
  const { today, prefs, updatePrefs, history, todayDone, onDaily, onFresh, onHistory } = props;
  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const rrb = history.filter(isRRB);
  const last = rrb.slice(-10);
  const best = rrb.length ? Math.max(...rrb.map((h) => h.net)) : null;
  const avg = rrb.length ? rrb.reduce((s, h) => s + h.net, 0) / rrb.length : null;
  const streak = dailyStreak(history);
  return (
    <main className="container">
      <section className="hero card">
        <div>
          <h1>Today's RRB Clerk Prelims Mocks</h1>
          <p className="muted">{dateLabel} · 3 brand-new full-length papers every day — pick Easy, Moderate (real-exam level) or Hard, then start a shift. Each difficulty is a different paper.</p>
          <div className="pattern-row three">
            <div className="pat"><b>Reasoning Ability</b><span>40 Qs · 40 marks · 25 min</span></div>
            <div className="pat"><b>Numerical Ability</b><span>40 Qs · 40 marks · 20 min</span></div>
            <div className="pat total"><b>Total</b><span>80 Qs · 80 marks · 45 min</span></div>
          </div>
          <p className="small muted">Marking: +1 for correct, −0.25 for wrong, 0 for unattempted. Each question has 5 options (A–E).</p>
        </div>
      </section>

      <section className="card setup">
        <label className="field">
          <span>Candidate name</span>
          <input value={prefs.name} maxLength={40} placeholder="Enter your name" onChange={(e) => updatePrefs({ name: e.target.value })} />
        </label>
        <div className="field">
          <span>Exam mode</span>
          <div className="seg">
            <button className={prefs.mode === 'strict' ? 'on' : ''} onClick={() => updatePrefs({ mode: 'strict' })}>Strict Real Exam</button>
            <button className={prefs.mode === 'free' ? 'on' : ''} onClick={() => updatePrefs({ mode: 'free' })}>Practice / Free Switch</button>
          </div>
          <small className="muted">
            {prefs.mode === 'strict'
              ? 'Reasoning (25:00) then Numerical (20:00), each with its own timer that auto-advances when time runs out — exactly like the real CBT.'
              : 'One 45:00 timer for the whole paper; switch between sections freely.'}
          </small>
        </div>
        <div className="field level-field">
          <span>Difficulty</span>
          <div className="level-picker" role="group" aria-label="Paper difficulty">
            {PAPER_LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                className={`level-card ${lv.toLowerCase()} ${(prefs.level || 'Moderate') === lv ? 'on' : ''}`}
                onClick={() => updatePrefs({ level: lv })}
              >
                <span className="lvl">{LEVEL_LABEL[lv]}{lv === 'Moderate' ? ' · default' : ''}</span>
                <span className="blurb">{LEVEL_BLURB[lv]}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="shift-grid">
        {[1, 2, 3].map((n) => {
          const done = todayDone(n);
          return (
            <div key={n} className={`card shift ${done ? 'done' : ''}`}>
              <div className="shift-top">
                <span className="shift-icon">{SHIFT_INFO[n - 1].icon}</span>
                <div>
                  <div className="shift-name">{shiftName(n)} {n}</div>
                  <div className="small muted">Daily Mock {n} · {SHIFT_INFO[n - 1].time}</div>
                </div>
              </div>
              {done ? (
                <div className="shift-score">
                  <span className="big">{fmtNum(done.net)}</span>/{done.maxMarks || 80} · {fmtNum(done.accuracy)}% accuracy
                </div>
              ) : (
                <div className="shift-score muted">Not attempted yet</div>
              )}
              <button className="btn primary" onClick={() => onDaily(n)}>{done ? 'Re-attempt' : 'Start Test'}</button>
            </div>
          );
        })}
        <div className="card shift fresh">
          <div className="shift-top">
            <span className="shift-icon">⚡</span>
            <div>
              <div className="shift-name">Generate Fresh Test</div>
              <div className="small muted">Unlimited new 80-question papers at the selected difficulty</div>
            </div>
          </div>
          <div className="shift-score muted">New puzzles, new DI, new numbers every time</div>
          <button className="btn accent" onClick={onFresh}>Generate New Test</button>
        </div>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Your progress</h2>
          <button className="btn" onClick={onHistory}>📊 Progress &amp; Analytics →</button>
        </div>
        {rrb.length === 0 ? (
          <p className="muted">No RRB Clerk attempts yet. Take Morning Shift 1 to get your first scorecard, analysis and improvement plan.</p>
        ) : (
          <div className="progress-grid">
            <div className="kpis">
              <div className="kpi"><b>{rrb.length}</b><span>tests taken</span></div>
              <div className="kpi"><b>{best !== null ? fmtNum(best) : '–'}</b><span>best /80</span></div>
              <div className="kpi"><b>{avg !== null ? fmtNum(Math.round(avg * 100) / 100) : '–'}</b><span>average /80</span></div>
              <div className="kpi"><b>{streak}🔥</b><span>day streak</span></div>
            </div>
            <div>
              <Sparkline values={last.map((h) => h.net)} max={80} cutoff={71} />
              <div className="small muted">Last {last.length} scores (out of 80) · dashed line = 71 (Safe Zone)</div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Instructions({ paper, agree, setAgree, name, onBack, onBegin }: { paper: Paper; agree: boolean; setAgree: (b: boolean) => void; name: string; onBack: () => void; onBegin: () => void }) {
  const strict = paper.mode === 'strict';
  const counts = useMemo(() => SECTION_ORDER.map((s) => paper.questions.filter((q) => q.section === s).length), [paper]);
  return (
    <main className="container">
      <section className="card instr">
        <h2>IBPS RRB Clerk Prelims — General Instructions · {paper.label}</h2>
        <p className="muted small">Please read the following instructions carefully. Candidate: <b>{name || 'Candidate'}</b> · Paper date: {paper.dateKey} · Difficulty: <b>{paper.level || 'Moderate'}</b></p>
        <table className="std-table">
          <thead><tr><th>S.No.</th><th>Name of Test</th><th>No. of Qs</th><th>Max. Marks</th><th>Duration</th></tr></thead>
          <tbody>
            {SECTION_ORDER.map((s: SectionKey, i) => (
              <tr key={s}><td>{i + 1}</td><td>{SECTION_LABEL[s]}</td><td>{counts[i]}</td><td>{FULL_COUNT[s]}</td><td>{strict ? `${SEC_TIME[s] / 60} minutes` : '—'}</td></tr>
            ))}
            <tr className="tot"><td></td><td>Total</td><td>80</td><td>80</td><td>45 minutes</td></tr>
          </tbody>
        </table>
        <ol className="instr-list">
          <li>{strict ? 'Reasoning Ability (25 minutes) comes first, followed by Numerical Ability (20 minutes). Each section has its own timer; you cannot move to Numerical Ability before the Reasoning timer ends unless you submit the section, and you cannot return to a submitted section.' : 'Practice mode: a single 45-minute timer runs for the whole paper and you may switch between sections at any time.'}</li>
          <li>The countdown timer at the top right shows the time remaining. It turns <b className="amber">amber</b> below 5 minutes and <b className="red">red</b> below 3 minutes. When the timer reaches zero, the {strict ? 'section is submitted automatically' : 'test is submitted automatically'}.</li>
          <li>This paper is set at <b>{paper.level || 'Moderate'}</b> difficulty. Moderate matches recent IBPS RRB / IBPS Clerk Prelims; Hard is intentionally tougher than the real exam.</li>
          <li>There is negative marking: <b>0.25 mark</b> is deducted for every wrong answer. Unattempted questions carry no penalty.</li>
          <li>The Question Palette on the right shows the status of each question:
            <div className="legend-grid">
              <span><i className="pal answered">1</i> Answered</span>
              <span><i className="pal notAnswered">2</i> Not Answered</span>
              <span><i className="pal notVisited">3</i> Not Visited</span>
              <span><i className="pal marked">4</i> Marked for Review (not answered)</span>
              <span><i className="pal answeredMarked">5</i> Answered &amp; Marked for Review (will be evaluated)</span>
            </div>
          </li>
          <li>To answer, click an option and then click <b>Save &amp; Next</b>. Selecting an option and moving away without saving does not save your answer.</li>
          <li><b>Mark for Review &amp; Next</b> saves the selected option (if any) and flags the question; <b>Clear Response</b> removes your answer.</li>
          <li>Use the <b>Question Paper</b> button to see all questions of the current section at a glance, and <b>A− / A / A+</b> in the header to change the text size.</li>
          <li>Keyboard shortcuts: <kbd>1</kbd>–<kbd>5</kbd> or <kbd>A</kbd>–<kbd>E</kbd> select an option, <kbd>Enter</kbd> Save &amp; Next, <kbd>M</kbd> Mark for Review &amp; Next, <kbd>Shift</kbd>+<kbd>C</kbd> / <kbd>Delete</kbd> Clear Response, <kbd>←</kbd> / <kbd>→</kbd> Previous / Next.</li>
        </ol>
        <label className="declare">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>I have read and understood the instructions. I agree that I am not carrying any prohibited material and I will attempt this mock honestly within the time limit.</span>
        </label>
        <div className="row-between">
          <button className="btn ghost" onClick={onBack}>← Previous</button>
          <button className="btn primary" disabled={!agree} onClick={onBegin}>I am ready to begin</button>
        </div>
      </section>
    </main>
  );
}
