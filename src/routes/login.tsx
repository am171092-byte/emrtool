import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — RheumCare" }] }),
  component: Login,
});

function Login() {
  const { doctor, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (doctor) navigate({ to: doctor.profileComplete ? "/dashboard" : "/profile-setup" });
  }, [doctor, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm bg-card rounded-xl shadow-sm border p-8 text-center">
        <div className="mx-auto h-14 w-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
          <Stethoscope className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold">RheumCare</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your clinic. Your data. Your Drive.</p>

        <Button
          onClick={() => { signIn(); }}
          className="mt-6 w-full bg-foreground text-background hover:bg-foreground/90"
          size="lg"
        >
          <GoogleIcon className="h-4 w-4 mr-2" />
          Sign in with Google
        </Button>


        <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
          Your patient records are stored exclusively in your private Google Drive. Nobody else can access them.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.5 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.92a5.07 5.07 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.22-4.75 3.22-8.12z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.26 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
