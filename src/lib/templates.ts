import { getAuthToken } from "./auth-context";
import type { Prescription, Investigation } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export type TemplateType = "prescription" | "investigation";

export type PrescriptionTemplateItem = Omit<Prescription, "id"> & { id?: string };
export type InvestigationTemplateItem = Omit<Investigation, "id"> & { id?: string };

export interface Template {
  id: string;
  type: TemplateType;
  name: string;
  items: PrescriptionTemplateItem[] | InvestigationTemplateItem[];
  createdAt: string;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function listTemplates(): Promise<Template[]> {
  try {
    const data = await api<Template[] | { templates?: Template[] }>("/api/templates");
    if (Array.isArray(data)) return data;
    return data?.templates ?? [];
  } catch {
    return [];
  }
}

export async function saveTemplate(t: Template): Promise<Template> {
  return api<Template>(`/api/templates/${encodeURIComponent(t.id)}`, {
    method: "PUT",
    body: JSON.stringify(t),
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  await api<void>(`/api/templates/${encodeURIComponent(id)}`, { method: "DELETE" });
}
