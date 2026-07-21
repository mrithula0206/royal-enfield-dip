import { useEffect, useState } from 'react';
import { api } from '../api';

const KPI_ROWS = [
  { key: 'Leads', label: 'Leads' }, { key: 'New_Leads', label: 'New Leads' },
  { key: 'Enquiries', label: 'Enquiries' }, { key: 'Open_Enquiries', label: 'Open Enquiries' },
  { key: 'Bookings', label: 'Bookings' }, { key: 'Dropped', label: 'Dropped' },
  { key: 'Retail', label: 'Retail' }, { key: 'E2B_pct', label: 'E2B%', isPct: true },
  { key: 'L2B_pct', label: 'L2B%', isPct: true }, { key: 'Duplicate_pct', label: 'Duplicate%', isPct: true },
];

const DAILY_COLS = [
  { key: 'Leads', label: 'Leads' }, { key: 'Enquiries', label: 'Enquiries' },
  { key: 'Bookings', label: 'Bookings' }, { key: 'Open_Enquiries', label: 'Open Enquiries' },
  { key: 'Dropped', label: 'Dropped' },
];

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

const dateInputStyle = { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '7px 10px', fontSize: 12 };

export default function Reports() {
  const [tab, setTab] = useState('mom');
  const [mom, setMom] = useState(null);
  const [dailyPoints, setDailyPoints] = useState([]);
  const [minDate, setMinDate] = useState(null);
  const [maxDate, setMaxDate] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.monthOnMonth().then(setMom).catch(e => setError(e.message));
    api.dailyTrend({ granularity: 'daily', days: 61 }).then(r => {
      setDailyPoints(r.points);
      const ds = r.points.map(p => p.bucket);
      setMinDate(ds[0]);
      setMaxDate(ds[ds.length - 1]);
      setStartDate(ds[Math.max(0, ds.length - 19)]);
      setEndDate(ds[ds.length - 1]);
    }).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error-box">Could not reach the API ({error}).</div>;

  const rangeRows = dailyPoints.filter(p => (!startDate || p.bucket >= startDate) && (!endDate || p.bucket <= endDate));
  const totals = DAILY_COLS.reduce((acc, c) => {
    acc[c.key] = rangeRows.reduce((s, r) => s + (r[c.key] || 0), 0);
    return acc;
  }, {});

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Reports</div>
          <div className="page-meta">Month-on-month overview and day-by-day breakdown</div>
        </div>
      </div>

      <div className="tab-row">
        <button className={tab === 'mom' ? 'on' : ''} onClick={() => setTab('mom')}>Month on Month</button>
        <button className={tab === 'dod' ? 'on' : ''} onClick={() => setTab('dod')}>Daily Breakdown</button>
      </div>

      {tab === 'mom' && (
        !mom ? <div className="loading">Loading…</div> : (
          <div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">{mom.previous_period.label} → {mom.current_period.label}</div><div className="panel-sub">Overall KPI totals for each month</div></div>
            </div>
            <table>
              <thead><tr><th>KPI</th><th className="mono">{mom.previous_period.label}</th><th className="mono">{mom.current_period.label}</th><th>Change</th></tr></thead>
              <tbody>
                {KPI_ROWS.map(k => (
                  <tr key={k.key}>
                    <td>{k.label}</td>
                    <td className="mono">{fmt(mom.previous_period.kpis[k.key], k.isPct)}</td>
                    <td className="mono">{fmt(mom.current_period.kpis[k.key], k.isPct)}</td>
                    <DeltaCell v={mom.deltas[k.key]} unit={mom.deltas[k.key + '_unit']} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'dod' && (
        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Daily Breakdown</div><div className="panel-sub">Pick a date range — every day in between is shown as its own row</div></div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="date" value={startDate || ''} min={minDate} max={endDate || maxDate}
                onChange={e => setStartDate(e.target.value)} style={dateInputStyle} />
              <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>to</span>
              <input type="date" value={endDate || ''} min={startDate || minDate} max={maxDate}
                onChange={e => setEndDate(e.target.value)} style={dateInputStyle} />
            </div>
          </div>
          {!dailyPoints.length ? <div className="loading">Loading…</div> : rangeRows.length === 0 ? (
            <div className="empty-box">No data in that date range.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Date</th>{DAILY_COLS.map(c => <th key={c.key} className="mono">{c.label}</th>)}</tr>
                </thead>
                <tbody>
                  {rangeRows.map(r => (
                    <tr key={r.bucket}>
                      <td className="mono">{r.bucket}</td>
                      {DAILY_COLS.map(c => <td key={c.key} className="mono">{r[c.key]}</td>)}
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}>
                    <td>Total ({rangeRows.length} days)</td>
                    {DAILY_COLS.map(c => <td key={c.key} className="mono">{totals[c.key].toLocaleString('en-IN')}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
