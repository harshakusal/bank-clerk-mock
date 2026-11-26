import { useMemo, useRef, useState } from 'react';
import { SEC_TARGET, fmtNum, type SectionKey } from './gen/engine';
import { tipFor, OVERALL_BAND, MAX_MARKS, type TopicStat } from './analysis';
import { dailyStreak, exportHistoryJSON, importHistoryJSON, isRRB, type HistoryEntry } from './storage';
import { TrendChart, Bar } from './ui';

interface Mastery {
  topic: string;
  section: SectionKey;
  tests: number;
  total: number;
  attempted: number;
  correct: number;
  wrong: number;
  acc: number;
  avgTime: number;
  coverage: number;
  trend: 'up' | 'down' | 'steady' | 'new';
  tag: 'Focus Next' | 'Practice' | 'Strong';
  score: number;
}

function buildMastery(hist: HistoryEntry[]): Mastery[] {
  const map = new Map<string, { s: TopicStat[] }>();
  hist.forEach((h) => (h.topicStats || []).forEach((t) => { const m = map.get(t.topic) || { s: [] }; m.s.push(t); map.set(t.topic, m); }));
  const out: Mastery[] = [];
  map.forEach(({ s }, topic) => {
    const sum = (f: (x: TopicStat) => number) => s.reduce((a, x) => a + f(x), 0);
    const total = sum((x) => x.total), attempted = sum((x) => x.attempted), correct = sum((x) => x.correct), wrong = sum((x) => x.wrong), time = sum((x) => x.timeSec);
    const acc = attempted ? (correct / attempted) * 100 : 0;
    const accOf = (xs: TopicStat[]) => { const a = xs.reduce((q, x) => q + x.attempted, 0); return a ? (xs.reduce((q, x) => q + x.correct, 0) / a) * 100 : 0; };
    let trend: Mastery['trend'] = 'new';
    if (s.length >= 2) {
      const recent = accOf(s.slice(-2)), earlier = accOf(s.slice(0, -2).length ? s.slice(0, -2) : s.slice(0, 1));
      trend = recent - earlier >= 8 ? 'up' : earlier - recent >= 8 ? 'down' : 'steady';
    }
    const section = s[s.length - 1].section;
    const avgTime = total ? time / total : 0;
    const coverage = total ? attempted / total : 0;
    const slow = avgTime > (SEC_TARGET[section] || 35) * 1.3 ? 0.15 : 0;
    const score = (acc / 100) * (0.6 + 0.4 * coverage) - slow; // mastery index
    out.push({ topic, section, tests: s.length, total, attempted, correct, wrong, acc, avgTime, coverage, trend, tag: 'Practice', score });
  });
  out.sort((a, b) => a.score - b.score);
  out.forEach((m, i) => { m.tag = i < 3 && m.score < 0.8 ? 'Focus Next' : m.acc >= 85 && m.coverage >= 0.7 ? 'Strong' : 'Practice'; });
  return out;
}

