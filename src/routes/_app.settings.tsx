import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/auth-context";
import { InitialsAvatar } from "@/components/initials-avatar";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — RheumCare" }] }),
  component: SettingsPage,
});

const PREF_KEY = "rheumcare_pref_v1";
const THEME_KEY = "rheumcare_theme";

interface Prefs { defaultMarker: "ESR" | "CRP"; reminderDays: number }

function SettingsPage() {
  const { doctor, signOut } = useAuth();
  const nav = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>({ defaultMarker: "ESR", reminderDays: 30 });
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) setPrefs(JSON.parse(raw));
      const t = localStorage.getItem(THEME_KEY) as "light" | "dark" | "system" | null;
      if (t) setTheme(t);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    const root = document.documentElement;
    const effective = theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
    root.classList.toggle("dark", effective === "dark");
  }, [theme]);

  const save = (next: Prefs) => { setPrefs(next); localStorage.setItem(PREF_KEY, JSON.stringify(next)); };

  if (!doctor) return null;

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Profile</h2>
          <Button variant="outline" size="sm" onClick={() => nav({ to: "/profile-setup" })}>Edit profile</Button>
        </div>
        <div className="flex items-center gap-3">
          <InitialsAvatar name={doctor.name || doctor.email} size={56} />
          <div className="min-w-0">
            <div className="font-medium truncate">{doctor.name || "Unnamed clinician"}</div>
            <div className="text-xs text-muted-foreground truncate">{doctor.email}</div>
            {(doctor.specialty || doctor.clinicName) && (
              <div className="text-xs text-muted-foreground truncate">
                {[doctor.specialty, doctor.clinicName].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        </div>
      </Card>


      <Card className="p-5">
        <h2 className="font-semibold mb-1">Google Drive</h2>
        <p className="text-xs text-muted-foreground mb-3">Connected to <span className="font-mono">{doctor.email}</span>. Records would live in <span className="font-mono">/RheumClinicRecords</span> in your Drive.</p>
        <Button variant="outline" size="sm" disabled>Reconnect Drive (demo)</Button>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">App preferences</h2>
        <div>
          <Label className="mb-2 block">Default inflammatory marker for DAS28</Label>
          <RadioGroup value={prefs.defaultMarker} onValueChange={(v) => save({ ...prefs, defaultMarker: v as "ESR" | "CRP" })} className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="ESR" />ESR</label>
            <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="CRP" />CRP</label>
          </RadioGroup>
        </div>
        <div>
          <Label className="mb-2 block">Theme</Label>
          <div className="grid grid-cols-3 gap-1 rounded-md border p-1 max-w-xs">
            {(["light", "dark", "system"] as const).map((t) => (
              <button key={t} onClick={() => setTheme(t)} className={`text-sm py-1.5 rounded capitalize ${theme === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{t}</button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-1">About</h2>
        <p className="text-xs text-muted-foreground">RheumCare EMR v1.0 — demo build. Data lives in this browser only.</p>
      </Card>

      <Card className="p-5 border-destructive/40">
        <Button variant="destructive" onClick={() => { signOut(); nav({ to: "/login" }); }}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </Card>
    </div>
  );
}
