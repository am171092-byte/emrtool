import { useState, useMemo } from "react";
import type { Patient, Medication, Sex } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/tag-input";
import { upsertPatient, uid } from "@/lib/api-store";
import { calcAge, bmi } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

interface Props {
  initial?: Patient;
  onSaved: (id: string) => void;
  onCancel: () => void;
}

export function PatientForm({ initial, onSaved, onCancel }: Props) {
  const isNew = !initial;
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [dob, setDob] = useState(initial?.dob ?? "");
  const [sex, setSex] = useState<Sex>(initial?.sex ?? "Female");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [allergies, setAllergies] = useState<string[]>(initial?.allergies ?? []);
  const [meds, setMeds] = useState<Medication[]>(initial?.medications ?? []);
  const [comorbidities, setComorbidities] = useState<string[]>(initial?.comorbidities ?? []);
  const [problems, setProblems] = useState<string[]>(initial?.problemList ?? []);
  const [pmh, setPmh] = useState(initial?.pastMedicalHistory ?? "");
  const [primaryDx, setPrimaryDx] = useState(initial?.primaryDiagnosis ?? "");
  const [tdi, setTdi] = useState(initial?.tdi ?? "");

  // Vitals (initial only)
  const [bpS, setBpS] = useState<number | "">("");
  const [bpD, setBpD] = useState<number | "">("");
  const [hr, setHr] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [temp, setTemp] = useState<number | "">("");
  const [spo2, setSpo2] = useState<number | "">("");

  const calcBmi = useMemo(() => bmi(typeof weight === "number" ? weight : undefined, typeof height === "number" ? height : undefined), [weight, height]);
  const age = dob ? calcAge(dob) : null;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !dob || !phone.trim()) {
      toast.error("Name, date of birth, and phone are required.");
      return;
    }
    const id = initial?.id ?? uid("p");
    const vitalsEntry = (bpS || bpD || hr || weight || height || temp || spo2)
      ? [{
          id: uid("v"),
          date: new Date().toISOString(),
          bpSystolic: typeof bpS === "number" ? bpS : undefined,
          bpDiastolic: typeof bpD === "number" ? bpD : undefined,
          hr: typeof hr === "number" ? hr : undefined,
          weight: typeof weight === "number" ? weight : undefined,
          height: typeof height === "number" ? height : undefined,
          temperature: typeof temp === "number" ? temp : undefined,
          spo2: typeof spo2 === "number" ? spo2 : undefined,
        }]
      : [];

    const next: Patient = {
      id,
      fullName: fullName.trim(),
      dob,
      sex,
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      allergies,
      medications: meds,
      pastMedicalHistory: pmh.trim() || undefined,
      comorbidities,
      problemList: problems,
      primaryDiagnosis: primaryDx.trim() || undefined,
      tdi: tdi.trim() || undefined,
      vitals: isNew ? vitalsEntry : initial?.vitals ?? [],
      investigations: initial?.investigations ?? [],
      attachments: initial?.attachments ?? [],
      createdAt: initial?.createdAt ?? new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      nextFollowUp: initial?.nextFollowUp,
    };
    upsertPatient(next);
    toast.success("Patient saved successfully");
    onSaved(id);
  };

  const addMed = () => setMeds([...meds, { id: uid("m"), drug: "", dose: "", frequency: "", duration: "" }]);
  const updateMed = (i: number, patch: Partial<Medication>) => setMeds(meds.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const removeMed = (i: number) => setMeds(meds.filter((_, idx) => idx !== i));

  return (
    <form onSubmit={save} className="space-y-4 pb-24">
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Personal details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full name" required><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
          <Field label={`Date of birth ${age != null ? `· ${age} y` : ""}`} required>
            <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </Field>
          <Field label="Sex">
            <div className="grid grid-cols-3 gap-1 rounded-md border bg-background p-1">
              {(["Male", "Female", "Other"] as Sex[]).map((s) => (
                <button key={s} type="button" onClick={() => setSex(s)} className={`text-sm py-1.5 rounded ${sex === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{s}</button>
              ))}
            </div>
          </Field>
          <Field label="Phone" required><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="patient@example.com" /></Field>
          <Field label="Address" className="md:col-span-2"><Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Clinical details</h2>
        <Field label="Primary diagnosis"><Input value={primaryDx} onChange={(e) => setPrimaryDx(e.target.value)} placeholder="e.g. Rheumatoid Arthritis" /></Field>
        <Field label="Total Duration of Illness (TDI)"><Input value={tdi} onChange={(e) => setTdi(e.target.value)} placeholder="e.g. 3 years, 18 months" /></Field>
        <Field label="Allergies"><TagInput value={allergies} onChange={setAllergies} placeholder="Type allergy, press Enter" tone="danger" /></Field>
        <Field label="Comorbidities"><TagInput value={comorbidities} onChange={setComorbidities} placeholder="e.g. Hypertension" /></Field>
        <Field label="Current issues"><TagInput value={problems} onChange={setProblems} placeholder="Add issue, press Enter" /></Field>
        <Field label="Past medical history"><Textarea rows={3} value={pmh} onChange={(e) => setPmh(e.target.value)} /></Field>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Current medications</Label>
            <Button type="button" variant="outline" size="sm" onClick={addMed}><Plus className="h-3 w-3 mr-1" />Add</Button>
          </div>
          {meds.length === 0 && <div className="text-xs text-muted-foreground">None recorded.</div>}
          <div className="space-y-2">
            {meds.map((m, i) => (
              <div key={m.id} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-12 md:col-span-4" placeholder="Drug name" value={m.drug} onChange={(e) => updateMed(i, { drug: e.target.value })} />
                <Input className="col-span-4 md:col-span-2" placeholder="Dose" value={m.dose} onChange={(e) => updateMed(i, { dose: e.target.value })} />
                <Input className="col-span-4 md:col-span-3" placeholder="Frequency" value={m.frequency} onChange={(e) => updateMed(i, { frequency: e.target.value })} />
                <Input className="col-span-3 md:col-span-2" placeholder="Duration" value={m.duration} onChange={(e) => updateMed(i, { duration: e.target.value })} />
                <Button className="col-span-1" type="button" variant="ghost" size="icon" onClick={() => removeMed(i)} aria-label="Remove medication"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {isNew && (
        <Card className="p-5 space-y-4">
          <h2 className="font-semibold">Initial vitals <span className="text-xs font-normal text-muted-foreground">(optional)</span></h2>
          <div className="grid gap-3 md:grid-cols-3">
            <NumField label="BP Systolic (mmHg)" value={bpS} onChange={setBpS} />
            <NumField label="BP Diastolic (mmHg)" value={bpD} onChange={setBpD} />
            <NumField label="Heart rate (bpm)" value={hr} onChange={setHr} />
            <NumField label="Weight (kg)" value={weight} onChange={setWeight} />
            <NumField label="Height (cm)" value={height} onChange={setHeight} />
            <Field label="BMI"><Input value={calcBmi ?? ""} readOnly className="font-mono" /></Field>
            <NumField label="Temperature (°C)" value={temp} onChange={setTemp} />
            <NumField label="SpO2 (%)" value={spo2} onChange={setSpo2} />
          </div>
        </Card>
      )}

      <div className="h-20 md:hidden" aria-hidden />
      <div className="fixed bottom-14 inset-x-0 md:relative md:bottom-auto md:inset-auto bg-card md:bg-transparent border-t md:border-0 p-3 md:p-0 flex gap-2 z-30 no-print shadow-[0_-2px_8px_rgba(0,0,0,0.05)] md:shadow-none">

        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 md:flex-none">Cancel</Button>
        <Button type="submit" className="flex-1 md:flex-none">Save patient</Button>
      </div>
    </form>
  );
}

function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}
function NumField({ label, value, onChange }: { label: string; value: number | ""; onChange: (v: number | "") => void }) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className="font-mono"
      />
    </Field>
  );
}
