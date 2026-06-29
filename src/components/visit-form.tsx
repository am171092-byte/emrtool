import { useEffect, useMemo, useState } from "react";
import type { Patient, Visit, Prescription, Investigation, JointState, DAS28Data } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { upsertVisit, uid, getVisitsForPatient } from "@/lib/api-store";
import { RHEUM_DRUGS } from "@/lib/drugs";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { JointDiagram, type Mode } from "@/components/joint-diagram";
import { DAS28Calculator, type DAS28Snapshot } from "@/components/das28-calculator";
import { AIDrawer } from "@/components/ai-drawer";
import { TagInput } from "@/components/tag-input";
import { createCalendarEvent } from "@/lib/calendar-service";

interface Props {
  patient: Patient;
  visit?: Visit;
  onSaved: () => void;
  onCancel: () => void;
}

export function VisitForm({ patient, visit, onSaved, onCancel }: Props) {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const nowTime = today.toTimeString().slice(0, 5);

  const lastVisit = useMemo(() => {
    if (visit) return null;
    return getVisitsForPatient(patient.id)[0];
  }, [visit, patient.id]);

  const [date, setDate] = useState(visit?.date.slice(0, 10) ?? todayIso);
  const [time, setTime] = useState(visit?.time ?? nowTime);
  const [chiefComplaints, setChiefComplaints] = useState<string[]>(
    visit?.chiefComplaints && visit.chiefComplaints.length > 0
      ? visit.chiefComplaints
      : (visit?.chiefComplaint ? [visit.chiefComplaint] : [])
  );
  const [hpi, setHpi] = useState(visit?.soap.historyOfPresentingIllness ?? visit?.soap.subjective ?? "");
  const [currentVisit, setCurrentVisit] = useState(visit?.soap.currentVisit ?? "");
  const [examination, setExamination] = useState(visit?.soap.examination ?? visit?.soap.objective ?? "");
  const [impression, setImpression] = useState(visit?.soap.impression ?? visit?.soap.assessment ?? "");
  const [plan, setPlan] = useState(visit?.soap.plan ?? "");

  const prefVitals = visit?.vitals ?? lastVisit?.vitals ?? patient.vitals?.[0];
  const [bpS, setBpS] = useState<number | "">(prefVitals?.bpSystolic ?? "");
  const [bpD, setBpD] = useState<number | "">(prefVitals?.bpDiastolic ?? "");
  const [hr, setHr] = useState<number | "">(prefVitals?.hr ?? "");
  const [weight, setWeight] = useState<number | "">(prefVitals?.weight ?? "");
  const [temp, setTemp] = useState<number | "">(prefVitals?.temperature ?? "");
  const [spo2, setSpo2] = useState<number | "">(prefVitals?.spo2 ?? "");
  const [respRate, setRespRate] = useState<number | "">(prefVitals?.respiratoryRate ?? "");

  const [prescriptions, setPrescriptions] = useState<Prescription[]>(visit?.prescriptions ?? []);
  const [investigations, setInvestigations] = useState<Investigation[]>(visit?.investigations ?? []);
  const [investigationNotes, setInvestigationNotes] = useState(visit?.investigationNotes ?? "");
  const [nextFollowUp, setNextFollowUp] = useState(visit?.nextFollowUp?.slice(0, 10) ?? "");
  const [followUpNote, setFollowUpNote] = useState(visit?.followUpNote ?? "");

  const [enableDas28, setEnableDas28] = useState(!!visit?.das28);
  const [jointStates, setJointStates] = useState<Record<string, JointState>>(() => {
    const obj: Record<string, JointState> = {};
    visit?.jointMap?.joints.forEach((j) => { obj[j.id] = j; });
    return obj;
  });
  const [jointMode, setJointMode] = useState<Mode>("tender");
  const [das28Snap, setDas28Snap] = useState<DAS28Snapshot | null>(visit?.das28 ?? null);
  const [aiOpen, setAiOpen] = useState(false);

  const tjc = Object.values(jointStates).filter((j) => j.tender).length;
  const sjc = Object.values(jointStates).filter((j) => j.swollen).length;

  // warn on unload
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setDirty(true);
  }, [chiefComplaints, hpi, currentVisit, examination, impression, plan, prescriptions, investigations, investigationNotes, jointStates, das28Snap]);
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (chiefComplaints.length === 0) { toast.error("At least one chief complaint is required"); return; }
    const id = visit?.id ?? uid("vis");
    const nextFollowUpIso = nextFollowUp ? new Date(nextFollowUp).toISOString() : undefined;
    const next: Visit = {
      id, patientId: patient.id,
      date: new Date(date).toISOString(),
      time,
      chiefComplaints,
      chiefComplaint: chiefComplaints.join(", "),
      soap: { historyOfPresentingIllness: hpi, currentVisit, examination, impression, plan },
      vitals: { bpSystolic: typeof bpS === "number" ? bpS : undefined, bpDiastolic: typeof bpD === "number" ? bpD : undefined, hr: typeof hr === "number" ? hr : undefined, respiratoryRate: typeof respRate === "number" ? respRate : undefined, weight: typeof weight === "number" ? weight : undefined, temperature: typeof temp === "number" ? temp : undefined, spo2: typeof spo2 === "number" ? spo2 : undefined },
      prescriptions,
      investigations,
      investigationNotes: investigationNotes || undefined,
      nextFollowUp: nextFollowUpIso,
      followUpNote: followUpNote || undefined,
      jointMap: Object.values(jointStates).some((j) => j.tender || j.swollen || j.note) ? { joints: Object.values(jointStates), tjc, sjc } : undefined,
      das28: enableDas28 && das28Snap ? (das28Snap as DAS28Data) : undefined,
    };
    upsertVisit(next);
    setDirty(false);
    toast.success("Visit saved");
    const priorFollowUp = visit?.nextFollowUp?.slice(0, 10) ?? "";
    if (nextFollowUpIso && nextFollowUp !== priorFollowUp) {
      const ok = await createCalendarEvent({
        patientName: patient.fullName,
        patientId: patient.id,
        date: nextFollowUpIso,
        time: "",
        duration: 30,
        notes: followUpNote,
      });
      if (ok) toast.success("Follow-up added to Google Calendar");
    }
    onSaved();
  };

  const addPx = () => setPrescriptions([...prescriptions, { id: uid("rx"), drug: "", dose: "", frequency: "", duration: "" }]);
  const addInv = () => setInvestigations([...investigations, { id: uid("inv"), testName: "", urgency: "Routine" }]);

  return (
    <>
      <form onSubmit={save} className="space-y-4 pb-32">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">{visit ? "Edit visit" : "New visit"}</h1>
          <Button type="button" variant="outline" size="sm" onClick={() => setAiOpen(true)}>
            <Sparkles className="h-4 w-4 mr-1" /> AI Assist
          </Button>
        </div>

        <Card className="p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          </div>
          <Field label="Chief complaints">
            <TagInput value={chiefComplaints} onChange={setChiefComplaints} placeholder="Type a complaint, press Enter" />
          </Field>
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold">SOAP note</h2>
            <h2 className="font-semibold">Visit notes</h2>
            <SoapField label="History of Presenting Illness" value={hpi} onChange={setHpi} placeholder="Patient reports…" />
            <SoapField label="Current Visit" value={currentVisit} onChange={setCurrentVisit} placeholder="What happened this visit…" />
            <SoapField label="Examination" value={examination} onChange={setExamination} placeholder="On examination…" />
            <SoapField label="Impression" value={impression} onChange={setImpression} placeholder="Impression: …" />
            <SoapField label="Plan" value={plan} onChange={setPlan} placeholder="1. Continue… 2. Start…" />
          </Card>

          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <h2 className="font-semibold">Vitals</h2>
              <p className="text-xs text-muted-foreground">Pre-filled from last visit. Update as needed.</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <NumField label="BP Sys" suffix="mmHg" value={bpS} onChange={setBpS} />
                <NumField label="BP Dia" suffix="mmHg" value={bpD} onChange={setBpD} />
                <NumField label="HR" suffix="bpm" value={hr} onChange={setHr} />
                <NumField label="Resp Rate" suffix="/min" value={respRate} onChange={setRespRate} />
                <NumField label="Weight" suffix="kg" value={weight} onChange={setWeight} />
                <NumField label="Temp" suffix="°F" value={temp} onChange={setTemp} />
                <NumField label="SpO₂" suffix="%" value={spo2} onChange={setSpo2} />
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Prescriptions</h2>
                <Button type="button" variant="outline" size="sm" onClick={addPx}><Plus className="h-3 w-3 mr-1" />Add</Button>
              </div>
              <div className="space-y-2 mt-3">
                {prescriptions.length === 0 && <div className="text-xs text-muted-foreground">None.</div>}
                {prescriptions.map((rx, i) => (
                  <div key={rx.id} className="grid grid-cols-12 gap-1 items-center">
                    <DrugAutocomplete className="col-span-12 md:col-span-4" value={rx.drug} onChange={(v) => setPrescriptions(prescriptions.map((x, idx) => idx === i ? { ...x, drug: v } : x))} />
                    <Input className="col-span-4 md:col-span-2" placeholder="Dose" value={rx.dose} onChange={(e) => setPrescriptions(prescriptions.map((x, idx) => idx === i ? { ...x, dose: e.target.value } : x))} />
                    <Input className="col-span-4 md:col-span-2" placeholder="Freq" value={rx.frequency} onChange={(e) => setPrescriptions(prescriptions.map((x, idx) => idx === i ? { ...x, frequency: e.target.value } : x))} />
                    <Input className="col-span-3 md:col-span-2" placeholder="Duration" value={rx.duration} onChange={(e) => setPrescriptions(prescriptions.map((x, idx) => idx === i ? { ...x, duration: e.target.value } : x))} />
                    <Button className="col-span-1" type="button" variant="ghost" size="icon" onClick={() => setPrescriptions(prescriptions.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Investigations ordered</h2>
                <Button type="button" variant="outline" size="sm" onClick={addInv}><Plus className="h-3 w-3 mr-1" />Add</Button>
              </div>
              <div className="space-y-2 mt-3">
                {investigations.length === 0 && <div className="text-xs text-muted-foreground">None.</div>}
                {investigations.map((inv, i) => (
                  <div key={inv.id} className="grid grid-cols-12 gap-1">
                    <Input className="col-span-6" placeholder="Test" value={inv.testName} onChange={(e) => setInvestigations(investigations.map((x, idx) => idx === i ? { ...x, testName: e.target.value } : x))} />
                    <select className="col-span-3 rounded-md border bg-background px-2 text-sm" value={inv.urgency} onChange={(e) => setInvestigations(investigations.map((x, idx) => idx === i ? { ...x, urgency: e.target.value as "Routine" | "Urgent" | "Follow up" } : x))}>
                      <option>Routine</option><option>Urgent</option><option>Follow up</option>
                    </select>
                    <Input className="col-span-2" placeholder="Notes" value={inv.notes ?? ""} onChange={(e) => setInvestigations(investigations.map((x, idx) => idx === i ? { ...x, notes: e.target.value } : x))} />
                    <Button className="col-span-1" type="button" variant="ghost" size="icon" onClick={() => setInvestigations(investigations.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Subjective Notes</Label>
                <Textarea rows={3} value={investigationNotes} onChange={(e) => setInvestigationNotes(e.target.value)} placeholder="Overall notes about investigations…" className="resize-y" />
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-semibold mb-2">Next follow-up</h2>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Date"><Input type="date" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} /></Field>
                <Field label="Advice"><Input value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} /></Field>
              </div>
            </Card>
          </div>
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">DAS28 for this visit</h2>
            <Switch checked={enableDas28} onCheckedChange={setEnableDas28} />
          </div>
          {enableDas28 && (
            <div className="mt-4 grid lg:grid-cols-2 gap-4">
              <div>
                <div className="flex gap-2 mb-2">
                  <Button type="button" variant={jointMode === "tender" ? "default" : "outline"} size="sm" onClick={() => setJointMode("tender")}>Tender</Button>
                  <Button type="button" variant={jointMode === "swollen" ? "default" : "outline"} size="sm" onClick={() => setJointMode("swollen")}>Swollen</Button>
                  <div className="ml-auto text-xs text-muted-foreground self-center">TJC <span className="font-mono">{tjc}</span> · SJC <span className="font-mono">{sjc}</span></div>
                </div>
                <JointDiagram states={jointStates} mode={jointMode} onChange={setJointStates} />
              </div>
              <DAS28Calculator initialTjc={tjc} initialSjc={sjc} onChange={setDas28Snap} />
            </div>
          )}
        </Card>

        <div className="h-20 md:hidden" aria-hidden />
        <div className="fixed bottom-14 inset-x-0 md:bottom-0 bg-card border-t p-3 flex gap-2 z-30 no-print shadow-[0_-2px_8px_rgba(0,0,0,0.05)] md:shadow-none">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 md:flex-none">Cancel</Button>
          <Button type="submit" className="flex-1 md:flex-none">Save visit</Button>
        </div>
      </form>
      <AIDrawer open={aiOpen} onOpenChange={setAiOpen} patient={patient} />
    </>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={className}><Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>{children}</div>;
}
function NumField({ label, value, onChange }: { label: string; value: number | ""; onChange: (v: number | "") => void }) {
  return <Field label={label}><Input type="number" value={value} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} className="font-mono h-9" /></Field>;
}
function SoapField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs font-semibold uppercase tracking-wider">{label}</Label>
        <span className="text-[10px] text-muted-foreground font-mono">{value.length}</span>
      </div>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="resize-y" />
    </div>
  );
}

function DrugAutocomplete({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const [focus, setFocus] = useState(false);
  const matches = value
    ? RHEUM_DRUGS.filter((d) => d.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
    : [];
  return (
    <div className={`relative ${className ?? ""}`}>
      <Input value={value} placeholder="Drug" onChange={(e) => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} />
      {focus && matches.length > 0 && value && !matches.includes(value) && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border rounded-md shadow max-h-48 overflow-auto text-sm">
          {matches.map((m) => (
            <button key={m} type="button" className="w-full text-left px-3 py-1.5 hover:bg-muted" onMouseDown={(e) => { e.preventDefault(); onChange(m); }}>
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
