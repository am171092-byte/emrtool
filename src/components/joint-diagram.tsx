import { useRef, useState } from "react";
import { JOINTS, fullJointLabel, type JointDef } from "@/lib/joints";
import type { JointState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { X } from "lucide-react";

// Kept exported for backward compatibility with callers that still import the type.
export type Mode = "tender" | "swollen";

interface Props {
  states: Record<string, JointState>;
  onChange: (next: Record<string, JointState>) => void;
  /** @deprecated no longer used — clicking a joint opens a popover with checkboxes. */
  mode?: Mode;
}

function stateColor(s: JointState | undefined) {
  const t = s?.tender, sw = s?.swollen;
  if (t && sw) return "#8E44AD";
  if (t) return "#E67E22";
  if (sw) return "#2980B9";
  return undefined;
}

const VB_W = 400;
const VB_H = 600;

export function JointDiagram({ states, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const updateJoint = (id: string, patch: Partial<JointState>) => {
    const cur = states[id] ?? { id, tender: false, swollen: false };
    onChange({ ...states, [id]: { ...cur, ...patch } });
  };

  const handleClick = (id: string) => {
    setSelectedId(id);
  };

  const selected = selectedId ? JOINTS.find((j) => j.id === selectedId) ?? null : null;
  const selectedState = selectedId ? states[selectedId] : undefined;

  // Compute popover anchor in container px from joint SVG coords
  const anchor = (() => {
    if (!selected || !containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = rect.width / VB_W;
    const scaleY = rect.height / VB_H;
    const px = selected.x * scaleX;
    const py = selected.y * scaleY;
    const popW = 240;
    const popH = 210;
    const margin = 8;
    let left = px + 16;
    if (left + popW + margin > rect.width) left = px - popW - 16;
    if (left < margin) left = margin;
    let top = py - popH / 2;
    if (top < margin) top = margin;
    if (top + popH + margin > rect.height) top = rect.height - popH - margin;
    return { left, top, width: popW };
  })();

  const renderControls = (jointId: string, state: JointState | undefined) => (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <Checkbox
            checked={!!state?.tender}
            onCheckedChange={(v) => updateJoint(jointId, { tender: !!v })}
          />
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#E67E22" }} />
            Tender
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <Checkbox
            checked={!!state?.swollen}
            onCheckedChange={(v) => updateJoint(jointId, { swollen: !!v })}
          />
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#2980B9" }} />
            Swollen
          </span>
        </label>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</Label>
        <Input
          key={jointId}
          defaultValue={state?.note ?? ""}
          placeholder="e.g. crepitus, ↓ROM"
          onBlur={(e) => updateJoint(jointId, { note: e.target.value })}
        />
      </div>
      <Button size="sm" className="w-full" onClick={() => setSelectedId(null)}>
        Done
      </Button>
    </div>
  );

  return (
    <div ref={containerRef} className="relative w-full joint-watermark">
      <div className="joint-watermark-bg" />
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto relative z-10"
        role="img"
        aria-label="Human body joint diagram with 28 DAS28 hotspots"
      >
        <g fill="none" stroke="currentColor" strokeWidth="2" className="text-border">
          <ellipse cx="200" cy="60" rx="32" ry="40" />
          <path d="M185 100 L185 130 L140 150 L130 280 L150 290 L160 420 L240 420 L250 290 L270 280 L260 150 L215 130 L215 100" />
          <path d="M140 150 L110 240 L95 320 L70 380" />
          <path d="M260 150 L290 240 L305 320 L330 380" />
          <ellipse cx="70" cy="380" rx="55" ry="35" />
          <ellipse cx="330" cy="380" rx="55" ry="35" />
          <path d="M170 420 L165 470 L160 580" />
          <path d="M230 420 L235 470 L240 580" />
          <ellipse cx="160" cy="585" rx="22" ry="10" />
          <ellipse cx="240" cy="585" rx="22" ry="10" />
        </g>

        {JOINTS.map((j: JointDef) => {
          const s = states[j.id];
          const color = stateColor(s);
          const active = !!color;
          return (
            <g
              key={j.id}
              onClick={(e) => { e.stopPropagation(); handleClick(j.id); }}
              className="cursor-pointer"
              tabIndex={0}
              role="button"
              aria-label={`${fullJointLabel(j.id)} — ${s?.tender ? "tender, " : ""}${s?.swollen ? "swollen" : ""}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(j.id); }
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
                strokeWidth={selectedId === j.id ? 3 : active ? 2 : 1}
                className={cn("text-muted-foreground transition-colors")}
              />
              {s?.note && (
                <circle cx={j.x + j.r * 0.7} cy={j.y - j.r * 0.7} r={3} fill="hsl(var(--foreground))" />
              )}
            </g>
          );
        })}
      </svg>

      {/* Desktop / tablet: fixed-position popover anchored near joint */}
      {!isMobile && selected && anchor && (
        <div
          className="absolute z-20 rounded-md border bg-popover text-popover-foreground shadow-lg p-3"
          style={{ left: anchor.left, top: anchor.top, width: anchor.width }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">{fullJointLabel(selected.id)}</div>
            <button
              onClick={() => setSelectedId(null)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {renderControls(selected.id, selectedState)}
        </div>
      )}

      {/* Mobile: bottom sheet */}
      {isMobile && (
        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
          <SheetContent side="bottom" className="rounded-t-xl">
            {selected && (
              <>
                <SheetHeader>
                  <SheetTitle>{fullJointLabel(selected.id)}</SheetTitle>
                </SheetHeader>
                <div className="mt-3">{renderControls(selected.id, selectedState)}</div>
              </>
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
