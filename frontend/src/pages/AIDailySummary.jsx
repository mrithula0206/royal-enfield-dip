import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { CHART_GRID, CHART_AXIS, AXIS_TICK_STYLE, AXIS_TICK_MONO_STYLE, TOOLTIP_STYLE } from '../chartTheme';

const SEV_ICON = { High: '!', Medium: '◐', Low: '✓' };
const SEV_COLORS = { High: 'var(--red)', Medium: 'var(--amber)', Low: 'var(--green)' };

export default function AIDailySummary() {
  const [insights, setInsights] = useState(null);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [freshCount, setFreshCount] = useState(null);

  const load = (params = {}) => {
    api.insights({ limit: 100, ...params }).then(r => setInsights(r.insights)).catch(e => setError(e.message));
  };

  useEffect(() => {
    load();
    api.insightCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    load({ category: category || undefined, severity: severity || undefined });
  }, [category, severity]);

  const runGenerate = () => {
    setGenerating(true);
    api.generateInsights().then(r => {
      setFreshCount(r.generated_count);
      setGenerating(false);
    }).catch(e => { setError(e.message); setGenerating(false); });
  };

  if (error) return <div className="error-box">Could not reach the API ({error}).</div>;
  if (!insights) return <div className="loading">Loading AI daily summary…</div>;

  const sevCounts = ['High', 'Medium', 'Low'].map(s => ({
    severity: s, count: insights.filter(i => i.Severity === s).length,
  }));

  const catCounts = Object.entries(
    insights.reduce((acc, i) => { acc[i.Category] = (acc[i.Category] || 0) + 1; return acc; }, {})
  ).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">AI Insights</div>
          <div className="page-meta">Rule-based insight engine · {insights.length} insights loaded</div>
        </div>
        <button className="search-bar-btn" style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '9px 16px', color: 'var(--text)', fontSize: 12.5, fontWeight: 600,
        }} onClick={runGenerate} disabled={generating}>
          {generating ? 'Regenerating…' : 'Regenerate from live data'}
        </button>
      </div>

      {freshCount !== null && (
        <div className="panel" style={{ marginBottom: 14, borderColor: 'var(--green)' }}>
          <div className="panel-sub" style={{ color: 'var(--green)' }}>
            Generated {freshCount} fresh insights from current data (see /api/ai-insights/generate — this endpoint
            is what a nightly scheduled job would call in production).
          </div>
        </div>
      )}

      <div className="kpi-strip">
        <KpiCard label="Total Insights" value={insights.length} accent="blue" />
        <KpiCard label="High Severity" value={sevCounts[0].count} accent="red" />
        <KpiCard label="Medium Severity" value={sevCounts[1].count} accent="amber" />
        <KpiCard label="Low Severity" value={sevCounts[2].count} accent="green" />
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Insights by Category</div><div className="panel-sub">{catCounts.length} categories</div></div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catCounts} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} horizontal={false} />
              <XAxis type="number" tick={AXIS_TICK_MONO_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="category" tick={AXIS_TICK_STYLE} axisLine={{ stroke: CHART_AXIS }} tickLine={false} width={130} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="var(--blue)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">Severity Mix</div><div className="panel-sub">High · Medium · Low</div></div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={sevCounts.map(s => ({ name: s.severity, value: s.count }))} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2}>
                {sevCounts.map((s, i) => (
                  <Cell key={i} fill={SEV_COLORS[s.severity]} stroke="#fff" strokeWidth={3} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
            {sevCounts.map(s => (
              <div key={s.severity} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-dim)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: SEV_COLORS[s.severity] }}></span>
                {s.severity} {s.count}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-head" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={severity} onChange={e => setSeverity(e.target.value)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
            <option value="">All severities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div className="panel">
        {insights.length === 0 && <div className="empty-box">No insights match the selected filters.</div>}
        {insights.map(ins => (
          <div className={`insight sev-${ins.Severity}`} key={ins.Insight_ID}>
            <div className="insight-icon">{SEV_ICON[ins.Severity] || '•'}</div>
            <div>
              <div className="insight-text">{ins.Insight_Text}</div>
              <div className="insight-meta">{ins.Category?.toUpperCase()} · {ins.Severity?.toUpperCase()} · {ins.Generated_Date}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
