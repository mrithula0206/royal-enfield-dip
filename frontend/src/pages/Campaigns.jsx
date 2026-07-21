import { useEffect, useState } from 'react';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { IconMegaphone, IconTarget, IconShield } from '../components/Icons';

const STATUS_CLASS = { Healthy: 'pos', 'Needs Attention': '', Critical: 'neg' };

export default function Campaigns() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    Promise.all([api.masterData('campaign'), api.drilldown('campaign'), api.hygieneSummary()])
      .then(([master, d, hygiene]) => {
        const funnel = Object.fromEntries(d.rows.map(r => [r.Campaign_ID, r]));
        const today = Object.fromEntries(hygiene.campaigns.map(c => [c.Campaign_ID, c.Overall_Status]));
        setRows(master.rows.map(c => ({
          ...c,
          Leads: funnel[c.Campaign_ID]?.Leads || 0,
          Bookings: funnel[c.Campaign_ID]?.Bookings || 0,
          L2B_pct: funnel[c.Campaign_ID]?.L2B_pct || 0,
          Today_Status: today[c.Campaign_ID] || '—',
        })));
      })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error-box">Could not reach the API ({error}).</div>;
  if (!rows) return <div className="loading">Loading campaigns…</div>;

  const counts = { Healthy: 0, 'Needs Attention': 0, Critical: 0 };
  rows.forEach(c => { counts[c.Campaign_Status] = (counts[c.Campaign_Status] || 0) + 1; });
  const totalBudget = rows.reduce((s, c) => s + c.Budget, 0);

  const filtered = statusFilter ? rows.filter(c => c.Campaign_Status === statusFilter) : rows;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Campaigns</div>
          <div className="page-meta">{rows.length} campaigns across all models and sources</div>
        </div>
      </div>

      <div className="kpi-strip">
        <KpiCard label="Campaigns" value={rows.length} accent="blue" icon={IconMegaphone} />
        <KpiCard label="Healthy" value={counts.Healthy} accent="green" icon={IconShield} />
        <KpiCard label="Needs Attention" value={counts['Needs Attention']} accent="amber" icon={IconShield} />
        <KpiCard label="Critical" value={counts.Critical} accent="red" icon={IconShield} />
        <KpiCard label="Total Budget" value={totalBudget} accent="purple" icon={IconTarget} />
      </div>

      <div className="panel">
        <div className="panel-head">
          <div><div className="panel-title">All Campaigns</div><div className="panel-sub">Status, spend and funnel performance</div></div>
          <div className="tab-row" style={{ marginBottom: 0 }}>
            <button className={statusFilter === '' ? 'on' : ''} onClick={() => setStatusFilter('')}>All</button>
            {['Healthy', 'Needs Attention', 'Critical'].map(s => (
              <button key={s} className={statusFilter === s ? 'on' : ''} onClick={() => setStatusFilter(s)}>{s}</button>
            ))}
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Campaign</th><th>Model</th><th>Source</th><th>Status</th><th className="mono">Leads</th><th className="mono">Bookings</th><th className="mono">L2B%</th><th>Today</th></tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.Campaign_ID}>
                <td><b>{c.Campaign_ID}</b> · {c.Campaign_Name}</td>
                <td>{c.Model}</td>
                <td>{c.Source}</td>
                <td className={STATUS_CLASS[c.Campaign_Status]}>{c.Campaign_Status}</td>
                <td className="mono">{c.Leads}</td>
                <td className="mono">{c.Bookings}</td>
                <td className="mono">{(c.L2B_pct * 100).toFixed(1)}%</td>
                <td className={c.Today_Status === 'Fail' ? 'neg' : 'pos'}>{c.Today_Status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
