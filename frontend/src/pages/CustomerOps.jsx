import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { CHART_GRID, AXIS_TICK_STYLE, AXIS_TICK_MONO_STYLE, TOOLTIP_STYLE } from '../chartTheme';
import { IconPhone, IconUsers, IconClock, IconCalendarCheck, IconStar, IconShield } from '../components/Icons';

const OUTCOME_COLORS = { Connected: '#3D9B6F', 'No Answer': '#E8A33D', Busy: '#C7492B', Voicemail: '#8A93A0' };
const NPS_COLORS = { Promoter: '#3D9B6F', Passive: '#E8A33D', Detractor: '#C7492B' };

function pct(v) { return v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`; }

export default function CustomerOps() {
  const [tab, setTab] = useState('calls');
  const [callSummary, setCallSummary] = useState(null);
  const [callByStatus, setCallByStatus] = useState(null);
  const [callByDealer, setCallByDealer] = useState(null);
  const [fuSummary, setFuSummary] = useState(null);
  const [fuByStatus, setFuByStatus] = useState(null);
  const [fbSummary, setFbSummary] = useState(null);
  const [fbByDealer, setFbByDealer] = useState(null);
  const [fbByRegion, setFbByRegion] = useState(null);
  const [satisfactionImpact, setSatisfactionImpact] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.callCenterSummary(), api.callCenterByStatus(), api.callCenterByDealer(),
      api.followUpSummary(), api.followUpByStatus(),
      api.feedbackSummary(), api.feedbackByDealer(), api.feedbackByRegion(), api.feedbackSatisfactionImpact(),
    ]).then(([cs, cbs, cbd, fus, fubs, fbs, fbd, fbr, si]) => {
      setCallSummary(cs); setCallByStatus(cbs.rows); setCallByDealer(cbd.rows);
      setFuSummary(fus); setFuByStatus(fubs.rows);
      setFbSummary(fbs); setFbByDealer(fbd.rows); setFbByRegion(fbr.rows); setSatisfactionImpact(si);
    }).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error-box">Could not reach the API ({error}).</div>;
  if (!callSummary) return <div className="loading">Loading customer ops…</div>;

  const outcomeData = callSummary.by_outcome.map(o => ({ name: o.Outcome, value: o.Calls }));

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Customer Ops</div>
          <div className="page-meta">Call center performance, follow-up discipline, and post-delivery NPS</div>
        </div>
      </div>

      <div className="tab-row">
        <button className={tab === 'calls' ? 'on' : ''} onClick={() => setTab('calls')}>Call Center</button>
        <button className={tab === 'followup' ? 'on' : ''} onClick={() => setTab('followup')}>Follow-Ups</button>
        <button className={tab === 'nps' ? 'on' : ''} onClick={() => setTab('nps')}>NPS &amp; Feedback</button>
      </div>

      {tab === 'calls' && (
        <>
          <div className="kpi-strip">
            <KpiCard label="Total Calls" value={callSummary.total_calls} accent="blue" icon={IconPhone} />
            <KpiCard label="Leads Called" value={callSummary.leads_called} accent="blue" icon={IconUsers} />
            <KpiCard label="Connect Rate" value={callSummary.connect_rate} isPct accent="green" icon={IconCalendarCheck} />
            <KpiCard label="Avg Duration (Connected)" value={Math.round(callSummary.avg_duration_sec_connected)} accent="amber" icon={IconClock} compareLabel="seconds" compareValue={callSummary.avg_duration_sec_connected} />
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-head">
                <div><div className="panel-title">Connect Rate by Lead Status</div><div className="panel-sub">Calls skew toward Booked/Dropped leads for closure and recovery</div></div>
              </div>
              <table>
                <thead><tr><th>Status</th><th className="mono">Calls</th><th className="mono">Connected</th><th className="mono">Connect Rate</th><th className="mono">Avg Duration (s)</th></tr></thead>
                <tbody>
                  {(callByStatus || []).map(r => (
                    <tr key={r.Lead_Status}>
                      <td>{r.Lead_Status}</td>
                      <td className="mono">{r.Calls.toLocaleString('en-IN')}</td>
                      <td className="mono">{r.Connected.toLocaleString('en-IN')}</td>
                      <td className="mono">{pct(r.Connect_Rate)}</td>
                      <td className="mono">{r.Avg_Duration_Sec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div><div className="panel-title">Call Outcome Mix</div><div className="panel-sub">All {callSummary.total_calls.toLocaleString('en-IN')} calls</div></div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={outcomeData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2}>
                    {outcomeData.map((e, i) => <Cell key={i} fill={OUTCOME_COLORS[e.name] || '#8A93A0'} stroke="#fff" strokeWidth={3} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-legend">
                {outcomeData.map(d => (
                  <div className="donut-legend-row" key={d.name}>
                    <span className="donut-legend-left"><span className="donut-legend-dot" style={{ background: OUTCOME_COLORS[d.name] }}></span>{d.name}</span>
                    <span className="donut-legend-value">{d.value.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">Dealer Call Handling</div><div className="panel-sub">Direct dealer-channel calls, ranked by connect rate</div></div>
            </div>
            <table>
              <thead><tr><th>Dealer</th><th>Tier</th><th>Region</th><th className="mono">Calls</th><th className="mono">Connected</th><th className="mono">Connect Rate</th></tr></thead>
              <tbody>
                {(callByDealer || []).slice(0, 12).map(r => (
                  <tr key={r.Dealer_ID}>
                    <td>{r.Dealer_Name || r.Dealer_ID}</td>
                    <td><span className="tier-pill">{r.Tier}</span></td>
                    <td>{r.Region}</td>
                    <td className="mono">{r.Calls}</td>
                    <td className="mono">{r.Connected}</td>
                    <td className="mono">{pct(r.Connect_Rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'followup' && fuSummary && (
        <>
          <div className="kpi-strip">
            <KpiCard label="Total Follow-Ups" value={fuSummary.total_follow_ups} accent="blue" icon={IconCalendarCheck} />
            <KpiCard label="Done Rate" value={fuSummary.done_rate} isPct accent="green" icon={IconShield} />
            <KpiCard label="Avg Delay (Done)" value={Math.round(fuSummary.avg_delay_days)} accent="amber" icon={IconClock} compareLabel="days" compareValue={fuSummary.avg_delay_days} />
          </div>

          <div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">Follow-Up Outcome by Lead Status</div><div className="panel-sub">Booked leads get the fastest, most complete follow-up; Dropped leads lag</div></div>
            </div>
            <table>
              <thead><tr><th>Status</th><th className="mono">Total</th><th className="mono">Done</th><th className="mono">Missed</th><th className="mono">Pending</th><th className="mono">Done Rate</th><th className="mono">Avg Delay (days)</th></tr></thead>
              <tbody>
                {(fuByStatus || []).map(r => (
                  <tr key={r.Lead_Status}>
                    <td>{r.Lead_Status}</td>
                    <td className="mono">{r.Total}</td>
                    <td className="mono">{r.Done}</td>
                    <td className="mono">{r.Missed}</td>
                    <td className="mono">{r.Pending}</td>
                    <td className="mono">{pct(r.Done_Rate)}</td>
                    <td className="mono">{r.Avg_Delay_Days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'nps' && fbSummary && (
        <>
          <div className="kpi-strip">
            <KpiCard label="Feedback Responses" value={fbSummary.responses} accent="blue" icon={IconUsers} />
            <KpiCard label="Net Promoter Score" value={fbSummary.nps} accent={fbSummary.nps >= 0 ? 'green' : 'red'} icon={IconStar} />
            <KpiCard label="Avg Score (0-10)" value={fbSummary.avg_nps_score} accent="amber" icon={IconStar} />
            <KpiCard label="Complaint Rate" value={fbSummary.complaint_rate} isPct accent="red" icon={IconShield} />
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-head">
                <div><div className="panel-title">Promoter / Passive / Detractor</div><div className="panel-sub">Score 9-10 Promoter · 7-8 Passive · 0-6 Detractor</div></div>
              </div>
              <div className="donut-legend">
                <div className="donut-legend-row"><span className="donut-legend-left"><span className="donut-legend-dot" style={{ background: NPS_COLORS.Promoter }}></span>Promoters</span><span className="donut-legend-value">{pct(fbSummary.promoter_pct)}</span></div>
                <div className="donut-legend-row"><span className="donut-legend-left"><span className="donut-legend-dot" style={{ background: NPS_COLORS.Passive }}></span>Passives</span><span className="donut-legend-value">{pct(fbSummary.passive_pct)}</span></div>
                <div className="donut-legend-row"><span className="donut-legend-left"><span className="donut-legend-dot" style={{ background: NPS_COLORS.Detractor }}></span>Detractors</span><span className="donut-legend-value">{pct(fbSummary.detractor_pct)}</span></div>
              </div>
              <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginTop: 14 }}>
                <div style={{ width: `${fbSummary.promoter_pct * 100}%`, background: NPS_COLORS.Promoter }} />
                <div style={{ width: `${fbSummary.passive_pct * 100}%`, background: NPS_COLORS.Passive }} />
                <div style={{ width: `${fbSummary.detractor_pct * 100}%`, background: NPS_COLORS.Detractor }} />
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div><div className="panel-title">Complaints by Category</div><div className="panel-sub">{fbSummary.complaints_by_category.reduce((s, c) => s + c.Count, 0)} total complaints</div></div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={fbSummary.complaints_by_category} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid horizontal={false} stroke={CHART_GRID} />
                  <XAxis type="number" tick={AXIS_TICK_MONO_STYLE} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="Complaint_Category" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} width={110} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="Count" fill="#C7492B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-head">
                <div><div className="panel-title">Dealer NPS Leaderboard</div><div className="panel-sub">Higher tiers consistently score higher — a real service-quality signal</div></div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Dealer</th><th>Tier</th><th>Region</th><th className="mono">Responses</th><th className="mono">Avg Score</th><th className="mono">NPS</th><th className="mono">Complaint Rate</th></tr></thead>
                  <tbody>
                    {(fbByDealer || []).slice(0, 12).map(r => (
                      <tr key={r.Dealer_ID}>
                        <td>{r.Dealer_Name || r.Dealer_ID}</td>
                        <td><span className="tier-pill">{r.Tier}</span></td>
                        <td>{r.Region}</td>
                        <td className="mono">{r.Responses}</td>
                        <td className="mono">{r.Avg_NPS}</td>
                        <td className={`mono ${r.NPS >= 0 ? 'pos' : 'neg'}`}>{r.NPS}</td>
                        <td className="mono">{pct(r.Complaint_Rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div><div className="panel-title">Region-Wise NPS</div><div className="panel-sub">Ranked highest to lowest</div></div>
              </div>
              <table>
                <thead><tr><th>Region</th><th className="mono">Responses</th><th className="mono">NPS</th><th className="mono">Complaint Rate</th></tr></thead>
                <tbody>
                  {(fbByRegion || []).map(r => (
                    <tr key={r.Region}>
                      <td>{r.Region}</td>
                      <td className="mono">{r.Responses}</td>
                      <td className={`mono ${r.NPS >= 0 ? 'pos' : 'neg'}`}>{r.NPS}</td>
                      <td className="mono">{pct(r.Complaint_Rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {satisfactionImpact && (
            <div className="panel">
              <div className="panel-head">
                <div>
                  <div className="panel-title">Complaint Rate vs Lead Leakage</div>
                  <div className="panel-sub">
                    Correlation coefficient: {satisfactionImpact.correlation_complaint_vs_leakage ?? '—'}
                    {' '}— dealers with high complaint rates, ranked against how much of their lead volume never converts to a booking
                  </div>
                </div>
              </div>
              <table>
                <thead><tr><th>Dealer</th><th>Tier</th><th className="mono">Complaint Rate</th><th className="mono">Lead Leakage%</th></tr></thead>
                <tbody>
                  {satisfactionImpact.rows.slice(0, 12).map(r => (
                    <tr key={r.Dealer_ID}>
                      <td>{r.Dealer_Name || r.Dealer_ID}</td>
                      <td><span className="tier-pill">{r.Tier}</span></td>
                      <td className="mono neg">{pct(r.Complaint_Rate)}</td>
                      <td className="mono">{pct(r.Leakage_pct)}</td>
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
