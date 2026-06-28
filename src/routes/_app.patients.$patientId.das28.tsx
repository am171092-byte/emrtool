import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { DAS28Calculator } from "@/components/das28-calculator";
import { usePatient, useVisitsForPatient } from "@/lib/use-store";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from "recharts";
import { z } from "zod";
import { Loader2 } from "lucide-react";

const search = z.object({ tjc: z.number().optional(), sjc: z.number().optional() }).parse;

export const Route = createFileRoute("/_app/patients/$patientId/das28")({
  head: () => ({ meta: [{ title: "DAS28 — RheumCare" }] }),
  validateSearch: (s) => search(s),
  component: DAS28Page,
});

function DAS28Page() {
  const { patientId } = Route.useParams();
  const { tjc, sjc } = Route.useSearch();
  const p = usePatient(patientId);
  const visits = useVisitsForPatient(patientId);

  const history = useMemo(() => {
    return visits
      .filter((v) => v.das28)
      .map((v) => ({ date: new Date(v.date).toLocaleDateString(), score: v.das28!.scoreEsr ?? v.das28!.scoreCrp ?? 0 }))
      .reverse();
  }, [visits]);

  if (!p) return <div className="text-sm text-muted-foreground">Patient not found.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">DAS28 — {p.fullName}</h1>
        <p className="text-sm text-muted-foreground">Disease Activity Score in 28 joints.</p>
      </div>

      <DAS28Calculator initialTjc={tjc ?? 0} initialSjc={sjc ?? 0} />

      <Card className="p-5">
        <h2 className="font-semibold mb-3">Historical trend</h2>
        {history.length < 2 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Not enough DAS28 entries yet. Record DAS28 on at least 2 visits to see the trend.</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 8]} tick={{ fontSize: 10 }} />
                <ReferenceLine y={2.6} stroke="var(--color-accent)" strokeDasharray="3 3" label={{ value: "2.6", fontSize: 10 }} />
                <ReferenceLine y={3.2} stroke="var(--color-primary)" strokeDasharray="3 3" label={{ value: "3.2", fontSize: 10 }} />
                <ReferenceLine y={5.1} stroke="var(--color-destructive)" strokeDasharray="3 3" label={{ value: "5.1", fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
