const ACCENTS = {
  blue: { fg: 'var(--blue)', bg: 'var(--blue-dim)' },
  green: { fg: 'var(--green)', bg: 'var(--green-dim)' },
  amber: { fg: 'var(--amber)', bg: 'var(--amber-dim)' },
  red: { fg: 'var(--red)', bg: 'var(--red-dim)' },
  purple: { fg: 'var(--purple)', bg: 'var(--purple-dim)' },
  faint: { fg: 'var(--text-faint)', bg: 'var(--border-soft)' },
};

function formatValue(v, isPct) {
  if (v === null || v === undefined) return '—';
  if (isPct) return `${(v * 100).toFixed(1)}%`;
  return v.toLocaleString('en-IN');
}

export default function KpiCard({ label, value, isPct = false, accent = 'faint', delta, deltaUnit, icon: Icon, compareLabel, compareValue }) {
  let deltaClass = 'flat', deltaText = null;
  if (delta !== null && delta !== undefined) {
    deltaClass = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '—';
    const magnitude = deltaUnit === 'pts' ? `${Math.abs(delta).toFixed(1)} pts` : `${Math.abs(delta * 100).toFixed(1)}%`;
    deltaText = `${arrow} ${magnitude}`;
  }
  const { fg, bg } = ACCENTS[accent] || ACCENTS.faint;

  return (
    <div className="kpi" style={{ '--kpi-accent': fg, '--kpi-soft': bg }}>
      <div className="kpi-top">
        {Icon && <div className="kpi-icon"><Icon size={17} /></div>}
        {deltaText && <div className={`kpi-delta ${deltaClass}`} style={{ marginTop: 0 }}>{deltaText}</div>}
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{formatValue(value, isPct)}</div>
      {compareLabel && (
        <div className="kpi-compare">vs {compareLabel}: {compareValue}</div>
      )}
    </div>
  );
}
