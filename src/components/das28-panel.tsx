import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JointDiagram, type Mode } from "@/components/joint-diagram";
import { DAS28Calculator, type DAS28Snapshot } from "@/components/das28-calculator";
import type { JointState, Patient, DAS28Entry } from "@/lib/types";
import { fullJointLabel } from "@/lib/joints";
import { upsertPatient, uid } from "@/lib/api-store";
import { formatDate } from "@/lib/format";
import { activityLabel } from "@/lib/das28";
import { RotateCcw, Save, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DAS28Panel({ patient }: { patient: Patient }) {
  const [mode, setMode] = useState<Mode>("tender");
  const [states, setStates] = useState<Record<string, JointState>>({});
  const [snap, setSnap] = useState<DAS28Snapshot | null>(null);
  const [saving, setSaving] = useState(false);

  const list = Object.values(states).filter((j) => j.tender || j.swollen || j.note);
  const tjc = list.filter((j) => j.tender).length;
  const sjc = list.filter((j) => j.swollen).length;

  const history = patient.das28History ?? [];

  const save = async () => {
    if (!snap || saving) return;
    setSaving(true);
    const tid = toast.loading("Saving DAS28…");
    try {
      const entry: DAS28Entry = {
        id: uid("das"),
        date: new Date().toISOString(),
        ...snap,
        joints: list,
      };
      await upsertPatient({ ...patient, das28History: [entry, ...history] });
      toast.success("DAS28 saved to patient record", { id: tid });
      setStates({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save DAS28", { id: tid });
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: string) => {
    upsertPatient({ ...patient, das28History: history.filter((e) => e.id !== id) });
  };

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2 p-4">
          <div className="flex gap-2 mb-3">
            <Button size="sm" variant={mode === "tender" ? "default" : "outline"} onClick={() => setMode("tender")}>Tender</Button>
            <Button size="sm" variant={mode === "swollen" ? "default" : "outline"} onClick={() => setMode("swollen")}>Swollen</Button>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setStates({})}><RotateCcw className="h-3 w-3 mr-1" />Reset</Button>
          </div>
          <JointDiagram states={states} mode={mode} onChange={setStates} />
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <Legend color="#E67E22" label="Tender" />
            <Legend color="#2980B9" label="Swollen" />
            <Legend color="#8E44AD" label="Both" />
          </div>
          {list.length > 0 && (
            <div className="mt-3 max-h-32 overflow-auto text-xs space-y-0.5 border-t pt-2">
              {list.map((j) => (
                <div key={j.id} className="flex justify-between">
                  <span>{fullJointLabel(j.id)}</span>
                  <span className="text-muted-foreground">{j.tender && j.swollen ? "Both" : j.tender ? "Tender" : "Swollen"}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="lg:col-span-3 space-y-3">
          <DAS28Calculator initialTjc={tjc} initialSjc={sjc} onChange={setSnap} />
          <Button onClick={save} className="w-full" size="lg" disabled={!snap || (tjc === 0 && sjc === 0) || saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving DAS28…</> : <><Save className="h-4 w-4 mr-2" /> Save to patient record</>}
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">DAS28 history</h3>
        {history.length === 0 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">No saved assessments yet.</div>
        ) : (
          <div className="space-y-2">
            {history.map((e) => {
              const score = e.scoreEsr ?? e.scoreCrp;
              const act = activityLabel(score ?? null);
              return (
                <div key={e.id} className="flex items-center gap-3 border-b last:border-0 py-2 text-sm">
                  <div className="text-xs text-muted-foreground w-24">{formatDate(e.date)}</div>
                  <div className="font-mono text-lg w-16">{score?.toFixed(2) ?? "—"}</div>
                  <div className="text-xs">{act.label}</div>
                  <div className="text-xs text-muted-foreground ml-auto">TJC {e.tjc} · SJC {e.sjc} · {e.marker}</div>
                  <Button size="icon" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ background: color }} />{label}</span>;
}
