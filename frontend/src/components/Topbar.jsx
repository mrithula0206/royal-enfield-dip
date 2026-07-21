import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useFilters } from '../FilterContext';
import { IconCalendar, IconChevronDown, IconFilter, IconBell } from './Icons';

const panelStyle = {
  position: 'absolute', top: 'calc(100% + 8px)', background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 12, boxShadow: 'var(--shadow-md)', padding: 14, zIndex: 20, minWidth: 220,
  animation: 'fadeIn 0.15s ease-out',
};
const selectStyle = { width: '100%', background: 'var(--base)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, padding: '8px 10px', fontSize: 12.5, marginBottom: 10 };
const fieldLabel = { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--text-faint)', marginBottom: 5, fontWeight: 600 };

export default function Topbar() {
  const [online, setOnline] = useState(null);
  const [open, setOpen] = useState(null);
  const [highInsights, setHighInsights] = useState([]);
  const f = useFilters();

  useEffect(() => {
    let mounted = true;
    api.health().then(() => mounted && setOnline(true)).catch(() => mounted && setOnline(false));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (open === 'notif') {
      api.insights({ severity: 'High', limit: 6 }).then(r => setHighInsights(r.insights)).catch(() => {});
    }
  }, [open]);

  const toggle = (name) => setOpen(o => (o === name ? null : name));

  if (!f) return null;

  return (
    <div className="topbar">
      {open && <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 10 }}></div>}

      <div className="brand">
        <div className="brand-mark">RE</div>
        <div>
          <div className="brand-text">Digital Intelligence Platform</div>
          <div className="brand-sub">Royal Enfield · CRM &amp; Marketing Ops</div>
        </div>
        {online === null ? null : (
          <span className={`env-pill ${online ? '' : 'offline'}`}>
            ● {online ? 'API CONNECTED' : 'API OFFLINE'}
          </span>
        )}
      </div>
      <div className="topbar-right">
        <div style={{ position: 'relative' }}>
          <button className="pill-btn" onClick={() => toggle('period')}>
            <IconCalendar size={14} /> {f.mode === 'mom' ? f.currentMonth : f.currentDate || '…'} <IconChevronDown size={13} />
          </button>
          {open === 'period' && (
            <div style={{ ...panelStyle, right: 0, minWidth: 250 }} onClick={e => e.stopPropagation()}>
              <div className="tab-row" style={{ marginBottom: 12 }}>
                <button className={f.mode === 'mom' ? 'on' : ''} onClick={() => f.setMode('mom')}>Month on Month</button>
                <button className={f.mode === 'dod' ? 'on' : ''} onClick={() => f.setMode('dod')}>Day on Day</button>
              </div>
              {f.mode === 'mom' ? (
                <>
                  <div style={fieldLabel}>Period</div>
                  <select style={selectStyle} value={f.currentMonth || ''} onChange={e => f.setCurrentMonth(e.target.value)}>
                    {f.months.map(m => <option key={m.value} value={m.value}>{m.value}</option>)}
                  </select>
                  <div style={fieldLabel}>Compare against</div>
                  <select style={{ ...selectStyle, marginBottom: 0 }} value={f.previousMonth || ''} onChange={e => f.setPreviousMonth(e.target.value)}>
                    {f.months.map(m => <option key={m.value} value={m.value}>{m.value}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <div style={fieldLabel}>Day</div>
                  <input type="date" style={selectStyle} value={f.currentDate || ''} min={f.dates[0]} max={f.dates[f.dates.length - 1]}
                    onChange={e => f.setCurrentDate(e.target.value)} />
                  <div style={fieldLabel}>Compare against</div>
                  <input type="date" style={{ ...selectStyle, marginBottom: 0 }} value={f.previousDate || ''} min={f.dates[0]} max={f.dates[f.dates.length - 1]}
                    onChange={e => f.setPreviousDate(e.target.value)} />
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button className="pill-btn compare" onClick={() => toggle('period')}>
            Compare: {f.mode === 'mom' ? f.previousMonth : f.previousDate || '…'} <IconChevronDown size={13} />
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <button className="icon-btn" title="Filters" onClick={() => toggle('filters')} style={{ position: 'relative' }}>
            <IconFilter size={16} />
            {f.activeFilterCount > 0 && <span className="notif-dot">{f.activeFilterCount}</span>}
          </button>
          {open === 'filters' && (
            <div style={{ ...panelStyle, right: 0, minWidth: 240 }} onClick={e => e.stopPropagation()}>
              <div style={fieldLabel}>Region</div>
              <select style={selectStyle} value={f.region} onChange={e => f.setRegion(e.target.value)}>
                <option value="">All regions</option>
                {f.regionOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div style={fieldLabel}>Model</div>
              <select style={selectStyle} value={f.model} onChange={e => f.setModel(e.target.value)}>
                <option value="">All models</option>
                {f.modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <div style={fieldLabel}>Source</div>
              <select style={{ ...selectStyle, marginBottom: 0 }} value={f.source} onChange={e => f.setSource(e.target.value)}>
                <option value="">All sources</option>
                {f.sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {f.activeFilterCount > 0 && (
                <button onClick={f.clearFilters} style={{ marginTop: 12, width: '100%', background: 'var(--border-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 0', fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button className="icon-btn" title="Notifications" onClick={() => toggle('notif')}>
            <IconBell size={17} />
            {highInsights.length > 0 && <span className="notif-dot">{highInsights.length}</span>}
          </button>
          {open === 'notif' && (
            <div style={{ ...panelStyle, right: 0, minWidth: 300, padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 12.5 }}>High-severity insights</div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {highInsights.length === 0 && <div style={{ padding: 14, fontSize: 12, color: 'var(--text-faint)' }}>Nothing flagged right now.</div>}
                {highInsights.map(ins => (
                  <div key={ins.Insight_ID} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-soft)', fontSize: 12, lineHeight: 1.5 }}>
                    {ins.Insight_Text}
                  </div>
                ))}
              </div>
              <Link to="/ai-insights" onClick={() => setOpen(null)} style={{ display: 'block', textAlign: 'center', padding: '10px 0', fontSize: 12, fontWeight: 600, color: 'var(--red)', borderTop: '1px solid var(--border)' }}>
                View all insights
              </Link>
            </div>
          )}
        </div>

        <div className="user-block">
          <div className="avatar">RE</div>
          <div>
            <div className="user-name">RE Admin</div>
            <div className="user-role">Head Office</div>
          </div>
        </div>
      </div>
    </div>
  );
}
