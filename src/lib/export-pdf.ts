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

// Spacing tokens (mm).
const SECTION_GAP = 8;        // 8mm gap between sections
const HEADER_PAD_BELOW = 2;   // below header before content
const INFO_GAP = 4;           // below patient info block
const MIN_SECTION_SPACE = 25; // require >=25mm before starting a new section
const BODY_SIZE = 10;
const HEADER_SIZE = 11;
const FONT = "helvetica"; // clean sans-serif bundled with jsPDF

type RenderOpts = { mode: "save" | "print" };

function buildVisitPdf(p: Patient, v: Visit): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = TOP_MARGIN;
  let firstSection = true;

  const ensureSpace = (h: number) => {
    if (y + h > PAGE_H - BOTTOM_MARGIN) {
      doc.addPage();
      y = TOP_MARGIN;
    }
  };

  const writeText = (
    txt: string,
    opts: { size?: number; bold?: boolean; indent?: number; color?: number } = {},
  ) => {
    const size = opts.size ?? BODY_SIZE;
    const lineH = size * 0.42;
    doc.setFont(FONT, opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    if (opts.color != null) doc.setTextColor(opts.color);
    else doc.setTextColor(20);
    const x = LEFT + (opts.indent ?? 0);
    const wrapped = doc.splitTextToSize(txt, CONTENT_W - (opts.indent ?? 0));
    for (const ln of wrapped) {
      ensureSpace(lineH);
      doc.text(ln, x, y);
      y += lineH;
    }
    doc.setTextColor(20);
  };

  const sectionTitle = (label: string) => {
    if (!firstSection) y += SECTION_GAP;
    // Keep header with at least some content: require min space available.
    const remaining = PAGE_H - BOTTOM_MARGIN - y;
    if (remaining < MIN_SECTION_SPACE) {
      doc.addPage();
      y = TOP_MARGIN;
    }
    firstSection = false;
    doc.setFont(FONT, "bold");
    doc.setFontSize(HEADER_SIZE);
    doc.setTextColor(20);
    doc.text(label, LEFT, y);
    y += HEADER_SIZE * 0.42 + 0.6;
    doc.setDrawColor(190);
    doc.setLineWidth(0.18);
    doc.line(LEFT, y, PAGE_W - RIGHT, y);
    y += HEADER_PAD_BELOW;
  };

  const sectionBody = (label: string, body?: string | null) => {
    if (!body || !body.trim()) return;
    sectionTitle(label);
    writeText(body.trim(), { size: BODY_SIZE });
  };

  // Compact list: comma-joined if ≤3 items, bulleted if more.
  const sectionList = (label: string, items?: string[]) => {
    const list = (items ?? []).map((s) => String(s).trim()).filter(Boolean);
    if (list.length === 0) return;
    sectionTitle(label);
    if (list.length <= 3) {
      writeText(list.join(", "), { size: BODY_SIZE });
    } else {
      list.forEach((it) => writeText(`•  ${it}`, { size: BODY_SIZE, indent: 2 }));
    }
  };

  // ---------- Patient header (single-line layout) ----------
  doc.setFont(FONT, "bold");
  doc.setFontSize(12);
  doc.setTextColor(20);
  ensureSpace(6);
  const nameW = doc.getTextWidth(p.fullName);
  doc.text(p.fullName, LEFT, y);

  doc.setFont(FONT, "normal");
  doc.setFontSize(10);
  doc.setTextColor(70);
  const meta = `  ·  ${calcAge(p.dob)} y  ·  ${p.sex}`;
  doc.text(meta, LEFT + nameW, y);

  // Right-aligned visit date
  doc.setFont(FONT, "bold");
  doc.setFontSize(10);
  doc.setTextColor(20);
  const dateTxt = `Visit: ${new Date(v.date).toLocaleDateString()}${v.time ? "  " + v.time : ""}`;
  const dateW = doc.getTextWidth(dateTxt);
  doc.text(dateTxt, PAGE_W - RIGHT - dateW, y);
  y += 3.2;

  // subtle bottom border under info block
  doc.setDrawColor(170);
  doc.setLineWidth(0.25);
  doc.line(LEFT, y, PAGE_W - RIGHT, y);
  y += INFO_GAP;
  doc.setTextColor(20);

  // ---------- Patient context ----------
  sectionList("Current Issues", p.problemList ?? []);
  sectionList("Comorbidities", (p.comorbidities ?? []) as string[]);
  sectionList("Allergies", (p.allergies ?? []) as string[]);

  const meds = p.medications ?? [];
  if (meds.length > 0) {
    sectionTitle("Current Medications");
    meds.forEach((m) => renderRxLine(doc, m, ensureSpace, () => y, (ny) => { y = ny; }));
  }

  // ---------- Visit clinical content ----------
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

  // ---------- Prescriptions table ----------
  if (v.prescriptions && v.prescriptions.length > 0) {
    sectionTitle("Prescriptions");
    renderPrescriptionTable(doc, v.prescriptions, () => y, (ny) => { y = ny; }, ensureSpace);
  }

  if (v.investigations && v.investigations.length > 0) {
    sectionTitle("Investigations Ordered");
    const items = v.investigations.map((i) => {
      const bits = [i.testName, i.urgency].filter(Boolean).join("  ·  ");
      return i.notes ? `${bits}  —  ${i.notes}` : bits;
    });
    if (items.length <= 3) writeText(items.join("; "), { size: BODY_SIZE });
    else items.forEach((it) => writeText(`•  ${it}`, { size: BODY_SIZE, indent: 2 }));
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
      { size: BODY_SIZE },
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
    writeText(parts.join("  ·  "), { size: BODY_SIZE });
  }

  if (v.nextFollowUp || v.followUpNote) {
    sectionTitle("Next Follow-up");
    const bits: string[] = [];
    if (v.nextFollowUp) bits.push(new Date(v.nextFollowUp).toLocaleDateString());
    if (v.followUpNote) bits.push(v.followUpNote);
    writeText(bits.join("  —  "), { size: BODY_SIZE });
  }

  return doc;
}

