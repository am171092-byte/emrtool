import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { useAllVisits, useAllPatients } from "@/lib/use-store";
import { formatDate } from "@/lib/format";
import { InitialsAvatar } from "@/components/initials-avatar";

export const Route = createFileRoute("/_app/calendar")({
  head: () => ({ meta: [{ title: "Calendar — RheumCare" }] }),
  component: CalendarPage,
});

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function CalendarPage() {
  const [selected, setSelected] = useState<Date>(new Date());
  const visits = useAllVisits();
  const patients = useAllPatients();

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    visits.forEach((v) => {
      const k = new Date(v.date).toDateString();
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return map;
  }, [visits]);

  const upcomingByDay = useMemo(() => {
    const map = new Map<string, number>();
    patients.forEach((p) => {
      if (!p.nextFollowUp) return;
      const k = new Date(p.nextFollowUp).toDateString();
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return map;
  }, [patients]);

  const dayVisits = useMemo(
    () => visits.filter((v) => sameDay(new Date(v.date), selected)).sort((a, b) => a.time.localeCompare(b.time)),
    [visits, selected],
  );
  const dayUpcoming = useMemo(
    () => patients.filter((p) => p.nextFollowUp && sameDay(new Date(p.nextFollowUp), selected)),
    [patients, selected],
  );
  const patientById = (id: string) => patients.find((p) => p.id === id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground">Patients seen and scheduled follow-ups.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2 p-3 flex justify-center">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => d && setSelected(d)}
            className="w-full [--cell-size:2.6rem]"
            components={{
              DayButton: (props) => {
                const k = props.day.date.toDateString();
                const seen = countsByDay.get(k) ?? 0;
                const due = upcomingByDay.get(k) ?? 0;
                return (
                  <button
                    {...props}
                    className="relative aspect-square w-full rounded-md text-sm hover:bg-accent/40 data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground"
                    data-selected-single={props.modifiers.selected || undefined}
                  >
                    <span>{props.day.date.getDate()}</span>
                    {(seen > 0 || due > 0) && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {seen > 0 && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        {due > 0 && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                      </span>
                    )}
                  </button>
                );
              },
            }}
          />
        </Card>

        <div className="lg:col-span-3 space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">{formatDate(selected.toISOString())}</h2>
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary">{dayVisits.length} seen</Badge>
                <Badge variant="outline">{dayUpcoming.length} due</Badge>
              </div>
            </div>

            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Visits</div>
            {dayVisits.length === 0 ? (
              <div className="text-xs text-muted-foreground py-2">No visits on this day.</div>
            ) : (
              <div className="space-y-1">
                {dayVisits.map((v) => {
                  const p = patientById(v.patientId);
                  if (!p) return null;
                  return (
                    <Link
                      key={v.id}
                      to="/patients/$patientId/visits/$visitId/edit"
                      params={{ patientId: p.id, visitId: v.id }}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/30 border"
                    >
                      <div className="font-mono text-xs w-12 text-muted-foreground">{v.time}</div>
                      <InitialsAvatar name={p.fullName} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.fullName}</div>
                        <div className="text-xs text-muted-foreground truncate">{v.chiefComplaint}</div>
                      </div>
                      {p.primaryDiagnosis && <Badge variant="secondary" className="text-[10px]">{p.primaryDiagnosis}</Badge>}
                    </Link>
                  );
                })}
              </div>
            )}

            {dayUpcoming.length > 0 && (
              <>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mt-4 mb-2">Scheduled follow-ups</div>
                <div className="space-y-1">
                  {dayUpcoming.map((p) => (
                    <Link
                      key={p.id}
                      to="/patients/$patientId"
                      params={{ patientId: p.id }}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/30 border border-dashed"
                    >
                      <InitialsAvatar name={p.fullName} size={28} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.fullName}</div>
                        <div className="text-xs text-muted-foreground truncate">{p.nextVisitReason ?? "Follow-up"}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
