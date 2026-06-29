import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, UserPlus, Check, X, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/calendar")({
  head: () => ({ meta: [{ title: "Calendar — RheumCare" }] }),
  component: CalendarPage,
});

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

type EventStatus = "mapped" | "suggested" | "review" | "new";

interface Candidate {
  id: string;
  fullName: string;
  age?: number;
  sex?: string;
  phone?: string;
}

interface CalEvent {
  id: string;
  title: string;
  start: string; // ISO datetime
  end?: string;
  status: EventStatus;
  patient?: Candidate;
  candidates?: Candidate[];
}

interface CalendarResponse {
  summary: {
    synced: number;
    suggested: number;
    review: number;
    new: number;
  };
  events: CalEvent[];
}

function authHeaders(): HeadersInit {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function fmtTimeISO(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function statusBadge(s: EventStatus) {
  switch (s) {
    case "mapped":
      return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Synced</Badge>;
    case "suggested":
      return <Badge className="bg-blue-600 hover:bg-blue-600 text-white">Suggested</Badge>;
    case "review":
      return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Review</Badge>;
    case "new":
      return <Badge variant="secondary">New Patient</Badge>;
  }
}

function CandidateLine({ c }: { c: Candidate }) {
  const bits = [c.age != null ? `${c.age}y` : null, c.sex, c.phone].filter(Boolean).join(" · ");
  return (
    <div className="min-w-0">
      <div className="text-sm font-medium truncate">{c.fullName}</div>
      {bits && <div className="text-xs text-muted-foreground truncate">{bits}</div>}
    </div>
  );
}

function CalendarPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [showCandidates, setShowCandidates] = useState<Record<string, boolean>>({});
  const [pickChoice, setPickChoice] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/calendar/upcoming?days=14`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as CalendarResponse;
      json.summary ||= { synced: 0, suggested: 0, review: 0, new: 0 };
      json.events ||= [];
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    if (!data) return [] as { date: string; events: CalEvent[] }[];
    const map = new Map<string, CalEvent[]>();
    [...data.events]
      .sort((a, b) => a.start.localeCompare(b.start))
      .forEach((e) => {
        const k = new Date(e.start).toDateString();
        const arr = map.get(k) ?? [];
        arr.push(e);
        map.set(k, arr);
      });
    return Array.from(map.entries()).map(([k, events]) => ({
      date: new Date(k).toISOString(),
      events,
    }));
  }, [data]);

  const setBusyFor = (id: string, v: boolean) =>
    setBusy((b) => ({ ...b, [id]: v }));

  const updateEvent = (id: string, patch: Partial<CalEvent>) => {
    setData((d) => {
      if (!d) return d;
      const events = d.events.map((e) => (e.id === id ? { ...e, ...patch } : e));
      const summary = {
        synced: events.filter((e) => e.status === "mapped").length,
        suggested: events.filter((e) => e.status === "suggested").length,
        review: events.filter((e) => e.status === "review").length,
        new: events.filter((e) => e.status === "new").length,
      };
      return { events, summary };
    });
  };

  const linkPatient = async (evt: CalEvent, patient: Candidate) => {
    setBusyFor(evt.id, true);
    try {
      const res = await fetch(`${API_BASE}/api/calendar/link`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          eventTitle: evt.title,
          patientId: patient.id,
          createVisit: {
            date: evt.start.slice(0, 10),
            time: fmtTimeISO(evt.start),
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      updateEvent(evt.id, { status: "mapped", patient, candidates: undefined });
      toast.success(`Linked to ${patient.fullName}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to link");
    } finally {
      setBusyFor(evt.id, false);
    }
  };

  const createPatient = async (evt: CalEvent) => {
    setBusyFor(evt.id, true);
    try {
      const res = await fetch(`${API_BASE}/api/calendar/create-patient`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          eventTitle: evt.title,
          eventDate: evt.start,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = (await res.json()) as Candidate;
      updateEvent(evt.id, { status: "mapped", patient: created, candidates: undefined });
      toast.success(`Created patient ${created.fullName}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create patient");
    } finally {
      setBusyFor(evt.id, false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-muted-foreground">Upcoming appointments from your Google Calendar.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {data && (
        <Card className="p-3 flex flex-wrap gap-2 text-sm">
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">{data.summary.synced} synced</Badge>
          <Badge className="bg-blue-600 hover:bg-blue-600 text-white">{data.summary.suggested} suggested</Badge>
          <Badge className="bg-amber-500 hover:bg-amber-500 text-white">{data.summary.review} needs review</Badge>
          <Badge variant="secondary">{data.summary.new} new</Badge>
        </Card>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading calendar…
        </div>
      )}

      {error && (
        <Card className="p-4 border-destructive/50 bg-destructive/5 text-sm text-destructive">
          Failed to load calendar: {error}
        </Card>
      )}

      {data && grouped.length === 0 && !loading && (
        <Card className="p-8 text-center text-muted-foreground">
          <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-60" />
          No upcoming events in the next 14 days.
        </Card>
      )}

      <div className="space-y-5">
        {grouped.map((group) => (
          <div key={group.date} className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {formatDate(group.date)}
            </div>
            {group.events.map((evt) => {
              const isBusy = !!busy[evt.id];
              return (
                <Card key={evt.id} className="p-4">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="font-mono text-sm text-muted-foreground w-14 shrink-0">
                      {fmtTime(evt.start)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-medium truncate">{evt.title}</div>
                        {statusBadge(evt.status)}
                      </div>

                      {evt.status === "mapped" && evt.patient && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate({ to: "/patients/$patientId", params: { patientId: evt.patient!.id } })
                          }
                          className="text-left hover:underline"
                        >
                          <CandidateLine c={evt.patient} />
                        </button>
                      )}

                      {evt.status === "suggested" && evt.patient && (
                        <div className="space-y-2">
                          <div className="text-sm">
                            Link to <span className="font-medium">{evt.patient.fullName}</span>?
                          </div>
                          <CandidateLine c={evt.patient} />
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" onClick={() => linkPatient(evt, evt.patient!)} disabled={isBusy}>
                              {isBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowCandidates((s) => ({ ...s, [evt.id]: true }))}
                              disabled={isBusy}
                            >
                              <X className="h-4 w-4 mr-1" /> Not this patient
                            </Button>
                          </div>
                          {showCandidates[evt.id] && (
                            <CandidatesPicker
                              evt={evt}
                              choice={pickChoice[evt.id]}
                              onChoice={(v) => setPickChoice((p) => ({ ...p, [evt.id]: v }))}
                              onLink={(p) => linkPatient(evt, p)}
                              onCreate={() => createPatient(evt)}
                              busy={isBusy}
                            />
                          )}
                        </div>
                      )}

                      {evt.status === "review" && (
                        <CandidatesPicker
                          evt={evt}
                          choice={pickChoice[evt.id]}
                          onChoice={(v) => setPickChoice((p) => ({ ...p, [evt.id]: v }))}
                          onLink={(p) => linkPatient(evt, p)}
                          onCreate={() => createPatient(evt)}
                          busy={isBusy}
                        />
                      )}

                      {evt.status === "new" && (
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">No matching patient found.</div>
                          <Button size="sm" onClick={() => createPatient(evt)} disabled={isBusy}>
                            {isBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserPlus className="h-4 w-4 mr-1" />}
                            Create patient
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function CandidatesPicker({
  evt,
  choice,
  onChoice,
  onLink,
  onCreate,
  busy,
}: {
  evt: CalEvent;
  choice?: string;
  onChoice: (v: string) => void;
  onLink: (p: Candidate) => void;
  onCreate: () => void;
  busy: boolean;
}) {
  const candidates = evt.candidates ?? [];
  const selected = candidates.find((c) => c.id === choice);
  return (
    <div className="space-y-2">
      {candidates.length > 0 ? (
        <>
          <div className="text-xs text-muted-foreground">Pick the matching patient:</div>
          <Select value={choice} onValueChange={onChoice}>
            <SelectTrigger className="w-full sm:w-80">
              <SelectValue placeholder="Choose patient…" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.fullName}
                  {c.age != null ? ` · ${c.age}y` : ""}
                  {c.sex ? ` · ${c.sex}` : ""}
                  {c.phone ? ` · ${c.phone}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      ) : (
        <div className="text-xs text-muted-foreground">No candidates returned.</div>
      )}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => selected && onLink(selected)} disabled={!selected || busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
          Link patient
        </Button>
        <Button size="sm" variant="outline" onClick={onCreate} disabled={busy}>
          <UserPlus className="h-4 w-4 mr-1" /> Create new patient
        </Button>
      </div>
    </div>
  );
}
