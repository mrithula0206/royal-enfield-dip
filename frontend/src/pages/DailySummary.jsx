import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { CHART_GRID, CHART_AXIS, AXIS_TICK_STYLE, AXIS_TICK_MONO_STYLE, TOOLTIP_STYLE } from '../chartTheme';
import { IconUsers, IconChat, IconCalendarCheck, IconTarget } from '../components/Icons';

export default function DailySummary() {
  const [dates, setDates] = useState([]);
  const [date, setDate] = useState(null);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.dailyTrend({ granularity: 'daily', days: 61 }).then(r => {
      setTrend(r.points);
      setDates(r.points.map(p => p.bucket));
    }).catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    api.dailySummary(date ? { date } : {}).then(setSummary).catch(e => setError(e.message));
  }, [date]);

  if (error) return <div className="error-box">Could not reach the API ({error}).</div>;
  if (!summary) return <div className="loading">Loading daily summary…</div>;

  const s = summary.snapshot;
  const waText = encodeURIComponent(
    `RE Digital Intelligence — Daily Summary (${summary.date})\n` +
    `Leads: ${s.Leads} · Enquiries: ${s.Enquiries} · Bookings: ${s.Bookings}\n` +
    `E2B: ${(s.E2B * 100).toFixed(1)}% · L2B: ${(s.L2B * 100).toFixed(1)}%\n` +
    (summary.needs_attention.length ? `\nNeeds attention:\n- ${summary.needs_attention.join('\n- ')}` : '')
  );

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Daily Summary</div>
          <div className="page-meta">Auto-generated end-of-day business snapshot</div>
        </div>
        <select value={date || summary.date} onChange={e => setDate(e.target.value)}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '8px 12px', fontSize: 12.5 }}>
          {dates.slice().reverse().map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="kpi-strip">
        <KpiCard label="Leads" value={s.Leads} accent="blue" icon={IconUsers} />
        <KpiCard label="Enquiries" value={s.Enquiries} accent="purple" icon={IconChat} />
        <KpiCard label="Bookings" value={s.Bookings} accent="green" icon={IconCalendarCheck} />
        <KpiCard label="E2B%" value={s.E2B} isPct accent="amber" icon={IconTarget} />
        <KpiCard label="L2B%" value={s.L2B} isPct accent="blue" icon={IconTarget} />
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Trailing 61-Day Trend</div><div className="panel-sub">Leads &amp; Bookings, daily</div></div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="bucket" tick={{ ...AXIS_TICK_STYLE, fontSize: 8 }} axisLine={{ stroke: CHART_AXIS }} tickLine={false} interval={6} />
              <YAxis tick={AXIS_TICK_MONO_STYLE} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="Leads" stroke="var(--blue)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Bookings" stroke="var(--green)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">{summary.date}</div><div className="panel-sub">Narrative snapshot</div></div>
          </div>
          <div className="summary-meta-row">
            <span>Open Enquiries <b>{s.Open_Enquiries}</b></span>
            <span>Dropped <b>{s.Dropped}</b></span>
            <span>Duplicate% <b>{(s.Duplicate_Percentage * 100).toFixed(1)}%</b></span>
          </div>
          {summary.needs_attention.length > 0 ? (
            <div className="needs-attention">
              <div className="needs-attention-title">Top Needs Attention</div>
              <ul>{summary.needs_attention.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          ) : (
            <div className="empty-box" style={{ padding: 16 }}>No high-severity items today.</div>
          )}
          <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" className="whatsapp-btn">
            Send on WhatsApp
          </a>
        </div>
      </div>
    </>
  );
}
