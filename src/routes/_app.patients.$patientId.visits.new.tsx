import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { VisitForm } from "@/components/visit-form";
import { usePatient } from "@/lib/use-store";

export const Route = createFileRoute("/_app/patients/$patientId/visits/new")({
  head: () => ({ meta: [{ title: "New visit — RheumCare" }] }),
  component: NewVisit,
});

function NewVisit() {
  const { patientId } = Route.useParams();
  const p = usePatient(patientId);
  const nav = useNavigate();
  if (!p) return <div className="text-sm text-muted-foreground">Patient not found.</div>;
  return <VisitForm patient={p} onSaved={() => nav({ to: "/patients/$patientId", params: { patientId } })} onCancel={() => nav({ to: "/patients/$patientId", params: { patientId } })} />;
}
