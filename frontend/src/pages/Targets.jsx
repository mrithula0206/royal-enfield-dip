import { useEffect, useState } from 'react';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { IconTarget } from '../components/Icons';

const LEVELS = [
  { key: 'region', label: 'Region', col: 'Region' },
  { key: 'model', label: 'Model', col: 'Model' },
  { key: 'source', label: 'Source', col: 'Source' },
];

export default function Targets() {
  const [level, setLevel] = useState('region');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRows(null);
    api.targetVsActual({ level }).then(r => setRows(r.rows)).catch(e => setError(e.message));
  }, [level]);

  const def = LEVELS.find(l => l.key === level);
  const avgAch = rows && rows.length ? rows.reduce((s, r) => s + r.Booking_Achievement_pct, 0) / rows.length : 0;
  const onTrack = rows ? rows.filter(r => r.Booking_Achievement_pct >= 1).length : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Targets</div>
          <div className="page-meta">Lead &amp; booking targets vs. actuals, by dimension</div>
        </div>
      </div>

      <div className="tab-row">
        {LEVELS.map(l => (
          <button key={l.key} className={level === l.key ? 'on' : ''} onClick={() => setLevel(l.key)}>{l.label}</button>
        ))}
      </div>

      {error && <div className="error-box">Could not reach the API ({error}).</div>}
      {!rows && !error && <div className="loading">Loading targets…</div>}

      {rows && (
        <>
          <div className="kpi-strip">
            <KpiCard label={`${def.label}s Tracked`} value={rows.length} accent="blue" icon={IconTarget} />
            <KpiCard label="Avg Booking Achievement" value={avgAch} isPct accent="amber" icon={IconTarget} />
            <KpiCard label="On / Above Target" value={onTrack} accent="green" icon={IconTarget} />
          </div>

          <div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">{def.label}-wise Targets</div><div className="panel-sub">Lead &amp; booking target achievement</div></div>
            </div>
            <table>
              <thead>
                <tr><th>{def.label}</th><th className="mono">Lead Target</th><th className="mono">Lead Actual</th><th className="mono">Booking Target</th><th className="mono">Booking Actual</th><th>Achievement</th></tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const pct = r.Booking_Achievement_pct;
                  const color = pct >= 1 ? 'var(--green)' : pct >= 0.9 ? 'var(--amber)' : 'var(--red)';
                  return (
                    <tr key={r[def.col]}>
                      <td>{r[def.col]}</td>
                      <td className="mono">{r.Lead_Target}</td>
                      <td className="mono">{r.Lead_Actual}</td>
                      <td className="mono">{r.Booking_Target}</td>
                      <td className="mono">{r.Booking_Actual}</td>
                      <td className="bar-cell">
                        <div className="mini-bar-track"><div className="mini-bar-fill" style={{ width: `${Math.min(pct * 100, 100)}%`, background: color }}></div></div>
                        <span className="mono" style={{ color }}>{(pct * 100).toFixed(0)}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
