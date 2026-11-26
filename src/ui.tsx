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
