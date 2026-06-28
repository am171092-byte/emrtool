import { useState } from "react";
import { JOINTS, fullJointLabel, type JointDef } from "@/lib/joints";
import type { JointState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export type Mode = "tender" | "swollen";

interface Props {
  states: Record<string, JointState>;
  mode: Mode;
  onChange: (next: Record<string, JointState>) => void;
}

function stateColor(s: JointState | undefined) {
  const t = s?.tender, sw = s?.swollen;
  if (t && sw) return "#8E44AD";
  if (t) return "#E67E22";
  if (sw) return "#2980B9";
  return undefined;
}

export function JointDiagram({ states, mode, onChange }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    const cur = states[id] ?? { id, tender: false, swollen: false };
    const next: JointState = mode === "tender"
      ? { ...cur, tender: !cur.tender }
      : { ...cur, swollen: !cur.swollen };
    onChange({ ...states, [id]: next });
  };

  const setNote = (id: string, note: string) => {
    const cur = states[id] ?? { id, tender: false, swollen: false };
    onChange({ ...states, [id]: { ...cur, note } });
  };

  return (
    <div className="relative w-full joint-watermark">
      <div className="joint-watermark-bg" />
      <svg viewBox="0 0 400 600" className="w-full h-auto relative z-10" role="img" aria-label="Human body joint diagram with 28 DAS28 hotspots">
        {/* Simplified body silhouette */}
        <g fill="none" stroke="currentColor" strokeWidth="2" className="text-border">
          {/* Head */}
          <ellipse cx="200" cy="60" rx="32" ry="40" />
          {/* Neck + torso */}
          <path d="M185 100 L185 130 L140 150 L130 280 L150 290 L160 420 L240 420 L250 290 L270 280 L260 150 L215 130 L215 100" />
          {/* Arms */}
          <path d="M140 150 L110 240 L95 320 L70 380" />
          <path d="M260 150 L290 240 L305 320 L330 380" />
          {/* Hands */}
          <ellipse cx="70" cy="380" rx="55" ry="35" />
          <ellipse cx="330" cy="380" rx="55" ry="35" />
          {/* Legs */}
          <path d="M170 420 L165 470 L160 580" />
          <path d="M230 420 L235 470 L240 580" />
          {/* Feet */}
          <ellipse cx="160" cy="585" rx="22" ry="10" />
          <ellipse cx="240" cy="585" rx="22" ry="10" />
        </g>

        {/* Joints */}
        {JOINTS.map((j: JointDef) => {
          const s = states[j.id];
          const color = stateColor(s);
          const active = !!color;
          return (
            <Popover key={j.id} open={openId === j.id} onOpenChange={(o) => setOpenId(o ? j.id : null)}>
              <PopoverTrigger asChild>
                <g
                  onClick={() => toggle(j.id)}
                  onContextMenu={(e) => { e.preventDefault(); setOpenId(j.id); }}
                  className="cursor-pointer"
                  tabIndex={0}
                  role="button"
                  aria-label={`${fullJointLabel(j.id)} — ${s?.tender ? "tender, " : ""}${s?.swollen ? "swollen" : ""}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(j.id); }
                  }}
                >
                  <circle
                    cx={j.x}
                    cy={j.y}
                    r={j.r}
                    fill={color ?? "currentColor"}
                    fillOpacity={active ? 0.95 : 0.18}
                    stroke={color ?? "currentColor"}
                    strokeOpacity={active ? 1 : 0.4}
                    strokeWidth={active ? 2 : 1}
                    className={cn("text-muted-foreground transition-all", s?.tender && "[animation:ping_2s_cubic-bezier(0,0,0.2,1)_infinite]")}
                  />
                  {s?.note && (
                    <circle cx={j.x + j.r * 0.7} cy={j.y - j.r * 0.7} r={3} fill="hsl(var(--foreground))" />
                  )}
                </g>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 z-50">
                <div className="text-sm font-semibold mb-2">{fullJointLabel(j.id)}</div>
                <Input
                  defaultValue={s?.note ?? ""}
                  placeholder="Note (e.g. crepitus, ↓ROM)"
                  onBlur={(e) => setNote(j.id, e.target.value)}
                  autoFocus
                />
                <div className="mt-2 flex gap-2 text-xs">
                  <Button size="sm" variant="outline" onClick={() => { toggle(j.id); }}>
                    Toggle {mode}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>Close</Button>
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </svg>
    </div>
  );
}
