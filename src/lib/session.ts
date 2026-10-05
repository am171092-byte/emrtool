/**
 * session.ts — session-expiry detection, pending-write queue, and local draft helpers.
 * Browser-only state; all storage access is guarded.
 */
export const TOKEN_KEY = "rheumcare_token";
export const PENDING_KEY = "rheumcare_pending_writes";
export const DRAFT_PREFIX = "rheumcare_draft_";
export const DOCTOR_CACHE_KEY = "rheumcare_doctor_cache";

export const REAUTH_CODES = new Set([
  "REAUTH_REQUIRED",
  "SESSION_REVOKED",
  "TOKEN_EXPIRED",
  "INVALID_TOKEN",
  "NO_TOKEN",
]);

export class SessionExpiredError extends Error {
  constructor() {
    super("You've been signed out. Your work is saved on this device.");
    this.name = "SessionExpiredError";
  }
}

export function isSessionExpiredError(e: unknown): e is SessionExpiredError {
  return e instanceof SessionExpiredError || (e as any)?.name === "SessionExpiredError";
}

/** Returns true if a 401 response carries one of the re-auth codes. */
export async function isReauthResponse(res: Response): Promise<boolean> {
  if (res.status !== 401) return false;
  try {
    const body = await res.clone().json();
    return REAUTH_CODES.has(body?.code);
  } catch {
    return false;
  }
}

// ---------- expired state ----------
let expired = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export function subscribeSession(fn: () => void) {
  subs.add(fn);
  return () => { subs.delete(fn); };
}
export function isSessionExpired() { return expired; }
export function markSessionExpired() {
  if (!expired) { expired = true; emit(); }
}
export function markSessionRestored() {
  if (expired) { expired = false; emit(); }
}

// ---------- pending writes ----------
export interface PendingWrite {
  key: string; // dedupe key, e.g. "PUT /api/visits/123"
  method: string;
  path: string;
  body?: string;
  queuedAt: string;
}

let pending: PendingWrite[] = [];
let pendingLoaded = false;
function loadPending() {
  if (pendingLoaded || typeof window === "undefined") return;
  pendingLoaded = true;
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (raw) pending = JSON.parse(raw) ?? [];
  } catch { pending = []; }
}
function persistPending() {
  if (typeof window === "undefined") return;
  try {
    if (pending.length) localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    else localStorage.removeItem(PENDING_KEY);
  } catch { /* quota */ }
}
export function enqueueWrite(w: Omit<PendingWrite, "key" | "queuedAt">) {
  loadPending();
  const key = `${w.method} ${w.path}`;
  pending = [...pending.filter((p) => p.key !== key), { ...w, key, queuedAt: new Date().toISOString() }];
  persistPending();
  emit();
}
export function getPendingWrites(): PendingWrite[] { loadPending(); return pending; }
export function removePendingWrite(key: string) {
  pending = pending.filter((p) => p.key !== key);
  persistPending();
  emit();
}

// ---------- drafts ----------
export function hasLocalDrafts(): boolean {
  if (typeof window === "undefined") return false;
  for (let i = 0; i < localStorage.length; i++) {
    if (localStorage.key(i)?.startsWith(DRAFT_PREFIX)) return true;
  }
  return false;
}

/** Clears all patient-data keys stored on this device (drafts + pending writes + cached profile). */
export function clearLocalPatientData() {
  if (typeof window === "undefined") return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith(DRAFT_PREFIX) || k === PENDING_KEY || k === DOCTOR_CACHE_KEY)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
  pending = [];
  emit();
}
