import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { PatientForm } from "@/components/patient-form";
import { usePatient } from "@/lib/use-store";

export const Route = createFileRoute("/_app/patients/$patientId/edit")({
  head: () => ({ meta: [{ title: "Edit patient — RheumCare" }] }),
  component: EditPatient,
});

function EditPatient() {
  const { patientId } = Route.useParams();
  const p = usePatient(patientId);
  const nav = useNavigate();
  if (!p) return <div className="text-sm text-muted-foreground">Patient not found.</div>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Edit patient</h1>
      <PatientForm initial={p} onSaved={(id) => nav({ to: "/patients/$patientId", params: { patientId: id } })} onCancel={() => nav({ to: "/patients/$patientId", params: { patientId } })} />
    </div>
  );
}
