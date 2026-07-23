import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { CHART_GRID, AXIS_TICK_STYLE, AXIS_TICK_MONO_STYLE, TOOLTIP_STYLE } from '../chartTheme';
import { IconShare, IconTarget, IconUsers, IconCalendarCheck, IconTv, IconWallet } from '../components/Icons';

function pct(v) { return v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`; }
function inr(v) { return v === null || v === undefined ? '—' : `₹${Math.round(v).toLocaleString('en-IN')}`; }

export default function MediaPerformance() {
  const [tab, setTab] = useState('digital');
  const [adSummary, setAdSummary] = useState(null);
  const [searchSplit, setSearchSplit] = useState(null);
  const [offlineSummary, setOfflineSummary] = useState(null);
  const [offlineByRegion, setOfflineByRegion] = useState(null);
  const [affSummary, setAffSummary] = useState(null);
  const [affPerf, setAffPerf] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.adPerformanceSummary(), api.adPerformanceSearchSplit(),
      api.offlineSummary(), api.offlineByRegion(),
      api.affiliateSummary(), api.affiliatePerformance(),
    ]).then(([ads, split, off, offRegion, aff, affPerformance]) => {
      setAdSummary(ads); setSearchSplit(split.rows);
      setOfflineSummary(off); setOfflineByRegion(offRegion.rows);
      setAffSummary(aff); setAffPerf(affPerformance.rows);
    }).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error-box">Could not reach the API ({error}).</div>;
  if (!adSummary) return <div className="loading">Loading media performance…</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Media Performance</div>
          <div className="page-meta">Paid digital, offline media, and affiliate lead-gen partner economics</div>
        </div>
      </div>

      <div className="tab-row">
        <button className={tab === 'digital' ? 'on' : ''} onClick={() => setTab('digital')}>Digital Ads</button>
        <button className={tab === 'offline' ? 'on' : ''} onClick={() => setTab('offline')}>Offline Campaigns</button>
        <button className={tab === 'affiliate' ? 'on' : ''} onClick={() => setTab('affiliate')}>Affiliate Payouts</button>
      </div>

      {tab === 'digital' && (
        <>
          <div className="kpi-strip">
            <KpiCard label="Ad Spend" value={Math.round(adSummary.totals.spend)} accent="blue" icon={IconWallet} />
            <KpiCard label="Leads Generated" value={adSummary.totals.leads} accent="blue" icon={IconUsers} />
            <KpiCard label="Bookings Generated" value={adSummary.totals.bookings} accent="green" icon={IconCalendarCheck} />
            <KpiCard label="Blended CPL" value={Math.round(adSummary.totals.blended_cpl)} accent="amber" icon={IconTarget} compareLabel="L2B" compareValue={pct(adSummary.totals.blended_l2b_pct)} />
          </div>

          <div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">Channel Performance</div><div className="panel-sub">Google Search split into Brand vs Generic</div></div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>Channel</th><th className="mono">Impressions</th><th className="mono">Clicks</th><th className="mono">Spend</th><th className="mono">Leads</th><th className="mono">Bookings</th><th className="mono">CTR</th><th className="mono">CPC</th><th className="mono">CPL</th><th className="mono">L2B%</th></tr></thead>
                <tbody>
                  {adSummary.by_channel.map(r => (
                    <tr key={r.Channel}>
                      <td>{r.Channel}</td>
                      <td className="mono">{r.Impressions.toLocaleString('en-IN')}</td>
                      <td className="mono">{r.Clicks.toLocaleString('en-IN')}</td>
                      <td className="mono">{inr(r.Spend)}</td>
                      <td className="mono">{r.Leads_Generated}</td>
                      <td className="mono">{r.Bookings_Generated}</td>
                      <td className="mono">{pct(r.CTR)}</td>
                      <td className="mono">{inr(r.CPC)}</td>
                      <td className="mono">{inr(r.CPL)}</td>
                      <td className="mono">{pct(r.L2B_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">Brand vs Generic Search</div><div className="panel-sub">Brand intent converts far better per lead, at lower CPL</div></div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={searchSplit || []}>
                <CartesianGrid vertical={false} stroke={CHART_GRID} />
                <XAxis dataKey="Search_Type" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_TICK_MONO_STYLE} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="Leads_Generated" name="Leads" fill="#3D7EBD" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Bookings_Generated" name="Bookings" fill="#3D9B6F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {tab === 'offline' && offlineSummary && (
        <>
          <div className="kpi-strip">
            <KpiCard label="Offline Spend" value={Math.round(offlineSummary.totals.spend)} accent="blue" icon={IconWallet} />
            <KpiCard label="Leads Generated" value={offlineSummary.totals.leads} accent="blue" icon={IconUsers} />
            <KpiCard label="Bookings Generated" value={offlineSummary.totals.bookings} accent="green" icon={IconCalendarCheck} />
            <KpiCard label="Channels" value={offlineSummary.by_channel.length} accent="amber" icon={IconTv} />
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-head">
                <div><div className="panel-title">TV / Print / OOH</div><div className="panel-sub">Spend vs response — offline media converts slower, at higher CPL</div></div>
              </div>
              <table>
                <thead><tr><th>Channel</th><th className="mono">Spend</th><th className="mono">Leads</th><th className="mono">Bookings</th><th className="mono">CPL</th><th className="mono">L2B%</th></tr></thead>
                <tbody>
                  {offlineSummary.by_channel.map(r => (
                    <tr key={r.Channel}>
                      <td>{r.Channel}</td>
                      <td className="mono">{inr(r.Spend)}</td>
                      <td className="mono">{r.Leads_Generated}</td>
                      <td className="mono">{r.Bookings_Generated}</td>
                      <td className="mono">{inr(r.CPL)}</td>
                      <td className="mono">{pct(r.L2B_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div><div className="panel-title">Top Regions by Offline Spend</div><div className="panel-sub">South/West zones weighted higher in flight planning</div></div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={(offlineByRegion || []).slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid horizontal={false} stroke={CHART_GRID} />
                  <XAxis type="number" tick={AXIS_TICK_MONO_STYLE} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="Region" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="Spend" fill="#3D7EBD" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {tab === 'affiliate' && affSummary && (
        <>
          <div className="kpi-strip">
            <KpiCard label="Leads Delivered" value={affSummary.totals.leads_delivered} accent="blue" icon={IconUsers} />
            <KpiCard label="Amount Payable" value={Math.round(affSummary.totals.amount_payable)} accent="amber" icon={IconWallet} />
            <KpiCard label="Amount Paid" value={Math.round(affSummary.totals.amount_paid)} accent="green" icon={IconCalendarCheck} />
            <KpiCard label="Amount Receivable" value={Math.round(affSummary.totals.amount_receivable)} accent="red" icon={IconShare} />
          </div>

          <div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">Affiliate Partner Ledger</div><div className="panel-sub">Lead-gen partner CPL rates and outstanding balances</div></div>
            </div>
            <table>
              <thead><tr><th>Partner</th><th className="mono">Leads Delivered</th><th className="mono">CPL Rate</th><th className="mono">Payable</th><th className="mono">Paid</th><th className="mono">Receivable</th></tr></thead>
              <tbody>
                {affSummary.by_source.map(r => (
                  <tr key={r.Affiliate_Source}>
                    <td>{r.Affiliate_Source}</td>
                    <td className="mono">{r.Leads_Delivered}</td>
                    <td className="mono">{inr(r.CPL_Rate)}</td>
                    <td className="mono">{inr(r.Amount_Payable)}</td>
                    <td className="mono">{inr(r.Amount_Paid)}</td>
                    <td className="mono">{inr(r.Amount_Receivable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-head">
                <div><div className="panel-title">Payment Status Mix</div></div>
              </div>
              <div className="donut-legend">
                {affSummary.status_mix.map(s => (
                  <div className="donut-legend-row" key={s.Payment_Status}>
                    <span className="donut-legend-left">{s.Payment_Status}</span>
                    <span className="donut-legend-value">{s.Count}</span>
                  </div>
                ))}
              </div>
            </div>

            {affPerf && (
              <div className="panel">
                <div className="panel-head">
                  <div><div className="panel-title">Bookings per ₹1,000 Spent</div><div className="panel-sub">Spend-vs-output — who converts their payout most efficiently</div></div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={affPerf} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid horizontal={false} stroke={CHART_GRID} />
                    <XAxis type="number" tick={AXIS_TICK_MONO_STYLE} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="Affiliate_Source" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} width={90} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="Bookings_Per_1000_Spend" fill="#3D9B6F" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {affPerf && (
            <div className="panel">
              <div className="panel-head">
                <div><div className="panel-title">Affiliate-wise Funnel</div><div className="panel-sub">Leads, bookings, retail and conversion% from the real lead funnel (not the payout ledger)</div></div>
              </div>
              <table>
                <thead><tr><th>Partner</th><th className="mono">Leads</th><th className="mono">Bookings</th><th className="mono">Retail</th><th className="mono">L2B%</th><th className="mono">B2R%</th></tr></thead>
                <tbody>
                  {affPerf.map(r => (
                    <tr key={r.Affiliate_Source}>
                      <td>{r.Affiliate_Source}</td>
                      <td className="mono">{r.Leads}</td>
                      <td className="mono">{r.Bookings}</td>
                      <td className="mono">{r.Retail}</td>
                      <td className="mono">{pct(r.L2B_pct)}</td>
                      <td className="mono">{pct(r.B2R_pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
