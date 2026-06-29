import { jsPDF } from "jspdf";
import type { Patient, Visit } from "./types";
import { calcAge } from "./format";

// Layout constants (mm). A4 = 210 x 297mm.
const PAGE_W = 210;
const PAGE_H = 297;
const TOP_MARGIN = 65;     // 6.5 cm — applied to EVERY page
const BOTTOM_MARGIN = 35;  // 3.5 cm
const LEFT = 10;           // 1 cm
const RIGHT = 10;          // 1 cm
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
    const lineH = size * 0.42;
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
    writeText(label, { size: 12, bold: true });
    y += 0.4;
  };

  const sectionBody = (label: string, body?: string | null) => {
    if (!body || !body.trim()) return;
    sectionTitle(label);
    writeText(body.trim(), { size: 10.5 });
  };

  const sectionList = (label: string, items?: string[]) => {
    const list = (items ?? []).filter((s) => s && String(s).trim());
    if (list.length === 0) return;
    sectionTitle(label);
    list.forEach((it) => writeText(`• ${it}`, { size: 10.5, indent: 1 }));
  };

  // Header: patient identity
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  ensureSpace(5);
  doc.text(p.fullName, LEFT, y);
  y += 4.8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${calcAge(p.dob)} y · ${p.sex}`, LEFT, y);
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text(
    `Visit: ${new Date(v.date).toLocaleDateString()}${v.time ? "  " + v.time : ""}`,
    LEFT,
    y,
  );
  y += 3.2;

  doc.setDrawColor(180);
  doc.setLineWidth(0.2);
  doc.line(LEFT, y, PAGE_W - RIGHT, y);
  y += 2.5;

  // Patient context
  sectionList("Current Issues", p.problemList ?? []);
  sectionList("Comorbidities", (p.comorbidities ?? []) as string[]);
  sectionList("Allergies", (p.allergies ?? []) as string[]);

  const meds = p.medications ?? [];
  if (meds.length > 0) {
    sectionTitle("Current Medications");
    meds.forEach((m) => {
      const parts = [m.drug, m.dose, m.frequency, m.duration].filter(Boolean).join("  ·  ");
      writeText(`• ${parts}`, { size: 10.5, indent: 1 });
    });
  }

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
      writeText(`• ${parts}${notes}`, { size: 10.5, indent: 1 });
    });
  }

  if (v.investigations && v.investigations.length > 0) {
    sectionTitle("Investigations Ordered");
    v.investigations.forEach((i) => {
      const bits = [i.testName, i.urgency].filter(Boolean).join("  ·  ");
      const notes = i.notes ? `  — ${i.notes}` : "";
      writeText(`• ${bits}${notes}`, { size: 10.5, indent: 1 });
    });
  }

  sectionBody("Investigation Notes", v.investigationNotes);

  if (v.das28) {
    sectionTitle("DAS28 Score");
    const esr = v.das28.scoreEsr != null ? v.das28.scoreEsr.toFixed(2) : null;
    const crp = v.das28.scoreCrp != null ? v.das28.scoreCrp.toFixed(2) : null;
    const score = esr ? `ESR ${esr}` : crp ? `CRP ${crp}` : "—";
    const activity = v.das28.activity ? `  ·  ${v.das28.activity}` : "";
    writeText(
      `${score}${activity}  ·  TJC ${v.das28.tjc}  ·  SJC ${v.das28.sjc}`,
      { size: 10.5 },
    );
  }

  const vit = v.vitals;
  if (vit && Object.values(vit).some((x) => x != null && x !== "")) {
    sectionTitle("Vitals");
    const parts: string[] = [];
    if (vit.bpSystolic && vit.bpDiastolic)
      parts.push(`BP ${vit.bpSystolic}/${vit.bpDiastolic} mmHg`);
    if (vit.hr != null) parts.push(`HR ${vit.hr} bpm`);
    if (vit.respiratoryRate != null) parts.push(`RR ${vit.respiratoryRate} /min`);
    if (vit.temperature != null) parts.push(`Temp ${vit.temperature} °F`);
    if (vit.spo2 != null) parts.push(`SpO₂ ${vit.spo2} %`);
    if (vit.weight != null) parts.push(`Wt ${vit.weight} kg`);
    if (vit.height != null) parts.push(`Ht ${vit.height} cm`);
    writeText(parts.join("  ·  "), { size: 10.5 });
  }

  if (v.nextFollowUp || v.followUpNote) {
    sectionTitle("Next Follow-up");
    if (v.nextFollowUp) {
      writeText(new Date(v.nextFollowUp).toLocaleDateString(), { size: 10.5 });
    }
    if (v.followUpNote) {
      writeText(v.followUpNote, { size: 10.5 });
    }
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
