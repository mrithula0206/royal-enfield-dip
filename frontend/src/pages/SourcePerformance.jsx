import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { CHART_GRID, AXIS_TICK_STYLE, AXIS_TICK_MONO_STYLE, TOOLTIP_STYLE } from '../chartTheme';
import { IconShare, IconUsers, IconCalendarCheck, IconTarget, IconBuilding } from '../components/Icons';

const CAT_COLORS = { Digital: '#3D7EBD', Affiliate: '#E8A33D', Dealer: '#5C6670' };

function pct(v) { return v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`; }

export default function SourcePerformance() {
  const [tab, setTab] = useState('sources');
  const [rows, setRows] = useState(null);
  const [walkin, setWalkin] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.drilldown('source'), api.masterData('source'), api.walkinSummary()])
      .then(([d, master, wi]) => {
        const info = Object.fromEntries(master.rows.map(m => [m.Source, m]));
        setRows(d.rows.map(r => ({ ...r, ...info[r.Source] })));
        setWalkin(wi);
      })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error-box">Could not reach the API ({error}).</div>;
  if (!rows) return <div className="loading">Loading source performance…</div>;

  const totalLeads = rows.reduce((s, r) => s + r.Leads, 0);
  const totalBookings = rows.reduce((s, r) => s + r.Bookings, 0);
  const totalEnquiries = rows.reduce((s, r) => s + r.Enquiries, 0);
  const avgE2B = totalEnquiries ? totalBookings / totalEnquiries : 0;
  const best = rows.slice().sort((a, b) => b.E2B_pct - a.E2B_pct)[0];

  const catTotals = {};
  rows.forEach(r => { catTotals[r.Source_Category] = (catTotals[r.Source_Category] || 0) + r.Leads; });
  const donutData = Object.entries(catTotals).map(([name, value]) => ({ name, value }));

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Source Performance</div>
          <div className="page-meta">Funnel performance across all {rows.length} sources</div>
        </div>
      </div>

      <div className="tab-row">
        <button className={tab === 'sources' ? 'on' : ''} onClick={() => setTab('sources')}>All Sources</button>
        <button className={tab === 'walkin' ? 'on' : ''} onClick={() => setTab('walkin')}>Walk-In Intelligence</button>
      </div>

      {tab === 'sources' && (
        <>
          <div className="kpi-strip">
            <KpiCard label="Sources" value={rows.length} accent="blue" icon={IconShare} />
            <KpiCard label="Total Leads" value={totalLeads} accent="blue" icon={IconUsers} />
            <KpiCard label="Total Bookings" value={totalBookings} accent="green" icon={IconCalendarCheck} />
            <KpiCard label="Best Converting" value={best.E2B_pct} isPct accent="amber" icon={IconTarget} compareLabel="source" compareValue={best.Source} />
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-head">
                <div><div className="panel-title">All Sources</div><div className="panel-sub">Digital · Affiliate · Dealer</div></div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Source</th><th>Category</th><th className="mono">Leads</th><th className="mono">Bookings</th><th className="mono">Retail</th><th className="mono">E2B%</th><th className="mono">Dup%</th></tr></thead>
                  <tbody>
                    {rows.slice().sort((a, b) => b.Leads - a.Leads).map(r => (
                      <tr key={r.Source}>
                        <td>{r.Source}</td>
                        <td><span className="tier-pill">{r.Source_Category}</span></td>
                        <td className="mono">{r.Leads}</td>
                        <td className="mono">{r.Bookings}</td>
                        <td className="mono">{r.Retail}</td>
                        <td className="mono">{(r.E2B_pct * 100).toFixed(1)}%</td>
                        <td className="mono">{(r.Duplicate_pct * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div><div className="panel-title">Source Mix</div><div className="panel-sub">Leads by category (Google vs Meta vs Affiliates, rolled up)</div></div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                    {donutData.map((entry, i) => <Cell key={i} fill={CAT_COLORS[entry.name] || '#8A93A0'} stroke="#fff" strokeWidth={3} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-legend">
                {donutData.map(d => (
                  <div className="donut-legend-row" key={d.name}>
                    <span className="donut-legend-left"><span className="donut-legend-dot" style={{ background: CAT_COLORS[d.name] }}></span>{d.name}</span>
                    <span className="donut-legend-value">{d.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'walkin' && (
        !walkin ? <div className="loading">Loading walk-in data…</div> : (
          <>
            <div className="kpi-strip">
              <KpiCard label="Walk-In Leads" value={walkin.kpis.Leads} accent="blue" icon={IconBuilding} />
              <KpiCard label="Walk-In Bookings" value={walkin.kpis.Bookings} accent="green" icon={IconCalendarCheck} />
              <KpiCard label="Walk-In Retail" value={walkin.kpis.Retail} accent="amber" icon={IconTarget} />
              <KpiCard label="L2B%" value={walkin.kpis.L2B_pct} isPct accent="purple" icon={IconTarget} compareLabel="share of total leads" compareValue={pct(walkin.kpis.Share_of_Total_Leads_pct)} />
            </div>
            <div className="panel">
              <div className="panel-head">
                <div><div className="panel-title">Walk-In Trend</div><div className="panel-sub">Daily leads &amp; bookings — trend read only, no A/B split exists for a true uplift test</div></div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={walkin.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="Date" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK_MONO_STYLE} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="Leads" stroke="var(--blue)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Bookings" stroke="var(--green)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )
      )}
    </>
  );
}