// Render a single Rx line with bold drug name and regular metadata.
function renderRxLine(
  doc: jsPDF,
  m: { drug?: string; dose?: string; frequency?: string; duration?: string; notes?: string; instructions?: string },
  ensureSpace: (h: number) => void,
  getY: () => number,
  setY: (n: number) => void,
) {
  const size = BODY_SIZE;
  const lineH = size * 0.45;
  ensureSpace(lineH);
  let y = getY();
  const x = LEFT + 2;
  const drug = (m.drug || "").trim() || "—";
  doc.setFont(FONT, "bold");
  doc.setFontSize(size);
  doc.setTextColor(20);
  doc.text(`•  ${drug}`, x, y);
  const wBold = doc.getTextWidth(`•  ${drug}`);

  const rest: string[] = [];
  if (m.dose) rest.push(m.dose);
  if (m.frequency) rest.push(m.frequency);
  if (m.duration) rest.push(m.duration);
  const notes = m.notes || m.instructions;
  let trail = "";
  if (rest.length) trail += "  ·  " + rest.join("  ·  ");
  if (notes) trail += "  —  " + notes;

  if (trail) {
    doc.setFont(FONT, "normal");
    doc.setTextColor(45);
    const remaining = CONTENT_W - wBold - 2;
    const wrapped = doc.splitTextToSize(trail, remaining);
    doc.text(wrapped[0], x + wBold, y);
    y += lineH;
    if (wrapped.length > 1) {
      for (let i = 1; i < wrapped.length; i++) {
        ensureSpace(lineH);
        doc.text(wrapped[i], x + 4, y);
        y += lineH;
      }
    }
  } else {
    y += lineH;
  }
  doc.setTextColor(20);
  setY(y);
}

// Compact prescription table with alternating row backgrounds.
function renderPrescriptionTable(
  doc: jsPDF,
  rxs: Array<{ drug?: string; dose?: string; frequency?: string; duration?: string; notes?: string; instructions?: string }>,
  getY: () => number,
  setY: (n: number) => void,
  ensureSpace: (h: number) => void,
) {
  const headers = ["Drug", "Dose", "Frequency", "Duration", "Notes"];
  // column widths (mm) summing to CONTENT_W = 190
  const cols = [60, 25, 35, 25, 45];
  const padX = 2;     // ~6px horizontal cell padding
  const padY = 1.6;   // ~6px vertical cell padding
  const size = BODY_SIZE;
  const lineH = size * 0.42;

  const colX = (i: number) => {
    let x = LEFT;
    for (let k = 0; k < i; k++) x += cols[k];
    return x;
  };

  // Header row
  ensureSpace(lineH + padY * 2);
  let y = getY();
  doc.setFillColor(235, 238, 242);
  doc.rect(LEFT, y - lineH + 0.5, CONTENT_W, lineH + padY * 2, "F");
  doc.setFont(FONT, "bold");
  doc.setFontSize(size);
  doc.setTextColor(40);
  headers.forEach((h, i) => doc.text(h, colX(i) + padX, y + padY));
  y += lineH + padY * 2;

  // Rows
  rxs.forEach((r, idx) => {
    const cells = [
      r.drug || "—",
      r.dose || "",
      r.frequency || "",
      r.duration || "",
      r.notes || r.instructions || "",
    ];
    // wrap each cell to its column width
    const wrapped = cells.map((txt, i) =>
      doc.splitTextToSize(String(txt), cols[i] - padX * 2),
    );
    const rowLines = Math.max(...wrapped.map((w) => w.length));
    const rowH = rowLines * lineH + padY * 2;
    ensureSpace(rowH);
    y = getY();

    if (idx % 2 === 0) {
      doc.setFillColor(248, 249, 251);
      doc.rect(LEFT, y, CONTENT_W, rowH, "F");
    }

    cells.forEach((_, i) => {
      doc.setFont(FONT, i === 0 ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(i === 0 ? 20 : 45);
      const lines = wrapped[i];
      lines.forEach((ln: string, li: number) => {
        doc.text(ln, colX(i) + padX, y + padY + lineH * (li + 1) - lineH * 0.25);
      });
    });

    y += rowH;
    setY(y);
  });

  // Bottom border
  doc.setDrawColor(220);
  doc.setLineWidth(0.15);
  doc.line(LEFT, y, PAGE_W - RIGHT, y);
  setY(y);
  doc.setTextColor(20);
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
