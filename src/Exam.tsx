import { useEffect, useMemo, useRef, useState } from 'react';
import { SECTION_ORDER, SECTION_LABEL, SEC_TIME, LETTERS, fmtClock, netOf, type SectionKey } from './gen/engine';
import { computeResults, topicStatsOf, type ExamResult } from './analysis';
import { saveHistory, type HistoryEntry } from './storage';
import { Modal, DIView, Pre } from './ui';
import type { Paper } from './App';

export interface ExamOutcome {
  answers: (number | null)[];
  times: number[];
  marked: boolean[];
  visited: boolean[];
  result: ExamResult;
}

type Tile = 'answered' | 'notAnswered' | 'marked' | 'answeredMarked' | 'notVisited';
interface St {
  answers: (number | null)[];
  marked: boolean[];
  visited: boolean[];
  times: number[];
  cur: number;
  draft: number | null;
  secLeft: number[];
  totalLeft: number;
  activeSec: number;
  done: boolean;
  flash: string;
}

const FONT_STEPS = [0.9, 1, 1.18];

export default function Exam({ paper, candidate, fontScale, setFontScale, onFinish, onQuit }: { paper: Paper; candidate: string; fontScale: number; setFontScale: (f: number) => void; onFinish: (o: ExamOutcome) => void; onQuit: () => void }) {
  const qs = paper.questions;
  const n = qs.length;
  const strict = paper.mode === 'strict' && !paper.drill;
  const secs = useMemo(() => SECTION_ORDER.filter((s) => qs.some((q) => q.section === s)), [qs]);
  const ranges = useMemo(() => secs.map((s) => { const idx = qs.map((q, i) => (q.section === s ? i : -1)).filter((i) => i >= 0); return { s, first: idx[0], last: idx[idx.length - 1], idx }; }), [secs, qs]);
  const secOfIdx = (i: number) => ranges.findIndex((r) => r.idx.includes(i));

  const [st, setSt] = useState<St>(() => ({
    answers: Array(n).fill(null),
    marked: Array(n).fill(false),
    visited: Array.from({ length: n }, (_, i) => i === 0),
    times: Array(n).fill(0),
    cur: 0,
    draft: null,
    secLeft: secs.map((s) => SEC_TIME[s]),
    totalLeft: paper.drill ? Math.max(120, n * 34) : 2700,
    activeSec: 0,
    done: false,
    flash: '',
  }));
  const [modal, setModal] = useState<null | 'paper' | 'instr' | 'submitSec' | 'submitTest' | 'quit'>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const finished = useRef(false);
  const qTop = useRef<HTMLDivElement>(null);

  // ----- pure state helpers -----
  const gotoS = (s: St, i: number): St => {
    const visited = s.visited.slice();
    visited[i] = true;
    return { ...s, cur: i, visited, draft: s.answers[i] };
  };
  const advanceSection = (s: St): St => {
    if (s.activeSec >= ranges.length - 1) return { ...s, done: true };
    const next = s.activeSec + 1;
    return { ...gotoS({ ...s, activeSec: next }, ranges[next].first), flash: `${SECTION_LABEL[ranges[s.activeSec].s]} submitted. ${SECTION_LABEL[ranges[next].s]} has started.` };
  };
  const nextIdx = (s: St): number => {
    const sec = secOfIdx(s.cur);
    const r = ranges[sec];
    const pos = r.idx.indexOf(s.cur);
    if (pos < r.idx.length - 1) return r.idx[pos + 1];
    if (strict) return r.first;
    return ranges[(sec + 1) % ranges.length].first;
  };

  // ----- timer -----
  useEffect(() => {
    const id = window.setInterval(() => {
      setSt((s) => {
        if (s.done) return s;
        const times = s.times.slice();
        times[s.cur] += 1;
        if (strict) {
          const secLeft = s.secLeft.slice();
          secLeft[s.activeSec] -= 1;
          const ns = { ...s, times, secLeft };
          if (secLeft[s.activeSec] <= 0) {
            // auto-save current draft like the real CBT does not; unsaved selections are discarded
            return advanceSection(ns);
          }
          return ns;
        }
        const totalLeft = s.totalLeft - 1;
        return totalLeft <= 0 ? { ...s, times, totalLeft: 0, done: true } : { ...s, times, totalLeft };
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (!finished.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, []);

  useEffect(() => {
    if (st.flash) {
      const t = window.setTimeout(() => setSt((s) => ({ ...s, flash: '' })), 4000);
      return () => window.clearTimeout(t);
    }
  }, [st.flash]);

  useEffect(() => {
    qTop.current?.scrollTo?.({ top: 0 });
  }, [st.cur]);

  // ----- finish -----
  useEffect(() => {
    if (!st.done || finished.current) return;
    finished.current = true;
    const result = computeResults(qs, st.answers, st.times, st.marked, st.visited);
    if (!paper.drill) {
      const secMap = {} as HistoryEntry['sections'];
      result.sections.forEach((g) => { secMap[g.label as SectionKey] = { net: netOf(g), correct: g.correct, wrong: g.wrong, attempted: g.correct + g.wrong }; });
      saveHistory({
        id: `${paper.dateKey}-${paper.testNo}-${Date.now()}`,
        at: new Date().toISOString(),
        dateKey: paper.dateKey,
        testNo: paper.testNo,
        label: paper.label,
        mode: paper.mode,
        exam: 'rrb-clerk',
        maxMarks: qs.length,
        level: paper.level || 'Moderate',
        topicStats: topicStatsOf(result),
        net: result.net,
        correct: result.correct,
        wrong: result.wrong,
        skipped: result.skipped,
        attempted: result.attempted,
        accuracy: Math.round(result.accuracy * 10) / 10,
        timeSec: result.timeSec,
        sections: secMap,
        weakTopics: result.topics.filter((t) => netOf(t) < t.total * 0.5).sort((a, b) => netOf(a) / a.total - netOf(b) / b.total).slice(0, 3).map((t) => t.label),
      });
    }
    onFinish({ answers: st.answers, times: st.times, marked: st.marked, visited: st.visited, result });
  }, [st.done]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- actions -----
  const act = {
    select: (k: number) => setSt((s) => ({ ...s, draft: k })),
    saveNext: () => setSt((s) => {
      const answers = s.answers.slice();
      const marked = s.marked.slice();
      answers[s.cur] = s.draft;
      marked[s.cur] = false;
      const flash = s.draft === null ? 'No option selected — question left Not Answered.' : '';
      return { ...gotoS({ ...s, answers, marked }, nextIdx(s)), flash };
    }),
    markNext: () => setSt((s) => {
      const answers = s.answers.slice();
      const marked = s.marked.slice();
      if (s.draft !== null) answers[s.cur] = s.draft;
      marked[s.cur] = true;
      return gotoS({ ...s, answers, marked }, nextIdx(s));
    }),
    next: () => setSt((s) => gotoS(s, nextIdx(s))),
    clear: () => setSt((s) => { const answers = s.answers.slice(); answers[s.cur] = null; return { ...s, answers, draft: null }; }),
    prev: () => setSt((s) => {
      const r = ranges[secOfIdx(s.cur)];
      const pos = r.idx.indexOf(s.cur);
      if (pos > 0) return gotoS(s, r.idx[pos - 1]);
      if (!strict) { const ps = (secOfIdx(s.cur) - 1 + ranges.length) % ranges.length; return gotoS(s, ranges[ps].last); }
      return s;
    }),
    jump: (i: number) => setSt((s) => (strict && secOfIdx(i) !== s.activeSec ? { ...s, flash: 'This section is locked in Strict Real Exam mode.' } : gotoS(s, i))),
    switchSec: (k: number) => setSt((s) => {
      if (strict) return k === s.activeSec ? s : { ...s, flash: k < s.activeSec ? 'Submitted sections cannot be reopened.' : 'Sections unlock in order when the timer ends or you submit the section.' };
      return gotoS(s, ranges[k].first);
    }),
    submitSection: () => { setModal(null); setSt((s) => advanceSection(s)); },
    submitTest: () => { setModal(null); setSt((s) => ({ ...s, done: true })); },
  };

  // ----- keyboard shortcuts -----
  const actRef = useRef(act);
  actRef.current = act;
  const modalRef = useRef(modal);
  modalRef.current = modal;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' && (el as HTMLInputElement).type !== 'radio' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (modalRef.current || e.ctrlKey || e.metaKey || e.altKey) return;
      const a = actRef.current;
      const k = e.key;
      let handled = true;
      if (/^[1-5]$/.test(k)) a.select(Number(k) - 1);
      else if (k === 'C' || (k === 'c' && e.shiftKey) || k === 'Delete' || k === 'Backspace') a.clear();
      else if (/^[abdeABDE]$/.test(k) || k === 'c') a.select('abcde'.indexOf(k.toLowerCase()));
      else if (k === 'Enter') a.saveNext();
      else if (k === 'm' || k === 'M') a.markNext();
      else if (k === 'ArrowLeft') a.prev();
      else if (k === 'ArrowRight') a.next();
      else handled = false;
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const tileOf = (s: St, i: number): Tile => {
    const ans = s.answers[i] !== null;
    if (s.marked[i]) return ans ? 'answeredMarked' : 'marked';
    if (ans) return 'answered';
    return s.visited[i] ? 'notAnswered' : 'notVisited';
  };
  const countsFor = (idx: number[]) => {
    const c: Record<Tile, number> = { answered: 0, notAnswered: 0, marked: 0, answeredMarked: 0, notVisited: 0 };
    idx.forEach((i) => (c[tileOf(st, i)] += 1));
    return c;
  };

  const curSec = secOfIdx(st.cur);
  const viewSec = strict ? st.activeSec : curSec;
  const q = qs[st.cur];
  const secRange = ranges[viewSec];
  const numInSec = secRange.idx.indexOf(st.cur) + 1;
  const left = strict ? st.secLeft[st.activeSec] : st.totalLeft;
  const timerTone = left < 180 ? 'red' : left < 300 ? 'amber' : '';
  const elapsed = st.times.reduce((a, b) => a + b, 0);
  const totalRemaining = strict ? st.secLeft.slice(st.activeSec).reduce((a, b) => a + Math.max(0, b), 0) : st.totalLeft;
  const isLastSec = st.activeSec === ranges.length - 1;
  const c = countsFor(secRange.idx);
  const hasSide = !!(q.passage || q.table);

  const Legend = ({ cc }: { cc: Record<Tile, number> }) => (
    <div className="pal-legend">
      <span><i className="pal answered">{cc.answered}</i>Answered</span>
      <span><i className="pal notAnswered">{cc.notAnswered}</i>Not Answered</span>
      <span><i className="pal notVisited">{cc.notVisited}</i>Not Visited</span>
      <span><i className="pal marked">{cc.marked}</i>Marked for Review</span>
      <span className="wide"><i className="pal answeredMarked">{cc.answeredMarked}</i>Answered &amp; Marked for Review (will be considered for evaluation)</span>
    </div>
  );

  const summaryTable = (
    <table className="std-table">
      <thead><tr><th>Section</th><th>No. of Qs</th><th>Answered</th><th>Not Answered</th><th>Marked for Review</th><th>Ans. &amp; Marked</th><th>Not Visited</th></tr></thead>
      <tbody>
        {ranges.map((r) => { const k = countsFor(r.idx); return (
          <tr key={r.s}><td>{SECTION_LABEL[r.s]}</td><td>{r.idx.length}</td><td>{k.answered}</td><td>{k.notAnswered}</td><td>{k.marked}</td><td>{k.answeredMarked}</td><td>{k.notVisited}</td></tr>
        ); })}
      </tbody>
    </table>
  );

  return (
    <div className="exam" style={{ ['--fs' as string]: String(fontScale) }}>
      <header className="exam-head">
        <div className="eh-left">
          <div className="logo sm">RRB</div>
          <div>
            <div className="eh-title">{paper.drill ? paper.label : `IBPS RRB Clerk Prelims · ${paper.label}`}</div>
            <div className="eh-sub">{paper.dateKey} · <span className={`level-tag ${(paper.level || 'Moderate').toLowerCase()}`}>{paper.level || 'Moderate'}</span> · {strict ? 'Strict Real Exam Mode' : paper.drill ? 'Retry Drill (untimed sections)' : 'Practice / Free Switch Mode'}</div>
          </div>
        </div>
        <div className="eh-right">
          <div className="font-toggle" role="group" aria-label="Text size">
            {FONT_STEPS.map((f, i) => (
              <button key={f} className={Math.abs(fontScale - f) < 0.01 ? 'on' : ''} onClick={() => setFontScale(f)} aria-label={['Smaller text', 'Normal text', 'Larger text'][i]} title={['Smaller text', 'Normal text', 'Larger text'][i]}>{['A−', 'A', 'A+'][i]}</button>
            ))}
          </div>
          <div className={`timer ${timerTone}`}>
            <span className="t-label">{strict ? `${secRange.s === 'Numerical' ? 'Quant' : 'Reasoning'} section` : 'Time Left'}</span>
            <span className="t-val">{fmtClock(left)}</span>
          </div>
          <div className="timer overall">
            <span className="t-label">Overall left</span>
            <span className="t-val">{fmtClock(totalRemaining)}</span>
          </div>
        </div>
      </header>

      <div className="exam-toolbar">
        <div className="sec-tabs" role="tablist">
          {ranges.map((r, k) => {
            const locked = strict && k !== st.activeSec;
            const doneSec = strict && k < st.activeSec;
            return (
              <button key={r.s} role="tab" className={`sec-tab ${k === viewSec ? 'on' : ''} ${locked ? 'locked' : ''}`} onClick={() => act.switchSec(k)}>
                {doneSec ? '✓ ' : locked ? '🔒 ' : ''}{SECTION_LABEL[r.s]} <small>({r.idx.length})</small>
              </button>
            );
          })}
        </div>
        <div className="tool-btns">
          <button className="btn tiny" onClick={() => setModal('paper')}>📄 Question Paper</button>
          <button className="btn tiny" onClick={() => setModal('instr')}>ℹ Instructions</button>
          <button className={`btn tiny keys-chip ${showKeys ? 'on' : ''}`} onClick={() => setShowKeys((v) => !v)} aria-expanded={showKeys}>⌨ Shortcuts</button>
          <button className="btn tiny mobile-only" onClick={() => setShowPalette((v) => !v)}>▦ Palette</button>
        </div>
      </div>

      {showKeys && (
        <div className="keys-bar">
          <span><kbd>1</kbd>–<kbd>5</kbd> / <kbd>A</kbd>–<kbd>E</kbd> select</span>
          <span><kbd>Enter</kbd> Save &amp; Next</span>
          <span><kbd>M</kbd> Mark &amp; Next</span>
          <span><kbd>Shift</kbd>+<kbd>C</kbd> / <kbd>Del</kbd> Clear</span>
          <span><kbd>←</kbd> Previous · <kbd>→</kbd> Next</span>
        </div>
      )}
      {st.flash && <div className="flash">{st.flash}</div>}

      <div className="exam-body">
        <section className="q-area">
          <div className="q-head">
            <span className="q-no">Question No. {numInSec}</span>
            <span className="q-meta">
              <span className="pill">{q.topic}</span>
              <span className="mk pos">+1</span><span className="mk neg">−0.25</span>
              <span className="q-time">⏱ {fmtClock(st.times[st.cur])}</span>
            </span>
          </div>
          <div className={`q-scroll ${hasSide ? 'split' : ''}`} ref={qTop}>
            {hasSide && (
              <div className="q-passage">
                {q.passageTitle && <div className="passage-title">{q.passageTitle}</div>}
                {q.passage && <Pre text={q.passage} />}
                {q.table && <DIView table={q.table} />}
              </div>
            )}
            <div className="q-main">
              <Pre className="q-text" text={q.question} />
              <div className="opts" role="radiogroup">
                {q.options.map((o, k) => (
                  <label key={k} className={`opt ${st.draft === k ? 'sel' : ''}`}>
                    <input type="radio" name={`q${st.cur}`} checked={st.draft === k} onChange={() => act.select(k)} />
                    <span className="opt-letter">{LETTERS[k]}</span>
                    <span className="opt-text">{o}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="q-actions">
            <div className="btn-row">
              <button className="btn" onClick={act.markNext}>Mark for Review &amp; Next</button>
              <button className="btn" onClick={act.clear}>Clear Response</button>
            </div>
            <div className="btn-row">
              <button className="btn" onClick={act.prev}>Previous</button>
              <button className="btn save" onClick={act.saveNext}>Save &amp; Next</button>
            </div>
          </div>
        </section>

        <aside className={`side ${showPalette ? 'open' : ''}`}>
          <div className="cand">
            <div className="avatar">{(candidate || 'C').trim().slice(0, 1).toUpperCase()}</div>
            <div>
              <div className="cand-name">{candidate}</div>
              <div className="small muted">Elapsed {fmtClock(elapsed)}</div>
            </div>
          </div>
          <Legend cc={c} />
          <div className="pal-title">{SECTION_LABEL[secRange.s]} — choose a question</div>
          <div className="palette">
            {secRange.idx.map((i, k) => (
              <button key={i} className={`pal ${tileOf(st, i)} ${i === st.cur ? 'current' : ''}`} onClick={() => { act.jump(i); setShowPalette(false); }} aria-label={`Question ${k + 1}`}>
                {k + 1}
              </button>
            ))}
          </div>
          <div className="side-actions">
            {strict && !isLastSec ? (
              <button className="btn warn" onClick={() => setModal('submitSec')}>Submit Section Early</button>
            ) : (
              <button className="btn submit" onClick={() => setModal('submitTest')}>Submit Test</button>
            )}
            <button className="btn ghost tiny" onClick={() => setModal('quit')}>Exit without saving</button>
          </div>
        </aside>
      </div>

      {modal === 'paper' && (
        <Modal title={`Question Paper — ${SECTION_LABEL[secRange.s]}`} onClose={() => setModal(null)} wide>
          <ol className="qp-list">
            {secRange.idx.map((i, k) => (
              <li key={i}>
                <button className="qp-item" onClick={() => { act.jump(i); setModal(null); }}>
                  <span className={`pal mini ${tileOf(st, i)}`}>{k + 1}</span>
                  <span className="qp-text">{qs[i].question.split('\n').filter(Boolean).slice(-1)[0].slice(0, 160)}</span>
                  <span className="pill">{qs[i].topic}</span>
                </button>
              </li>
            ))}
          </ol>
        </Modal>
      )}
      {modal === 'instr' && (
        <Modal title="Instructions" onClose={() => setModal(null)}>
          <ul className="instr-list">
            <li>{strict ? 'Reasoning has 25 minutes and Numerical Ability 20 minutes; each section opens only after the previous one ends.' : 'One 45-minute timer runs for the whole paper; switch sections from the tabs.'}</li>
            <li>Shortcuts: 1–5 or A–E select, Enter = Save &amp; Next, M = Mark &amp; Next, Shift+C or Delete = Clear, ← / → = Previous / Next.</li>
            <li>Select an option and click <b>Save &amp; Next</b> to save it. Unsaved selections are discarded when you move away.</li>
            <li><b>Mark for Review &amp; Next</b> saves the selected option (if any) and flags the question. Answered &amp; marked questions are evaluated.</li>
            <li>+1 for a correct answer, −0.25 for a wrong answer, 0 for unattempted.</li>
          </ul>
          <Legend cc={c} />
        </Modal>
      )}
      {modal === 'submitSec' && (
        <Modal title="Submit section?" onClose={() => setModal(null)} wide>
          <p>You still have <b>{fmtClock(st.secLeft[st.activeSec])}</b> left in {SECTION_LABEL[secRange.s]}. Once submitted, you <b>cannot return</b> to this section. The unused time is not carried forward.</p>
          {summaryTable}
          <div className="row-between">
            <button className="btn" onClick={() => setModal(null)}>No, go back</button>
            <button className="btn warn" onClick={act.submitSection}>Yes, submit section</button>
          </div>
        </Modal>
      )}
      {modal === 'submitTest' && (
        <Modal title="Exam summary" onClose={() => setModal(null)} wide>
          {summaryTable}
          <p>Are you sure you want to submit the test? You will not be able to change your answers after submission.</p>
          <div className="row-between">
            <button className="btn" onClick={() => setModal(null)}>No, continue</button>
            <button className="btn submit" onClick={act.submitTest}>Yes, submit test</button>
          </div>
        </Modal>
      )}
      {modal === 'quit' && (
        <Modal title="Exit test?" onClose={() => setModal(null)}>
          <p>Your answers will be discarded and this attempt will not be saved.</p>
          <div className="row-between">
            <button className="btn" onClick={() => setModal(null)}>Continue test</button>
            <button className="btn danger" onClick={() => { finished.current = true; onQuit(); }}>Exit</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

