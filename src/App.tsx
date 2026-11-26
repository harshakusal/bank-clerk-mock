import { useMemo, useState } from 'react';
import { generatePaper, hashStr, shiftName, SECTION_ORDER, SECTION_LABEL, FULL_COUNT, fmtNum, type Question, type SectionKey } from './gen/engine';
import { loadHistory, loadPrefs, savePrefs, nextFreshTestNo, todayKey, clearHistory, type HistoryEntry } from './storage';
import { Sparkline } from './ui';
import Exam, { type ExamOutcome } from './Exam';
import Report from './Report';

export interface Paper {
  dateKey: string;
  testNo: number;
  label: string;
  mode: 'strict' | 'free';
  questions: Question[];
  drill?: boolean;
}

type Phase = 'dashboard' | 'instructions' | 'exam' | 'report' | 'history';

const SHIFT_INFO = [
  { icon: '🌅', time: '9:00 AM slot' },
  { icon: '☀️', time: '1:00 PM slot' },
  { icon: '🌆', time: '5:00 PM slot' },
];

export function makePaper(dateKey: string, testNo: number, mode: 'strict' | 'free'): Paper {
  const label = testNo <= 3 ? `Daily Mock ${testNo} · ${shiftName(testNo)} ${testNo}` : `Fresh Mock #${testNo - 3}`;
  return { dateKey, testNo, label, mode, questions: generatePaper(dateKey, testNo, hashStr(dateKey)) };
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('dashboard');
  const [prefs, setPrefs] = useState(loadPrefs());
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory());
  const [paper, setPaper] = useState<Paper | null>(null);
  const [outcome, setOutcome] = useState<ExamOutcome | null>(null);
  const [agree, setAgree] = useState(false);
  const today = todayKey();

  const updatePrefs = (p: Partial<typeof prefs>) => {
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
  const startDaily = (n: number) => start(makePaper(today, n, prefs.mode));
  const startFresh = () => start(makePaper(today, nextFreshTestNo(today), prefs.mode));

  const onFinish = (o: ExamOutcome) => {
    setOutcome(o);
    setHistory(loadHistory());
    setPhase('report');
    window.scrollTo(0, 0);
  };

  const todayDone = (n: number) => history.filter((h) => h.dateKey === today && h.testNo === n).slice(-1)[0];
  const nextDaily = [1, 2, 3].find((n) => !todayDone(n));

  if (phase === 'exam' && paper) return <Exam paper={paper} candidate={prefs.name || 'Candidate'} onFinish={onFinish} onQuit={() => setPhase('dashboard')} />;
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
        onHistory={() => { setPhase('history'); window.scrollTo(0, 0); }}
      />
    );

  return (
    <div className="app-shell">
      <TopBrand />
      {phase === 'instructions' && paper ? (
        <Instructions paper={paper} agree={agree} setAgree={setAgree} name={prefs.name} onBack={() => setPhase('dashboard')} onBegin={() => { setPhase('exam'); window.scrollTo(0, 0); }} />
      ) : phase === 'history' ? (
        <HistoryView history={history} onBack={() => setPhase('dashboard')} onClear={() => { if (confirm('Delete all saved attempts from this browser?')) { clearHistory(); setHistory([]); } }} />
      ) : (
        <Dashboard
          today={today}
          prefs={prefs}
          updatePrefs={updatePrefs}
          history={history}
          todayDone={todayDone}
          onDaily={startDaily}
          onFresh={startFresh}
          onHistory={() => setPhase('history')}
        />
      )}
      <footer className="foot">
        Practice platform modelled on the IBPS / SBI Clerk Preliminary CBT pattern (100 Qs · 60 min · sectional timing · ¼ negative marking). Not affiliated with IBPS or SBI. Your attempts are stored only in this browser.
      </footer>
    </div>
  );
}

function TopBrand() {
  return (
    <header className="brand-bar">
      <div className="brand-inner">
        <div className="logo">BC</div>
        <div>
          <div className="brand-title">Bank Clerk Prelims — Online Mock Test</div>
          <div className="brand-sub">IBPS Clerk · SBI Junior Associate · CBT Practice Portal</div>
        </div>
      </div>
    </header>
  );
}

