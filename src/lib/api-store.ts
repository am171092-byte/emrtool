/**
 * api-store.ts — Backend-backed store with same surface as the old mock-store.
 */
import type { Patient, Visit, Attachment } from "./types";
import { getAuthToken } from "./auth-context";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

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
  return res.json();
}

const cache: {
  patients: Patient[];
  visits: Visit[];
  recent: string[];
  loaded: boolean;
  loading: boolean;
} = { patients: [], visits: [], recent: [], loaded: false, loading: false };

const subs = new Set<() => void>();
const notify = () => subs.forEach((s) => s());
export function subscribe(fn: () => void) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function loadFromBackend(): Promise<void> {
  if (cache.loaded || cache.loading) return;
  cache.loading = true;
  try {
    const patients = await api<Patient[]>("/api/patients");
    cache.patients = patients;
    cache.recent = [...patients]
      .sort((a, b) => {
        const ta = a.lastAccessedAt ? new Date(a.lastAccessedAt).getTime() : 0;
        const tb = b.lastAccessedAt ? new Date(b.lastAccessedAt).getTime() : 0;
        return tb - ta;
      })
      .map((p) => p.id)
      .slice(0, 20);
    cache.loaded = true;
    notify();
  } catch (err) {
    console.error("Failed to load patients from backend:", err);
  } finally {
    cache.loading = false;
  }
}

export function getAllPatients(): Patient[] { return cache.patients; }
export function getAllVisits(): Visit[] { return cache.visits; }
export function getPatient(id: string): Patient | undefined {
  return cache.patients.find((p) => p.id === id);
}

export async function loadPatient(id: string): Promise<Patient | undefined> {
  try {
    const patient = await api<Patient>(`/api/patients/${id}`);
    const idx = cache.patients.findIndex((p) => p.id === id);
    if (idx >= 0) cache.patients[idx] = patient;
    else cache.patients.unshift(patient);
    notify();
    return patient;
  } catch {
    return undefined;
  }
}

export async function upsertPatient(p: Patient): Promise<void> {
  const all = [...cache.patients];
  const i = all.findIndex((x) => x.id === p.id);
  if (i >= 0) all[i] = p;
  else all.unshift(p);
  cache.patients = all;
  notify();
  await api(`/api/patients/${p.id}`, { method: "PUT", body: JSON.stringify(p) });
}

export async function deletePatient(id: string): Promise<void> {
  cache.patients = cache.patients.filter((p) => p.id !== id);
  cache.visits = cache.visits.filter((v) => v.patientId !== id);
  notify();
  await api(`/api/patients/${id}`, { method: "DELETE" });
}

export function touchRecent(id: string) {
  cache.recent = [id, ...cache.recent.filter((x) => x !== id)].slice(0, 20);
  const i = cache.patients.findIndex((p) => p.id === id);
  if (i >= 0) {
    cache.patients[i] = { ...cache.patients[i], lastAccessedAt: new Date().toISOString() };
  }
  notify();
  if (i >= 0) {
    api(`/api/patients/${id}`, {
      method: "PUT",
      body: JSON.stringify(cache.patients[i]),
    }).catch(console.error);
  }
}

export function getRecentIds(): string[] { return cache.recent; }

export async function loadVisitsForPatient(patientId: string): Promise<Visit[]> {
  try {
    const visits = await api<Visit[]>(`/api/patients/${patientId}/visits`);
    cache.visits = [...cache.visits.filter((v) => v.patientId !== patientId), ...visits];
    notify();
    return visits;
  } catch (err) {
    console.error("Failed to load visits:", err);
    return [];
  }
}

export function getVisitsForPatient(id: string): Visit[] {
  return cache.visits
    .filter((v) => v.patientId === id)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getVisit(visitId: string): Visit | undefined {
  return cache.visits.find((v) => v.id === visitId);
}

export async function loadVisit(visitId: string): Promise<Visit | undefined> {
  try {
    const visit = await api<Visit>(`/api/visits/${visitId}`);
    const idx = cache.visits.findIndex((v) => v.id === visitId);
    if (idx >= 0) cache.visits[idx] = visit;
    else cache.visits.unshift(visit);
    notify();
    return visit;
  } catch {
    return undefined;
  }
}

export async function upsertVisit(v: Visit): Promise<void> {
  const all = [...cache.visits];
  const i = all.findIndex((x) => x.id === v.id);
  if (i >= 0) all[i] = v;
  else all.unshift(v);
  cache.visits = all;
  notify();
  await api(`/api/visits/${v.id}`, { method: "PUT", body: JSON.stringify(v) });
}

export async function deleteVisit(id: string): Promise<void> {
  cache.visits = cache.visits.filter((v) => v.id !== id);
  notify();
  await api(`/api/visits/${id}`, { method: "DELETE" });
}

export async function addAttachment(
  patientId: string,
  file: { filename: string; mimeType: string; base64Data: string },
): Promise<Attachment> {
  const result = await api<Attachment>(`/api/patients/${patientId}/attachments`, {
    method: "POST",
    body: JSON.stringify(file),
  });
  const idx = cache.patients.findIndex((p) => p.id === patientId);
  if (idx >= 0) {
    cache.patients[idx] = {
      ...cache.patients[idx],
      attachments: [result, ...cache.patients[idx].attachments],
    };
    notify();
  }
  return result;
}

export async function deleteAttachment(patientId: string, attachmentId: string): Promise<void> {
  const idx = cache.patients.findIndex((p) => p.id === patientId);
  if (idx >= 0) {
    cache.patients[idx] = {
      ...cache.patients[idx],
      attachments: cache.patients[idx].attachments.filter((a) => a.id !== attachmentId),
    };
    notify();
  }
  await api(`/api/attachments/${attachmentId}`, { method: "DELETE" });
}

export function getAttachmentUrl(fileId: string): string {
  const token = getAuthToken();
  return `${API_BASE}/api/attachments/${fileId}?token=${token}`;
}
