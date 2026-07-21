import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { TOOLTIP_STYLE } from '../chartTheme';
import { IconShare, IconUsers, IconCalendarCheck, IconTarget } from '../components/Icons';

const CAT_COLORS = { Digital: '#3D7EBD', Affiliate: '#E8A33D', Dealer: '#5C6670' };

export default function SourcePerformance() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.drilldown('source'), api.masterData('source')])
      .then(([d, master]) => {
        const info = Object.fromEntries(master.rows.map(m => [m.Source, m]));
        setRows(d.rows.map(r => ({ ...r, ...info[r.Source] })));
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
          <table>
            <thead><tr><th>Source</th><th>Category</th><th className="mono">Leads</th><th className="mono">Bookings</th><th className="mono">E2B%</th><th className="mono">Dup%</th></tr></thead>
            <tbody>
              {rows.slice().sort((a, b) => b.Leads - a.Leads).map(r => (
                <tr key={r.Source}>
                  <td>{r.Source}</td>
                  <td><span className="tier-pill">{r.Source_Category}</span></td>
                  <td className="mono">{r.Leads}</td>
                  <td className="mono">{r.Bookings}</td>
                  <td className="mono">{(r.E2B_pct * 100).toFixed(1)}%</td>
                  <td className="mono">{(r.Duplicate_pct * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Source Mix</div><div className="panel-sub">Leads by category</div></div>
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
  );
}
