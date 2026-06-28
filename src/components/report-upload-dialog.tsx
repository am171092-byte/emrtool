import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2, FileText, Trash2 } from "lucide-react";
import type { Patient, Investigation } from "@/lib/types";
import { uid, addAttachment, upsertPatient } from "@/lib/api-store";
import { extractReport, type ExtractedReport } from "@/lib/report-extract";
import { toast } from "sonner";

interface Props {
  patient: Patient;
  file: File | null;
  onClose: () => void;
}

function nameSimilarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/).filter(Boolean);
  const A = new Set(norm(a));
  const B = norm(b);
  if (B.length === 0) return 0;
  const hits = B.filter((t) => A.has(t)).length;
  return hits / Math.max(A.size, B.length);
}

export function ReportUploadDialog({ patient, file, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedReport | null>(null);
  const [detectedName, setDetectedName] = useState("");
  const [override, setOverride] = useState(false);
  const [rows, setRows] = useState<Investigation[]>([]);
  const [dataUrl, setDataUrl] = useState<string>("");

  // Trigger extraction once when file appears
  if (file && !loading && !extracted) {
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      setDataUrl(String(reader.result));
      const result = await extractReport(file.name, patient.fullName);
      setExtracted(result);
      setDetectedName(result.detectedName);
      setRows(result.investigations.map((i) => ({ ...i, id: uid("inv") })));
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }

  const sim = nameSimilarity(patient.fullName, detectedName);
  const nameMatches = sim >= 0.5;
  const canConfirm = !!extracted && (nameMatches || override);

  const updateRow = (id: string, patch: Partial<Investigation>) => {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };
  const removeRow = (id: string) => setRows((r) => r.filter((row) => row.id !== id));

  const confirm = async () => {
    if (!file || !canConfirm) return;
    try {
      const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      await addAttachment(patient.id, {
        filename: file.name,
        mimeType: file.type,
        base64Data,
      });
      const merged = [...rows.filter((r) => r.testName.trim()), ...patient.investigations];
      await upsertPatient({ ...patient, investigations: merged });
      toast.success(`Report saved · ${rows.length} value(s) added to Labs`);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save report");
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Review diagnostic report</DialogTitle>
          <DialogDescription>AI extracts patient name and lab values. Verify before saving.</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Extracting report contents…
          </div>
        )}

        {extracted && (
          <div className="space-y-4">
            {/* Name check */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="font-medium">Patient name on report</div>
                {nameMatches ? (
                  <Badge variant="outline" className="border-accent text-accent gap-1"><CheckCircle2 className="h-3 w-3" /> Matches</Badge>
                ) : (
                  <Badge variant="outline" className="border-destructive text-destructive gap-1"><AlertTriangle className="h-3 w-3" /> Mismatch</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Detected on report</div>
                  <Input value={detectedName} onChange={(e) => { setDetectedName(e.target.value); setOverride(false); }} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Patient record</div>
                  <Input value={patient.fullName} disabled />
                </div>
              </div>
              {!nameMatches && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                    <div>
                      <div className="font-medium text-destructive">Name does not match this patient</div>
                      <div className="text-xs text-muted-foreground">Verify you are attaching this report to the correct chart. You can override and proceed if you confirm it belongs to {patient.fullName}.</div>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={override} onCheckedChange={(v) => setOverride(v === true)} />
                    I confirm this report belongs to <span className="font-medium">{patient.fullName}</span> — proceed anyway
                  </label>
                </div>
              )}
            </div>

            {/* Extracted values */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Extracted values ({rows.length})</div>
                <div className="text-xs text-muted-foreground">{extracted.reportType}</div>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">Test</th>
                      <th className="text-left p-2">Result</th>
                      <th className="text-left p-2">Units</th>
                      <th className="text-left p-2">Range</th>
                      <th className="text-left p-2">Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground text-xs">No values extracted.</td></tr>}
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-1"><Input className="h-8" value={r.testName} onChange={(e) => updateRow(r.id, { testName: e.target.value })} /></td>
                        <td className="p-1 w-24"><Input className="h-8" value={r.result ?? ""} onChange={(e) => updateRow(r.id, { result: e.target.value })} /></td>
                        <td className="p-1 w-20"><Input className="h-8" value={r.units ?? ""} onChange={(e) => updateRow(r.id, { units: e.target.value })} /></td>
                        <td className="p-1 w-24"><Input className="h-8" value={r.referenceRange ?? ""} onChange={(e) => updateRow(r.id, { referenceRange: e.target.value })} /></td>
                        <td className="p-1">
                          <Badge variant="outline" className={r.status === "Normal" ? "border-accent text-accent" : r.status === "Critical" ? "border-destructive text-destructive" : "border-warning text-warning"}>{r.status ?? "—"}</Badge>
                        </td>
                        <td className="p-1"><button onClick={() => removeRow(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={confirm} disabled={!canConfirm}>
            {nameMatches ? "Save report & fill labs" : override ? "Override & save" : "Resolve name mismatch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
