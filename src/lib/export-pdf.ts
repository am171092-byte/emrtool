import { jsPDF } from "jspdf";
import type { Doctor, Patient, Visit } from "./types";
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
const SECTION_GAP = 6;
const HEADER_PAD_BELOW = 2;
const INFO_GAP = 5;
const MIN_SECTION_SPACE = 25;
const TABLE_GAP_BELOW_HEADER = 4;
const SIGNATURE_GAP = 30; // 3cm blank space above the doctor's name
const BODY_SIZE = 10;
const HEADER_SIZE = 11;
const FONT = "helvetica";

type RenderOpts = { mode: "save" | "print"; doctor?: Doctor | null };

function buildVisitPdf(p: Patient, v: Visit, doctor?: Doctor | null): jsPDF {
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
    y += HEADER_SIZE * 0.42 + HEADER_PAD_BELOW;
  };

  const sectionBody = (label: string, body?: string | null) => {
    if (!body || !body.trim()) return;
    sectionTitle(label);
    writeText(body.trim(), { size: BODY_SIZE });
  };

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

  // ---------- Patient header (single-line, no separator line) ----------
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

  doc.setFont(FONT, "bold");
  doc.setFontSize(10);
  doc.setTextColor(20);
  const dateTxt = `Visit: ${new Date(v.date).toLocaleDateString()}${v.time ? "  " + v.time : ""}`;
  const dateW = doc.getTextWidth(dateTxt);
  doc.text(dateTxt, PAGE_W - RIGHT - dateW, y);
  y += INFO_GAP;
  doc.setTextColor(20);

  // ---------- Patient context (no Current Medications) ----------
  sectionList("Current Issues", p.problemList ?? []);
  sectionList("Comorbidities", (p.comorbidities ?? []) as string[]);
  sectionList("Allergies", (p.allergies ?? []) as string[]);

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

  if (v.prescriptions && v.prescriptions.length > 0) {
    sectionTitle("Prescriptions");
    y += TABLE_GAP_BELOW_HEADER;
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
    writeText(`${score}${activity}  ·  TJC ${v.das28.tjc}  ·  SJC ${v.das28.sjc}`, { size: BODY_SIZE });
  }

  const vit = v.vitals;
  if (vit && Object.values(vit).some((x) => x != null && x !== "")) {
    sectionTitle("Vitals");
    const parts: string[] = [];
    if (vit.bpSystolic && vit.bpDiastolic) parts.push(`BP ${vit.bpSystolic}/${vit.bpDiastolic} mmHg`);
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
    if (v.nextFollowUp) {
      const dateStr = new Date(v.nextFollowUp).toLocaleDateString();
      // Inline: bold "Date:" then value
      const lineH = BODY_SIZE * 0.42;
      ensureSpace(lineH);
      doc.setFont(FONT, "bold");
      doc.setFontSize(BODY_SIZE);
      doc.setTextColor(20);
      doc.text("Date:", LEFT, y);
      const labelW = doc.getTextWidth("Date: ");
      doc.setFont(FONT, "normal");
      doc.text(dateStr, LEFT + labelW, y);
      y += lineH;
    }
    if (v.followUpNote && v.followUpNote.trim()) {
      const lineH = BODY_SIZE * 0.42;
      ensureSpace(lineH);
      doc.setFont(FONT, "bold");
      doc.setFontSize(BODY_SIZE);
      doc.setTextColor(20);
      doc.text("Advice:", LEFT, y);
      const labelW = doc.getTextWidth("Advice: ");
      doc.setFont(FONT, "normal");
      const wrapped = doc.splitTextToSize(v.followUpNote.trim(), CONTENT_W - labelW);
      doc.text(wrapped[0] ?? "", LEFT + labelW, y);
      y += lineH;
      for (let i = 1; i < wrapped.length; i++) {
        ensureSpace(lineH);
        doc.text(wrapped[i], LEFT, y);
        y += lineH;
      }
    }
  }

  // ---------- Signature block (right-aligned, bottom of last page) ----------
  renderSignature(doc, doctor, () => y, (ny) => { y = ny; });

  return doc;
}

