// Mock LLM extraction of diagnostic reports. Swap with a fetch to the AI
// backend (e.g. Gemini vision proxy) that returns the same shape.
import type { Investigation } from "./types";

export interface ExtractedReport {
  detectedName: string;
  reportType: string;
  investigations: Omit<Investigation, "id">[];
}

const REPORT_TEMPLATES: Record<string, Omit<Investigation, "id">[]> = {
  cbc: [
    { testName: "Hemoglobin", result: "11.8", units: "g/dL", referenceRange: "12–16", status: "Abnormal" },
    { testName: "WBC", result: "8.4", units: "10³/µL", referenceRange: "4–11", status: "Normal" },
    { testName: "Platelets", result: "412", units: "10³/µL", referenceRange: "150–400", status: "Abnormal" },
    { testName: "MCV", result: "82", units: "fL", referenceRange: "80–96", status: "Normal" },
  ],
  inflammatory: [
    { testName: "ESR", result: "48", units: "mm/hr", referenceRange: "<20", status: "Abnormal" },
    { testName: "CRP", result: "22", units: "mg/L", referenceRange: "<5", status: "Abnormal" },
  ],
  rheum: [
    { testName: "RF", result: "84", units: "IU/mL", referenceRange: "<14", status: "Abnormal" },
    { testName: "Anti-CCP", result: "120", units: "U/mL", referenceRange: "<20", status: "Critical" },
    { testName: "ANA", result: "Negative", referenceRange: "Negative", status: "Normal" },
  ],
  lft: [
    { testName: "ALT", result: "32", units: "U/L", referenceRange: "<40", status: "Normal" },
    { testName: "AST", result: "28", units: "U/L", referenceRange: "<40", status: "Normal" },
    { testName: "Alk Phos", result: "92", units: "U/L", referenceRange: "40–129", status: "Normal" },
    { testName: "Bilirubin", result: "0.7", units: "mg/dL", referenceRange: "0.2–1.2", status: "Normal" },
  ],
  kft: [
    { testName: "Creatinine", result: "0.9", units: "mg/dL", referenceRange: "0.6–1.2", status: "Normal" },
    { testName: "Urea", result: "28", units: "mg/dL", referenceRange: "15–40", status: "Normal" },
    { testName: "eGFR", result: ">90", units: "mL/min", referenceRange: ">90", status: "Normal" },
  ],
  urate: [
    { testName: "Uric Acid", result: "8.4", units: "mg/dL", referenceRange: "3.5–7.2", status: "Abnormal" },
  ],
  vitd: [
    { testName: "25-OH Vitamin D", result: "18", units: "ng/mL", referenceRange: "30–100", status: "Abnormal" },
  ],
};

function classify(filename: string): { type: string; key: keyof typeof REPORT_TEMPLATES } {
  const f = filename.toLowerCase();
  if (/cbc|hemo|blood\s*count/.test(f)) return { type: "Complete Blood Count", key: "cbc" };
  if (/esr|crp|inflam/.test(f)) return { type: "Inflammatory markers", key: "inflammatory" };
  if (/rf|ccp|ana|rheum|autoimm/.test(f)) return { type: "Rheumatology panel", key: "rheum" };
  if (/lft|liver/.test(f)) return { type: "Liver function", key: "lft" };
  if (/kft|rft|renal|kidney|creat/.test(f)) return { type: "Renal function", key: "kft" };
  if (/urat|gout|uric/.test(f)) return { type: "Serum urate", key: "urate" };
  if (/vit\s*d|vitamin/.test(f)) return { type: "Vitamin D", key: "vitd" };
  return { type: "Rheumatology panel", key: "rheum" };
}

// Simulate OCR'd name. ~70% match (correct), 30% mismatch to demo warning.
function detectName(filename: string, patientName: string): string {
  const f = filename.toLowerCase().replace(/\.[^.]+$/, "");
  // Filename may contain a name fragment
  const cleaned = f.replace(/[_-]+/g, " ").replace(/\b(cbc|lft|kft|rf|ccp|ana|esr|crp|report|lab|results?|\d+)\b/g, "").trim();
  if (cleaned.length > 3 && /[a-z]{3,}/.test(cleaned)) {
    return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  // Deterministic-ish: hash filename length to decide match vs mismatch
  const mismatch = filename.length % 10 < 3;
  if (mismatch) {
    const others = ["Rajesh Kumar", "Anita Sharma", "Mohammed Ali", "Priya Iyer", "John Smith"];
    return others[filename.length % others.length];
  }
  return patientName;
}

export async function extractReport(filename: string, patientName: string): Promise<ExtractedReport> {
  await new Promise((r) => setTimeout(r, 1100 + Math.random() * 700));
  const { type, key } = classify(filename);
  return {
    detectedName: detectName(filename, patientName),
    reportType: type,
    investigations: REPORT_TEMPLATES[key].map((i) => ({ ...i, date: new Date().toISOString() })),
  };
}
