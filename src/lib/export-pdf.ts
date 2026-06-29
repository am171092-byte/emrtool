import { jsPDF } from "jspdf";
import type { Patient, Visit } from "./types";
import { calcAge } from "./format";

// Layout constants (mm). 80px @ 96dpi ≈ 21.17mm reserved at top for letterhead.
const PAGE_W = 210;
const PAGE_H = 297;
const TOP_MARGIN = 21.17;
const BOTTOM_MARGIN = 15;
const LEFT = 14;
const RIGHT = 14;
const CONTENT_W = PAGE_W - LEFT - RIGHT;

type RenderOpts = { mode: "save" | "print" };

function buildVisitPdf(p: Patient, v: Visit): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = TOP_MARGIN;

  const ensureSpace = (h: number) => {
    if (y + h > PAGE_H - BOTTOM_MARGIN) {
      doc.addPage();
      y = TOP_MARGIN;
    }
  };

  const writeText = (
    txt: string,
    opts: { size?: number; bold?: boolean; indent?: number } = {},
  ) => {
    const size = opts.size ?? 10;
    const lineH = size * 0.42; // tight line height
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    const x = LEFT + (opts.indent ?? 0);
    const wrapped = doc.splitTextToSize(txt, CONTENT_W - (opts.indent ?? 0));
    for (const ln of wrapped) {
      ensureSpace(lineH);
      doc.text(ln, x, y);
      y += lineH;
    }
  };

  const sectionTitle = (label: string) => {
    ensureSpace(6);
    y += 1.2;
    writeText(label, { size: 10.5, bold: true });
    y += 0.4;
  };

  const sectionBody = (label: string, body?: string | null) => {
    if (!body || !body.trim()) return;
    sectionTitle(label);
    writeText(body.trim(), { size: 10 });
  };

  // Header: patient identity
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  ensureSpace(5);
  doc.text(p.fullName, LEFT, y);
  y += 4.8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const sub = `${calcAge(p.dob)} y · ${p.sex}${p.phone ? " · " + p.phone : ""}${p.mrn ? " · MRN " + p.mrn : ""}`;
  doc.text(sub, LEFT, y);
  y += 4;

  // Visit date
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const dateLine = `Visit: ${new Date(v.date).toLocaleDateString()}${v.time ? "  " + v.time : ""}`;
  doc.text(dateLine, LEFT, y);
  y += 3.2;

  // Divider
  doc.setDrawColor(180);
  doc.setLineWidth(0.2);
  doc.line(LEFT, y, PAGE_W - RIGHT, y);
  y += 3;

  // Chief complaints
  const cc =
    v.chiefComplaints && v.chiefComplaints.length > 0
      ? v.chiefComplaints.join(", ")
      : v.chiefComplaint || "";
  if (cc) sectionBody("Chief Complaint", cc);

  sectionBody(
    "History of Presenting Illness",
    v.soap?.historyOfPresentingIllness || v.soap?.subjective,
  );
  sectionBody("Current Visit", v.soap?.currentVisit);
  sectionBody("Examination", v.soap?.examination || v.soap?.objective);
  sectionBody("Impression", v.soap?.impression || v.soap?.assessment);
  sectionBody("Plan", v.soap?.plan);

  if (v.prescriptions && v.prescriptions.length > 0) {
    sectionTitle("Prescriptions");
    v.prescriptions.forEach((r) => {
      const parts = [r.drug, r.dose, r.frequency, r.duration].filter(Boolean).join("  ·  ");
      const notes = r.notes ? `  — ${r.notes}` : r.instructions ? `  — ${r.instructions}` : "";
      writeText(`• ${parts}${notes}`, { size: 10, indent: 1 });
    });
  }

  if (v.investigations && v.investigations.length > 0) {
    sectionTitle("Investigations");
    v.investigations.forEach((i) => {
      const bits = [i.testName, i.urgency].filter(Boolean).join("  ·  ");
      const notes = i.notes ? `  — ${i.notes}` : "";
      writeText(`• ${bits}${notes}`, { size: 10, indent: 1 });
    });
    if (v.investigationNotes) {
      writeText(`Notes: ${v.investigationNotes}`, { size: 9.5, indent: 1 });
    }
  }

  if (v.das28) {
    sectionTitle("DAS28");
    const esr = v.das28.scoreEsr != null ? v.das28.scoreEsr.toFixed(2) : "—";
    const crp = v.das28.scoreCrp != null ? v.das28.scoreCrp.toFixed(2) : "—";
    writeText(
      `ESR ${esr}  ·  CRP ${crp}  ·  TJC ${v.das28.tjc}  ·  SJC ${v.das28.sjc}`,
      { size: 10 },
    );
  }

  if (v.nextFollowUp) {
    sectionTitle("Next Follow-up");
    const reason = v.nextVisitReason ? ` — ${v.nextVisitReason}` : "";
    writeText(`${new Date(v.nextFollowUp).toLocaleDateString()}${reason}`, { size: 10 });
  }

  return doc;
}

export function exportVisitPdf(p: Patient, v: Visit, opts: RenderOpts = { mode: "save" }) {
  const doc = buildVisitPdf(p, v);
  if (opts.mode === "print") {
    doc.autoPrint();
    const url = doc.output("bloburl");
    const w = window.open(url, "_blank");
    if (!w) {
      // popup blocked — fall back to save
      doc.save(filename(p, v));
    }
    return;
  }
  doc.save(filename(p, v));
}

export function printVisitPdf(p: Patient, v: Visit) {
  exportVisitPdf(p, v, { mode: "print" });
}

function filename(p: Patient, v: Visit) {
  return `${p.fullName.replace(/\s+/g, "_")}_${new Date(v.date).toISOString().slice(0, 10)}_Visit.pdf`;
}
