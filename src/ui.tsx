import type { ReactNode } from 'react';
import type { DataTable } from './gen/engine';

export function Modal({ title, onClose, children, wide }: { title: string; onClose?: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head">
          <span>{title}</span>
          {onClose && (
            <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
          )}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Bar({ value, max, color, label }: { value: number; max: number; color?: string; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="bar">
      <div className="bar-fill" style={{ width: `${pct}%`, background: color || 'var(--brand)' }} />
      {label && <span className="bar-label">{label}</span>}
    </div>
  );
}

const CHART_COLORS = ['#1f6fd1', '#f59e0b', '#16a34a'];

export function DIChart({ table }: { table: DataTable }) {
  const cols = table.columns.slice(1);
  const rows = table.rows.map((r) => ({ name: r[0], vals: r.slice(1).map(Number) }));
  const max = Math.max(...rows.flatMap((r) => r.vals));
  const top = Math.ceil(max / 100) * 100;
  const W = 520, H = 210, padL = 40, padB = 28, padT = 10;
  const gw = (W - padL - 10) / rows.length;
  const bw = Math.min(22, (gw - 14) / cols.length);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  return (
    <div className="di-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Bar chart: ${table.title}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 6} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
            <text x={padL - 6} y={y(t) + 4} fontSize="10" textAnchor="end" fill="#64748b">{t}</text>
          </g>
        ))}
        {rows.map((r, i) => (
          <g key={r.name}>
            {r.vals.map((v, j) => (
              <rect key={j} x={padL + i * gw + 7 + j * bw} y={y(v)} width={bw - 2} height={H - padB - y(v)} fill={CHART_COLORS[j]} rx="2" />
            ))}
            <text x={padL + i * gw + gw / 2} y={H - 10} fontSize="11" textAnchor="middle" fill="#334155">{r.name.length > 4 ? r.name.slice(0, 3) : r.name}</text>
          </g>
        ))}
      </svg>
      <div className="legend">
        {cols.map((c, j) => (
          <span key={c}><i style={{ background: CHART_COLORS[j] }} />{c}</span>
        ))}
      </div>
    </div>
  );
}

export function DataTableView({ table }: { table: DataTable }) {
  return (
    <div className="di-wrap">
      <div className="di-title">{table.title}</div>
      <div className="table-scroll">
        <table className="di-table">
          <thead>
            <tr>{table.columns.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {table.rows.map((r) => (
              <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <DIChart table={table} />
    </div>
  );
}

export function Sparkline({ values, max = 100, cutoff }: { values: number[]; max?: number; cutoff?: number }) {
  if (values.length < 2) return null;
  const W = 320, H = 80, pad = 6;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / (values.length - 1);
  const y = (v: number) => H - pad - ((H - 2 * pad) * Math.max(0, v)) / max;
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="spark" role="img" aria-label="Score trend">
      {cutoff !== undefined && <line x1={pad} x2={W - pad} y1={y(cutoff)} y2={y(cutoff)} stroke="#f59e0b" strokeDasharray="4 4" />}
      <path d={d} fill="none" stroke="#1f6fd1" strokeWidth="2.5" />
      {values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill="#1f6fd1" />)}
    </svg>
  );
}

/** Render text with line breaks preserved */
export function Pre({ text, className }: { text: string; className?: string }) {
  return <div className={`pre ${className || ''}`}>{text}</div>;
}

const LINE_COLORS = ['#1f6fd1', '#e4572e'];
export function LineChart({ table }: { table: DataTable }) {
  const cols = table.columns.slice(1);
  const rows = table.rows.map((r) => ({ name: r[0], vals: r.slice(1).map(Number) }));
  const max = Math.max(...rows.flatMap((r) => r.vals));
  const top = Math.ceil((max * 1.1) / 100) * 100;
  const W = 540, H = 240, padL = 44, padR = 20, padB = 30, padT = 18;
  const x = (i: number) => padL + (i * (W - padL - padR)) / (rows.length - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  return (
    <div className="di-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Line chart: ${table.title}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
            <text x={padL - 6} y={y(t) + 4} fontSize="10" textAnchor="end" fill="#64748b">{t}</text>
          </g>
        ))}
        {rows.map((r, i) => <text key={r.name} x={x(i)} y={H - 10} fontSize="11" textAnchor="middle" fill="#334155">{r.name}</text>)}
        {cols.map((c, j) => (
          <g key={c}>
            <path d={rows.map((r, i) => `${i ? 'L' : 'M'}${x(i)},${y(r.vals[j])}`).join(' ')} fill="none" stroke={LINE_COLORS[j]} strokeWidth="2.5" strokeDasharray={j ? '6 4' : undefined} />
            {rows.map((r, i) => (
              <g key={i}>
                <circle cx={x(i)} cy={y(r.vals[j])} r="4" fill="#fff" stroke={LINE_COLORS[j]} strokeWidth="2"><title>{`${c}, ${r.name}: ${r.vals[j]}`}</title></circle>
                <text x={x(i)} y={y(r.vals[j]) + (r.vals[j] >= r.vals[1 - j] ? -9 : 16)} fontSize="10.5" fontWeight="700" textAnchor="middle" fill={LINE_COLORS[j]}>{r.vals[j]}</text>
              </g>
            ))}
          </g>
        ))}
      </svg>
      <div className="legend">
        {cols.map((c, j) => <span key={c}><i style={{ background: LINE_COLORS[j] }} />{c}{j ? ' (dashed)' : ''}</span>)}
      </div>
    </div>
  );
}

