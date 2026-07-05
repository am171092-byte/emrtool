import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  listTemplates, saveTemplate, deleteTemplate,
  type Template, type TemplateType,
  type PrescriptionTemplateItem, type InvestigationTemplateItem,
} from "@/lib/templates";
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";

function newId() {
  return `tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function TemplatesCard() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setTemplates(await listTemplates());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startNew = (type: TemplateType) => {
    setEditing({
      id: newId(),
      type,
      name: "",
      items: [],
      createdAt: new Date().toISOString(),
    });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await deleteTemplate(id);
      setTemplates((t) => t.filter((x) => x.id !== id));
      toast.success("Template deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const rxTemplates = templates.filter((t) => t.type === "prescription");
  const invTemplates = templates.filter((t) => t.type === "investigation");

  return (
    <Card className="p-5 space-y-4">
      <h2 className="font-semibold">Templates</h2>
      {loading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading templates…
        </div>
      ) : (
        <>
          <TemplateSection
            title="Prescription templates"
            templates={rxTemplates}
            onAdd={() => startNew("prescription")}
            onEdit={setEditing}
            onDelete={remove}
            describe={(t) => `${t.items.length} drug${t.items.length === 1 ? "" : "s"}`}
          />
          <TemplateSection
            title="Investigation templates"
            templates={invTemplates}
            onAdd={() => startNew("investigation")}
            onEdit={setEditing}
            onDelete={remove}
            describe={(t) => `${t.items.length} test${t.items.length === 1 ? "" : "s"}`}
          />
        </>
      )}
      {editing && (
        <TemplateEditor
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setTemplates((prev) => {
              const exists = prev.some((t) => t.id === saved.id);
              return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved];
            });
            setEditing(null);
          }}
        />
      )}
    </Card>
  );
}

function TemplateSection({
  title, templates, onAdd, onEdit, onDelete, describe,
}: {
  title: string;
  templates: Template[];
  onAdd: () => void;
  onEdit: (t: Template) => void;
  onDelete: (id: string) => void;
  describe: (t: Template) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-3 w-3 mr-1" /> New
        </Button>
      </div>
      {templates.length === 0 ? (
        <div className="text-xs text-muted-foreground">No templates yet.</div>
      ) : (
        <ul className="space-y-1">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 rounded border px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{t.name || "(untitled)"}</div>
                <div className="text-xs text-muted-foreground">{describe(t)}</div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => onEdit(t)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(t.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TemplateEditor({
  template, onClose, onSaved,
}: {
  template: Template;
  onClose: () => void;
  onSaved: (t: Template) => void;
}) {
  const [name, setName] = useState(template.name);
  const [items, setItems] = useState<Template["items"]>(template.items);
  const [saving, setSaving] = useState(false);

  const isRx = template.type === "prescription";

  const addItem = () => {
    if (isRx) {
      setItems([...(items as PrescriptionTemplateItem[]), { drug: "", dose: "", frequency: "", duration: "", notes: "" }]);
    } else {
      setItems([...(items as InvestigationTemplateItem[]), { testName: "", urgency: "Routine" }]);
    }
  };

  const updateItem = (i: number, patch: Record<string, unknown>) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) as Template["items"]);
  };

  const removeItem = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i) as Template["items"]);
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    setSaving(true);
    try {
      const payload: Template = { ...template, name: name.trim(), items };
      const saved = await saveTemplate(payload);
      toast.success("Template saved");
      onSaved(saved ?? payload);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isRx ? "Prescription template" : "Investigation template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block">Template name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isRx ? "e.g. RA Standard" : "e.g. Lupus Panel"} />
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {items.length === 0 && <div className="text-xs text-muted-foreground">No items yet.</div>}
            {isRx
              ? (items as PrescriptionTemplateItem[]).map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-1">
                  <Input className="col-span-3" placeholder="Drug" value={it.drug} onChange={(e) => updateItem(i, { drug: e.target.value })} />
                  <Input className="col-span-2" placeholder="Dose" value={it.dose} onChange={(e) => updateItem(i, { dose: e.target.value })} />
                  <Input className="col-span-2" placeholder="Freq" value={it.frequency} onChange={(e) => updateItem(i, { frequency: e.target.value })} />
                  <Input className="col-span-2" placeholder="Duration" value={it.duration} onChange={(e) => updateItem(i, { duration: e.target.value })} />
                  <Input className="col-span-2" placeholder="Notes" value={it.notes ?? ""} onChange={(e) => updateItem(i, { notes: e.target.value })} />
                  <Button className="col-span-1" type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))
              : (items as InvestigationTemplateItem[]).map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-1">
                  <Input className="col-span-7" placeholder="Test name" value={it.testName} onChange={(e) => updateItem(i, { testName: e.target.value })} />
                  <select
                    className="col-span-4 rounded-md border bg-background px-2 text-sm"
                    value={it.urgency}
                    onChange={(e) => updateItem(i, { urgency: e.target.value as "Routine" | "Urgent" | "Follow up" })}
                  >
                    <option>Routine</option><option>Urgent</option><option>Follow up</option>
                  </select>
                  <Button className="col-span-1" type="button" variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3 w-3 mr-1" /> Add item
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Saving…</> : "Save template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
