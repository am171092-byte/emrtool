import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/lib/auth-context";
import { InitialsAvatar } from "@/components/initials-avatar";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — RheumCare" }] }),
  component: SettingsPage,
});

const PREF_KEY = "rheumcare_pref_v1";
const THEME_KEY = "rheumcare_theme";

interface Prefs { defaultMarker: "ESR" | "CRP"; reminderDays: number }

function SettingsPage() {
  const { doctor, signOut, updateProfile } = useAuth();
  const nav = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>({ defaultMarker: "ESR", reminderDays: 30 });
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    clinicName: "",
    specialty: "",
    phone: "",
    registrationNo: "",
    address: "",
  });
  const [saving, setSaving] = useState(false);

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

  const openEdit = () => {
    if (!doctor) return;
    setForm({
      name: doctor.name || "",
      clinicName: doctor.clinicName || "",
      specialty: doctor.specialty || "",
      phone: doctor.phone || "",
      registrationNo: doctor.registrationNo || "",
      address: doctor.address || "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ ...form, profileComplete: true });
      toast.success("Profile updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!doctor) return null;

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Profile</h2>
          {!editing && (
            <Button variant="outline" size="sm" onClick={openEdit}>Edit profile</Button>
          )}
        </div>

        {!editing ? (
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
              {(doctor.phone || doctor.registrationNo) && (
                <div className="text-xs text-muted-foreground truncate">
                  {[doctor.phone, doctor.registrationNo && `Reg. ${doctor.registrationNo}`].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block">Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">Clinic Name</Label>
                <Input value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block">Specialty</Label>
                <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label className="mb-1 block">Registration Number</Label>
                <Input value={form.registrationNo} onChange={(e) => setForm({ ...form, registrationNo: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="mb-1 block">Address</Label>
              <Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-1">Google Drive</h2>
        <p className="text-xs text-muted-foreground">
          Connected to <span className="font-mono">{doctor.email}</span> · <span className="font-mono">/RheumClinicRecords/</span>
        </p>
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
        <p className="text-xs text-muted-foreground">RheumCare EMR v1.0 — Your data is stored securely in your Google Drive.</p>
      </Card>

      <Card className="p-5 border-destructive/40">
        <Button variant="destructive" onClick={() => { signOut(); nav({ to: "/login" }); }}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </Card>
    </div>
  );
}
