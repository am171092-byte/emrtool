import { useEffect, useState, useSyncExternalStore } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { subscribeSession, isSessionExpired, getPendingWrites } from "@/lib/session";
import { flushPendingWrites } from "@/lib/api-store";

/** Persistent banner shown when the backend ends the session. Never navigates or clears data. */
export function SessionBanner() {
  const { token, signInNewTab } = useAuth();
  const expired = useSyncExternalStore(subscribeSession, isSessionExpired, () => false);
  const [opening, setOpening] = useState(false);

  // When a (new) token is present and writes are queued, flush them.
  useEffect(() => {
    if (!token || expired) return;
    if (getPendingWrites().length === 0) return;
    const id = toast.loading("Saving your pending changes…");
    flushPendingWrites()
      .then((n) => {
        if (getPendingWrites().length === 0) toast.success(n > 0 ? "Saved" : "Up to date", { id });
        else toast.error("Some changes are still pending — will retry", { id });
      })
      .catch(() => toast.error("Could not save pending changes yet", { id }));
  }, [token, expired]);

  if (!expired) return null;

  return (
    <div role="alert" className="fixed top-0 inset-x-0 z-[200] bg-destructive text-destructive-foreground shadow-lg no-print">
      <div className="mx-auto max-w-[1100px] px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium flex-1">
          You've been signed out. Your work is saved on this device. Sign in again to continue.
        </p>
        <Button
          variant="secondary"
          size="sm"
          disabled={opening}
          onClick={async () => {
            setOpening(true);
            try { await signInNewTab(); } catch { toast.error("Could not open sign-in"); }
            finally { setOpening(false); }
          }}
        >
          {opening && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Sign in again
        </Button>
      </div>
    </div>
  );
}
