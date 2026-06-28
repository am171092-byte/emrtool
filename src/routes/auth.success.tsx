import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Stethoscope, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/success")({
  component: AuthSuccess,
});

function AuthSuccess() {
  const { doctor, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (doctor) {
      navigate({ to: doctor.profileComplete ? "/dashboard" : "/profile-setup" });
    } else {
      navigate({ to: "/login" });
    }
  }, [doctor, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm bg-card rounded-xl shadow-sm border p-8 text-center">
        <div className="mx-auto h-14 w-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
          <Stethoscope className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-xl font-semibold">Signing you in…</h1>
        <Loader2 className="mt-4 mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}
