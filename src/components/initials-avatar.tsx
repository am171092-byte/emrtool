import { initials, colorFromName } from "@/lib/format";
import { cn } from "@/lib/utils";

export function InitialsAvatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  return (
    <div
      className={cn("flex items-center justify-center rounded-full font-semibold text-white shrink-0", className)}
      style={{ width: size, height: size, background: colorFromName(name), fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
