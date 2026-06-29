import { jsPDF } from "jspdf";
import type { Patient, Visit } from "./types";
import { calcAge } from "./format";

export function exportVisitPdf(p: Patient, v: Visit) {
  const doc = new jsPDF();
  let y = 18;
  const pad = 14;
  const line = (txt: string, opts?: { bold?: boolean; size?: number }) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.size ?? 10);
    const split = doc.splitTextToSize(txt, 180);
    doc.text(split, pad, y);
    y += split.length * (opts?.size ?? 10) * 0.5 + 2;
  };
  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text("RheumCare — Visit Summary", pad, y); y += 8;
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date(v.date).toLocaleDateString()}  ${v.time}`, pad, y); y += 6;
  doc.line(pad, y, 196, y); y += 6;

  line(`Patient: ${p.fullName}  •  ${calcAge(p.dob)} y  •  ${p.sex}  •  ${p.phone}`, { bold: true });
  y += 2;
  line("Chief complaint", { bold: true, size: 11 });
  line(v.chiefComplaint || "—");
  y += 2;

  line("History of Presenting Illness", { bold: true, size: 11 }); line(v.soap.historyOfPresentingIllness || v.soap.subjective || "—");
  line("Current Visit", { bold: true, size: 11 }); line(v.soap.currentVisit || "—");
  line("Examination", { bold: true, size: 11 }); line(v.soap.examination || v.soap.objective || "—");
  line("Impression", { bold: true, size: 11 }); line(v.soap.impression || v.soap.assessment || "—");
  line("Plan", { bold: true, size: 11 }); line(v.soap.plan || "—");

  if (v.prescriptions.length) {
    doc.addPage(); y = 18;
    line("Prescriptions", { bold: true, size: 13 });
    v.prescriptions.forEach((r) => line(`• ${r.drug}  ${r.dose}  ${r.frequency}  (${r.duration}) ${r.instructions ?? ""}`));
  }
  if (v.investigations.length) {
    line("Investigations", { bold: true, size: 13 });
    v.investigations.forEach((i) => line(`• ${i.testName}  ${i.urgency ?? ""}  ${i.notes ?? ""}`));
    if (v.investigationNotes) { line("Subjective Notes:", { bold: true }); line(v.investigationNotes); }
  }
  if (v.das28) {
    line("DAS28", { bold: true, size: 13 });
    line(`DAS28-ESR ${v.das28.scoreEsr?.toFixed(2) ?? "—"}  •  DAS28-CRP ${v.das28.scoreCrp?.toFixed(2) ?? "—"}  •  TJC ${v.das28.tjc} / SJC ${v.das28.sjc}`);
  }
  if (v.nextFollowUp) {
    line("Next follow-up", { bold: true, size: 13 });
    line(new Date(v.nextFollowUp).toLocaleDateString());
  }

  const fname = `${p.fullName.replace(/\s+/g, "_")}_${new Date(v.date).toISOString().slice(0, 10)}_Visit.pdf`;
  doc.save(fname);
}
