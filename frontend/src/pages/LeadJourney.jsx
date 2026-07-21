import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { CHART_GRID, CHART_AXIS, AXIS_TICK_STYLE, AXIS_TICK_MONO_STYLE, TOOLTIP_STYLE } from '../chartTheme';

export default function LeadJourney() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [journey, setJourney] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.journeyMetrics().then(setMetrics).catch(e => setError(e.message));
  }, []);

  const search = () => {
    if (!query.trim()) return;
    api.searchLeads({ customer_name: query, limit: 10 }).then(rows => {
      if (rows.length === 0) {
        // maybe it's a Lead_ID or mobile number
        api.leadJourney(query.trim()).then(j => { setJourney(j); setResults([]); })
          .catch(() => api.searchLeads({ mobile: query, limit: 10 }).then(setResults));
      } else {
        setResults(rows);
        setJourney(null);
      }
    });
  };

  const openLead = (leadId) => {
    api.leadJourney(leadId).then(j => { setJourney(j); setResults([]); });
  };

  const dropReasonData = metrics
    ? Object.entries(metrics.Drop_Reasons).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count)
    : [];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Lead Journey Intelligence</div>
          <div className="page-meta">Full lifecycle tracking — search by Lead ID, customer name, or mobile number</div>
        </div>
      </div>

      {error && <div className="error-box">Could not reach the API ({error}).</div>}

      {metrics && (
        <>
          <div className="kpi-strip" style={{ marginBottom: 14 }}>
            <KpiCard label="Avg Lead Age" value={metrics.Avg_Lead_Age_Days} accent="blue" />
            <KpiCard label="Avg Conversion Time" value={metrics.Avg_Conversion_Time_Days} accent="blue" />
            <KpiCard label="Dealer Transfer Rate" value={metrics.Dealer_Transfer_Rate} isPct accent="amber" />
            <KpiCard label="Retail Conversion" value={metrics.Retail_Conversion_pct} isPct accent="green" />
            <KpiCard label="Bounce Rate" value={metrics.Bounce_Rate_pct} isPct accent="red" />
          </div>

          <div className="panel" style={{ marginBottom: 18 }}>
            <div className="panel-head">
              <div><div className="panel-title">Drop Reasons</div><div className="panel-sub">Why dropped leads left the funnel</div></div>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={dropReasonData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK_MONO_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="reason" tick={AXIS_TICK_STYLE} axisLine={{ stroke: CHART_AXIS }} tickLine={false} width={230} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="var(--red)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="search-bar">
        <input
          placeholder="Search Lead ID (e.g. RE202605000123), customer name, or mobile number…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
        />
        <button onClick={search}>Search</button>
      </div>

      {results.length > 0 && (
        <div className="search-results">
          {results.map(r => (
            <div key={r.Lead_ID} className="search-result-row" onClick={() => openLead(r.Lead_ID)}>
              <span><b>{r.Customer_Name}</b> · {r.Lead_ID} · {r.Model}</span>
              <span style={{ color: 'var(--text-dim)' }}>{r.Region} · {r.Lead_Status}</span>
            </div>
          ))}
        </div>
      )}

      {journey && (
        <div className="grid-2">
          <div className="panel">
            <div className="panel-head">
              <div><div className="panel-title">{journey.lead.Customer_Name}</div><div className="panel-sub">{journey.lead.Lead_ID} · {journey.lead.Model} · {journey.lead.Region}</div></div>
              <span className="chip">{journey.lead.Lead_Status}</span>
            </div>
            <div className="timeline">
              {journey.timeline.map((t, i) => (
                <div className="timeline-item" key={i}>
                  <div className="timeline-rail">
                    <div className="timeline-dot"></div>
                    {i < journey.timeline.length - 1 && <div className="timeline-line"></div>}
                  </div>
                  <div className="timeline-body">
                    <div className="timeline-date">{t.Event_Date}</div>
                    <div className="timeline-event">{t.Event}</div>
                    {t.Detail && <div className="timeline-detail">{t.Detail}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head"><div className="panel-title">Journey Metrics</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="metric-tile"><div className="kpi-label">Lead Age</div><div className="kpi-value">{journey.metrics.Lead_Age_Days} days</div></div>
              <div className="metric-tile"><div className="kpi-label">Conversion Time</div><div className="kpi-value">{journey.metrics.Conversion_Time_Days ?? '—'} days</div></div>
              <div className="metric-tile"><div className="kpi-label">Dealer Transfers</div><div className="kpi-value">{journey.metrics.Dealer_Transfers}</div></div>
              <div className="metric-tile"><div className="kpi-label">Retail Status</div><div className="kpi-value" style={{ fontSize: 15 }}>{journey.metrics.Retail_Status}</div></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
