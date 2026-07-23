import { useEffect, useState } from 'react';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { IconMegaphone, IconTarget, IconShield } from '../components/Icons';

const STATUS_CLASS = { Healthy: 'pos', 'Needs Attention': '', Critical: 'neg' };

function pct(v) { return v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`; }
function inr(v) { return v === null || v === undefined ? '—' : `₹${Math.round(v).toLocaleString('en-IN')}`; }

export default function Campaigns() {
  const [tab, setTab] = useState('all');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const [ranked, setRanked] = useState(null);
  const [costEff, setCostEff] = useState(null);
  const [impact, setImpact] = useState(null);

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
    api.campaignsRanked().then(setRanked).catch(() => {});
    api.campaignsCostEfficiency().then(setCostEff).catch(() => {});
    api.campaignsImpact().then(setImpact).catch(() => {});
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

      <div className="tab-row">
        <button className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All Campaigns</button>
        <button className={tab === 'ranked' ? 'on' : ''} onClick={() => setTab('ranked')}>Best &amp; Worst</button>
        <button className={tab === 'cost' ? 'on' : ''} onClick={() => setTab('cost')}>Cost Efficiency</button>
        <button className={tab === 'impact' ? 'on' : ''} onClick={() => setTab('impact')}>Campaign Impact</button>
      </div>

      {tab === 'all' && (
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
      )}

      {tab === 'ranked' && (
        !ranked ? <div className="loading">Loading…</div> : (
          <div className="grid-2">
            <div className="panel">
              <div className="panel-head"><div><div className="panel-title">Best Campaigns</div><div className="panel-sub">By L2B%, min. 20 leads</div></div></div>
              <table>
                <thead><tr><th>Campaign</th><th className="mono">Leads</th><th className="mono">L2B%</th></tr></thead>
                <tbody>
                  {ranked.top.map(r => (
                    <tr key={r.Campaign_ID}><td>{r.Campaign_Name}</td><td className="mono">{r.Leads}</td><td className="mono pos">{pct(r.L2B_pct)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel">
              <div className="panel-head"><div><div className="panel-title">Worst Campaigns</div><div className="panel-sub">By L2B%, min. 20 leads</div></div></div>
              <table>
                <thead><tr><th>Campaign</th><th className="mono">Leads</th><th className="mono">L2B%</th></tr></thead>
                <tbody>
                  {ranked.bottom.map(r => (
                    <tr key={r.Campaign_ID}><td>{r.Campaign_Name}</td><td className="mono">{r.Leads}</td><td className="mono neg">{pct(r.L2B_pct)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {tab === 'cost' && (
        !costEff ? <div className="loading">Loading…</div> : (
          <div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">Cost Efficiency</div><div className="panel-sub">CPL &amp; Cost-per-Booking, using Budget as an allocated-spend proxy. Avg cost/booking: {inr(costEff.avg_cost_per_booking)}</div></div>
            </div>
            <table>
              <thead><tr><th>Campaign</th><th className="mono">Budget</th><th className="mono">Leads</th><th className="mono">Bookings</th><th className="mono">CPL</th><th className="mono">Cost/Booking</th><th>Wastage</th></tr></thead>
              <tbody>
                {costEff.rows.map(r => (
                  <tr key={r.Campaign_ID}>
                    <td>{r.Campaign_Name}</td>
                    <td className="mono">{inr(r.Budget)}</td>
                    <td className="mono">{r.Leads}</td>
                    <td className="mono">{r.Bookings}</td>
                    <td className="mono">{inr(r.CPL)}</td>
                    <td className="mono">{inr(r.Cost_Per_Booking)}</td>
                    <td>{r.Wastage_Flag ? <span className="sev-tag High">Wastage</span> : <span style={{ color: 'var(--text-faint)' }}>—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'impact' && (
        !impact ? <div className="loading">Loading…</div> : (
          <div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">Campaign Start/End Impact</div><div className="panel-sub">Leads/day during the campaign vs an equal-length window right before it started</div></div>
            </div>
            <table>
              <thead><tr><th>Campaign</th><th className="mono">Duration</th><th className="mono">Leads/day Before</th><th className="mono">Leads/day During</th><th className="mono">Uplift%</th></tr></thead>
              <tbody>
                {impact.rows.map(r => (
                  <tr key={r.Campaign_ID}>
                    <td>{r.Campaign_Name}</td>
                    <td className="mono">{r.Duration_Days}d</td>
                    <td className="mono">{r.Leads_Per_Day_Before}</td>
                    <td className="mono">{r.Leads_Per_Day_During}</td>
                    <td className={`mono ${r.Uplift_pct > 0 ? 'pos' : r.Uplift_pct < 0 ? 'neg' : ''}`}>{r.Uplift_pct === null ? '—' : pct(r.Uplift_pct)}</td>
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