function Dashboard(props: {
  today: string;
  prefs: { name: string; mode: 'strict' | 'free' };
  updatePrefs: (p: Partial<{ name: string; mode: 'strict' | 'free' }>) => void;
  history: HistoryEntry[];
  todayDone: (n: number) => HistoryEntry | undefined;
  onDaily: (n: number) => void;
  onFresh: () => void;
  onHistory: () => void;
}) {
  const { today, prefs, updatePrefs, history, todayDone, onDaily, onFresh, onHistory } = props;
  const dateLabel = new Date(today + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const last = history.slice(-10);
  const best = history.length ? Math.max(...history.map((h) => h.net)) : null;
  const avg = history.length ? history.reduce((s, h) => s + h.net, 0) / history.length : null;
  return (
    <main className="container">
      <section className="hero card">
        <div>
          <h1>Today's Clerk Prelims Mocks</h1>
          <p className="muted">{dateLabel} · 3 brand-new full-length papers every day (questions change for every shift and every fresh test)</p>
          <div className="pattern-row">
            <div className="pat"><b>English Language</b><span>30 Qs · 20 min</span></div>
            <div className="pat"><b>Numerical Ability</b><span>35 Qs · 20 min</span></div>
            <div className="pat"><b>Reasoning Ability</b><span>35 Qs · 20 min</span></div>
            <div className="pat total"><b>Total</b><span>100 Qs · 100 marks · 60 min</span></div>
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
              ? 'Sections open one by one with a 20:00 timer each and auto-advance when time runs out — exactly like the real CBT.'
              : 'One 60:00 timer for the whole paper; switch between sections freely.'}
          </small>
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
                  <span className="big">{fmtNum(done.net)}</span>/100 · {fmtNum(done.accuracy)}% accuracy
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
              <div className="small muted">Unlimited new 100-question papers</div>
            </div>
          </div>
          <div className="shift-score muted">New numbers, new puzzles, new mix every time</div>
          <button className="btn accent" onClick={onFresh}>Generate New Test</button>
        </div>
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Your progress</h2>
          {history.length > 0 && <button className="btn ghost" onClick={onHistory}>View full history →</button>}
        </div>
        {history.length === 0 ? (
          <p className="muted">No attempts yet. Take Morning Shift 1 to get your first scorecard, analysis and improvement plan.</p>
        ) : (
          <div className="progress-grid">
            <div className="kpis">
              <div className="kpi"><b>{history.length}</b><span>tests taken</span></div>
              <div className="kpi"><b>{best !== null ? fmtNum(best) : '–'}</b><span>best score</span></div>
              <div className="kpi"><b>{avg !== null ? fmtNum(Math.round(avg * 100) / 100) : '–'}</b><span>average score</span></div>
            </div>
            <div>
              <Sparkline values={last.map((h) => h.net)} cutoff={75} />
              <div className="small muted">Last {last.length} scores · dashed line = 75 (typical cut-off zone)</div>
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
        <h2>General Instructions — {paper.label}</h2>
        <p className="muted small">Please read the following instructions carefully. Candidate: <b>{name || 'Candidate'}</b> · Paper date: {paper.dateKey}</p>
        <table className="std-table">
          <thead><tr><th>S.No.</th><th>Name of Test</th><th>No. of Qs</th><th>Max. Marks</th><th>Duration</th></tr></thead>
          <tbody>
            {SECTION_ORDER.map((s: SectionKey, i) => (
              <tr key={s}><td>{i + 1}</td><td>{SECTION_LABEL[s]}</td><td>{counts[i]}</td><td>{FULL_COUNT[s]}</td><td>{strict ? '20 minutes' : '—'}</td></tr>
            ))}
            <tr className="tot"><td></td><td>Total</td><td>100</td><td>100</td><td>60 minutes</td></tr>
          </tbody>
        </table>
        <ol className="instr-list">
          <li>{strict ? 'Each section has a separate timer of 20 minutes. You cannot move to the next section before its time is over unless you submit the section; you cannot return to a previous section.' : 'Practice mode: a single 60-minute timer runs for the whole paper and you may switch between sections at any time.'}</li>
          <li>The countdown timer at the top right shows the time remaining. It turns <b className="amber">amber</b> below 5 minutes and <b className="red">red</b> below 3 minutes. When the timer reaches zero, the {strict ? 'section is submitted automatically' : 'test is submitted automatically'}.</li>
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
          <li>Use the <b>Question Paper</b> button to see all questions of the current section at a glance.</li>
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

function HistoryView({ history, onBack, onClear }: { history: HistoryEntry[]; onBack: () => void; onClear: () => void }) {
  const rows = history.slice().reverse();
  return (
    <main className="container">
      <section className="card">
        <div className="row-between">
          <h2>Attempt history</h2>
          <div className="btn-row">
            <button className="btn ghost" onClick={onBack}>← Dashboard</button>
            {history.length > 0 && <button className="btn danger-ghost" onClick={onClear}>Clear history</button>}
          </div>
        </div>
        {history.length > 1 && <Sparkline values={history.slice(-20).map((h) => h.net)} cutoff={75} />}
        {rows.length === 0 ? (
          <p className="muted">No attempts saved yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="std-table">
              <thead>
                <tr><th>Date</th><th>Test</th><th>Mode</th><th>Net</th><th>Eng</th><th>Quant</th><th>Reas</th><th>Acc.</th><th>Attempted</th><th>Weak topics</th></tr>
              </thead>
              <tbody>
                {rows.map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{h.label}</td>
                    <td>{h.mode === 'strict' ? 'Strict' : 'Practice'}</td>
                    <td><b>{fmtNum(h.net)}</b></td>
                    <td>{fmtNum(h.sections.English?.net ?? 0)}</td>
                    <td>{fmtNum(h.sections.Numerical?.net ?? 0)}</td>
                    <td>{fmtNum(h.sections.Reasoning?.net ?? 0)}</td>
                    <td>{fmtNum(h.accuracy)}%</td>
                    <td>{h.attempted}</td>
                    <td className="small">{h.weakTopics.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
