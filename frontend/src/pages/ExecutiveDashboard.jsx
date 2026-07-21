import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { useFilters } from '../FilterContext';
import { monthBounds } from '../dateUtils';
import { CHART_GRID, CHART_AXIS, AXIS_TICK_STYLE, AXIS_TICK_MONO_STYLE, TOOLTIP_STYLE } from '../chartTheme';
import {
  IconUsers, IconChat, IconCalendarCheck, IconUserPlus, IconClock, IconTrash, IconBike,
} from '../components/Icons';

const KPI_DEFS = [
  { key: 'Leads', label: 'Total Leads', accent: 'blue', icon: IconUsers },
  { key: 'Enquiries', label: 'Total Enquiries', accent: 'purple', icon: IconChat },
  { key: 'Bookings', label: 'Total Bookings', accent: 'green', icon: IconCalendarCheck },
  { key: 'New_Leads', label: 'New Leads', accent: 'blue', icon: IconUserPlus },
  { key: 'Open_Enquiries', label: 'Open Enquiries', accent: 'amber', icon: IconClock },
  { key: 'Dropped', label: 'Dropped Leads', accent: 'red', icon: IconTrash },
];

const STATUS_COLORS = { Healthy: '#2FA666', 'Needs Attention': '#E8A33D', Critical: '#D6323F' };
const SEV_TAG = { High: 'Critical', Medium: 'Needs Attention', Low: 'Positive' };
const SEV_TAG_CLASS = { High: 'High', Medium: 'Medium', Low: 'Low' };

function regionHeatColor(value, max) {
  const t = max ? value / max : 0;
  const r = 214, g = Math.round(230 - t * 180), b = Math.round(232 - t * 190);
  return `rgb(${r},${g},${b})`;
}

