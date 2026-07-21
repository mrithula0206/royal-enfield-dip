import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../api';
import { useFilters } from '../FilterContext';
import { CHART_GRID, CHART_AXIS, AXIS_TICK_STYLE, AXIS_TICK_MONO_STYLE, TOOLTIP_STYLE } from '../chartTheme';

const KPI_ROWS = [
  { key: 'Leads', label: 'Leads' }, { key: 'New_Leads', label: 'New Leads' },
  { key: 'Enquiries', label: 'Enquiries' }, { key: 'Open_Enquiries', label: 'Open Enquiries' },
  { key: 'Bookings', label: 'Bookings' }, { key: 'Dropped', label: 'Dropped' },
  { key: 'Retail', label: 'Retail' }, { key: 'E2B_pct', label: 'E2B%', isPct: true },
  { key: 'L2B_pct', label: 'L2B%', isPct: true }, { key: 'Duplicate_pct', label: 'Duplicate%', isPct: true },
];
const CHART_KEYS = ['Leads', 'Enquiries', 'Bookings', 'Open_Enquiries', 'Dropped'];

function fmt(v, isPct) {
  if (v === null || v === undefined) return '—';
  return isPct ? `${(v * 100).toFixed(1)}%` : v.toLocaleString('en-IN');
}

function DeltaCell({ v, unit }) {
  if (v === null || v === undefined) return <td className="mono">—</td>;
  const cls = v > 0 ? 'pos' : v < 0 ? 'neg' : '';
  const text = unit === 'pts' ? `${v > 0 ? '▲' : v < 0 ? '▼' : '—'} ${Math.abs(v).toFixed(1)} pts` : `${v > 0 ? '▲' : v < 0 ? '▼' : '—'} ${Math.abs(v * 100).toFixed(1)}%`;
  return <td className={`mono ${cls}`}>{text}</td>;
}

const selectStyle = { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '8px 12px', fontSize: 12.5 };

export default function Comparisons() {
  const f = useFilters();
  const [monthA, setMonthA] = useState(null);
  const [monthB, setMonthB] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (f?.months?.length && !monthA) {
      setMonthA(f.months[f.months.length - 1].value);
      setMonthB(f.months.length > 1 ? f.months[f.months.length - 2].value : f.months[f.months.length - 1].value);
    }
  }, [f?.months]);

  useEffect(() => {
    if (!monthA || !monthB) return;
    api.monthOnMonth({ current_month: monthA, previous_month: monthB }).then(setData).catch(e => setError(e.message));
  }, [monthA, monthB]);

  if (error) return <div className="error-box">Could not reach the API ({error}).</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Comparisons</div>
          <div className="page-meta">Compare full-month totals between any two months</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select style={selectStyle} value={monthA || ''} onChange={e => setMonthA(e.target.value)}>
            {(f?.months || []).map(m => <option key={m.value} value={m.value}>{m.value}</option>)}
          </select>
          <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>vs</span>
          <select style={selectStyle} value={monthB || ''} onChange={e => setMonthB(e.target.value)}>
            {(f?.months || []).map(m => <option key={m.value} value={m.value}>{m.value}</option>)}
          </select>
        </div>
      </div>

      {!data ? <div className="loading">Loading comparison…</div> : (
        <>
          <div className="panel" style={{ marginBottom: 14 }}>
            <div className="panel-head">
              <div><div className="panel-title">{data.previous_period.label} vs {data.current_period.label}</div><div className="panel-sub">Funnel volume side by side</div></div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={CHART_KEYS.map(k => ({
                metric: k.replace('_', ' '),
                [data.previous_period.label]: data.previous_period.kpis[k],
                [data.current_period.label]: data.current_period.kpis[k],
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="metric" tick={AXIS_TICK_STYLE} axisLine={{ stroke: CHART_AXIS }} tickLine={false} />
                <YAxis tick={AXIS_TICK_MONO_STYLE} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={data.previous_period.label} fill="#8A93A0" radius={[4, 4, 0, 0]} />
                <Bar dataKey={data.current_period.label} fill="var(--red)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">Full KPI Comparison</div><div className="panel-sub">All executive KPIs, both months</div></div>
            </div>
            <table>
              <thead><tr><th>KPI</th><th className="mono">{data.previous_period.label}</th><th className="mono">{data.current_period.label}</th><th>Change</th></tr></thead>
              <tbody>
                {KPI_ROWS.map(k => (
                  <tr key={k.key}>
                    <td>{k.label}</td>
                    <td className="mono">{fmt(data.previous_period.kpis[k.key], k.isPct)}</td>
                    <td className="mono">{fmt(data.current_period.kpis[k.key], k.isPct)}</td>
                    <DeltaCell v={data.deltas[k.key]} unit={data.deltas[k.key + '_unit']} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
