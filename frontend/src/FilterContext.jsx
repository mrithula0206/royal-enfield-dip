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
  const [dates, setDates] = useState([]); // ['2026-05-01', ...]
  const [regionOptions, setRegionOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [sourceOptions, setSourceOptions] = useState([]);

  const [mode, setMode] = useState('mom'); // 'mom' | 'dod'
  const [currentMonth, setCurrentMonth] = useState(null);
  const [previousMonth, setPreviousMonth] = useState(null);
  const [currentDate, setCurrentDate] = useState(null);
  const [previousDate, setPreviousDate] = useState(null);
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
    api.dailyTrend({ granularity: 'daily', days: 365 }).then(r => {
      const ds = r.points.map(p => p.bucket);
      setDates(ds);
      if (ds.length) {
        setCurrentDate(ds[ds.length - 1]);
        setPreviousDate(ds.length > 1 ? ds[ds.length - 2] : ds[ds.length - 1]);
      }
    }).catch(() => {});
    api.masterData('region').then(r => setRegionOptions(r.rows.map(x => x.Region))).catch(() => {});
    api.masterData('model').then(r => setModelOptions(r.rows.map(x => x.Model))).catch(() => {});
    api.masterData('source').then(r => setSourceOptions(r.rows.map(x => x.Source))).catch(() => {});
  }, []);

  const clearFilters = () => { setRegion(''); setModel(''); setSource(''); };
  const activeFilterCount = [region, model, source].filter(Boolean).length;

  const value = useMemo(() => ({
    months, dates, mode, setMode,
    currentMonth, setCurrentMonth, previousMonth, setPreviousMonth,
    currentDate, setCurrentDate, previousDate, setPreviousDate,
    region, setRegion, model, setModel, source, setSource,
    regionOptions, modelOptions, sourceOptions, clearFilters, activeFilterCount,
  }), [months, dates, mode, currentMonth, previousMonth, currentDate, previousDate,
      region, model, source, regionOptions, modelOptions, sourceOptions]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  return useContext(FilterContext);
}
