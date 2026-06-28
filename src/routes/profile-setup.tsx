import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Stethoscope } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/profile-setup")({
  head: () => ({ meta: [{ title: "Set up your profile — RheumCare" }] }),
  component: ProfileSetup,
});

function ProfileSetup() {
  const { doctor, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(doctor?.name ?? "");
  const [specialty, setSpecialty] = useState(doctor?.specialty ?? "Rheumatology");
  const [clinicName, setClinicName] = useState(doctor?.clinicName ?? "");
  const [phone, setPhone] = useState(doctor?.phone ?? "");
  const [registrationNo, setRegistrationNo] = useState(doctor?.registrationNo ?? "");
  const [address, setAddress] = useState(doctor?.address ?? "");

  useEffect(() => {
    if (!doctor) navigate({ to: "/login" });
    else if (doctor.profileComplete && !window.location.search.includes("edit")) {
      navigate({ to: "/dashboard" });
    }
  }, [doctor, navigate]);

  if (!doctor) return null;

  const isFirstTime = !doctor.profileComplete;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    updateProfile({
      name: name.trim(),
      specialty: specialty.trim() || undefined,
      clinicName: clinicName.trim() || undefined,
      phone: phone.trim() || undefined,
      registrationNo: registrationNo.trim() || undefined,
      address: address.trim() || undefined,
      profileComplete: true,
    });
    toast.success("Profile saved");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-surface px-4 py-10 flex items-start justify-center">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Stethoscope className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">
            {isFirstTime ? "Welcome! Complete your profile" : "Edit your profile"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as <span className="font-mono">{doctor.email}</span>
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={save} className="space-y-4">
            <Field label="Full name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Jane Doe" autoFocus />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Specialty">
                <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
              </Field>
              <Field label="Medical registration no.">
                <Input value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} />
              </Field>
              <Field label="Clinic / hospital name">
                <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
              </Field>
              <Field label="Phone">
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </div>
            <Field label="Clinic address">
              <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>

            <div className="flex gap-2 pt-2">
              {!isFirstTime && (
                <Button type="button" variant="outline" onClick={() => navigate({ to: "/settings" })} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button type="submit" className="flex-1">
                {isFirstTime ? "Continue to dashboard" : "Save changes"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}
