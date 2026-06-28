import { createFileRoute } from "@tanstack/react-router";
import { DAS28Calculator } from "@/components/das28-calculator";

export const Route = createFileRoute("/_app/das28")({
  head: () => ({ meta: [{ title: "DAS28 Calculator — RheumCare" }] }),
  component: () => (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">DAS28 Calculator</h1>
        <p className="text-sm text-muted-foreground">Quick standalone calculator. Open a patient to save the result to a visit.</p>
      </div>
      <DAS28Calculator />
    </div>
  ),
});