export default function ExecutiveDashboard() {
  const f = useFilters();
  const [state, setState] = useState({ loading: true, error: null });
  const [mom, setMom] = useState(null);
  const [regionRows, setRegionRows] = useState([]);
  const [modelRows, setModelRows] = useState([]);
  const [sourceRows, setSourceRows] = useState([]);
  const [targetVsActual, setTargetVsActual] = useState([]);
  const [campaignRows, setCampaignRows] = useState([]);
  const [topInsights, setTopInsights] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [dailySeries, setDailySeries] = useState([]);
  const [trendGranularity, setTrendGranularity] = useState('weekly');
  const [trendPoints, setTrendPoints] = useState([]);

  // one-time data: not scoped to the selected reporting period
  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.masterData('campaign'),
      api.insights({ limit: 4 }),
      api.dailySummary(),
      api.dailyTrend({ granularity: 'daily', days: 30 }),
      api.dailyTrend({ granularity: 'weekly' }),
    ]).then(([campaigns, insights, summary, daily, trend]) => {
      if (!mounted) return;
      setCampaignRows(campaigns.rows);
      setTopInsights(insights.insights);
      setDailySummary(summary);
      setDailySeries(daily.points);
      setTrendPoints(trend.points);
    }).catch(err => { if (mounted) setState(s => ({ ...s, error: err.message })); });
    return () => { mounted = false; };
  }, []);

  // period + filter scoped data
  useEffect(() => {
    if (!f?.currentMonth || !f?.previousMonth) return;
    let mounted = true;
    const { start, end } = monthBounds(f.currentMonth);
    const dimFilters = { region: f.region || undefined, model: f.model || undefined, source: f.source || undefined };

    Promise.all([
      api.monthOnMonth({ current_month: f.currentMonth, previous_month: f.previousMonth, ...dimFilters }),
      api.drilldown('region', { start, end, model: dimFilters.model, source: dimFilters.source }),
      api.drilldown('model', { start, end, region: dimFilters.region, source: dimFilters.source }),
      api.drilldown('source', { start, end, region: dimFilters.region, model: dimFilters.model }),
      api.targetVsActual({ level: 'region', start, end }),
    ]).then(([momRes, region, model, source, tva]) => {
      if (!mounted) return;
      setMom(momRes);
      setRegionRows(region.rows.slice(0, 8));
      setModelRows(model.rows.slice(0, 5));
      setSourceRows(source.rows.slice(0, 5));
      setTargetVsActual(tva.rows.slice().sort((a, b) => b.Booking_Actual - a.Booking_Actual).slice(0, 5));
      setState({ loading: false, error: null });
    }).catch(err => {
      if (mounted) setState({ loading: false, error: err.message });
    });
    return () => { mounted = false; };
  }, [f?.currentMonth, f?.previousMonth, f?.region, f?.model, f?.source]);

  useEffect(() => {
    api.dailyTrend({ granularity: trendGranularity }).then(r => setTrendPoints(r.points)).catch(() => {});
  }, [trendGranularity]);

  if (state.loading || !mom) return <div className="loading">Loading executive dashboard…</div>;
  if (state.error) return (
    <div className="error-box">
      Could not reach the API ({state.error}). Make sure the backend is running at the URL
      configured in VITE_API_BASE (see README).
    </div>
  );

  const kpis = mom.current_period.kpis;
  const prevKpis = mom.previous_period.kpis;
  const deltas = mom.deltas;

  const hygieneCounts = { Healthy: 0, 'Needs Attention': 0, Critical: 0 };
  campaignRows.forEach(c => { hygieneCounts[c.Campaign_Status] = (hygieneCounts[c.Campaign_Status] || 0) + 1; });
  const hygieneDonutData = Object.entries(hygieneCounts).map(([name, value]) => ({ name, value }));

  const maxRegionLeads = regionRows[0]?.Leads || 1;
  const maxModelBookings = Math.max(...modelRows.map(r => r.Bookings), 1);
  const totalModelBookings = modelRows.reduce((s, r) => s + r.Bookings, 0) || 1;
  const maxSourceLeads = Math.max(...sourceRows.map(r => r.Leads), 1);
  const totalSourceLeads = sourceRows.reduce((s, r) => s + r.Leads, 0) || 1;

  const funnelStages = [
    { label: 'Leads Created', value: kpis.Leads, pct: 1, icon: IconUsers, accent: 'blue' },
    { label: 'New Leads', value: kpis.New_Leads, pct: kpis.New_Leads / kpis.Leads, icon: IconUserPlus, accent: 'blue' },
    { label: 'Enquiries', value: kpis.Enquiries, pct: kpis.Enquiries / kpis.Leads, icon: IconChat, accent: 'purple' },
    { label: 'Bookings', value: kpis.Bookings, pct: kpis.Bookings / kpis.Leads, icon: IconCalendarCheck, accent: 'green' },
    { label: 'Retail', value: kpis.Retail, pct: kpis.Retail / kpis.Leads, icon: IconBike, accent: 'red' },
  ];

  const waText = encodeURIComponent(
    `RE Digital Intelligence — Daily Summary (${dailySummary.date})\n` +
    `Leads: ${dailySummary.snapshot.Leads} · Enquiries: ${dailySummary.snapshot.Enquiries} · Bookings: ${dailySummary.snapshot.Bookings}\n` +
    `E2B: ${(dailySummary.snapshot.E2B * 100).toFixed(1)}% · L2B: ${(dailySummary.snapshot.L2B * 100).toFixed(1)}%`
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Executive Dashboard</div>
          <div className="page-meta">
            {mom.current_period.label} vs {mom.previous_period.label}
            {(f.region || f.model || f.source) && (
              <> · Filtered by {[f.region, f.model, f.source].filter(Boolean).join(', ')}</>
            )}
          </div>
        </div>
      </div>

      <div className="kpi-strip">
        {KPI_DEFS.map(d => (
          <KpiCard
            key={d.key}
            label={d.label}
            value={kpis[d.key]}
            accent={d.accent}
            icon={d.icon}
            delta={deltas[d.key]}
            deltaUnit={deltas[d.key + '_unit']}
            compareLabel={mom.previous_period.label}
            compareValue={prevKpis[d.key]?.toLocaleString('en-IN')}
          />
        ))}
      </div>

      <div className="rate-strip">
        <div className="rate-card">
          <div>
            <div className="rate-card-label">E2B Conversion Rate</div>
            <span className="rate-card-value">{(kpis.E2B_pct * 100).toFixed(2)}%</span>
            <span className={`rate-card-delta ${deltas.E2B_pct > 0 ? 'pos' : 'neg'}`}>
              {deltas.E2B_pct > 0 ? '▲' : '▼'} {Math.abs(deltas.E2B_pct).toFixed(2)} pp
            </span>
          </div>
          <div className="rate-card-spark">
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={dailySeries.map(d => ({ v: d.Enquiries ? d.Bookings / d.Enquiries : 0 }))}>
                <Line type="monotone" dataKey="v" stroke="var(--blue)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rate-card">
          <div>
            <div className="rate-card-label">L2B Conversion Rate</div>
            <span className="rate-card-value">{(kpis.L2B_pct * 100).toFixed(2)}%</span>
            <span className={`rate-card-delta ${deltas.L2B_pct > 0 ? 'pos' : 'neg'}`}>
              {deltas.L2B_pct > 0 ? '▲' : '▼'} {Math.abs(deltas.L2B_pct).toFixed(2)} pp
            </span>
          </div>
          <div className="rate-card-spark">
            <ResponsiveContainer width="100%" height={40}>
              <LineChart data={dailySeries.map(d => ({ v: d.Leads ? d.Bookings / d.Leads : 0 }))}>
                <Line type="monotone" dataKey="v" stroke="var(--green)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-head">
          <div><div className="panel-title">Leads, Enquiries &amp; Bookings Trend</div><div className="panel-sub">{trendPoints.length} periods</div></div>
          <div className="toggle-group">
            {['daily', 'weekly', 'monthly'].map(g => (
              <button key={g} className={trendGranularity === g ? 'on' : ''} onClick={() => setTrendGranularity(g)}>
                {g[0].toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={trendPoints}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
            <XAxis dataKey="bucket" tick={AXIS_TICK_STYLE} axisLine={{ stroke: CHART_AXIS }} tickLine={false} />
            <YAxis tick={AXIS_TICK_MONO_STYLE} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Leads" stroke="var(--blue)" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="Enquiries" stroke="var(--amber)" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="Bookings" stroke="var(--green)" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '1.6fr 1fr 1fr' }}>
        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Leads by Region</div><div className="panel-sub">Top 8 of 23 regions, ranked</div></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {regionRows.map((r, i) => (
              <div key={r.Region} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="rank" style={{ width: 18 }}>{i + 1}</span>
                <span style={{ width: 34, fontSize: 12, fontWeight: 600 }}>{r.Region}</span>
                <div style={{ flex: 1, height: 16, background: 'var(--border-soft)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(r.Leads / maxRegionLeads) * 100}%`, height: '100%',
                    background: regionHeatColor(r.Leads, maxRegionLeads), borderRadius: 4,
                  }}></div>
                </div>
                <span className="mono" style={{ fontSize: 11.5, width: 42, textAlign: 'right', color: 'var(--text-dim)' }}>{r.Leads}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Top 5 Regions</div><div className="panel-sub">By bookings</div></div>
          </div>
          <table>
            <thead><tr><th>Region</th><th className="mono">Actual</th><th>Achv.</th></tr></thead>
            <tbody>
              {targetVsActual.map(r => {
                const pct = r.Booking_Achievement_pct;
                const color = pct >= 1 ? 'var(--green)' : pct >= 0.9 ? 'var(--amber)' : 'var(--red)';
                return (
                  <tr key={r.Region}>
                    <td>{r.Region}</td>
                    <td className="mono">{r.Booking_Actual}</td>
                    <td className="mono" style={{ color }}>{(pct * 100).toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Campaign Hygiene</div><div className="panel-sub">Overview</div></div>
          </div>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={hygieneDonutData} dataKey="value" nameKey="name" innerRadius={44} outerRadius={64} paddingAngle={2}>
                  {hygieneDonutData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name]} stroke="#fff" strokeWidth={3} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <div className="donut-center-value">{campaignRows.length}</div>
              <div className="donut-center-label">Campaigns</div>
            </div>
          </div>
          <div className="donut-legend">
            {hygieneDonutData.map(d => (
              <div className="donut-legend-row" key={d.name}>
                <span className="donut-legend-left"><span className="donut-legend-dot" style={{ background: STATUS_COLORS[d.name] }}></span>{d.name}</span>
                <span className="donut-legend-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-4">
        <div className="panel">
          <div className="panel-head"><div><div className="panel-title">Top 5 Models</div><div className="panel-sub">By bookings</div></div></div>
          <table>
            <thead><tr><th>Model</th><th className="mono">Book.</th></tr></thead>
            <tbody>
              {modelRows.map(r => (
                <tr key={r.Model}>
                  <td style={{ fontSize: 11.5 }}>{r.Model}</td>
                  <td className="bar-cell">
                    <div className="mini-bar-track" style={{ width: 44 }}><div className="mini-bar-fill" style={{ width: `${(r.Bookings / maxModelBookings) * 100}%`, background: 'var(--blue)' }}></div></div>
                    <span className="mono" style={{ fontSize: 11 }}>{r.Bookings}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head"><div><div className="panel-title">Top 5 Sources</div><div className="panel-sub">By leads</div></div></div>
          <table>
            <thead><tr><th>Source</th><th className="mono">Leads</th></tr></thead>
            <tbody>
              {sourceRows.map(r => (
                <tr key={r.Source}>
                  <td style={{ fontSize: 11.5 }}>{r.Source}</td>
                  <td className="bar-cell">
                    <div className="mini-bar-track" style={{ width: 44 }}><div className="mini-bar-fill" style={{ width: `${(r.Leads / maxSourceLeads) * 100}%`, background: 'var(--amber)' }}></div></div>
                    <span className="mono" style={{ fontSize: 11 }}>{r.Leads}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel" style={{ gridColumn: 'span 2' }}>
          <div className="panel-head">
            <div><div className="panel-title">AI Insights</div><div className="panel-sub">Latest {topInsights.length} generated</div></div>
            <Link className="panel-link" to="/ai-insights">View all →</Link>
          </div>
          {topInsights.map(ins => (
            <div className="insight" key={ins.Insight_ID}>
              <div>
                <div className="insight-text">{ins.Insight_Text}</div>
                <div className="insight-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`sev-tag ${SEV_TAG_CLASS[ins.Severity]}`}>{SEV_TAG[ins.Severity]}</span>
                  {ins.Generated_Date}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Lead Journey Summary</div><div className="panel-sub">{mom.current_period.label} funnel</div></div>
          </div>
          <div className="funnel-strip">
            {funnelStages.map(s => {
              const Icon = s.icon;
              const accentVar = { blue: ['var(--blue)', 'var(--blue-dim)'], purple: ['var(--purple)', 'var(--purple-dim)'], green: ['var(--green)', 'var(--green-dim)'], red: ['var(--red)', 'var(--red-dim)'] }[s.accent];
              return (
                <div className="funnel-step" key={s.label} style={{ '--kpi-accent': accentVar[0], '--kpi-soft': accentVar[1] }}>
                  <div className="funnel-icon"><Icon size={16} /></div>
                  <div className="funnel-label">{s.label}</div>
                  <div className="funnel-value">{s.value.toLocaleString('en-IN')}</div>
                  <div className="funnel-pct">{(s.pct * 100).toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Daily Summary</div><div className="panel-sub">Auto-generated · {dailySummary.date}</div></div>
            <Link className="panel-link" to="/daily-summary">View full report →</Link>
          </div>
          <div className="summary-meta-row">
            <span>Leads <b>{dailySummary.snapshot.Leads}</b></span>
            <span>Enquiries <b>{dailySummary.snapshot.Enquiries}</b></span>
            <span>Bookings <b>{dailySummary.snapshot.Bookings}</b></span>
            <span>E2B <b>{(dailySummary.snapshot.E2B * 100).toFixed(1)}%</b></span>
            <span>L2B <b>{(dailySummary.snapshot.L2B * 100).toFixed(1)}%</b></span>
          </div>
          {dailySummary.needs_attention.length > 0 && (
            <div className="needs-attention">
              <div className="needs-attention-title">Top Needs Attention</div>
              <ul>
                {dailySummary.needs_attention.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" className="whatsapp-btn">
            Send on WhatsApp
          </a>
        </div>
      </div>

      <div className="page-footer">
        <span>Royal Enfield Digital Intelligence Platform · Confidential</span>
        <span>Version 1.0.0</span>
      </div>
    </>
  );
}
