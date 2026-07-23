import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { ModelThumb } from '../components/BikeArt';
import { CHART_GRID, CHART_AXIS, AXIS_TICK_STYLE, AXIS_TICK_MONO_STYLE, TOOLTIP_STYLE } from '../chartTheme';
import { IconBike, IconUsers, IconCalendarCheck, IconTarget } from '../components/Icons';

const TIER_ACCENT = { Entry: '#3D7EBD', Mid: '#E8A33D', Premium: '#D6323F' };

function pct(v) { return v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`; }

export default function ModelPerformance() {
  const [tab, setTab] = useState('lineup');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  const [crossDim, setCrossDim] = useState('zone');
  const [crossData, setCrossData] = useState(null);
  const [dropoff, setDropoff] = useState(null);

  useEffect(() => {
    Promise.all([api.drilldown('model'), api.masterData('model')])
      .then(([d, master]) => {
        const info = Object.fromEntries(master.rows.map(m => [m.Model, m]));
        setRows(d.rows.map(r => ({ ...r, ...info[r.Model] })));
      })
      .catch(e => setError(e.message));
    api.modelDropoff().then(setDropoff).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== 'cross') return;
    api.modelCross(crossDim).then(setCrossData).catch(() => {});
  }, [tab, crossDim]);

  if (error) return <div className="error-box">Could not reach the API ({error}).</div>;
  if (!rows) return <div className="loading">Loading model performance…</div>;

  const totalLeads = rows.reduce((s, r) => s + r.Leads, 0);
  const totalBookings = rows.reduce((s, r) => s + r.Bookings, 0);
  const totalEnquiries = rows.reduce((s, r) => s + r.Enquiries, 0);
  const avgE2B = totalEnquiries ? totalBookings / totalEnquiries : 0;
  const best = rows.slice().sort((a, b) => b.E2B_pct - a.E2B_pct)[0];

  let crossTable = null;
  if (crossData) {
    const byModel = {};
    crossData.rows.forEach(r => {
      byModel[r.Model] = byModel[r.Model] || {};
      byModel[r.Model][r[crossDim.charAt(0).toUpperCase() + crossDim.slice(1)]] = r.Leads;
    });
    crossTable = { dims: crossData.dims, models: crossData.models, byModel };
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Model Performance</div>
          <div className="page-meta">Funnel performance across all {rows.length} models</div>
        </div>
      </div>

      <div className="kpi-strip">
        <KpiCard label="Models" value={rows.length} accent="blue" icon={IconBike} />
        <KpiCard label="Total Leads" value={totalLeads} accent="blue" icon={IconUsers} />
        <KpiCard label="Total Bookings" value={totalBookings} accent="green" icon={IconCalendarCheck} />
        <KpiCard label="Best Converting" value={best.E2B_pct} isPct accent="amber" icon={IconTarget} compareLabel="model" compareValue={best.Model} />
      </div>

      <div className="tab-row">
        <button className={tab === 'lineup' ? 'on' : ''} onClick={() => setTab('lineup')}>Lineup</button>
        <button className={tab === 'cross' ? 'on' : ''} onClick={() => setTab('cross')}>Geography Cross-Tab</button>
        <button className={tab === 'dropoff' ? 'on' : ''} onClick={() => setTab('dropoff')}>Drop-off Flags</button>
      </div>

      {tab === 'lineup' && (
        <>
          <div className="panel" style={{ marginBottom: 14 }}>
            <div className="panel-head">
              <div><div className="panel-title">Leads vs Bookings by Model</div><div className="panel-sub">Sorted by lead volume</div></div>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="Model" tick={{ ...AXIS_TICK_STYLE, fontSize: 9 }} axisLine={{ stroke: CHART_AXIS }} tickLine={false} angle={-30} textAnchor="end" height={70} />
                <YAxis tick={AXIS_TICK_MONO_STYLE} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="Leads" fill="var(--blue)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Bookings" fill="var(--green)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">Model Lineup</div><div className="panel-sub">Engine segment, body style, retail &amp; conversion</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
              {rows.map(m => (
                <div key={m.Model} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'var(--surface)' }}>
                  <div style={{ margin: '-14px -14px 10px', borderRadius: '12px 12px 0 0', overflow: 'hidden', background: 'var(--border-soft)' }}>
                    <ModelThumb model={m.Model} bodyStyle={m.Body_Style} accent={TIER_ACCENT[m.Price_Tier] || '#D6323F'} />
                  </div>
                  <div style={{ fontFamily: 'var(--disp)', fontWeight: 700, fontSize: 13.5 }}>{m.Model}</div>
                  <div style={{ display: 'flex', gap: 6, margin: '6px 0 10px', flexWrap: 'wrap' }}>
                    <span className="tier-pill">{m.Engine_Segment}</span>
                    <span className="tier-pill">{m.Body_Style}</span>
                    <span className="tier-pill">{m.Price_Tier}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-dim)' }}>
                    <span>Leads <b className="mono" style={{ color: 'var(--text)' }}>{m.Leads}</b></span>
                    <span>Bookings <b className="mono" style={{ color: 'var(--text)' }}>{m.Bookings}</b></span>
                    <span>Retail <b className="mono" style={{ color: 'var(--text)' }}>{m.Retail}</b></span>
                    <span>E2B <b className="mono" style={{ color: 'var(--text)' }}>{(m.E2B_pct * 100).toFixed(1)}%</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'cross' && (
        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Model Demand Cross-Tab</div><div className="panel-sub">Leads by model, cross-tabbed against geography</div></div>
            <div className="toggle-group">
              {['zone', 'region', 'city'].map(d => (
                <button key={d} className={crossDim === d ? 'on' : ''} onClick={() => setCrossDim(d)}>{d[0].toUpperCase() + d.slice(1)}</button>
              ))}
            </div>
          </div>
          {!crossTable ? <div className="loading">Loading…</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Model</th>{crossTable.dims.map(d => <th key={d} className="mono">{d}</th>)}</tr>
                </thead>
                <tbody>
                  {crossTable.models.map(m => (
                    <tr key={m}>
                      <td>{m}</td>
                      {crossTable.dims.map(d => <td key={d} className="mono">{crossTable.byModel[m]?.[d] || 0}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'dropoff' && (
        !dropoff ? <div className="loading">Loading…</div> : (
          <div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">Drop-off Flags</div><div className="panel-sub">High lead volume (above fleet avg of {dropoff.avg_leads}) but below-average conversion ({pct(dropoff.avg_l2b_pct)}) — high visibility, weak conversion</div></div>
            </div>
            <table>
              <thead><tr><th>Model</th><th className="mono">Leads</th><th className="mono">Bookings</th><th className="mono">L2B%</th><th>Flag</th></tr></thead>
              <tbody>
                {dropoff.rows.map(r => (
                  <tr key={r.Model}>
                    <td>{r.Model}</td><td className="mono">{r.Leads}</td><td className="mono">{r.Bookings}</td>
                    <td className="mono">{pct(r.L2B_pct)}</td>
                    <td>{r.Flagged ? <span className="sev-tag High">Needs Attention</span> : <span style={{ color: 'var(--text-faint)' }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  );
}