function renderSignature(
  doc: jsPDF,
  doctor: Doctor | null | undefined,
  getY: () => number,
  setY: (n: number) => void,
) {
  if (!doctor || !doctor.name) return;

  const nameSize = 11;
  const subSize = 9;
  const nameLineH = nameSize * 0.45;
  const subLineH = subSize * 0.45;
  const lines: { text: string; bold: boolean; size: number; h: number }[] = [
    { text: doctor.name, bold: true, size: nameSize, h: nameLineH },
  ];
  if (doctor.registrationNo) {
    lines.push({ text: `Reg. No: ${doctor.registrationNo}`, bold: false, size: subSize, h: subLineH });
  }
  if (doctor.clinicName) {
    lines.push({ text: doctor.clinicName, bold: false, size: subSize, h: subLineH });
  }
  const blockH = SIGNATURE_GAP + lines.reduce((s, l) => s + l.h, 0);

  let y = getY();
  const remaining = PAGE_H - BOTTOM_MARGIN - y;

  // Anchor to bottom if it fits on current page; otherwise start a new page and anchor there.
  if (remaining < blockH) {
    doc.addPage();
    y = TOP_MARGIN;
  }
  // Push to just above bottom margin
  const blockTop = PAGE_H - BOTTOM_MARGIN - blockH;
  if (blockTop > y) y = blockTop;

  // 3cm blank space for physical signature
  y += SIGNATURE_GAP;

  for (const ln of lines) {
    doc.setFont(FONT, ln.bold ? "bold" : "normal");
    doc.setFontSize(ln.size);
    doc.setTextColor(ln.bold ? 20 : 60);
    const w = doc.getTextWidth(ln.text);
    doc.text(ln.text, PAGE_W - RIGHT - w, y);
    y += ln.h;
  }
  doc.setTextColor(20);
  setY(y);
}

function renderPrescriptionTable(
  doc: jsPDF,
  rxs: Array<{ drug?: string; dose?: string; frequency?: string; duration?: string; notes?: string; instructions?: string }>,
  getY: () => number,
  setY: (n: number) => void,
  ensureSpace: (h: number) => void,
) {
  const headers = ["Drug", "Dose", "Frequency", "Duration", "Notes"];
  const pct = [0.35, 0.15, 0.20, 0.15, 0.15];
  const cols = pct.map((p) => p * CONTENT_W);
  const padX = 2.5;
  const padY = 2.2;
  const size = BODY_SIZE;
  const lineH = size * 0.45;

  const colX = (i: number) => {
    let x = LEFT;
    for (let k = 0; k < i; k++) x += cols[k];
    return x;
  };

  const drawRow = (
    cells: string[],
    opts: { bold?: boolean; fill?: [number, number, number] | null },
  ) => {
    const wrapped = cells.map((txt, i) =>
      doc.splitTextToSize(String(txt || ""), cols[i] - padX * 2),
    );
    const rowLines = Math.max(1, ...wrapped.map((w) => w.length));
    const rowH = rowLines * lineH + padY * 2;
    ensureSpace(rowH);
    let y = getY();

    if (opts.fill) {
      doc.setFillColor(opts.fill[0], opts.fill[1], opts.fill[2]);
      doc.rect(LEFT, y, CONTENT_W, rowH, "F");
    }

    doc.setFont(FONT, opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(opts.bold ? 40 : 30);

    wrapped.forEach((lines: string[], i: number) => {
      lines.forEach((ln: string, li: number) => {
        const baseline = y + padY + lineH * (li + 1) - lineH * 0.25;
        doc.text(ln, colX(i) + padX, baseline);
      });
    });

    setY(y + rowH);
  };

  drawRow(headers, { bold: true, fill: [240, 240, 240] });
  rxs.forEach((r) => {
    drawRow(
      [
        r.drug || "—",
        r.dose || "",
        r.frequency || "",
        r.duration || "",
        r.notes || r.instructions || "",
      ],
      { fill: null },
    );
  });

  doc.setTextColor(20);
}

export function exportVisitPdf(p: Patient, v: Visit, opts: RenderOpts = { mode: "save" }) {
  const doc = buildVisitPdf(p, v, opts.doctor);
  if (opts.mode === "print") {
    doc.autoPrint();
    const url = doc.output("bloburl");
    const w = window.open(url, "_blank");
    if (!w) doc.save(filename(p, v));
    return;
  }
  doc.save(filename(p, v));
}

export function printVisitPdf(p: Patient, v: Visit, doctor?: Doctor | null) {
  exportVisitPdf(p, v, { mode: "print", doctor });
}

function filename(p: Patient, v: Visit) {
  return `${p.fullName.replace(/\s+/g, "_")}_${new Date(v.date).toISOString().slice(0, 10)}_Visit.pdf`;
}
