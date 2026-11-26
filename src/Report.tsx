import { useMemo, useState } from 'react';
import { SECTION_LABEL, LETTERS, SEC_TARGET, netOf, accOf, fmtNum, fmtDur, type Question, type SectionKey, type QR } from './gen/engine';
import { buildInsights, readiness, SECTION_CUTOFF, tipFor } from './analysis';
import { isRRB, type HistoryEntry } from './storage';
import type { Paper } from './App';
import type { ExamOutcome } from './Exam';
import { Bar, DIView, Pre, Sparkline } from './ui';

type SF = 'all' | 'wrong' | 'skipped' | 'correct' | 'marked';

const QUAD_INFO: Record<string, { cls: string; hint: string }> = {
  'Fast & Accurate': { cls: 'good', hint: 'Your scoring zone — attempt these first.' },
  'Slow & Accurate': { cls: 'warn', hint: 'Right answers but too slow — learn shortcuts.' },
  'Fast & Guessy': { cls: 'bad', hint: 'Rushing — slow down and read fully.' },
  'Time Sink': { cls: 'bad', hint: 'Slow and inaccurate — skip in exam, fix concepts.' },
};

export default function Report(props: {
  paper: Paper;
  outcome: ExamOutcome;
  candidate: string;
  history: HistoryEntry[];
  onHome: () => void;
  onDrill: (qs: Question[]) => void;
  onNextDaily?: () => void;
  onFresh: () => void;
  onHistory: () => void;
}) {
  const { paper, outcome, candidate, history, onHome, onDrill, onNextDaily, onFresh, onHistory } = props;
  const res = outcome.result;
  const ins = useMemo(() => buildInsights(res, paper.questions), [res, paper.questions]);
  const [sf, setSf] = useState<SF>('all');
  const [secF, setSecF] = useState<'all' | SectionKey>('all');
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const ready = readiness(res.net, res.total);
  const retryQs = res.rows.filter((r) => r.status !== 'correct').map((r) => r.q);
  const fullPaper = res.total === 80 && !paper.drill;

  const filtered = res.rows.filter((r) => (secF === 'all' || r.q.section === secF) && (sf === 'all' || (sf === 'marked' ? r.marked : r.status === sf)));
  const counts = { all: res.rows.length, wrong: res.wrong, skipped: res.skipped, correct: res.correct, marked: res.rows.filter((r) => r.marked).length };
  const trend = history.filter(isRRB).slice(-12).map((h) => h.net);
  const maxTopicTotal = Math.max(...res.topics.map((t) => t.total));

  return (
    <div className="app-shell">
      <header className="brand-bar">
        <div className="brand-inner">
          <div className="logo">RRB</div>
          <div>
            <div className="brand-title">IBPS RRB Clerk Prelims — Score Card &amp; Performance Analysis</div>
            <div className="brand-sub">{paper.label} · {paper.dateKey} · {candidate}</div>
          </div>
        </div>
      </header>
      <main className="container">
        <section className="card score-hero">
          <div className="score-ring" style={{ ['--p' as string]: `${Math.max(0, res.net) / res.total * 100}` }}>
            <div>
              <div className="ring-val">{fmtNum(res.net)}</div>
              <div className="ring-sub">/ {res.total}</div>
            </div>
          </div>
          <div className="score-info">
            <h1>{res.net / res.total >= 71 / 80 ? 'Excellent attempt — Safe Zone!' : res.net / res.total >= 64 / 80 ? 'Good effort — you are in the borderline band' : 'Keep going — here is exactly what to fix'}</h1>
            {fullPaper ? <div className={`verdict ${ready.tone}`}>{ready.label}</div> : <div className="verdict warn">Retry drill — not saved to history</div>}
            <div className="metrics">
              <M k="Accuracy" v={`${fmtNum(Math.round(res.accuracy * 10) / 10)}%`} />
              <M k="Attempted" v={`${res.attempted}/${res.total}`} />
              <M k="Correct" v={String(res.correct)} cls="good" />
              <M k="Wrong" v={String(res.wrong)} cls="bad" />
              <M k="Skipped" v={String(res.skipped)} />
              <M k="Negative marks" v={`−${fmtNum(res.negLost)}`} cls="bad" />
              <M k="Speed" v={`${fmtNum(Math.round(res.speed * 100) / 100)} Qs/min`} />
              <M k="Time used" v={fmtDur(res.timeSec)} />
              {fullPaper && <M k="Est. percentile" v={`${res.percentile}`} />}
            </div>
          </div>
        </section>

        <div className="btn-row center wrap no-print">
          {retryQs.length > 0 && <button className="btn primary" onClick={() => onDrill(retryQs)}>🔁 Retry Wrong &amp; Skipped Drill ({retryQs.length})</button>}
          {onNextDaily && <button className="btn primary" onClick={onNextDaily}>▶ Take Next Daily Test</button>}
          <button className="btn accent" onClick={onFresh}>⚡ Generate Fresh Test</button>
          <button className="btn" onClick={onHistory}>📊 Progress &amp; Analytics</button>
          <button className="btn" onClick={() => window.print()}>🖨 Print / Save PDF</button>
          <button className="btn ghost" onClick={onHome}>⌂ Dashboard</button>
        </div>

        <section className="card">
          <h2>Section-wise performance &amp; sectional qualifying check</h2>
          <div className="table-scroll">
            <table className="std-table">
              <thead><tr><th>Section</th><th>Qs</th><th>Attempted</th><th>Correct</th><th>Wrong</th><th>Net</th><th>Accuracy</th><th>Avg time / Q</th><th>Qualifying (approx.)</th></tr></thead>
              <tbody>
                {res.sections.map((s) => {
                  const net = netOf(s); const cut = SECTION_CUTOFF[s.label as SectionKey]; const att = s.correct + s.wrong;
                  return (
                    <tr key={s.label}>
                      <td><b>{SECTION_LABEL[s.label as SectionKey]}</b></td><td>{s.total}</td><td>{att}</td><td>{s.correct}</td><td>{s.wrong}</td>
                      <td><b>{fmtNum(net)}</b></td><td>{fmtNum(Math.round(accOf(s) * 10) / 10)}%</td>
                      <td>{att || s.time ? `${Math.round(s.time / s.total)}s (target ${SEC_TARGET[s.label as SectionKey]}s)` : '—'}</td>
                      <td>{fullPaper ? <span className={`tag ${net >= cut ? 'good' : 'bad'}`}>{net >= cut ? `Cleared (${cut})` : `Below (${cut})`}</span> : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="sec-bars">
            {res.sections.map((s) => (
              <div key={s.label} className="sec-bar">
                <div className="row-between small"><span>{SECTION_LABEL[s.label as SectionKey]}</span><span>{fmtNum(netOf(s))} / {s.total}</span></div>
                <Bar value={Math.max(0, netOf(s))} max={s.total} color={netOf(s) >= SECTION_CUTOFF[s.label as SectionKey] ? '#16a34a' : '#dc2626'} />
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>Topic-wise breakdown</h2>
          <div className="table-scroll">
            <table className="std-table topic-table">
              <thead><tr><th>Topic</th><th>Section</th><th>Correct / Total</th><th className="w40">Score bar</th><th>Wrong</th><th>Skipped</th><th>Avg time</th></tr></thead>
              <tbody>
                {res.topics.map((t) => (
                  <tr key={t.label}>
                    <td>{t.label}</td>
                    <td className="small">{t.section === 'Numerical' ? 'Quant' : t.section}</td>
                    <td>{t.correct}/{t.total}</td>
                    <td><Bar value={t.correct} max={maxTopicTotal} color={accOf(t) >= 80 && t.correct ? '#16a34a' : t.correct / t.total >= 0.5 ? '#f59e0b' : '#dc2626'} label={`${Math.round((t.correct / t.total) * 100)}%`} /></td>
                    <td>{t.wrong}</td>
                    <td>{t.skipped}</td>
                    <td>{Math.round(t.time / t.total)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid2">
          <div className="card">
            <h2>💪 Strengths</h2>
            {ins.strengths.length ? <ul className="clean">{ins.strengths.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="muted">No topic reached 80%+ accuracy with enough attempts yet. Build one strong area first (Simplification, Inequality or Error Spotting are the quickest).</p>}
          </div>
          <div className="card">
            <h2>🎯 Priority fix topics</h2>
            {ins.fixes.length ? (
              <ol className="clean">{ins.fixes.map((f) => <li key={f.topic}><b>{f.topic}</b> <span className="muted small">— {f.why}</span><div className="small tip">{f.tip}</div></li>)}</ol>
            ) : <p className="muted">No weak topic — excellent consistency.</p>}
          </div>
        </section>

        <section className="card">
          <h2>⚡ Speed vs accuracy quadrant</h2>
          <div className="quad-grid">
            {(['Fast & Accurate', 'Slow & Accurate', 'Fast & Guessy', 'Time Sink'] as const).map((qd) => {
              const items = ins.quadrants.filter((x) => x.quad === qd);
              return (
                <div key={qd} className={`quad ${QUAD_INFO[qd].cls}`}>
                  <div className="quad-h">{qd}</div>
                  <div className="small muted">{QUAD_INFO[qd].hint}</div>
                  <div className="chips">{items.length ? items.map((x) => <span key={x.label} className="chip">{x.label} · {Math.round(x.acc)}% · {Math.round(x.avg)}s</span>) : <span className="muted small">—</span>}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid2">
          <div className="card">
            <h2>🔍 Mistake pattern analysis</h2>
            <ul className="clean">{ins.patterns.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
          <div className="card">
            <h2>🧭 Next-test action plan</h2>
            <ul className="clean">{ins.nextTest.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        </section>

        <section className="card">
          <h2>🗓 7-day improvement roadmap</h2>
          <div className="roadmap">
            {ins.roadmap.map((d) => <div key={d.day} className="road"><b>{d.day}</b><span>{d.plan}</span></div>)}
          </div>
        </section>

        {trend.length > 1 && (
          <section className="card">
            <h2>📈 Score trend (last {trend.length} tests)</h2>
            <Sparkline values={trend} max={80} cutoff={71} />
            <div className="small muted">Dashed line = 71/80 (RRB Clerk Safe Zone); 64–70.75 is the borderline band.</div>
          </section>
        )}

        <section className="card no-print">
          <h2>✅ Corrections &amp; solutions</h2>
          <div className="filters">
            <div className="seg">
              {(['all', 'wrong', 'skipped', 'correct', 'marked'] as SF[]).map((k) => (
                <button key={k} className={sf === k ? 'on' : ''} onClick={() => setSf(k)}>{k[0].toUpperCase() + k.slice(1)} ({counts[k]})</button>
              ))}
            </div>
            <div className="seg">
              {(['all', 'Reasoning', 'Numerical'] as const).map((k) => (
                <button key={k} className={secF === k ? 'on' : ''} onClick={() => setSecF(k)}>{k === 'all' ? 'All sections' : k === 'Numerical' ? 'Quant' : k}</button>
              ))}
            </div>
          </div>
          {filtered.length === 0 && <p className="muted">No questions match this filter.</p>}
          <div className="corr-list">
            {filtered.map((r) => <Correction key={r.idx} r={r} open={!!open[r.idx]} toggle={() => setOpen((o) => ({ ...o, [r.idx]: !o[r.idx] }))} />)}
          </div>
        </section>
        <section className="card print-only">
          <h2>Corrections — wrong &amp; skipped questions ({retryQs.length})</h2>
          {res.rows.filter((r) => r.status !== 'correct').map((r) => (
            <div key={r.idx} className="print-corr">
              <div><b>Q{r.num}.</b> <span className="small">[{r.q.section === 'Numerical' ? 'Quant' : 'Reasoning'} · {r.q.topic} · {r.status === 'wrong' ? 'Wrong' : 'Skipped'} · {r.time}s]</span></div>
              <Pre text={r.q.question} />
              <div className="small">Your answer: <b>{r.yours === null ? '—' : `${LETTERS[r.yours]}. ${r.q.options[r.yours]}`}</b> · Correct: <b>{LETTERS[r.q.correctIndex]}. {r.q.options[r.q.correctIndex]}</b></div>
              <ol className="small">{r.q.explanation.map((e, i) => <li key={i}>{e}</li>)}</ol>
              <div className="small"><b>Shortcut:</b> {r.q.shortcut} <b>Trap:</b> {r.q.commonTrap}</div>
            </div>
          ))}
          {retryQs.length === 0 && <p>No wrong or skipped questions — perfect paper!</p>}
        </section>
        <div className="print-only small muted">Printed from IBPS RRB Clerk Prelims Mock · {paper.label} · {paper.dateKey} · {candidate}</div>
      </main>
    </div>
  );
}

function M({ k, v, cls }: { k: string; v: string; cls?: string }) {
  return <div className={`metric ${cls || ''}`}><span>{k}</span><b>{v}</b></div>;
}

function Correction({ r, open, toggle }: { r: QR; open: boolean; toggle: () => void }) {
  const q = r.q;
  const st = r.status;
  return (
    <div className={`corr ${st}`}>
      <button className="corr-head" onClick={toggle}>
        <span className={`tag ${st === 'correct' ? 'good' : st === 'wrong' ? 'bad' : 'neutral'}`}>{st === 'correct' ? '✓ Correct' : st === 'wrong' ? '✗ Wrong' : '— Skipped'}</span>
        <span className="corr-q">Q{r.num}. {q.question.split('\n').filter(Boolean).slice(-1)[0].slice(0, 110)}</span>
        <span className="small muted">{q.topic} · {q.difficulty === 'Tricky' ? 'Hard' : q.difficulty} · {r.time}s{r.marked ? ' · 🔖' : ''}</span>
        <span className="chev">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="corr-body">
          {q.passageTitle && <div className="passage-title">{q.passageTitle}</div>}
          {q.passage && <details><summary>Show passage / directions</summary><Pre text={q.passage} /></details>}
          {q.table && <DIView table={q.table} />}
          <Pre className="q-text" text={q.question} />
          <div className="opts review">
            {q.options.map((o, k) => (
              <div key={k} className={`opt ${k === q.correctIndex ? 'right' : ''} ${k === r.yours && k !== q.correctIndex ? 'wrongpick' : ''}`}>
                <span className="opt-letter">{LETTERS[k]}</span><span className="opt-text">{o}</span>
                {k === q.correctIndex && <span className="tag good">Correct answer</span>}
                {k === r.yours && k !== q.correctIndex && <span className="tag bad">Your answer</span>}
                {k === r.yours && k === q.correctIndex && <span className="tag good">Your answer</span>}
              </div>
            ))}
          </div>
          <div className="sol">
            <div className="sol-h">Step-by-step solution</div>
            <ol>{q.explanation.map((e, i) => <li key={i}>{e}</li>)}</ol>
          </div>
          <div className="grid2 tight">
            <div className="hint good"><b>⚡ Exam shortcut:</b> {q.shortcut}</div>
            <div className="hint bad"><b>⚠ Common trap:</b> {q.commonTrap}</div>
          </div>
          {st !== 'correct' && <div className="small muted">Revise: {tipFor(q.topic)}</div>}
        </div>
      )}
    </div>
  );
}