export default function Progress({ history, onBack, onChanged, onClear }: { history: HistoryEntry[]; onBack: () => void; onChanged: () => void; onClear: () => void }) {
  const rrb = useMemo(() => history.filter(isRRB), [history]);
  const legacy = history.length - rrb.length;
  const mastery = useMemo(() => buildMastery(rrb), [rrb]);
  const [secF, setSecF] = useState<'all' | SectionKey>('all');
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const best = rrb.length ? Math.max(...rrb.map((h) => h.net)) : 0;
  const avg = rrb.length ? rrb.reduce((a, h) => a + h.net, 0) / rrb.length : 0;
  const solved = rrb.reduce((a, h) => a + h.attempted, 0);
  const avgAcc = rrb.length ? rrb.reduce((a, h) => a + h.accuracy, 0) / rrb.length : 0;
  const streak = dailyStreak(history);
  const last = rrb.slice(-20);
  const points = last.map((h) => ({ label: `${h.dateKey.slice(5)} ${h.testNo <= 3 ? 'S' + h.testNo : 'F'}`, score: Math.round(h.net * 100) / 100, acc: Math.round(h.accuracy) }));
  const rows = mastery.filter((m) => secF === 'all' || m.section === secF);
  const focus = mastery.filter((m) => m.tag === 'Focus Next');

  const doExport = () => {
    const blob = new Blob([exportHistoryJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rrb-clerk-mock-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg(`Exported ${history.length} attempt(s).`);
  };
  const doImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const n = importHistoryJSON(await f.text());
      setMsg(`Imported ${n} new attempt(s).`);
      onChanged();
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <main className="container">
      <section className="card">
        <div className="row-between">
          <h2>📊 Progress &amp; Analytics — RRB Clerk Prelims</h2>
          <div className="btn-row">
            <button className="btn ghost" onClick={onBack}>← Dashboard</button>
            <button className="btn" onClick={doExport} disabled={!history.length}>⬇ Export JSON</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>⬆ Import JSON</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
            {history.length > 0 && <button className="btn danger-ghost" onClick={onClear}>Clear history</button>}
          </div>
        </div>
        {msg && <div className="flash inline">{msg}</div>}
        <div className="kpis wide">
          <div className="kpi"><b>{rrb.length}</b><span>mocks completed</span></div>
          <div className="kpi"><b>{rrb.length ? fmtNum(best) : '–'}</b><span>personal best /80</span></div>
          <div className="kpi"><b>{rrb.length ? fmtNum(Math.round(avg * 100) / 100) : '–'}</b><span>average /80</span></div>
          <div className="kpi"><b>{rrb.length ? `${fmtNum(Math.round(avgAcc))}%` : '–'}</b><span>average accuracy</span></div>
          <div className="kpi"><b>{solved}</b><span>questions solved</span></div>
          <div className="kpi"><b>{streak}🔥</b><span>day streak</span></div>
        </div>
        {legacy > 0 && <p className="small muted">{legacy} older attempt(s) from the previous 100-mark format are kept in your history but excluded from these RRB Clerk analytics.</p>}
      </section>

      <section className="card">
        <h2>Score &amp; accuracy trend</h2>
        {points.length ? (
          <>
            <TrendChart points={points} max={MAX_MARKS} band={[OVERALL_BAND.low, OVERALL_BAND.high]} />
            <div className="legend small"><span><i style={{ background: '#1f6fd1' }} />Net score (/80)</span><span><i style={{ background: '#e4572e' }} />Accuracy %</span><span><i style={{ background: '#fde68a' }} />Borderline band 64–71</span></div>
          </>
        ) : <p className="muted">Complete your first RRB Clerk mock to see your trend.</p>}
      </section>

      <section className="card">
        <div className="row-between">
          <h2>Cross-test topic mastery matrix</h2>
          <div className="seg">
            {(['all', 'Reasoning', 'Numerical'] as const).map((k) => <button key={k} className={secF === k ? 'on' : ''} onClick={() => setSecF(k)}>{k === 'all' ? 'All' : k === 'Numerical' ? 'Quant' : k}</button>)}
          </div>
        </div>
        {focus.length > 0 && (
          <div className="focus-box">
            <b>🎯 Focus next:</b>
            <ul className="clean">{focus.map((f) => <li key={f.topic}><b>{f.topic}</b> — {fmtNum(Math.round(f.acc))}% accuracy over {f.attempted} attempts. <span className="small muted">{tipFor(f.topic)}</span></li>)}</ul>
          </div>
        )}
        {rows.length === 0 ? <p className="muted">No topic data yet — topic stats are saved with every new attempt.</p> : (
          <div className="table-scroll">
            <table className="std-table">
              <thead><tr><th>Topic</th><th>Section</th><th>Tests</th><th>Attempted</th><th>Accuracy</th><th className="w40">Mastery</th><th>Avg time/Q</th><th>Trend</th><th>Priority</th></tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.topic}>
                    <td><b>{m.topic}</b></td>
                    <td className="small">{m.section === 'Numerical' ? 'Quant' : 'Reasoning'}</td>
                    <td>{m.tests}</td>
                    <td>{m.attempted}/{m.total}</td>
                    <td>{fmtNum(Math.round(m.acc))}%</td>
                    <td><Bar value={Math.max(0, m.score) * 100} max={100} color={m.tag === 'Strong' ? '#16a34a' : m.tag === 'Focus Next' ? '#dc2626' : '#f59e0b'} label={`${Math.round(Math.max(0, m.score) * 100)}`} /></td>
                    <td>{Math.round(m.avgTime)}s</td>
                    <td><span className={`trend-badge ${m.trend}`}>{m.trend === 'up' ? '▲ Improving' : m.trend === 'down' ? '▼ Slipping' : m.trend === 'steady' ? '■ Steady' : '● New'}</span></td>
                    <td><span className={`tag ${m.tag === 'Strong' ? 'good' : m.tag === 'Focus Next' ? 'bad' : 'neutral'}`}>{m.tag}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted">Mastery = accuracy weighted by coverage (attempted ÷ asked), minus a penalty when the average time is more than 1.3× the target (Reasoning ~37 s, Quant ~30 s per question).</p>
      </section>

      <section className="card">
        <h2>All attempts</h2>
        {history.length === 0 ? <p className="muted">No attempts saved yet.</p> : (
          <div className="table-scroll">
            <table className="std-table">
              <thead><tr><th>Date</th><th>Test</th><th>Mode</th><th>Net</th><th>Reasoning</th><th>Quant</th><th>Accuracy</th><th>Attempted</th><th>Weak topics</th></tr></thead>
              <tbody>
                {history.slice().reverse().map((h) => (
                  <tr key={h.id} className={isRRB(h) ? '' : 'legacy'}>
                    <td>{new Date(h.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{h.label}{isRRB(h) ? '' : ' (legacy 100-mark)'}</td>
                    <td>{h.mode === 'strict' ? 'Strict' : 'Practice'}</td>
                    <td><b>{fmtNum(h.net)}</b>/{h.maxMarks || 100}</td>
                    <td>{h.sections.Reasoning ? fmtNum(h.sections.Reasoning.net) : '—'}</td>
                    <td>{h.sections.Numerical ? fmtNum(h.sections.Numerical.net) : '—'}</td>
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