const PIE_COLORS = ['#1f6fd1', '#f59e0b', '#16a34a', '#e4572e', '#7c3aed'];
export function PieChart({ table }: { table: DataTable }) {
  const rows = table.rows.map((r) => ({ name: r[0], v: Number(r[1]) }));
  const cx = 120, cy = 120, R = 100, r0 = 52;
  let acc = 0;
  const pt = (a: number, rad: number) => [cx + rad * Math.sin(a), cy - rad * Math.cos(a)];
  return (
    <div className="di-chart pie">
      <svg viewBox="0 0 400 240" role="img" aria-label={`Pie chart: ${table.title}`}>
        {rows.map((s, i) => {
          const a0 = (acc / 100) * 2 * Math.PI; acc += s.v; const a1 = (acc / 100) * 2 * Math.PI;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [x2, y2] = pt(a1, r0), [x3, y3] = pt(a0, r0);
          const [lx, ly] = pt((a0 + a1) / 2, (R + r0) / 2);
          return (
            <g key={s.name}>
              <path d={`M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${large} 0 ${x3},${y3} Z`} fill={PIE_COLORS[i]} stroke="#fff" strokeWidth="2"><title>{`Branch ${s.name}: ${s.v}%`}</title></path>
              <text x={lx} y={ly + 4} fontSize="12" fontWeight="700" textAnchor="middle" fill="#fff">{s.v}%</text>
            </g>
          );
        })}
        <text x={cx} y={cy - 4} fontSize="11" textAnchor="middle" fill="#64748b">Total</text>
        <text x={cx} y={cy + 13} fontSize="15" fontWeight="800" textAnchor="middle" fill="#0b3c7d">{table.total}</text>
        {rows.map((s, i) => (
          <g key={s.name} transform={`translate(256, ${42 + i * 32})`}>
            <rect width="14" height="14" rx="3" fill={PIE_COLORS[i]} />
            <text x="22" y="12" fontSize="13" fill="#1e293b">Branch {s.name} — {s.v}%</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function DIView({ table }: { table: DataTable }) {
  if (table.chart === 'line') return <div className="di-wrap"><div className="di-title">{table.title}</div><LineChart table={table} /></div>;
  if (table.chart === 'pie') return <div className="di-wrap"><div className="di-title">{table.title}</div><PieChart table={table} /></div>;
  return <DataTableView table={table} />;
}

/** Score (bars, out of max) + accuracy (line, %) across attempts */
export function TrendChart({ points, max, band }: { points: { label: string; score: number; acc: number }[]; max: number; band?: [number, number] }) {
  if (!points.length) return null;
  const W = 640, H = 230, padL = 36, padR = 36, padT = 14, padB = 34;
  const n = points.length;
  const gw = (W - padL - padR) / n;
  const yS = (v: number) => padT + (H - padT - padB) * (1 - Math.max(0, v) / max);
  const yA = (v: number) => padT + (H - padT - padB) * (1 - v / 100);
  const cx = (i: number) => padL + gw * i + gw / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="trend" role="img" aria-label="Score and accuracy trend">
      {band && <rect x={padL} width={W - padL - padR} y={yS(band[1])} height={yS(band[0]) - yS(band[1])} fill="#fef3c7" />}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={padL} x2={W - padR} y1={yS(max * f)} y2={yS(max * f)} stroke="#e2e8f0" />
          <text x={padL - 5} y={yS(max * f) + 4} fontSize="10" textAnchor="end" fill="#64748b">{Math.round(max * f)}</text>
          <text x={W - padR + 5} y={yA(100 * f) + 4} fontSize="10" fill="#e4572e">{Math.round(100 * f)}%</text>
        </g>
      ))}
      {points.map((p, i) => (
        <g key={i}>
          <rect x={cx(i) - Math.min(16, gw * 0.3)} width={Math.min(32, gw * 0.6)} y={yS(p.score)} height={H - padB - yS(p.score)} fill="#1f6fd1" rx="3"><title>{`${p.label}: ${p.score}/${max}, accuracy ${p.acc}%`}</title></rect>
          {n <= 16 && <text x={cx(i)} y={yS(p.score) - 4} fontSize="10" textAnchor="middle" fill="#0b3c7d" fontWeight="700">{p.score}</text>}
          {n <= 12 && <text x={cx(i)} y={H - 12} fontSize="9.5" textAnchor="middle" fill="#475569">{p.label}</text>}
        </g>
      ))}
      <path d={points.map((p, i) => `${i ? 'L' : 'M'}${cx(i)},${yA(p.acc)}`).join(' ')} fill="none" stroke="#e4572e" strokeWidth="2.2" />
      {points.map((p, i) => <circle key={i} cx={cx(i)} cy={yA(p.acc)} r="3.5" fill="#e4572e" />)}
    </svg>
  );
}
