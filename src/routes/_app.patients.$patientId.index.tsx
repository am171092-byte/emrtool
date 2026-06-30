import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InitialsAvatar } from "@/components/initials-avatar";
import { TagInput } from "@/components/tag-input";
import { usePatient, useVisitsForPatient } from "@/lib/use-store";
import { upsertPatient, touchRecent, addAttachment, deleteAttachment, uid, deleteVisit } from "@/lib/api-store";
import { calcAge, formatDate, formatDateTime } from "@/lib/format";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { Pencil, Plus, Phone, Mail, FileDown, Printer, Trash2, Upload, FileText, CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { exportVisitPdf, printVisitPdf } from "@/lib/export-pdf";
import { DAS28Panel } from "@/components/das28-panel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { daysUntil } from "@/lib/format";
import { ReportUploadDialog } from "@/components/report-upload-dialog";
import { LabExtractDialog } from "@/components/lab-extract-dialog";
import { createCalendarEvent } from "@/lib/calendar-service";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/patients/$patientId/")({
  head: () => ({ meta: [{ title: "Patient record — RheumCare" }] }),
  component: PatientRecord,
});

function PatientRecord() {
  const { patientId } = Route.useParams();
  const p = usePatient(patientId);
  const visits = useVisitsForPatient(patientId);
  const nav = useNavigate();
  const { doctor } = useAuth();
  const [editingMeds, setEditingMeds] = useState(false);

  useEffect(() => {
    if (p) touchRecent(p.id);
  }, [p?.id]);

  if (!p) return <div className="flex items-center justify-center h-full py-16"><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-2 text-sm text-muted-foreground">Loading patient...</span></div>;

  const updateP = (patch: Partial<typeof p>) => upsertPatient({ ...p, ...patch });

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left summary */}
        <aside className="lg:w-80 shrink-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <InitialsAvatar name={p.fullName} size={64} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-lg leading-tight truncate">{p.fullName}</div>
                <div className="text-xs text-muted-foreground">{calcAge(p.dob)} y · {p.sex}</div>
                <div className="text-xs text-muted-foreground">DOB {formatDate(p.dob)}</div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1 text-xs text-primary"><Phone className="h-3 w-3" />{p.phone}</a>
                  {p.email && <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1 text-xs text-primary truncate max-w-[180px]"><Mail className="h-3 w-3 shrink-0" />{p.email}</a>}
                </div>
                {p.address && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.address}</div>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => nav({ to: "/patients/$patientId/edit", params: { patientId } })} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
            </div>
            {p.primaryDiagnosis && <Badge className="mt-3" variant="secondary">{p.primaryDiagnosis}</Badge>}
            {p.tdi && (
              <div className="mt-2 rounded-md bg-primary/5 border border-primary/15 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Duration of Illness</div>
                <div className="text-sm font-medium">{p.tdi}</div>
              </div>
            )}
          </Card>

          <NextVisitCard patient={p} />

          <Card className="p-4 space-y-3">
            <EditableSection title="Allergies" tone="danger">
              <TagInput value={p.allergies} onChange={(v) => updateP({ allergies: v })} placeholder="Add allergy" tone="danger" />
            </EditableSection>

            <EditableSection
              title="Current medications"
              extra={
                <Button variant="ghost" size="sm" onClick={() => setEditingMeds(!editingMeds)} className="h-7 px-2">
                  <Pencil className="h-3 w-3" />
                </Button>
              }
            >
              {editingMeds ? (
                <div className="space-y-2">
                  {p.medications.map((m, i) => (
                    <div key={m.id} className="grid grid-cols-12 gap-1 text-xs">
                      <Input className="col-span-5 h-8" value={m.drug} onChange={(e) => { const next = [...p.medications]; next[i] = { ...m, drug: e.target.value }; updateP({ medications: next }); }} />
                      <Input className="col-span-3 h-8" value={m.dose} onChange={(e) => { const next = [...p.medications]; next[i] = { ...m, dose: e.target.value }; updateP({ medications: next }); }} placeholder="Dose" />
                      <Input className="col-span-3 h-8" value={m.frequency} onChange={(e) => { const next = [...p.medications]; next[i] = { ...m, frequency: e.target.value }; updateP({ medications: next }); }} placeholder="Freq" />
                      <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8" onClick={() => updateP({ medications: p.medications.filter((x) => x.id !== m.id) })}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" className="w-full" onClick={() => updateP({ medications: [...p.medications, { id: uid("m"), drug: "", dose: "", frequency: "", duration: "" }] })}>
                    <Plus className="h-3 w-3 mr-1" /> Add medication
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {p.medications.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                  {p.medications.map((m) => (
                    <span key={m.id} className="inline-flex items-center rounded-md bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs" title={`${m.dose} ${m.frequency} · ${m.duration}`}>
                      {m.drug || "—"}
                    </span>
                  ))}
                </div>
              )}
            </EditableSection>

            <EditableSection title="Comorbidities">
              <TagInput value={p.comorbidities} onChange={(v) => updateP({ comorbidities: v })} placeholder="Add comorbidity" />
            </EditableSection>

            <EditableSection title="Current issues">
              <TagInput value={p.problemList} onChange={(v) => updateP({ problemList: v })} placeholder="Add issue" />
            </EditableSection>
          </Card>
        </aside>

        {/* Right tabs */}
        <section className="flex-1 min-w-0">
          <Tabs defaultValue="timeline">
            <div className="w-full overflow-x-auto -mx-1 px-1">
              <TabsList className="inline-flex w-max md:grid md:grid-cols-5 md:w-full md:max-w-2xl">
                <TabsTrigger value="timeline">Visits</TabsTrigger>
                <TabsTrigger value="das28">DAS28</TabsTrigger>
                <TabsTrigger value="vitals">Vitals</TabsTrigger>
                <TabsTrigger value="investigations">Labs</TabsTrigger>
                <TabsTrigger value="attachments">Files</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="timeline" className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Visit timeline</h3>
                <Button onClick={() => nav({ to: "/patients/$patientId/visits/new", params: { patientId } })}>
                  <Plus className="h-4 w-4 mr-2" /> New visit
                </Button>
              </div>
              {visits.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">No visits yet.</Card>
              ) : visits.map((v) => (
                <Card key={v.id} className="p-4">
                  <details>
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <div>
                        <div className="font-semibold text-sm">{formatDateTime(v.date)}</div>
                        <div className="text-xs text-muted-foreground">{(v.chiefComplaints && v.chiefComplaints.length > 0 ? v.chiefComplaints : (v.chiefComplaint ? [v.chiefComplaint] : [])).join(", ")}</div>
                      </div>
                      <div className="flex gap-1 no-print">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); nav({ to: "/patients/$patientId/visits/$visitId/edit", params: { patientId, visitId: v.id } }); }}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); printVisitPdf(p, v, doctor); }}><Printer className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); exportVisitPdf(p, v, { mode: "save", doctor }); }}><FileDown className="h-3 w-3" /></Button>


                        <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.preventDefault(); if (confirm("Delete this visit?")) { deleteVisit(v.id); toast.success("Visit deleted"); } }}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </summary>
                    <div className="mt-3 space-y-3 text-sm border-t pt-3">
                      <Section label="History of Presenting Illness">{v.soap.historyOfPresentingIllness || v.soap.subjective || "—"}</Section>
                      <Section label="Current Visit">{v.soap.currentVisit || "—"}</Section>
                      <Section label="Examination">{v.soap.examination || v.soap.objective || "—"}</Section>
                      <Section label="Impression">{v.soap.impression || v.soap.assessment || "—"}</Section>
                      <Section label="Plan">{v.soap.plan || "—"}</Section>
                      {v.prescriptions.length > 0 && (
                        <Section label="Prescriptions">
                          <ul className="list-disc pl-5">
                            {v.prescriptions.map((r) => <li key={r.id}>{r.drug} {r.dose} · {r.frequency} · {r.duration}</li>)}
                          </ul>
                        </Section>
                      )}
                      {v.das28 && (
                        <Section label="DAS28">
                          <span className="font-mono">{v.das28.scoreEsr?.toFixed(2) ?? v.das28.scoreCrp?.toFixed(2)}</span>
                          {" — "}<span className="text-muted-foreground">TJC {v.das28.tjc}, SJC {v.das28.sjc}</span>
                        </Section>
                      )}
                      {v.nextFollowUp && <Section label="Next follow-up">{formatDate(v.nextFollowUp)}</Section>}
                    </div>
                  </details>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="das28" className="space-y-3 mt-4">
              <DAS28Panel patient={p} />
            </TabsContent>



            <TabsContent value="vitals" className="space-y-3 mt-4">
              <VitalsTab patient={p} />
            </TabsContent>

            <TabsContent value="investigations" className="space-y-3 mt-4">
              <InvestigationsTab patient={p} />
            </TabsContent>

            <TabsContent value="attachments" className="space-y-3 mt-4">
              <AttachmentsTab patient={p} />
            </TabsContent>
          </Tabs>
        </section>
      </div>

      {/* Print-only summary header (basic) */}
      <div className="print-only">
        <h2>{p.fullName} — {calcAge(p.dob)}y {p.sex}</h2>
      </div>
    </div>
  );
}

