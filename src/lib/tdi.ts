// Total Duration of Illness helpers.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const MONTH_NAMES = MONTHS;

export function tdiYearOptions(): number[] {
  const now = new Date().getFullYear();
  const out: number[] = [];
  for (let y = now; y >= 1960; y--) out.push(y);
  return out;
}

/** Parse tdiStartDate ISO string → { year, month (1-12) } or null. */
export function parseTdiStart(iso?: string): { year: number; month: number } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** Build ISO date string for the 1st of the given month/year. */
export function buildTdiStart(year: number, month: number): string {
  const m = String(month).padStart(2, "0");
  return `${year}-${m}-01`;
}

/** Human-readable calculated TDI from ISO start date to now. */
export function formatTdiDuration(iso?: string): string {
  if (!iso) return "";
  const start = new Date(iso);
  if (isNaN(start.getTime())) return "";
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 1) return "< 1 month";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years} year${years === 1 ? "" : "s"} ${rem} month${rem === 1 ? "" : "s"}`;
}

/** Short "Jun 2023" label for the start date. */
export function formatTdiStartLabel(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
