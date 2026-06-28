import { createFileRoute } from "@tanstack/react-router";
import { AIDrawer } from "@/components/ai-drawer";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/ai-assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — RheumCare" }] }),
  component: AIPage,
});

function AIPage() {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">AI Assistant</h1>
      <Card className="p-8 text-center space-y-3">
        <Sparkles className="h-10 w-10 mx-auto text-accent" />
        <p className="text-sm text-muted-foreground max-w-md mx-auto">Quick clinical guidance, SOAP drafting, drug info, safety checks, and a free chat. Patient context is de-identified before any AI request.</p>
        <Button onClick={() => setOpen(true)}>Open assistant</Button>
      </Card>
      <AIDrawer open={open} onOpenChange={setOpen} />
    </div>
  );
}
