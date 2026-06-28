import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Users, Plus, CalendarDays, Sparkles, Search, Settings, LogOut, Stethoscope } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAllPatients } from "@/lib/use-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InitialsAvatar } from "@/components/initials-avatar";
import { AIDrawer } from "@/components/ai-drawer";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Home, mobile: true, mobileLabel: "Home" },
  { to: "/patients", label: "Patients", icon: Users, mobile: true, mobileLabel: "Patients" },
  { to: "/patients/new", label: "New Patient", icon: Plus, mobile: true, mobileLabel: "New" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, mobile: true, mobileLabel: "Calendar" },
  { to: "/ai-assistant", label: "AI Assistant", icon: Sparkles, mobile: true, mobileLabel: "AI" },
] as const;

export function AppShell() {
  const navigate = useNavigate();
  const { doctor, loading, signOut } = useAuth();
  const patients = useAllPatients();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [cmdOpen, setCmdOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  // Redirect to login if not authenticated; to profile setup if first-time user
  useEffect(() => {
    if (loading) return;
    if (!doctor) navigate({ to: "/login" });
    else if (!doctor.profileComplete) navigate({ to: "/profile-setup" });
  }, [doctor, loading, navigate]);


  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!doctor) return null;

  return (
    <div className="min-h-screen w-full flex bg-surface text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[260px] shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Stethoscope className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold leading-tight">RheumCare</div>
            <div className="text-[10px] uppercase tracking-wider opacity-70">EMR</div>
          </div>
        </div>

        <div className="p-3 border-b border-sidebar-border">
          <button
            onClick={() => setCmdOpen(true)}
            className="w-full flex items-center gap-2 rounded-md bg-sidebar-accent/60 hover:bg-sidebar-accent text-sm px-3 py-2 text-sidebar-foreground/90"
          >
            <Search className="h-4 w-4" />
            <span>Search patients…</span>
            <kbd className="ml-auto text-[10px] opacity-70 font-mono">⌘K</kbd>
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map((n) => {
            const active = path === n.to || path.startsWith(n.to + "/");
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  active ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-2">
          <Link to="/settings" className="flex items-center gap-2 text-xs text-sidebar-foreground/80 hover:text-sidebar-foreground">
            <Settings className="h-3.5 w-3.5" /> Settings
          </Link>
          <div className="flex items-center gap-2">
            <InitialsAvatar name={doctor.name} size={32} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{doctor.name}</div>
              <div className="text-[10px] opacity-70 truncate">{doctor.email}</div>
            </div>
            <button onClick={() => { signOut(); navigate({ to: "/login" }); }} className="opacity-70 hover:opacity-100" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-sidebar text-sidebar-foreground flex items-center justify-between px-4 py-3 border-b border-sidebar-border no-print">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          <span className="font-semibold">RheumCare</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCmdOpen(true)} className="text-sidebar-foreground">
          <Search className="h-5 w-5" />
        </Button>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="mx-auto max-w-[1100px] px-4 md:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t flex items-center justify-around no-print">
        {NAV.filter((n) => n.mobile).map((n) => {
          const active = path === n.to || path.startsWith(n.to + "/");
          const Icon = n.icon;
          return (
            <Link key={n.to} to={n.to} className={cn("flex flex-col items-center justify-center flex-1 py-2 text-[10px] gap-0.5", active ? "text-primary" : "text-muted-foreground")}>
              <Icon className="h-5 w-5" />
              {n.mobileLabel}
            </Link>
          );
        })}
      </nav>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Search by name, phone, diagnosis…" />
        <CommandList>
          <CommandEmpty>No patients found.</CommandEmpty>
          <CommandGroup heading="Patients">
            {patients.slice(0, 20).map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.fullName} ${p.phone} ${p.primaryDiagnosis ?? ""}`}
                onSelect={() => {
                  setCmdOpen(false);
                  navigate({ to: "/patients/$patientId", params: { patientId: p.id } });
                }}
              >
                <InitialsAvatar name={p.fullName} size={24} />
                <span className="ml-2">{p.fullName}</span>
                <span className="ml-auto text-xs text-muted-foreground">{p.primaryDiagnosis ?? ""}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <AIDrawer open={aiOpen} onOpenChange={setAiOpen} />
      {/* Floating AI button on desktop */}
      <Button
        onClick={() => setAiOpen(true)}
        className="hidden md:flex fixed bottom-6 right-6 z-30 rounded-full h-12 w-12 shadow-lg bg-accent hover:bg-accent/90 text-accent-foreground"
        size="icon"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-5 w-5" />
      </Button>
    </div>
  );
}

// helper for use in input (autofocus); avoids unused import warning
void Input;
