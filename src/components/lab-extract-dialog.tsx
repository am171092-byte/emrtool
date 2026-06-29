import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, FileText, RotateCw } from "lucide-react";
import { toast } from "sonner";
import type { Patient } from "@/lib/types";
import { uid, addAttachment, upsertPatient } from "@/lib/api-store";
import { getAuthToken } from "@/lib/auth-context";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

interface ExtractedValue {
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: "High" | "Low" | "Normal" | string;
}

interface ExtractResponse {
  patientName?: string;
  reportDate?: string;
  labName?: string;
  notes?: string;
  values: ExtractedValue[];
}

interface Props {
  patient: Patient;
  file: File | null;
  onClose: () => void;
}

function flagBadge(flag?: string) {
  const f = (flag || "").toLowerCase();
  if (f === "high") return <Badge className="bg-destructive/15 text-destructive border-destructive/30 border">High</Badge>;
  if (f === "low") return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 border">Low</Badge>;
  if (f === "normal") return <Badge className="bg-accent/15 text-accent border-accent/30 border">Normal</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Not flagged</Badge>;
}

function statusFromFlag(flag?: string): "Normal" | "Abnormal" | "Critical" {
  const f = (flag || "").toLowerCase();
  if (f === "normal") return "Normal";
  if (f === "high" || f === "low") return "Abnormal";
  return "Normal";
}

async function fileToBase64(file: File): Promise<{ base64: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = String(r.result);
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      resolve({ base64, dataUrl });
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function LabExtractDialog({ patient, file, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractResponse | null>(null);
  const [base64, setBase64] = useState<string>("");
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  const runExtract = async (f: File, b64: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/api/extract-lab-values`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ base64Data: b64, mimeType: f.type, filename: f.name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Extraction failed (${res.status})`);
      }
      const data: ExtractResponse = await res.json();
      const values = Array.isArray(data.values) ? data.values : [];
      setResult({ ...data, values });
      const def: Record<number, boolean> = {};
      values.forEach((_, i) => { def[i] = true; });
      setChecked(def);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setLoading(false);
    }
  };

  // Trigger initial extraction
  if (file && !loading && !result && !error && !base64) {
    fileToBase64(file).then(({ base64: b64 }) => {
      setBase64(b64);
      runExtract(file, b64);
    });
  }

  const reextract = () => {
    if (file && base64) runExtract(file, base64);
  };

  const save = async () => {
    if (!file || !result) return;
    const picks = result.values.filter((_, i) => checked[i]);
    if (picks.length === 0) {
      toast.error("Select at least one value");
      return;
    }
    setSaving(true);
    try {
      // Save original file as attachment
      await addAttachment(patient.id, {
        filename: file.name,
        mimeType: file.type,
        base64Data: base64,
      });
      const reportDateIso = result.reportDate
        ? new Date(result.reportDate).toISOString()
        : new Date().toISOString();
      const newRows = picks.map((v) => ({
        id: uid("inv"),
        date: reportDateIso,
        testName: v.testName,
        result: v.value,
        units: v.unit,
        referenceRange: v.referenceRange,
        status: statusFromFlag(v.flag),
      }));
      await upsertPatient({
        ...patient,
        investigations: [...newRows, ...patient.investigations],
      });
      toast.success(`Saved ${picks.length} lab value${picks.length === 1 ? "" : "s"}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const readability = result?.notes && /unclear|unreadab|blurr|poor quality|illegible/i.test(result.notes);

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Extract lab values</DialogTitle>
          <DialogDescription>
            AI-extracted values. Please verify against the original report.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-3 py-12 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Extracting lab values…
          </div>
        )}

        {error && !loading && (
          <div className="rounded-md bg-destructive/10 border border-destructive/30 p-4 text-sm space-y-2">
            <div className="flex items-start gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>{error}</div>
            </div>
            <Button size="sm" variant="outline" onClick={reextract}><RotateCw className="h-3 w-3 mr-1" /> Try again</Button>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-3">
            <div className="rounded-lg border p-3 text-sm space-y-1">
              {result.patientName && <div><span className="text-muted-foreground">Report for:</span> <span className="font-medium">{result.patientName}</span></div>}
              {result.reportDate && <div><span className="text-muted-foreground">Date:</span> {result.reportDate}</div>}
              {result.labName && <div><span className="text-muted-foreground">Lab:</span> {result.labName}</div>}
            </div>

            {readability && (
              <div className="rounded-md border border-warning/40 bg-warning/10 text-warning-foreground p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-warning" />
                <div>{result.notes}</div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{result.values.length} value{result.values.length === 1 ? "" : "s"} found</div>
              <Button size="sm" variant="outline" onClick={reextract}><RotateCw className="h-3 w-3 mr-1" /> Re-extract</Button>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2 w-8"></th>
                    <th className="text-left p-2">Test</th>
                    <th className="text-left p-2">Value</th>
                    <th className="text-left p-2">Unit</th>
                    <th className="text-left p-2">Reference</th>
                    <th className="text-left p-2">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {result.values.length === 0 && (
                    <tr><td colSpan={6} className="p-4 text-center text-muted-foreground text-xs">No values extracted.</td></tr>
                  )}
                  {result.values.map((v, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2"><Checkbox checked={!!checked[i]} onCheckedChange={(c) => setChecked({ ...checked, [i]: c === true })} /></td>
                      <td className="p-1"><Input className="h-8" value={v.testName} onChange={(e) => { const next = [...result.values]; next[i] = { ...v, testName: e.target.value }; setResult({ ...result, values: next }); }} /></td>
                      <td className="p-1 w-24"><Input className="h-8 font-mono" value={v.value} onChange={(e) => { const next = [...result.values]; next[i] = { ...v, value: e.target.value }; setResult({ ...result, values: next }); }} /></td>
                      <td className="p-1 w-20"><Input className="h-8" value={v.unit ?? ""} onChange={(e) => { const next = [...result.values]; next[i] = { ...v, unit: e.target.value }; setResult({ ...result, values: next }); }} /></td>
                      <td className="p-1 w-28"><Input className="h-8" value={v.referenceRange ?? ""} onChange={(e) => { const next = [...result.values]; next[i] = { ...v, referenceRange: e.target.value }; setResult({ ...result, values: next }); }} /></td>
                      <td className="p-2">{flagBadge(v.flag)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.notes && !readability && (
              <div className="text-xs text-muted-foreground italic">{result.notes}</div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={!result || saving || loading}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : "Save Selected Values"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
