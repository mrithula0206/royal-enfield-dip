import { useEffect, useState } from 'react';
import { api } from '../api';
import { IconDatabase } from '../components/Icons';

const ENTITIES = [
  { key: 'region', label: 'Regions' },
  { key: 'dealer', label: 'Dealers' },
  { key: 'model', label: 'Models' },
  { key: 'source', label: 'Sources' },
  { key: 'campaign', label: 'Campaigns' },
];

export default function MasterData() {
  const [entity, setEntity] = useState('region');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    api.masterData(entity).then(setData).catch(e => setError(e.message));
  }, [entity]);

  const cols = data ? Object.keys(data.rows[0] || {}) : [];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="page-title">Master Data</div>
          <div className="page-meta">Read-only lookup tables ingested from the source workbook</div>
        </div>
      </div>

      <div className="tab-row">
        {ENTITIES.map(e => (
          <button key={e.key} className={entity === e.key ? 'on' : ''} onClick={() => setEntity(e.key)}>{e.label}</button>
        ))}
      </div>

      {error && <div className="error-box">Could not reach the API ({error}).</div>}
      {!data && !error && <div className="loading">Loading…</div>}

      {data && (
        <div className="panel">
          <div className="panel-head">
            <div><div className="panel-title">{ENTITIES.find(e => e.key === entity).label}</div><div className="panel-sub">{data.count} rows</div></div>
            <span className="chip"><IconDatabase size={11} /> {entity}_master</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr>{cols.map(c => <th key={c}>{c.replace(/_/g, ' ')}</th>)}</tr></thead>
              <tbody>
                {data.rows.slice(0, 50).map((r, i) => (
                  <tr key={i}>{cols.map(c => <td key={c} className={typeof r[c] === 'number' ? 'mono' : ''}>{String(r[c])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.rows.length > 50 && <div className="panel-sub" style={{ marginTop: 10 }}>Showing 50 of {data.rows.length} rows.</div>}
        </div>
      )}
    </>
  );
}
