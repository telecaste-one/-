// Fixed 90-minute session slots — the design dropped per-menu duration in
// favor of one fixed length, so every slot below is a 90-minute booking.
export const SESSION_MINUTES = 90;

export const TIME_SLOTS = ["10:00", "11:30", "13:00", "14:30", "16:00", "18:00", "19:30"];

export const SLOT_NOTES: Record<string, string> = {
  "10:00": "朝トレ枠",
  "13:00": "ランチ後",
  "14:30": "午後",
  "18:00": "夕方 人気",
  "19:30": "夜間",
};

export const DAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

export function endTimeOf(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + SESSION_MINUTES;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}
