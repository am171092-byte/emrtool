import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JointDiagram, type Mode } from "@/components/joint-diagram";
import type { JointState } from "@/lib/types";
import { fullJointLabel } from "@/lib/joints";
import { usePatient } from "@/lib/use-store";
import { RotateCcw, Calculator, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/patients/$patientId/joint-map")({
  head: () => ({ meta: [{ title: "Joint map — RheumCare" }] }),
  component: JointMapPage,
});

function JointMapPage() {
  const { patientId } = Route.useParams();
  const p = usePatient(patientId);
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("tender");
  const [states, setStates] = useState<Record<string, JointState>>({});

  const list = Object.values(states).filter((j) => j.tender || j.swollen || j.note);
  const tjc = list.filter((j) => j.tender).length;
  const sjc = list.filter((j) => j.swollen).length;

  if (!p) return <div className="flex items-center justify-center h-full py-16"><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-2 text-sm text-muted-foreground">Loading patient...</span></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Joint map — {p.fullName}</h1>
        <p className="text-sm text-muted-foreground">28 DAS28 joints. Tap to mark.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3 p-4">
          <div className="flex gap-2 mb-3">
            <Button variant={mode === "tender" ? "default" : "outline"} onClick={() => setMode("tender")}>Tender</Button>
            <Button variant={mode === "swollen" ? "default" : "outline"} onClick={() => setMode("swollen")}>Swollen</Button>
          </div>
          <JointDiagram states={states} mode={mode} onChange={setStates} />
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <Legend color="#E67E22" label="Tender" />
            <Legend color="#2980B9" label="Swollen" />
            <Legend color="#8E44AD" label="Both" />
          </div>
        </Card>

        <Card className="lg:col-span-2 p-5 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Tender (TJC)</div>
            <div className="font-mono text-4xl">{tjc}<span className="text-muted-foreground text-lg">/28</span></div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Swollen (SJC)</div>
            <div className="font-mono text-4xl">{sjc}<span className="text-muted-foreground text-lg">/28</span></div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Affected joints</div>
            <div className="space-y-1 max-h-64 overflow-auto text-sm">
              {list.length === 0 && <div className="text-xs text-muted-foreground">None marked.</div>}
              {list.map((j) => (
                <div key={j.id} className="flex justify-between border-b py-1">
                  <span>{fullJointLabel(j.id)}</span>
                  <span className="text-xs text-muted-foreground">{j.tender && j.swollen ? "Both" : j.tender ? "Tender" : "Swollen"}{j.note ? ` · ${j.note}` : ""}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { if (confirm("Reset all?")) setStates({}); }} className="flex-1"><RotateCcw className="h-4 w-4 mr-1" />Reset</Button>
            <Button size="sm" onClick={() => nav({ to: "/patients/$patientId/das28", params: { patientId }, search: { tjc, sjc } as never })} className="flex-1">
              <Calculator className="h-4 w-4 mr-1" />Send to DAS28
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ background: color }} />{label}</span>;
}
