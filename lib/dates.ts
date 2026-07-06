import { DAYS_JA } from "./constants";

export type DateInfo = {
  date: string; // YYYY-MM-DD
  day: number; // day-of-month
  dow: number; // 0=Sun..6=Sat
  w: string; // weekday label, ja
  label: string; // "7/6(月)"
};

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Next `count` days starting today, in the server's local time zone.
export function getUpcomingDates(count = 8, from = new Date()): DateInfo[] {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const out: DateInfo[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push({
      date: toISODate(d),
      day: d.getDate(),
      dow: d.getDay(),
      w: DAYS_JA[d.getDay()],
      label: `${d.getMonth() + 1}/${d.getDate()}(${DAYS_JA[d.getDay()]})`,
    });
  }
  return out;
}

export function labelForISODate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${m}/${d}(${DAYS_JA[dt.getDay()]})`;
}

export function weekdayColor(dow: number): string {
  return dow === 0 ? "#e2607a" : dow === 6 ? "#5b8def" : "#9aa4b4";
}
