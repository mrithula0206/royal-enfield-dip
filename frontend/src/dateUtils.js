const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = n => String(n).padStart(2, '0');
const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "Jun-2026" -> { start: '2026-06-01', end: '2026-06-30' }
export function monthBounds(label) {
  const [mon, yearStr] = label.split('-');
  const year = Number(yearStr);
  const m = MONTHS.indexOf(mon);
  const start = new Date(year, m, 1);
  const end = new Date(year, m + 1, 0);
  return { start: fmt(start), end: fmt(end) };
}