function EditableSection({ title, children, tone, extra }: { title: string; children: React.ReactNode; tone?: "danger"; extra?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className={`text-xs font-semibold uppercase tracking-wider ${tone === "danger" ? "text-destructive" : "text-muted-foreground"}`}>{title}</div>
        {extra}
      </div>
      {children}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="whitespace-pre-wrap">{children}</div>
    </div>
  );
}

function VitalsTab({ patient }: { patient: ReturnType<typeof usePatient> & {} }) {
  const v = patient?.vitals ?? [];
  const [bpS, setBpS] = useState<number | "">("");
  const [bpD, setBpD] = useState<number | "">("");
  const [hr, setHr] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [temp, setTemp] = useState<number | "">("");
  const [spo2, setSpo2] = useState<number | "">("");
  const [respRate, setRespRate] = useState<number | "">("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ bpS: number | ""; bpD: number | ""; hr: number | ""; resp: number | ""; weight: number | ""; height: number | ""; temp: number | ""; spo2: number | "" }>({ bpS: "", bpD: "", hr: "", resp: "", weight: "", height: "", temp: "", spo2: "" });

  if (!patient) return null;

  const add = () => {
    if (!bpS && !bpD && !hr && !weight && !temp && !spo2 && !respRate) return;
    upsertPatient({
      ...patient,
      vitals: [
        { id: uid("v"), date: new Date().toISOString(),
          bpSystolic: typeof bpS === "number" ? bpS : undefined,
          bpDiastolic: typeof bpD === "number" ? bpD : undefined,
          hr: typeof hr === "number" ? hr : undefined,
          respiratoryRate: typeof respRate === "number" ? respRate : undefined,
          weight: typeof weight === "number" ? weight : undefined,
          height: typeof height === "number" ? height : patient.vitals?.[0]?.height,
          temperature: typeof temp === "number" ? temp : undefined,
          spo2: typeof spo2 === "number" ? spo2 : undefined,
        },
        ...v,
      ],
    });
    setBpS(""); setBpD(""); setHr(""); setRespRate(""); setWeight(""); setHeight(""); setTemp(""); setSpo2("");
    toast.success("Vitals added");
  };

  const startEdit = (row: typeof v[number]) => {
    setEditingId(row.id);
    setEdit({
      bpS: row.bpSystolic ?? "", bpD: row.bpDiastolic ?? "", hr: row.hr ?? "",
      resp: row.respiratoryRate ?? "", weight: row.weight ?? "", height: row.height ?? "",
      temp: row.temperature ?? "", spo2: row.spo2 ?? "",
    });
  };
  const saveEdit = () => {
    if (!editingId) return;
    upsertPatient({
      ...patient,
      vitals: v.map((row) => row.id !== editingId ? row : {
        ...row,
        bpSystolic: typeof edit.bpS === "number" ? edit.bpS : undefined,
        bpDiastolic: typeof edit.bpD === "number" ? edit.bpD : undefined,
        hr: typeof edit.hr === "number" ? edit.hr : undefined,
        respiratoryRate: typeof edit.resp === "number" ? edit.resp : undefined,
        weight: typeof edit.weight === "number" ? edit.weight : undefined,
        height: typeof edit.height === "number" ? edit.height : undefined,
        temperature: typeof edit.temp === "number" ? edit.temp : undefined,
        spo2: typeof edit.spo2 === "number" ? edit.spo2 : undefined,
      }),
    });
    setEditingId(null);
    toast.success("Vitals updated");
  };
  const removeRow = (id: string) => {
    if (!confirm("Delete this vitals entry?")) return;
    upsertPatient({ ...patient, vitals: v.filter((r) => r.id !== id) });
    toast.success("Vitals entry deleted");
  };

  const chartData = [...v].reverse().map((row) => ({
    date: formatDate(row.date),
    BP: row.bpSystolic,
    Weight: row.weight,
  }));

  const numCell = (val: number | "", set: (n: number | "") => void, w = "w-16") => (
    <Input className={`h-8 ${w} font-mono`} type="number" value={val} onChange={(e) => set(e.target.value === "" ? "" : Number(e.target.value))} />
  );

  return (
    <>
      <Card className="p-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr><th className="p-2">Date</th><th className="p-2">BP (mmHg)</th><th className="p-2">HR (bpm)</th><th className="p-2">RR (/min)</th><th className="p-2">Wt (kg)</th><th className="p-2">Ht (cm)</th><th className="p-2">BMI</th><th className="p-2">Temp (°F)</th><th className="p-2">SpO₂ (%)</th><th className="p-2"></th></tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="p-1 text-xs text-muted-foreground">Add new</td>
              <td className="p-1"><div className="flex gap-1"><Input className="h-8 w-14 font-mono" type="number" value={bpS} onChange={(e) => setBpS(e.target.value === "" ? "" : Number(e.target.value))} placeholder="120" /><span className="self-center">/</span><Input className="h-8 w-14 font-mono" type="number" value={bpD} onChange={(e) => setBpD(e.target.value === "" ? "" : Number(e.target.value))} placeholder="80" /></div></td>
              <td className="p-1">{numCell(hr, setHr)}</td>
              <td className="p-1">{numCell(respRate, setRespRate)}</td>
              <td className="p-1">{numCell(weight, setWeight)}</td>
              <td className="p-1">{numCell(height, setHeight)}</td>
              <td className="p-1 font-mono text-xs">—</td>
              <td className="p-1"><Input className="h-8 w-16 font-mono" type="number" value={temp} onChange={(e) => setTemp(e.target.value === "" ? "" : Number(e.target.value))} placeholder="98.6" /></td>
              <td className="p-1">{numCell(spo2, setSpo2, "w-14")}</td>
              <td className="p-1"><Button size="sm" onClick={add}>Add</Button></td>
            </tr>
            {v.map((row) => editingId === row.id ? (
              <tr key={row.id} className="border-t bg-muted/30">
                <td className="p-2 text-xs">{formatDate(row.date)}</td>
                <td className="p-1"><div className="flex gap-1"><Input className="h-8 w-14 font-mono" type="number" value={edit.bpS} onChange={(e) => setEdit({ ...edit, bpS: e.target.value === "" ? "" : Number(e.target.value) })} /><span className="self-center">/</span><Input className="h-8 w-14 font-mono" type="number" value={edit.bpD} onChange={(e) => setEdit({ ...edit, bpD: e.target.value === "" ? "" : Number(e.target.value) })} /></div></td>
                <td className="p-1">{numCell(edit.hr, (n) => setEdit({ ...edit, hr: n }))}</td>
                <td className="p-1">{numCell(edit.resp, (n) => setEdit({ ...edit, resp: n }))}</td>
                <td className="p-1">{numCell(edit.weight, (n) => setEdit({ ...edit, weight: n }))}</td>
                <td className="p-1">{numCell(edit.height, (n) => setEdit({ ...edit, height: n }))}</td>
                <td className="p-2 font-mono text-xs">—</td>
                <td className="p-1">{numCell(edit.temp, (n) => setEdit({ ...edit, temp: n }))}</td>
                <td className="p-1">{numCell(edit.spo2, (n) => setEdit({ ...edit, spo2: n }), "w-14")}</td>
                <td className="p-1"><div className="flex gap-1"><Button size="sm" onClick={saveEdit}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>×</Button></div></td>
              </tr>
            ) : (
              <tr key={row.id} className="border-t">
                <td className="p-2 text-xs">{formatDate(row.date)}</td>
                <td className="p-2 font-mono">{row.bpSystolic ?? "—"}/{row.bpDiastolic ?? "—"}</td>
                <td className="p-2 font-mono">{row.hr ?? "—"}</td>
                <td className="p-2 font-mono">{row.respiratoryRate ?? "—"}</td>
                <td className="p-2 font-mono">{row.weight ?? "—"}</td>
                <td className="p-2 font-mono">{row.height ?? "—"}</td>
                <td className="p-2 font-mono">{row.weight && row.height ? (row.weight / ((row.height / 100) ** 2)).toFixed(1) : "—"}</td>
                <td className="p-2 font-mono">{row.temperature ?? "—"}</td>
                <td className="p-2 font-mono">{row.spo2 ?? "—"}</td>
                <td className="p-2"><div className="flex gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(row)}><Pencil className="h-3 w-3" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeRow(row.id)}><Trash2 className="h-3 w-3" /></Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {chartData.length >= 2 && (
        <Card className="p-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="BP" stroke="var(--color-primary)" dot />
              <Line type="monotone" dataKey="Weight" stroke="var(--color-accent)" dot />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </>
  );
}


function InvestigationsTab({ patient }: { patient: ReturnType<typeof usePatient> & {} }) {
  const [open, setOpen] = useState(false);
  const today = () => new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState({ testName: "", result: "", units: "", referenceRange: "", status: "Normal" as "Normal" | "Abnormal" | "Critical", date: today() });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ testName: "", result: "", units: "", referenceRange: "", status: "Normal" as "Normal" | "Abnormal" | "Critical", date: today() });
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const onExtractFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setExtractFile(f);
    e.target.value = "";
  };

  if (!patient) return null;

  const add = () => {
    if (!draft.testName.trim()) return;
    const { date, ...rest } = draft;
    upsertPatient({ ...patient, investigations: [{ id: uid("inv"), date: new Date(date).toISOString(), ...rest }, ...patient.investigations] });
    setDraft({ testName: "", result: "", units: "", referenceRange: "", status: "Normal", date: today() });
    setOpen(false);
    toast.success("Investigation added");
  };

  const startEdit = (row: typeof patient.investigations[number]) => {
    setEditingId(row.id);
    setEdit({
      testName: row.testName ?? "",
      result: row.result ?? "",
      units: row.units ?? "",
      referenceRange: row.referenceRange ?? "",
      status: (row.status ?? "Normal") as "Normal" | "Abnormal" | "Critical",
      date: (row.date ?? new Date().toISOString()).slice(0, 10),
    });
  };
  const saveEdit = () => {
    if (!editingId) return;
    upsertPatient({
      ...patient,
      investigations: patient.investigations.map((r) => r.id !== editingId ? r : {
        ...r,
        testName: edit.testName,
        result: edit.result || undefined,
        units: edit.units || undefined,
        referenceRange: edit.referenceRange || undefined,
        status: edit.status,
        date: new Date(edit.date).toISOString(),
      }),
    });
    setEditingId(null);
    toast.success("Lab updated");
  };
  const removeRow = (id: string) => {
    if (!confirm("Delete this lab entry?")) return;
    upsertPatient({ ...patient, investigations: patient.investigations.filter((r) => r.id !== id) });
    toast.success("Lab entry deleted");
  };

  return (
    <>
      <div className="flex justify-end gap-2 flex-wrap">
        <label className="inline-flex items-center justify-center gap-1 h-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground px-3 text-sm font-medium cursor-pointer">
          <Upload className="h-3 w-3" /> Upload & Extract Lab Report
          <input type="file" className="hidden" accept="image/jpeg,image/png,image/jpg,application/pdf" onChange={onExtractFile} />
        </label>
        <Button size="sm" onClick={() => setOpen(!open)}><Plus className="h-3 w-3 mr-1" />{open ? "Close" : "Add"}</Button>
      </div>
      <LabExtractDialog patient={patient} file={extractFile} onClose={() => setExtractFile(null)} />
      {open && (
        <Card className="p-3 grid grid-cols-2 md:grid-cols-7 gap-2 items-end">
          <div><label className="text-xs text-muted-foreground">Date</label><Input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>
          <div className="col-span-2"><label className="text-xs text-muted-foreground">Test</label><Input value={draft.testName} onChange={(e) => setDraft({ ...draft, testName: e.target.value })} /></div>
          <div><label className="text-xs text-muted-foreground">Result</label><Input value={draft.result} onChange={(e) => setDraft({ ...draft, result: e.target.value })} /></div>
          <div><label className="text-xs text-muted-foreground">Units</label><Input value={draft.units} onChange={(e) => setDraft({ ...draft, units: e.target.value })} /></div>
          <div><label className="text-xs text-muted-foreground">Ref</label><Input value={draft.referenceRange} onChange={(e) => setDraft({ ...draft, referenceRange: e.target.value })} /></div>
          <Button onClick={add}>Save</Button>
        </Card>
      )}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground bg-muted/30"><tr><th className="p-2">Date</th><th className="p-2">Test</th><th className="p-2">Result</th><th className="p-2">Units</th><th className="p-2">Ref</th><th className="p-2">Status</th><th className="p-2"></th></tr></thead>
          <tbody>
            {patient.investigations.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground text-sm">No investigations yet.</td></tr>}
            {patient.investigations.map((i) => editingId === i.id ? (
              <tr key={i.id} className="border-t bg-muted/30">
                <td className="p-1"><Input type="date" className="h-8" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></td>
                <td className="p-1"><Input className="h-8" value={edit.testName} onChange={(e) => setEdit({ ...edit, testName: e.target.value })} /></td>
                <td className="p-1"><Input className="h-8 font-mono" value={edit.result} onChange={(e) => setEdit({ ...edit, result: e.target.value })} /></td>
                <td className="p-1"><Input className="h-8" value={edit.units} onChange={(e) => setEdit({ ...edit, units: e.target.value })} /></td>
                <td className="p-1"><Input className="h-8" value={edit.referenceRange} onChange={(e) => setEdit({ ...edit, referenceRange: e.target.value })} /></td>
                <td className="p-1">
                  <select className="h-8 rounded-md border bg-background px-2 text-sm" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as "Normal" | "Abnormal" | "Critical" })}>
                    <option>Normal</option><option>Abnormal</option><option>Critical</option>
                  </select>
                </td>
                <td className="p-1"><div className="flex gap-1"><Button size="sm" onClick={saveEdit}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>×</Button></div></td>
              </tr>
            ) : (
              <tr key={i.id} className="border-t">
                <td className="p-2 text-xs">{formatDate(i.date)}</td>
                <td className="p-2">{i.testName}</td>
                <td className="p-2 font-mono">{i.result ?? "—"}</td>
                <td className="p-2 text-xs">{i.units ?? "—"}</td>
                <td className="p-2 text-xs">{i.referenceRange ?? "—"}</td>
                <td className="p-2"><Badge variant="outline" className={i.status === "Normal" ? "border-accent text-accent" : i.status === "Critical" ? "border-destructive text-destructive" : "border-warning text-warning"}>{i.status ?? "—"}</Badge></td>
                <td className="p-2"><div className="flex gap-1"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(i)}><Pencil className="h-3 w-3" /></Button><Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeRow(i.id)}><Trash2 className="h-3 w-3" /></Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}


function AttachmentsTab({ patient }: { patient: ReturnType<typeof usePatient> & {} }) {
  if (!patient) return null;
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    e.target.value = "";
  };

  return (
    <>
      <ReportUploadDialog patient={patient} file={pendingFile} onClose={() => setPendingFile(null)} />
      <Card className="p-6 border-dashed border-2 text-center">
        <label className="cursor-pointer flex flex-col items-center gap-2">
          <Upload className="h-6 w-6 text-muted-foreground" />
          <div className="text-sm font-medium">Upload diagnostic report</div>
          <div className="text-xs text-muted-foreground">AI verifies patient name and auto-fills lab values</div>
          <input type="file" className="hidden" onChange={onFile} accept="image/*,application/pdf" />
        </label>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {patient.attachments.map((a) => (
          <Card key={a.id} className="p-3 text-xs">
            {a.dataUrl && a.type.startsWith("image/") ? (
              <img src={a.dataUrl} alt={a.filename} className="aspect-square object-cover rounded mb-2" />
            ) : (
              <div className="aspect-square bg-muted rounded mb-2 flex items-center justify-center"><FileText className="h-8 w-8 text-muted-foreground" /></div>
            )}
            <div className="truncate font-medium">{a.filename}</div>
            <div className="text-muted-foreground">{(a.size / 1024).toFixed(1)} KB · {formatDate(a.date)}</div>
            <div className="flex gap-1 mt-2">
              {a.dataUrl && <a href={a.dataUrl} download={a.filename} className="text-primary">Download</a>}
              <button onClick={() => deleteAttachment(patient.id, a.id)} className="text-destructive ml-auto"><Trash2 className="h-3 w-3" /></button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function NextVisitCard({ patient }: { patient: ReturnType<typeof usePatient> & {} }) {
  if (!patient) return null;
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(patient.nextFollowUp?.slice(0, 10) ?? "");
  const [reason, setReason] = useState(patient.nextVisitReason ?? "");
  const due = daysUntil(patient.nextFollowUp);

  const save = async () => {
    if (!date) return;
    const iso = new Date(date).toISOString();
    upsertPatient({ ...patient, nextFollowUp: iso, nextVisitReason: reason || undefined });
    toast.success("Next visit scheduled");
    setOpen(false);
    const ok = await createCalendarEvent({
      patientName: patient.fullName,
      patientId: patient.id,
      date: iso,
      time: "",
      duration: 30,
      notes: reason,
    });
    if (ok) toast.success("Follow-up added to Google Calendar");
  };
  const clear = () => {
    upsertPatient({ ...patient, nextFollowUp: undefined, nextVisitReason: undefined });
    setDate(""); setReason("");
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next visit</div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2"><CalendarPlus className="h-3 w-3 mr-1" />{patient.nextFollowUp ? "Edit" : "Schedule"}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-2 z-50">
            <div>
              <label className="text-xs text-muted-foreground">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Reason / notes</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Lab review, DAS28" />
            </div>
            <div className="flex gap-2">
              <Button onClick={save} size="sm" className="flex-1">Save</Button>
              {patient.nextFollowUp && <Button onClick={clear} variant="ghost" size="sm">Clear</Button>}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {patient.nextFollowUp ? (
        <div>
          <div className="font-semibold text-sm">{formatDate(patient.nextFollowUp)}</div>
          <div className="text-xs text-muted-foreground">
            {due != null && (due < 0 ? `${-due} days overdue` : due === 0 ? "Today" : `in ${due} day${due === 1 ? "" : "s"}`)}
            {patient.nextVisitReason ? ` · ${patient.nextVisitReason}` : ""}
          </div>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No follow-up scheduled.</div>
      )}
    </Card>
  );
}


// avoid unused
void jsPDF;
