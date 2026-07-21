import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';

const FilterContext = createContext(null);

function monthLabel(bucket) {
  // "2026-06" -> "Jun-2026"
  const [y, m] = bucket.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString('en-US', { month: 'short' }) + '-' + y;
}

export function FilterProvider({ children }) {
  const [months, setMonths] = useState([]); // [{value:'Jun-2026', bucket:'2026-06'}]
  const [regionOptions, setRegionOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);

  const [currentMonth, setCurrentMonth] = useState(null);
  const [previousMonth, setPreviousMonth] = useState(null);
  const [region, setRegion] = useState('');
  const [model, setModel] = useState('');
  const [source, setSource] = useState('');

  useEffect(() => {
    api.dailyTrend({ granularity: 'monthly', days: 365 }).then(r => {
      const ms = r.points.map(p => ({ value: monthLabel(p.bucket), bucket: p.bucket }));
      setMonths(ms);
      if (ms.length) {
        setCurrentMonth(ms[ms.length - 1].value);
        setPreviousMonth(ms.length > 1 ? ms[ms.length - 2].value : ms[ms.length - 1].value);
      }
    }).catch(() => {});
    api.masterData('region').then(r => setRegionOptions(r.rows.map(x => x.Region))).catch(() => {});
    api.masterData('model').then(r => setModelOptions(r.rows.map(x => x.Model))).catch(() => {});
    api.masterData('source').then(r => setSourceOptions(r.rows.map(x => x.Source))).catch(() => {});
  }, []);

  const clearFilters = () => { setRegion(''); setModel(''); setSource(''); };
  const activeFilterCount = [region, model, source].filter(Boolean).length;

  const value = useMemo(() => ({
    months, currentMonth, setCurrentMonth, previousMonth, setPreviousMonth,
    region, setRegion, model, setModel, source, setSource,
    regionOptions, modelOptions, sourceOptions, clearFilters, activeFilterCount,
  }), [months, currentMonth, previousMonth, region, model, source, regionOptions, modelOptions, sourceOptions]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  return useContext(FilterContext);
}
