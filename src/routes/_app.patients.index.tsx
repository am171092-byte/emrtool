import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InitialsAvatar } from "@/components/initials-avatar";
import { useAllPatients } from "@/lib/use-store";
import { calcAge, formatDate, patientMatches } from "@/lib/format";
import { deletePatient } from "@/lib/api-store";
import { Plus, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/patients/")({
  head: () => ({ meta: [{ title: "Patients — RheumCare" }] }),
  component: PatientList,
});

function PatientList() {
  const all = useAllPatients();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"last_visit" | "name" | "followup">("last_visit");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const m = all.filter((p) => patientMatches(p, q));
    if (sort === "name") return [...m].sort((a, b) => a.fullName.localeCompare(b.fullName));
    if (sort === "followup") return [...m].sort((a, b) => (a.nextFollowUp ? +new Date(a.nextFollowUp) : Infinity) - (b.nextFollowUp ? +new Date(b.nextFollowUp) : Infinity));
    return [...m].sort((a, b) => +new Date(b.lastAccessedAt ?? b.createdAt) - +new Date(a.lastAccessedAt ?? a.createdAt));
  }, [all, q, sort]);

  return (
    <div className="space-y-4 relative">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <h1 className="text-2xl font-semibold">Patients</h1>
        <Button onClick={() => navigate({ to: "/patients/new" })} className="hidden sm:flex">
          <Plus className="h-4 w-4 mr-2" /> New patient
        </Button>
      </div>

      <Card className="p-3 flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Search by name, phone, or diagnosis…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1"
        />
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_visit">Last visit (newest)</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
            <SelectItem value="followup">Follow-up (soonest)</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-sm text-muted-foreground">{q ? `No patients match "${q}"` : "No patients yet."}</div>
          <Button className="mt-4" onClick={() => navigate({ to: "/patients/new" })}>Add patient</Button>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Age/Sex</th>
                  <th className="px-4 py-2 font-medium">Phone</th>
                  <th className="px-4 py-2 font-medium">Diagnosis</th>
                  <th className="px-4 py-2 font-medium">Last visit</th>
                  <th className="px-4 py-2 font-medium">Follow-up</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link to="/patients/$patientId" params={{ patientId: p.id }} className="flex items-center gap-2 font-medium">
                        <InitialsAvatar name={p.fullName} size={28} /> {p.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{calcAge(p.dob)} · {p.sex[0]}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.phone}</td>
                    <td className="px-4 py-3">{p.primaryDiagnosis && <Badge variant="secondary">{p.primaryDiagnosis}</Badge>}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.lastAccessedAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.nextFollowUp)}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="More"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate({ to: "/patients/$patientId", params: { patientId: p.id } })}>Open</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate({ to: "/patients/$patientId/visits/new", params: { patientId: p.id } })}>New visit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDel(p.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((p) => (
              <Card key={p.id} className="p-3">
                <Link to="/patients/$patientId" params={{ patientId: p.id }} className="flex items-center gap-3">
                  <InitialsAvatar name={p.fullName} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.fullName}</div>
                    <div className="text-xs text-muted-foreground">{calcAge(p.dob)} · {p.sex} · {p.phone}</div>
                    {p.primaryDiagnosis && <Badge variant="secondary" className="mt-1 text-[10px]">{p.primaryDiagnosis}</Badge>}
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Mobile FAB */}
      <Button
        onClick={() => navigate({ to: "/patients/new" })}
        className="sm:hidden fixed bottom-24 right-4 rounded-full h-14 w-14 shadow-lg z-30"
        aria-label="New patient"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete patient?</AlertDialogTitle>
            <AlertDialogDescription>This removes the patient and all their visits from this device. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => {
              if (confirmDel) { deletePatient(confirmDel); toast.success("Patient deleted"); }
              setConfirmDel(null);
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
