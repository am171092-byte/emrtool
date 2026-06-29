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
import { Pencil, Plus, Phone, FileDown, Printer, Trash2, Upload, FileText, CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { exportVisitPdf } from "@/lib/export-pdf";
import { DAS28Panel } from "@/components/das28-panel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { daysUntil } from "@/lib/format";
import { ReportUploadDialog } from "@/components/report-upload-dialog";
import { createCalendarEvent } from "@/lib/calendar-service";

export const Route = createFileRoute("/_app/patients/$patientId/")({
  head: () => ({ meta: [{ title: "Patient record — RheumCare" }] }),
  component: PatientRecord,
});

function PatientRecord() {
  const { patientId } = Route.useParams();
  const p = usePatient(patientId);
  const visits = useVisitsForPatient(patientId);
  const nav = useNavigate();
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
                <a href={`tel:${p.phone}`} className="mt-2 inline-flex items-center gap-1 text-xs text-primary"><Phone className="h-3 w-3" />{p.phone}</a>
                {p.address && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.address}</div>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => nav({ to: "/patients/$patientId/edit", params: { patientId } })} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
            </div>
            {p.primaryDiagnosis && <Badge className="mt-3" variant="secondary">{p.primaryDiagnosis}</Badge>}
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

            <EditableSection title="Problem list">
              <TagInput value={p.problemList} onChange={(v) => updateP({ problemList: v })} placeholder="Add problem" />
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
                        <div className="text-xs text-muted-foreground">{v.chiefComplaint}</div>
                      </div>
                      <div className="flex gap-1 no-print">
                        <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); nav({ to: "/patients/$patientId/visits/$visitId/edit", params: { patientId, visitId: v.id } }); }}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); window.print(); }}><Printer className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" onClick={(e) => { e.preventDefault(); exportVisitPdf(p, v); }}><FileDown className="h-3 w-3" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={(e) => { e.preventDefault(); if (confirm("Delete this visit?")) { deleteVisit(v.id); toast.success("Visit deleted"); } }}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </summary>
                    <div className="mt-3 space-y-3 text-sm border-t pt-3">
                      <Section label="Subjective">{v.soap.subjective || "—"}</Section>
                      <Section label="Objective">{v.soap.objective || "—"}</Section>
                      <Section label="Assessment">{v.soap.assessment || "—"}</Section>
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
  if (!patient) return null;
  const v = patient.vitals ?? [];
  const [bpS, setBpS] = useState<number | "">("");
  const [bpD, setBpD] = useState<number | "">("");
  const [hr, setHr] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [temp, setTemp] = useState<number | "">("");
  const [spo2, setSpo2] = useState<number | "">("");

  const add = () => {
    if (!bpS && !bpD && !hr && !weight && !temp && !spo2) return;
    upsertPatient({
      ...patient,
      vitals: [
        { id: uid("v"), date: new Date().toISOString(),
          bpSystolic: typeof bpS === "number" ? bpS : undefined,
          bpDiastolic: typeof bpD === "number" ? bpD : undefined,
          hr: typeof hr === "number" ? hr : undefined,
          weight: typeof weight === "number" ? weight : undefined,
          height: typeof height === "number" ? height : patient.vitals?.[0]?.height,
          temperature: typeof temp === "number" ? temp : undefined,
          spo2: typeof spo2 === "number" ? spo2 : undefined,
        },
        ...v,
      ],
    });
    setBpS(""); setBpD(""); setHr(""); setWeight(""); setHeight(""); setTemp(""); setSpo2("");
    toast.success("Vitals added");
  };

  const chartData = [...v].reverse().map((row) => ({
    date: formatDate(row.date),
    BP: row.bpSystolic,
    Weight: row.weight,
  }));

  return (
    <>
      <Card className="p-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr><th className="p-2">Date</th><th className="p-2">BP</th><th className="p-2">HR</th><th className="p-2">Wt</th><th className="p-2">Ht</th><th className="p-2">BMI</th><th className="p-2">Temp</th><th className="p-2">SpO₂</th></tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="p-1 text-xs text-muted-foreground">Add new</td>
              <td className="p-1"><div className="flex gap-1"><Input className="h-8 w-14 font-mono" type="number" value={bpS} onChange={(e) => setBpS(e.target.value === "" ? "" : Number(e.target.value))} placeholder="120" /><span className="self-center">/</span><Input className="h-8 w-14 font-mono" type="number" value={bpD} onChange={(e) => setBpD(e.target.value === "" ? "" : Number(e.target.value))} placeholder="80" /></div></td>
              <td className="p-1"><Input className="h-8 w-16 font-mono" type="number" value={hr} onChange={(e) => setHr(e.target.value === "" ? "" : Number(e.target.value))} /></td>
              <td className="p-1"><Input className="h-8 w-16 font-mono" type="number" value={weight} onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))} /></td>
              <td className="p-1"><Input className="h-8 w-16 font-mono" type="number" value={height} onChange={(e) => setHeight(e.target.value === "" ? "" : Number(e.target.value))} /></td>
              <td className="p-1 font-mono text-xs">—</td>
              <td className="p-1"><Input className="h-8 w-16 font-mono" type="number" value={temp} onChange={(e) => setTemp(e.target.value === "" ? "" : Number(e.target.value))} /></td>
              <td className="p-1"><div className="flex gap-1"><Input className="h-8 w-14 font-mono" type="number" value={spo2} onChange={(e) => setSpo2(e.target.value === "" ? "" : Number(e.target.value))} /><Button size="sm" onClick={add}>Add</Button></div></td>
            </tr>
            {v.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2 text-xs">{formatDate(row.date)}</td>
                <td className="p-2 font-mono">{row.bpSystolic ?? "—"}/{row.bpDiastolic ?? "—"}</td>
                <td className="p-2 font-mono">{row.hr ?? "—"}</td>
                <td className="p-2 font-mono">{row.weight ?? "—"}</td>
                <td className="p-2 font-mono">{row.height ?? "—"}</td>
                <td className="p-2 font-mono">{row.weight && row.height ? (row.weight / ((row.height / 100) ** 2)).toFixed(1) : "—"}</td>
                <td className="p-2 font-mono">{row.temperature ?? "—"}</td>
                <td className="p-2 font-mono">{row.spo2 ?? "—"}</td>
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
  if (!patient) return null;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ testName: "", result: "", units: "", referenceRange: "", status: "Normal" as "Normal" | "Abnormal" | "Critical" });
  const add = () => {
    if (!draft.testName.trim()) return;
    upsertPatient({ ...patient, investigations: [{ id: uid("inv"), date: new Date().toISOString(), ...draft }, ...patient.investigations] });
    setDraft({ testName: "", result: "", units: "", referenceRange: "", status: "Normal" });
    setOpen(false);
    toast.success("Investigation added");
  };
  return (
    <>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(!open)}><Plus className="h-3 w-3 mr-1" />{open ? "Close" : "Add"}</Button>
      </div>
      {open && (
        <Card className="p-3 grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
          <div className="col-span-2"><label className="text-xs text-muted-foreground">Test</label><Input value={draft.testName} onChange={(e) => setDraft({ ...draft, testName: e.target.value })} /></div>
          <div><label className="text-xs text-muted-foreground">Result</label><Input value={draft.result} onChange={(e) => setDraft({ ...draft, result: e.target.value })} /></div>
          <div><label className="text-xs text-muted-foreground">Units</label><Input value={draft.units} onChange={(e) => setDraft({ ...draft, units: e.target.value })} /></div>
          <div><label className="text-xs text-muted-foreground">Ref</label><Input value={draft.referenceRange} onChange={(e) => setDraft({ ...draft, referenceRange: e.target.value })} /></div>
          <Button onClick={add}>Save</Button>
        </Card>
      )}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground bg-muted/30"><tr><th className="p-2">Date</th><th className="p-2">Test</th><th className="p-2">Result</th><th className="p-2">Units</th><th className="p-2">Ref</th><th className="p-2">Status</th></tr></thead>
          <tbody>
            {patient.investigations.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">No investigations yet.</td></tr>}
            {patient.investigations.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-2 text-xs">{formatDate(i.date)}</td>
                <td className="p-2">{i.testName}</td>
                <td className="p-2 font-mono">{i.result ?? "—"}</td>
                <td className="p-2 text-xs">{i.units ?? "—"}</td>
                <td className="p-2 text-xs">{i.referenceRange ?? "—"}</td>
                <td className="p-2"><Badge variant="outline" className={i.status === "Normal" ? "border-accent text-accent" : i.status === "Critical" ? "border-destructive text-destructive" : "border-warning text-warning"}>{i.status ?? "—"}</Badge></td>
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
