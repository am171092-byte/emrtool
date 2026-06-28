import { useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Send, FileText, Pill, BookOpen, ShieldCheck, GitBranch, Users } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { aiAssist, type AITask, deidentify } from "@/lib/ai-mock";
import type { Patient } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChatMsg { role: "user" | "assistant"; content: string }

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  patient?: Patient;
}

const QUICK_ACTIONS: { task: AITask; label: string; icon: ReactNode; build?: (p?: Patient) => Record<string, unknown> }[] = [
  { task: "soap_generation", label: "Generate SOAP", icon: <FileText className="h-4 w-4" />, build: (p) => ({ chiefComplaint: "Joint pain", patient: p?.fullName }) },
  { task: "drug_info", label: "Drug info", icon: <Pill className="h-4 w-4" /> },
  { task: "guideline_summary", label: "Guideline", icon: <BookOpen className="h-4 w-4" /> },
  { task: "safety_check", label: "Safety check", icon: <ShieldCheck className="h-4 w-4" />, build: (p) => ({ medications: (p?.medications ?? []).map((m) => m.drug), allergies: p?.allergies ?? [], comorbidities: p?.comorbidities ?? [] }) },
  { task: "differential", label: "Differential", icon: <GitBranch className="h-4 w-4" /> },
  { task: "similar_cases", label: "Similar cases", icon: <Users className="h-4 w-4" /> },
];

export function AIDrawer({ open, onOpenChange, patient }: Props) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [deident, setDeident] = useState(true);
  const [activeTask, setActiveTask] = useState<AITask | null>(null);
  const [taskInput, setTaskInput] = useState("");

  const runTask = async (task: AITask, extra: Record<string, unknown> = {}) => {
    setLoading(true);
    setActiveTask(task);
    try {
      const payload = { ...extra };
      const resp = await aiAssist(task, payload);
      const out = deident && patient ? deidentify(resp, patient.fullName) : resp;
      setMsgs((m) => [...m, { role: "assistant", content: out }]);
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user" as const, content: input };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const resp = await aiAssist("chat", { messages: next });
      setMsgs((m) => [...m, { role: "assistant", content: resp }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-accent" />
            AI Assistant
            <Badge variant="outline" className="ml-auto text-[10px]">Mock · Gemini</Badge>
          </SheetTitle>
          <p className="text-xs text-muted-foreground">Patient data is de-identified before any AI request.</p>
        </SheetHeader>

        <div className="px-4 py-3 border-b space-y-2">
          {patient && (
            <Badge variant="secondary" className="text-xs">Context: {deident ? "[PATIENT]" : patient.fullName}</Badge>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">De-identify patient data</span>
            <Switch checked={deident} onCheckedChange={setDeident} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 border-b">
          {QUICK_ACTIONS.map((q) => (
            <Button
              key={q.task}
              variant="outline"
              size="sm"
              className="justify-start text-xs h-auto py-2"
              disabled={loading}
              onClick={() => {
                if (q.task === "drug_info" || q.task === "guideline_summary" || q.task === "differential") {
                  setActiveTask(q.task);
                  setTaskInput("");
                } else {
                  void runTask(q.task, q.build?.(patient) ?? {});
                }
              }}
            >
              {q.icon}
              <span className="ml-1.5">{q.label}</span>
            </Button>
          ))}
        </div>

        {activeTask && (activeTask === "drug_info" || activeTask === "guideline_summary" || activeTask === "differential") && (
          <div className="px-3 py-2 border-b flex gap-2">
            <Input
              placeholder={activeTask === "drug_info" ? "Drug name…" : activeTask === "guideline_summary" ? "Topic (e.g. RA, SLE, gout)" : "Clinical summary…"}
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && taskInput.trim()) {
                  const payload = activeTask === "drug_info" ? { drug_name: taskInput } : activeTask === "guideline_summary" ? { topic: taskInput } : { clinical_summary: taskInput };
                  void runTask(activeTask, payload);
                  setTaskInput("");
                  setActiveTask(null);
                }
              }}
              autoFocus
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {msgs.length === 0 && (
            <div className="text-center text-sm text-muted-foreground mt-8">
              Tap a quick action above or type a question below.
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "user" ? (
                <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[85%] text-sm">
                  {m.content}
                </div>
              ) : (
                <Card className="p-3 max-w-[90%] text-sm border-l-4 border-l-accent prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </Card>
              )}
            </div>
          ))}
          {loading && (
            <div className="text-xs text-muted-foreground animate-pulse">Thinking…</div>
          )}
        </div>

        <div className="border-t p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void sendChat(); }}
              placeholder="Ask the assistant…"
              disabled={loading}
            />
            <Button onClick={() => void sendChat()} disabled={loading || !input.trim()} size="icon" aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            AI responses are for informational support only. Always apply clinical judgment. Patient data is de-identified before transmission.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
