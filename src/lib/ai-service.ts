/**
 * ai-service.ts — Backend-proxied Gemini calls.
 */
import { getAuthToken } from "./auth-context";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export type AITask =
  | "soap_generation"
  | "drug_info"
  | "guideline_summary"
  | "safety_check"
  | "differential"
  | "similar_cases"
  | "chat";

export async function aiAssist(
  task: AITask,
  payload: Record<string, unknown>,
  patientName?: string,
): Promise<string> {
  const token = getAuthToken();
  if (!token) return "Please sign in to use the AI assistant.";
  try {
    const res = await fetch(`${API_BASE}/api/ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ task, payload, patientName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `AI request failed (${res.status})`);
    }
    const data = await res.json();
    return data.response || "No response received from AI.";
  } catch (err) {
    console.error("AI assist error:", err);
    return `AI request failed: ${err instanceof Error ? err.message : "Unknown error"}. Please try again.`;
  }
}

export function deidentify(text: string, patientName?: string): string {
  if (!patientName) return text;
  let clean = text;
  clean = clean.replaceAll(patientName, "[PATIENT]");
  const first = patientName.split(" ")[0];
  if (first.length > 2) clean = clean.replaceAll(first, "[PATIENT]");
  return clean;
}
