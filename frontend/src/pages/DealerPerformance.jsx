import { useEffect, useState } from 'react';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { IconBuilding, IconUsers, IconCalendarCheck, IconTarget } from '../components/Icons';

const VS_CLASS = { Over: 'pos', Under: 'neg', 'At Par': '' };

function pct(v) { return v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`; }

export default function DealerPerformance() {
  const [tab, setTab] = useState('leaderboard');
  const [rows, setRows] = useState(null);
  const [topBottom, setTopBottom] = useState(null);
  const [intel, setIntel] = useState(null);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('Leads');

  useEffect(() => {
    Promise.all([api.drilldown('dealer'), api.topBottom('dealers', { n: 5, min_leads: 20, metric: 'E2B_pct' })])
      .then(([d, tb]) => { setRows(d.rows); setTopBottom(tb); })
      .catch(e => setError(e.message));
    api.dealerIntelligence().then(setIntel).catch(() => {});
  }, []);

  if (error) return <div className="error-box">Could not reach the API ({error}).</div>;
  if (!rows) return <div className="loading">Loading dealer performance…</div>;

  const totalLeads = rows.reduce((s, r) => s + r.Leads, 0);
  const totalBookings = rows.reduce((s, r) => s + r.Bookings, 0);
  const totalEnquiries = rows.reduce((s, r) => s + r.Enquiries, 0);
  const avgE2B = totalEnquiries ? totalBookings / totalEnquiries : 0;

  const sorted = rows.slice().sort((a, b) => b[sortBy] - a[sortBy]).slice(0, 20);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Dealer Performance</div>
          <div className="page-meta">Funnel performance across all {rows.length} dealers</div>
        </div>
      </div>

      <div className="kpi-strip">
        <KpiCard label="Dealers" value={rows.length} accent="blue" icon={IconBuilding} />
        <KpiCard label="Total Leads" value={totalLeads} accent="blue" icon={IconUsers} />
        <KpiCard label="Total Bookings" value={totalBookings} accent="green" icon={IconCalendarCheck} />
        <KpiCard label="Avg E2B%" value={avgE2B} isPct accent="amber" icon={IconTarget} />
      </div>

      <div className="tab-row">
        <button className={tab === 'leaderboard' ? 'on' : ''} onClick={() => setTab('leaderboard')}>Leaderboard</button>
        <button className={tab === 'intel' ? 'on' : ''} onClick={() => setTab('intel')}>Leakage &amp; Benchmarking</button>
      </div>

      {tab === 'leaderboard' && (
        <div className="grid-2">
          <div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">Top 20 Dealers</div><div className="panel-sub">Ranked by {sortBy}</div></div>
              <div className="tab-row" style={{ marginBottom: 0 }}>
                {['Leads', 'Bookings', 'E2B_pct'].map(k => (
                  <button key={k} className={sortBy === k ? 'on' : ''} onClick={() => setSortBy(k)}>{k === 'E2B_pct' ? 'E2B%' : k}</button>
                ))}
              </div>
            </div>
            <table>
              <thead><tr><th>#</th><th>Dealer</th><th>Region</th><th>Tier</th><th className="mono">Leads</th><th className="mono">Bookings</th><th className="mono">E2B%</th></tr></thead>
              <tbody>
                {sorted.map((d, i) => (
                  <tr key={d.Dealer_ID}>
                    <td className="rank">{String(i + 1).padStart(2, '0')}</td>
                    <td>{d.Dealer_Name}</td><td>{d.Region}</td>
                    <td><span className="tier-pill">{d.Tier}</span></td>
                    <td className="mono">{d.Leads}</td>
                    <td className="mono">{d.Bookings}</td>
                    <td className="mono">{(d.E2B_pct * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <div className="panel-head"><div><div className="panel-title">Top / Bottom by E2B%</div><div className="panel-sub">min. 20 leads</div></div></div>
            <table>
              <thead><tr><th>#</th><th>Dealer</th><th className="mono">Leads</th><th className="mono">E2B%</th></tr></thead>
              <tbody>
                {topBottom.top.map((d, i) => (
                  <tr key={d.Dealer_ID}><td className="rank">{String(i + 1).padStart(2, '0')}</td><td>{d.Dealer_Name}</td><td className="mono">{d.Leads}</td><td className="mono pos">{(d.E2B_pct * 100).toFixed(1)}%</td></tr>
                ))}
                {topBottom.bottom.map((d, i) => (
                  <tr key={d.Dealer_ID + '_b'}><td className="rank">▼{i + 1}</td><td>{d.Dealer_Name}</td><td className="mono">{d.Leads}</td><td className="mono neg">{(d.E2B_pct * 100).toFixed(1)}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'intel' && (
        !intel ? <div className="loading">Loading…</div> : (
          <>
            <div className="kpi-strip">
              <KpiCard label="Active Dealers" value={intel.active_count} accent="green" icon={IconBuilding} />
              <KpiCard label="Inactive Dealers" value={intel.inactive_count} accent="red" icon={IconBuilding} />
            </div>
            <div className="panel">
              <div className="panel-head">
                <div><div className="panel-title">Leakage &amp; Region Benchmarking</div><div className="panel-sub">Leads-with-no-booking, bookings-with-no-retail, and performance vs each dealer's own region average</div></div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Dealer</th><th>Region</th><th>Tier</th><th>Active</th><th className="mono">Leads</th><th className="mono">Lead→No Booking</th><th className="mono">Booking→No Retail</th><th className="mono">L2B%</th><th className="mono">Region Avg</th><th>vs Region</th></tr></thead>
                  <tbody>
                    {intel.rows.slice(0, 40).map(d => (
                      <tr key={d.Dealer_ID}>
                        <td>{d.Dealer_Name}</td><td>{d.Region}</td>
                        <td><span className="tier-pill">{d.Tier}</span></td>
                        <td>{d.Active ? <span className="pos">Yes</span> : <span className="neg">No</span>}</td>
                        <td className="mono">{d.Leads}</td>
                        <td className="mono">{d.Lead_No_Booking_Leakage}</td>
                        <td className="mono">{d.Booking_No_Retail_Leakage}</td>
                        <td className="mono">{pct(d.L2B_pct)}</td>
                        <td className="mono">{pct(d.Region_Avg_L2B_pct)}</td>
                        <td className={VS_CLASS[d.Vs_Region] || ''}>{d.Vs_Region}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}
    </>
  );
}
