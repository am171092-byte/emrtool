import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth-context";
import { hasLocalDrafts, getPendingWrites } from "@/lib/session";

type Mode = null | "device" | "all";

/** Hook + dialog for "Sign out" and "Sign out of all devices". */
export function useSignOut() {
  const { signOut, signOutAllDevices } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);

  const hasUnsaved = () => hasLocalDrafts() || getPendingWrites().length > 0;

  const request = (m: Exclude<Mode, null>) => {
    if (m === "device" && !hasUnsaved()) {
      signOut();
      nav({ to: "/login" });
      return;
    }
    setMode(m);
  };

  const confirm = async () => {
    setBusy(true);
    try {
      if (mode === "all") await signOutAllDevices();
      else signOut();
      setMode(null);
      nav({ to: "/login" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign out failed");
    } finally {
      setBusy(false);
    }
  };

  const unsaved = mode ? hasUnsaved() : false;

  const dialog = (
    <AlertDialog open={mode !== null} onOpenChange={(o) => !o && !busy && setMode(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{mode === "all" ? "Sign out of all devices?" : "Sign out?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {mode === "all" && "You will be signed out on every phone, tablet and computer. "}
            {unsaved && "This device has unsaved drafts or changes that haven't reached the server yet. Signing out will permanently delete them."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => { e.preventDefault(); confirm(); }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "all" ? "Sign out everywhere" : "Sign out"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { request, dialog };
}
