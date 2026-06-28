import { useRef, useState } from "react";
import { JOINTS, fullJointLabel, type JointDef } from "@/lib/joints";
import type { JointState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { X } from "lucide-react";

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

const VB_W = 400;
const VB_H = 600;

export function JointDiagram({ states, mode, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const applyToggle = (id: string, which: Mode) => {
    const cur = states[id] ?? { id, tender: false, swollen: false };
    const next: JointState = which === "tender"
      ? { ...cur, tender: !cur.tender }
      : { ...cur, swollen: !cur.swollen };
    onChange({ ...states, [id]: next });
  };

  const handleClick = (id: string) => {
    applyToggle(id, mode);
    setSelectedId(id);
  };

  const setNote = (id: string, note: string) => {
    const cur = states[id] ?? { id, tender: false, swollen: false };
    onChange({ ...states, [id]: { ...cur, note } });
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
    // Position popover: prefer right of joint, flip to left if near right edge.
    const popW = 240;
    const popH = 170;
    const margin = 8;
    let left = px + 16;
    if (left + popW + margin > rect.width) left = px - popW - 16;
    if (left < margin) left = margin;
    let top = py - popH / 2;
    if (top < margin) top = margin;
    if (top + popH + margin > rect.height) top = rect.height - popH - margin;
    return { left, top, width: popW };
  })();

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
          <Input
            key={selected.id}
            defaultValue={selectedState?.note ?? ""}
            placeholder="Note (e.g. crepitus, ↓ROM)"
            onBlur={(e) => setNote(selected.id, e.target.value)}
            autoFocus
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={selectedState?.tender ? "default" : "outline"}
              onClick={() => applyToggle(selected.id, "tender")}
            >
              {selectedState?.tender ? "✓ " : ""}Tender
            </Button>
            <Button
              size="sm"
              variant={selectedState?.swollen ? "default" : "outline"}
              onClick={() => applyToggle(selected.id, "swollen")}
            >
              {selectedState?.swollen ? "✓ " : ""}Swollen
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="w-full mt-2" onClick={() => setSelectedId(null)}>
            Close
          </Button>
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
                <div className="mt-3 space-y-3">
                  <Input
                    key={selected.id}
                    defaultValue={selectedState?.note ?? ""}
                    placeholder="Note (e.g. crepitus, ↓ROM)"
                    onBlur={(e) => setNote(selected.id, e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={selectedState?.tender ? "default" : "outline"}
                      onClick={() => applyToggle(selected.id, "tender")}
                    >
                      {selectedState?.tender ? "✓ " : ""}Tender
                    </Button>
                    <Button
                      variant={selectedState?.swollen ? "default" : "outline"}
                      onClick={() => applyToggle(selected.id, "swollen")}
                    >
                      {selectedState?.swollen ? "✓ " : ""}Swollen
                    </Button>
                  </div>
                  <Button variant="ghost" className="w-full" onClick={() => setSelectedId(null)}>
                    Close
                  </Button>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
