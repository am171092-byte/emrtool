import { useMemo, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Copy, Save, RotateCcw } from "lucide-react";
import { das28Esr, das28Crp, activityLabel } from "@/lib/das28";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface DAS28Snapshot {
  tjc: number;
  sjc: number;
  marker: "ESR" | "CRP";
  esr?: number;
  crp?: number;
  gh: number;
  scoreEsr?: number;
  scoreCrp?: number;
  activity?: string;
}

export function DAS28Calculator({
  initialTjc = 0,
  initialSjc = 0,
  initialMarker = "ESR",
  onChange,
  onSave,
}: {
  initialTjc?: number;
  initialSjc?: number;
  initialMarker?: "ESR" | "CRP";
  onChange?: (snap: DAS28Snapshot) => void;
  /** When provided, the calculator does NOT auto-emit changes; user must click "Save DAS28". */
  onSave?: (snap: DAS28Snapshot | null) => void;
}) {
  const [tjc, setTjc] = useState(initialTjc);
  const [sjc, setSjc] = useState(initialSjc);
  const [marker, setMarker] = useState<"ESR" | "CRP">(initialMarker);
  const [esr, setEsr] = useState<number | "">(20);
  const [crp, setCrp] = useState<number | "">(5);
  const [gh, setGh] = useState(30);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => { setTjc(initialTjc); }, [initialTjc]);
  useEffect(() => { setSjc(initialSjc); }, [initialSjc]);

  const scoreEsr = useMemo(() => das28Esr({ tjc, sjc, esr: typeof esr === "number" ? esr : undefined, gh }), [tjc, sjc, esr, gh]);
  const scoreCrp = useMemo(() => das28Crp({ tjc, sjc, crp: typeof crp === "number" ? crp : undefined, gh }), [tjc, sjc, crp, gh]);

  const primary = marker === "ESR" ? scoreEsr : scoreCrp;
  const activity = activityLabel(primary);

  const buildSnap = (): DAS28Snapshot => ({
    tjc, sjc, marker,
    esr: typeof esr === "number" ? esr : undefined,
    crp: typeof crp === "number" ? crp : undefined,
    gh,
    scoreEsr: scoreEsr ?? undefined,
    scoreCrp: scoreCrp ?? undefined,
    activity: activity.label,
  });

  // Legacy behavior: auto-emit changes. Disabled when onSave is provided.
  useEffect(() => {
    if (onSave) return;
    onChange?.(buildSnap());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tjc, sjc, marker, esr, crp, gh, scoreEsr, scoreCrp, activity.label]);

  // Mark snapshot as dirty when inputs change after a save.
  useEffect(() => { setSavedAt(null); }, [tjc, sjc, marker, esr, crp, gh]);

  const handleSave = () => {
    const snap = buildSnap();
    onSave?.(snap);
    setSavedAt(Date.now());
    toast.success("DAS28 saved (will be stored with the visit)");
  };
  const handleReset = () => {
    setTjc(initialTjc); setSjc(initialSjc); setMarker(initialMarker);
    setEsr(20); setCrp(5); setGh(30);
    onSave?.(null);
    setSavedAt(null);
  };


  const toneBg = {
    accent: "bg-accent text-accent-foreground",
    primary: "bg-primary text-primary-foreground",
    warning: "bg-warning text-warning-foreground",
    destructive: "bg-destructive text-destructive-foreground",
    muted: "bg-muted text-foreground",
  }[activity.tone];

  const copy = () => {
    const txt = `DAS28 Assessment — ${new Date().toLocaleDateString()}
Tender Joints: ${tjc}/28
Swollen Joints: ${sjc}/28
ESR: ${typeof esr === "number" ? esr + " mm/hr" : "—"}
CRP: ${typeof crp === "number" ? crp + " mg/L" : "—"}
Patient Global Health: ${gh}/100
DAS28-ESR: ${scoreEsr?.toFixed(2) ?? "—"} → ${activityLabel(scoreEsr).label}
DAS28-CRP: ${scoreCrp?.toFixed(2) ?? "—"} → ${activityLabel(scoreCrp).label}`;
    navigator.clipboard.writeText(txt);
    toast.success("DAS28 summary copied");
  };

  return (
    <Card className="p-6 space-y-6 joint-watermark relative overflow-hidden">
      <div className="joint-watermark-bg" />
      <div className="relative z-10 grid gap-6 md:grid-cols-2">
        <div className="space-y-5">
          <Stepper label="Tender joints (TJC)" value={tjc} onChange={setTjc} max={28} />
          <Stepper label="Swollen joints (SJC)" value={sjc} onChange={setSjc} max={28} />

          <div>
            <Label className="mb-2 block">Inflammatory marker</Label>
            <RadioGroup value={marker} onValueChange={(v) => setMarker(v as "ESR" | "CRP")} className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="ESR" /> ESR (mm/hr)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value="CRP" /> CRP (mg/L)
              </label>
            </RadioGroup>
            <Input
              type="number"
              className="mt-3 font-mono"
              value={marker === "ESR" ? esr : crp}
              onChange={(e) => {
                const v = e.target.value === "" ? "" : Number(e.target.value);
                if (marker === "ESR") setEsr(v as number | "");
                else setCrp(v as number | "");
              }}
              min={0}
            />
          </div>

          <div>
            <Label className="mb-2 block">Patient Global Health (VAS 0–100)</Label>
            <div className="flex items-center gap-3">
              <Slider value={[gh]} max={100} step={1} onValueChange={(v) => setGh(v[0])} className="flex-1" />
              <Input
                type="number"
                value={gh}
                onChange={(e) => setGh(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="w-20 font-mono text-center"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0 — Very well</span>
              <span>100 — Very poor</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">DAS28-{marker}</div>
            <div className="font-mono text-6xl font-bold mt-1 tabular-nums">
              {primary != null ? primary.toFixed(2) : "—"}
            </div>
            <Badge className={cn("mt-2 text-sm px-3 py-1", toneBg)}>{activity.label}</Badge>
          </div>

          <ScoreBar score={primary} />

          <div className="rounded-md border bg-background/60 p-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">DAS28-ESR</span><span className="font-mono">{scoreEsr?.toFixed(2) ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">DAS28-CRP</span><span className="font-mono">{scoreCrp?.toFixed(2) ?? "—"}</span></div>
          </div>

          {onSave && (
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" onClick={handleSave} className="w-full" size="sm">
                  <Save className="h-4 w-4 mr-2" /> Save DAS28
                </Button>
                <Button type="button" onClick={handleReset} variant="outline" className="w-full" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset
                </Button>
              </div>
              {savedAt && <div className="text-[11px] text-accent text-center">Saved — included on next visit save.</div>}
            </div>
          )}

          <Button type="button" onClick={copy} variant="outline" className="w-full" size="sm">
            <Copy className="h-4 w-4 mr-2" /> Copy summary
          </Button>


          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">How is this calculated?</summary>
            <div className="mt-2 font-mono text-[11px] space-y-1">
              <div>DAS28-ESR = 0.56·√TJC + 0.28·√SJC + 0.70·ln(ESR) + 0.014·GH</div>
              <div>DAS28-CRP = 0.56·√TJC + 0.28·√SJC + 0.36·ln(CRP+1) + 0.014·GH + 0.96</div>
            </div>
          </details>
        </div>
      </div>
    </Card>
  );
}

function Stepper({ label, value, onChange, max }: { label: string; value: number; onChange: (n: number) => void; max: number }) {
  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" variant="outline" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Decrement ${label}`}>
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
          className="text-center font-mono text-lg w-20"
          min={0}
          max={max}
        />
        <Button type="button" size="icon" variant="outline" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Increment ${label}`}>
          <Plus className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">/ {max}</span>
      </div>
    </div>
  );
}

function ScoreBar({ score }: { score: number | null }) {
  // 0..8 with zones
  const pct = score != null ? Math.min(100, Math.max(0, (score / 8) * 100)) : 0;
  return (
    <div className="relative h-3 rounded-full bg-muted overflow-hidden">
      <div className="absolute inset-0 flex">
        <div style={{ width: `${(2.6 / 8) * 100}%` }} className="bg-accent/60" />
        <div style={{ width: `${((3.2 - 2.6) / 8) * 100}%` }} className="bg-primary/50" />
        <div style={{ width: `${((5.1 - 3.2) / 8) * 100}%` }} className="bg-warning/60" />
        <div style={{ width: `${((8 - 5.1) / 8) * 100}%` }} className="bg-destructive/60" />
      </div>
      {score != null && (
        <div className="absolute top-1/2 -translate-y-1/2 h-5 w-1.5 bg-foreground rounded-full transition-all" style={{ left: `calc(${pct}% - 3px)` }} />
      )}
    </div>
  );
}
