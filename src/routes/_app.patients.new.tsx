import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PatientForm } from "@/components/patient-form";

export const Route = createFileRoute("/_app/patients/new")({
  head: () => ({ meta: [{ title: "New patient — RheumCare" }] }),
  component: NewPatient,
});

function NewPatient() {
  const nav = useNavigate();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New patient</h1>
      <PatientForm onSaved={(id) => nav({ to: "/patients/$patientId", params: { patientId: id } })} onCancel={() => nav({ to: "/patients" })} />
    </div>
  );
}
