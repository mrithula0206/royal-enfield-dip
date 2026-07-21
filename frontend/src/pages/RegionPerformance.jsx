import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { CHART_GRID, CHART_AXIS, AXIS_TICK_STYLE, AXIS_TICK_MONO_STYLE, TOOLTIP_STYLE } from '../chartTheme';
import { IconMapPin, IconUsers, IconCalendarCheck, IconTarget } from '../components/Icons';

const BAND_COLORS = { High: '#2FA666', 'Medium-High': '#4C8FBD', Medium: '#E8A33D', 'Medium-Low': '#E8A33D', Low: '#D6323F' };

export default function RegionPerformance() {
  const [rows, setRows] = useState(null);
  const [topBottom, setTopBottom] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.drilldown('region'), api.topBottom('regions', { n: 5, min_leads: 0, metric: 'E2B_pct' })])
      .then(([d, tb]) => { setRows(d.rows); setTopBottom(tb); })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error-box">Could not reach the API ({error}).</div>;
  if (!rows) return <div className="loading">Loading region performance…</div>;

  const totalLeads = rows.reduce((s, r) => s + r.Leads, 0);
  const totalBookings = rows.reduce((s, r) => s + r.Bookings, 0);
  const totalEnquiries = rows.reduce((s, r) => s + r.Enquiries, 0);
  const avgE2B = totalEnquiries ? totalBookings / totalEnquiries : 0;
  const top = rows.slice().sort((a, b) => b.Leads - a.Leads)[0];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Region Performance</div>
          <div className="page-meta">Funnel performance across all {rows.length} regions</div>
        </div>
      </div>

      <div className="kpi-strip">
        <KpiCard label="Regions" value={rows.length} accent="blue" icon={IconMapPin} />
        <KpiCard label="Total Leads" value={totalLeads} accent="blue" icon={IconUsers} />
        <KpiCard label="Total Bookings" value={totalBookings} accent="green" icon={IconCalendarCheck} />
        <KpiCard label="Avg E2B%" value={avgE2B} isPct accent="amber" icon={IconTarget} />
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-head">
          <div><div className="panel-title">Leads by Region</div><div className="panel-sub">Colored by performance band</div></div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="Region" tick={AXIS_TICK_STYLE} axisLine={{ stroke: CHART_AXIS }} tickLine={false} />
            <YAxis tick={AXIS_TICK_MONO_STYLE} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="Leads" radius={[4, 4, 0, 0]}>
              {rows.map((r, i) => <Cell key={i} fill={BAND_COLORS[r.Performance_Band] || '#8A93A0'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">All Regions</div><div className="panel-sub">Full funnel breakdown</div></div>
          </div>
          <table>
            <thead><tr><th>Region</th><th>Zone</th><th className="mono">Leads</th><th className="mono">Bookings</th><th className="mono">E2B%</th><th className="mono">L2B%</th><th>Band</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.Region}>
                  <td>{r.Region}</td>
                  <td style={{ color: 'var(--text-dim)' }}>{r.Zone}</td>
                  <td className="mono">{r.Leads}</td>
                  <td className="mono">{r.Bookings}</td>
                  <td className="mono">{(r.E2B_pct * 100).toFixed(1)}%</td>
                  <td className="mono">{(r.L2B_pct * 100).toFixed(1)}%</td>
                  <td><span className="tier-pill">{r.Performance_Band}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head"><div><div className="panel-title">Top / Bottom by E2B%</div><div className="panel-sub">Conversion leaders and laggards</div></div></div>
          <table>
            <thead><tr><th>#</th><th>Region</th><th className="mono">Leads</th><th className="mono">E2B%</th></tr></thead>
            <tbody>
              {topBottom.top.map((r, i) => (
                <tr key={r.Region}><td className="rank">{String(i + 1).padStart(2, '0')}</td><td>{r.Region}</td><td className="mono">{r.Leads}</td><td className="mono pos">{(r.E2B_pct * 100).toFixed(1)}%</td></tr>
              ))}
              {topBottom.bottom.map((r, i) => (
                <tr key={r.Region + '_b'}><td className="rank">▼{i + 1}</td><td>{r.Region}</td><td className="mono">{r.Leads}</td><td className="mono neg">{(r.E2B_pct * 100).toFixed(1)}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
