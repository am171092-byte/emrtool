import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  tone?: "danger" | "primary" | "muted";
  className?: string;
}

export function TagInput({ value, onChange, placeholder, tone = "muted", className }: Props) {
  const [draft, setDraft] = useState("");

  const toneClass = {
    danger: "bg-destructive/10 text-destructive border-destructive/30",
    primary: "bg-primary/10 text-primary border-primary/30",
    muted: "bg-muted text-foreground border-border",
  }[tone];

  const add = (v: string) => {
    const t = v.trim();
    if (!t) return;
    if (value.includes(t)) return;
    onChange([...value, t]);
    setDraft("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-1.5 rounded-md border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring/40", className)}>
      {value.map((t) => (
        <span key={t} className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", toneClass)}>
          {t}
          <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="opacity-70 hover:opacity-100" aria-label={`Remove ${t}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => add(draft)}
        placeholder={value.length ? "" : placeholder}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
