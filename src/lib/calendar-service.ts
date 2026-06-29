import { getAuthToken } from "./auth-context";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export interface CreateCalendarEventInput {
  patientName: string;
  patientId: string;
  date: string;      // ISO date or datetime
  time?: string;     // "HH:MM" or ""
  duration?: number; // minutes
  notes?: string;
}

/**
 * Create a Google Calendar event for a scheduled follow-up.
 * Resolves silently on failure (caller decides UX); returns true on success.
 */
export async function createCalendarEvent(input: CreateCalendarEventInput): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/api/calendar/create-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        patientName: input.patientName,
        patientId: input.patientId,
        date: input.date,
        time: input.time ?? "",
        duration: input.duration ?? 30,
        notes: input.notes ?? "",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
