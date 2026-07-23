import { useEffect, useState } from 'react';
import { api } from '../api';
import KpiCard from '../components/KpiCard';
import { IconUsers, IconCalendarCheck, IconBike, IconTarget } from '../components/Icons';

const TREND_CLASS = { up: 'pos', down: 'neg', flat: '' };
const TREND_ARROW = { up: '▲', down: '▼', flat: '—' };

export default function Forecasting() {
  const [summary, setSummary] = useState(null);
  const [byRegion, setByRegion] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.forecastSummary(), api.forecastByRegion()])
      .then(([s, r]) => { setSummary(s); setByRegion(r); })
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="error-box">Could not reach the API ({error}).</div>;
  if (!summary) return <div className="loading">Loading forecast…</div>;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Forecasting</div>
          <div className="page-meta">Next-30-day trend projection · {summary.history_days} days of history used</div>
        </div>
      </div>

      <div className="needs-attention" style={{ marginBottom: 16 }}>
        <div className="needs-attention-title">Caveat</div>
        {summary.caveat}
      </div>

      <div className="kpi-strip">
        <KpiCard label="Leads (Next 30d)" value={summary.leads.next_period_total} accent="blue" icon={IconUsers}
          compareLabel="daily avg" compareValue={summary.leads.daily_avg_projected} />
        <KpiCard label="Bookings (Next 30d)" value={summary.bookings.next_period_total} accent="green" icon={IconCalendarCheck}
          compareLabel="daily avg" compareValue={summary.bookings.daily_avg_projected} />
        <KpiCard label="Retail (Next 30d)" value={summary.retail.next_period_total} accent="amber" icon={IconBike}
          compareLabel="daily avg" compareValue={summary.retail.daily_avg_projected} />
      </div>

      <div className="grid-3" style={{ marginBottom: 14 }}>
        {[
          { key: 'leads', label: 'Leads Trend', icon: IconUsers },
          { key: 'bookings', label: 'Bookings Trend', icon: IconCalendarCheck },
          { key: 'retail', label: 'Retail Trend', icon: IconBike },
        ].map(({ key, label, icon: Icon }) => {
          const fc = summary[key];
          return (
            <div className="panel" key={key}>
              <div className="panel-head">
                <div><div className="panel-title">{label}</div><div className="panel-sub">Slope: {fc.slope_per_day}/day</div></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="kpi-icon"><Icon size={17} /></div>
                <div className={`kpi-delta ${TREND_CLASS[fc.trend]}`} style={{ fontSize: 14 }}>
                  {TREND_ARROW[fc.trend]} {fc.trend.toUpperCase()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {byRegion && (
        <div className="grid-2">
          <div className="panel">
            <div className="panel-head"><div><div className="panel-title">Fastest-Rising Regions</div><div className="panel-sub">By lead-volume slope</div></div></div>
            <table>
              <thead><tr><th>Region</th><th className="mono">Current Leads</th><th className="mono">Slope/day</th><th>Trend</th></tr></thead>
              <tbody>
                {byRegion.rising.map(r => (
                  <tr key={r.Region}>
                    <td>{r.Region}</td><td className="mono">{r.Current_Total_Leads}</td>
                    <td className="mono pos">{r.slope_per_day}</td>
                    <td><span className={TREND_CLASS[r.trend]}>{TREND_ARROW[r.trend]} {r.trend}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel">
            <div className="panel-head"><div><div className="panel-title">Fastest-Falling Regions</div><div className="panel-sub">By lead-volume slope</div></div></div>
            <table>
              <thead><tr><th>Region</th><th className="mono">Current Leads</th><th className="mono">Slope/day</th><th>Trend</th></tr></thead>
              <tbody>
                {byRegion.falling.map(r => (
                  <tr key={r.Region}>
                    <td>{r.Region}</td><td className="mono">{r.Current_Total_Leads}</td>
                    <td className="mono neg">{r.slope_per_day}</td>
                    <td><span className={TREND_CLASS[r.trend]}>{TREND_ARROW[r.trend]} {r.trend}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
