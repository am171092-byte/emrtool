import type { Patient } from "./types";

export function calcAge(dob: string): number {
  const b = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

// Deterministic warm color from name
export function colorFromName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 55% 45%)`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = +new Date(iso) - Date.now();
  return Math.ceil(d / (1000 * 60 * 60 * 24));
}

export function bmi(weightKg?: number, heightCm?: number): number | null {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return +(weightKg / (m * m)).toFixed(1);
}

export function patientMatches(p: Patient, q: string): boolean {
  if (!q) return true;
  const s = q.toLowerCase();
  return (
    p.fullName.toLowerCase().includes(s) ||
    p.phone.toLowerCase().includes(s) ||
    (p.primaryDiagnosis?.toLowerCase().includes(s) ?? false) ||
    p.problemList.some((x) => x.toLowerCase().includes(s))
  );
}
