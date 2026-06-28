export interface DAS28Inputs {
  tjc: number;
  sjc: number;
  esr?: number;
  crp?: number;
  gh: number; // 0-100
}

export function das28Esr({ tjc, sjc, esr, gh }: DAS28Inputs): number | null {
  if (esr == null || esr <= 0) return null;
  return 0.56 * Math.sqrt(tjc) + 0.28 * Math.sqrt(sjc) + 0.7 * Math.log(esr) + 0.014 * gh;
}

export function das28Crp({ tjc, sjc, crp, gh }: DAS28Inputs): number | null {
  if (crp == null || crp < 0) return null;
  return 0.56 * Math.sqrt(tjc) + 0.28 * Math.sqrt(sjc) + 0.36 * Math.log(crp + 1) + 0.014 * gh + 0.96;
}

export type Activity = "Remission" | "Low" | "Moderate" | "High";

export function activityLabel(score: number | null): { label: Activity | "—"; tone: "accent" | "primary" | "warning" | "destructive" | "muted" } {
  if (score == null || isNaN(score)) return { label: "—", tone: "muted" };
  if (score < 2.6) return { label: "Remission", tone: "accent" };
  if (score <= 3.2) return { label: "Low", tone: "primary" };
  if (score <= 5.1) return { label: "Moderate", tone: "warning" };
  return { label: "High", tone: "destructive" };
}
