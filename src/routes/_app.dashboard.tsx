import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InitialsAvatar } from "@/components/initials-avatar";
import { useAllPatients, useAllVisits, useRecentIds } from "@/lib/use-store";
import { useAuth } from "@/lib/auth-context";
import { calcAge, daysUntil, formatDate } from "@/lib/format";
import { Plus, UserPlus, Calculator } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — RheumCare" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { doctor } = useAuth();
  const navigate = useNavigate();
  const patients = useAllPatients();
  const visits = useAllVisits();
  const recentIds = useRecentIds();

  const today = new Date().toDateString();
  const visitsToday = visits.filter((v) => new Date(v.date).toDateString() === today).length;
  const monthAgo = Date.now() - 30 * 86400000;
  const visitsThisMonth = visits.filter((v) => +new Date(v.date) >= monthAgo).length;

  const upcoming = useMemo(() => {
    return patients
      .filter((p) => p.nextFollowUp && daysUntil(p.nextFollowUp)! <= 14 && daysUntil(p.nextFollowUp)! >= -1)
      .sort((a, b) => +new Date(a.nextFollowUp!) - +new Date(b.nextFollowUp!));
  }, [patients]);

  const recent = useMemo(() => {
    const byId = new Map(patients.map((p) => [p.id, p]));
    return recentIds.map((id) => byId.get(id)).filter(Boolean).slice(0, 10);
  }, [patients, recentIds]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{greeting}, {doctor?.name?.split(" ").slice(-1)[0]}</h1>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Stat label="Total patients" value={patients.length} />
        <Stat label="Visits today" value={visitsToday} />
        <Stat label="Visits this month" value={visitsThisMonth} />
        <Stat label="Pending follow-ups" value={upcoming.length} />
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-5 md:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent patients</h2>
            <Link to="/patients" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <EmptyRecent />
          ) : (
            <div className="space-y-1">
              {recent.map((p) => p && (
                <Link
                  key={p.id}
                  to="/patients/$patientId"
                  params={{ patientId: p.id }}
                  className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted transition-colors"
                >
                  <InitialsAvatar name={p.fullName} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.fullName}</div>
                    <div className="text-xs text-muted-foreground">
                      {calcAge(p.dob)}y · {p.sex} · {formatDate(p.lastAccessedAt)}
                    </div>
                  </div>
                  {p.primaryDiagnosis && (
                    <Badge variant="secondary" className="text-[10px]">{p.primaryDiagnosis}</Badge>
                  )}
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 md:col-span-2">
          <h2 className="font-semibold mb-3">Upcoming follow-ups</h2>
          {upcoming.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Nothing in the next 14 days.</div>
          ) : (
            <div className="space-y-1">
              {upcoming.map((p) => {
                const d = daysUntil(p.nextFollowUp)!;
                const tone = d < 3 ? "destructive" : d <= 7 ? "warning" : "accent";
                const toneCls = { destructive: "text-destructive", warning: "text-warning", accent: "text-accent" }[tone];
                return (
                  <Link key={p.id} to="/patients/$patientId" params={{ patientId: p.id }} className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.fullName}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(p.nextFollowUp)}</div>
                    </div>
                    <span className={`text-xs font-mono ${toneCls}`}>{d}d</span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4 flex flex-wrap gap-2">
        <Button onClick={() => navigate({ to: "/patients/new" })}>
          <UserPlus className="h-4 w-4 mr-2" /> New patient
        </Button>
        <Button variant="outline" onClick={() => navigate({ to: "/patients" })}>
          <Plus className="h-4 w-4 mr-2" /> New visit
        </Button>
        <Button variant="outline" onClick={() => navigate({ to: "/das28" })}>
          <Calculator className="h-4 w-4 mr-2" /> DAS28 calculator
        </Button>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="font-mono text-3xl tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}

function EmptyRecent() {
  return (
    <div className="text-sm text-muted-foreground py-8 text-center">
      No patients yet. <Link to="/patients/new" className="text-primary underline">Add your first patient</Link>.
    </div>
  );
}
