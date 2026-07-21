import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { CHART_GRID, CHART_AXIS, AXIS_TICK_STYLE, AXIS_TICK_MONO_STYLE, TOOLTIP_STYLE } from '../chartTheme';

const CHECK_LABELS = {
  OTP_Status: 'OTP', Form_Status: 'Form', CRM_Status: 'CRM Push',
  Landing_Page_Status: 'Landing Page', MSD_Push_Status: 'MSD Push',
};
const CHECK_KEYS = Object.keys(CHECK_LABELS);
const STATUS_COLORS = { Healthy: '#3FA66B', Flagged: '#D6323F' };

function statusToClass(campaign) {
  if (campaign.Campaign_Status === 'Critical' || campaign.Overall_Status === 'Fail') {
    return campaign.Campaign_Status === 'Critical' ? 'crit' : 'warn';
  }
  return '';
}

export default function CampaignHygiene() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [streaks, setStreaks] = useState(null);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    api.hygieneSummary().then(setSummary).catch(e => setError(e.message));
  }, []);

  const openCampaign = (cid) => {
    setSelected(cid);
    api.hygieneStreaks(cid).then(setStreaks);
    api.hygieneHistory(cid, { days: 14 }).then(setHistory);
  };

  if (error) return <div className="error-box">Could not reach the API ({error}).</div>;
  if (!summary) return <div className="loading">Loading campaign hygiene…</div>;

  const passRate = summary.total_campaigns ? summary.pass_count / summary.total_campaigns : 0;

  const failByCheck = CHECK_KEYS.map(key => ({
    check: CHECK_LABELS[key],
    fails: summary.campaigns.filter(c => c[key] === 'Fail').length,
  }));

  const statusDonutData = [
    { name: 'Healthy', value: summary.pass_count },
    { name: 'Flagged', value: summary.fail_count },
  ];

  const historyChartData = history
    ? history.history.map(h => ({ date: h.Date.slice(5), ok: h.Overall_Status === 'Pass' ? 1 : 0 }))
    : [];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Campaign Hygiene Automation</div>
          <div className="page-meta">
            Automated OTP · Form · CRM Push · Landing Page · MSD Push checks — as of {summary.as_of}
          </div>
        </div>
        <div className="toggle-group">
          <button className="on">{summary.pass_count} Healthy</button>
          <button>{summary.fail_count} Flagged</button>
        </div>
      </div>

      <div className="kpi-strip">
        <KpiCard label="Campaigns" value={summary.total_campaigns} accent="blue" />
        <KpiCard label="Healthy" value={summary.pass_count} accent="green" />
        <KpiCard label="Flagged" value={summary.fail_count} accent="red" />
        <KpiCard label="Pass Rate" value={passRate} isPct accent="amber" />
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Failures by Check Type</div><div className="panel-sub">Across all campaigns today</div></div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={failByCheck}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="check" tick={AXIS_TICK_STYLE} axisLine={{ stroke: CHART_AXIS }} tickLine={false} />
              <YAxis tick={AXIS_TICK_MONO_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="fails" fill="var(--red)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Overall Status Mix</div><div className="panel-sub">Healthy vs flagged campaigns today</div></div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusDonutData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2}>
                {statusDonutData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name]} stroke="#fff" strokeWidth={3} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
            {statusDonutData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLORS[d.name] }}></span>
                {d.name} {d.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-head">
          <div><div className="panel-title">Today's Automated Checks</div><div className="panel-sub">Click a campaign to inspect its 14-day history and failure streaks</div></div>
          <span className="chip">{summary.total_campaigns} campaigns</span>
        </div>
        <div className="hygiene-grid">
          {summary.campaigns.map(c => (
            <div key={c.Campaign_ID} className={`camp-chip ${statusToClass(c)}`} onClick={() => openCampaign(c.Campaign_ID)}>
              <div className="camp-id">{c.Campaign_ID}</div>
              <div className="camp-name">{c.Campaign_Name}</div>
              <div className="camp-status">
                <span className="status-dot" style={{
                  background: c.Overall_Status === 'Fail' ? 'var(--red)' : 'var(--green)'
                }}></span>
                {c.Overall_Status === 'Fail' ? 'Check Failed' : 'Healthy'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">{selected} — Failure Streak Analysis</div><div className="panel-sub">Longest consecutive-day failure run, per check</div></div>
          </div>

          {streaks && (
            <div className="grid-3" style={{ marginBottom: 16 }}>
              {Object.entries(streaks.streaks).filter(([k]) => k !== 'Overall').map(([check, s]) => (
                <div className="metric-tile" key={check}>
                  <div className="kpi-label">{CHECK_LABELS[check] || check}</div>
                  <div className="kpi-value" style={{ color: s.max_consecutive_fail_days >= 3 ? 'var(--red)' : 'var(--text)' }}>
                    {s.max_consecutive_fail_days} day{s.max_consecutive_fail_days === 1 ? '' : 's'}
                  </div>
                  {s.start_date && <div className="insight-meta">{s.start_date} → {s.end_date}</div>}
                </div>
              ))}
            </div>
          )}

          {history && (
            <>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={historyChartData}>
                  <XAxis dataKey="date" tick={{ ...AXIS_TICK_STYLE, fontSize: 9 }} axisLine={{ stroke: CHART_AXIS }} tickLine={false} interval={1} />
                  <YAxis hide domain={[0, 1]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => v === 1 ? 'Pass' : 'Fail'} />
                  <Bar dataKey="ok" radius={[3, 3, 0, 0]}>
                    {historyChartData.map((d, i) => (
                      <Cell key={i} fill={d.ok ? 'var(--green)' : 'var(--red)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <table style={{ marginTop: 14 }}>
                <thead>
                  <tr><th>Date</th><th>OTP</th><th>Form</th><th>CRM</th><th>Landing Page</th><th>MSD Push</th><th>Overall</th></tr>
                </thead>
                <tbody>
                  {history.history.slice().reverse().map(h => (
                    <tr key={h.Date}>
                      <td className="mono">{h.Date}</td>
                      {['OTP_Status', 'Form_Status', 'CRM_Status', 'Landing_Page_Status', 'MSD_Push_Status'].map(c => (
                        <td key={c} className={h[c] === 'Fail' ? 'neg' : 'pos'}>{h[c]}</td>
                      ))}
                      <td className={h.Overall_Status === 'Fail' ? 'neg' : 'pos'} style={{ fontWeight: 600 }}>{h.Overall_Status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </>
  );
}
