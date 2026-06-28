import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { VisitForm } from "@/components/visit-form";
import { usePatient, useVisit } from "@/lib/use-store";

export const Route = createFileRoute("/_app/patients/$patientId/visits/$visitId/edit")({
  head: () => ({ meta: [{ title: "Edit visit — RheumCare" }] }),
  component: EditVisit,
});

function EditVisit() {
  const { patientId, visitId } = Route.useParams();
  const p = usePatient(patientId);
  const v = useVisit(visitId);
  const nav = useNavigate();
  if (!p || !v) return <div className="flex items-center justify-center h-full py-16"><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-2 text-sm text-muted-foreground">Loading...</span></div>;
  return <VisitForm patient={p} visit={v} onSaved={() => nav({ to: "/patients/$patientId", params: { patientId } })} onCancel={() => nav({ to: "/patients/$patientId", params: { patientId } })} />;
}
