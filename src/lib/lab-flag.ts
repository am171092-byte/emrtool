/**
 * Auto-flag a lab value against its reference range.
 * Returns "Low" | "High" | "Normal" | "" (empty when range can't be parsed).
 */
export function computeFlag(value: string | number | undefined | null, range: string | undefined | null): "Low" | "High" | "Normal" | "" {
  if (value == null || value === "") return "";
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(num)) return "";
  const r = String(range ?? "").trim();
  if (!r) return "";

  // "<10" or "≤10"
  const lt = r.match(/^\s*[<≤]\s*(-?\d+(?:\.\d+)?)/);
  if (lt) {
    const max = parseFloat(lt[1]);
    return num > max ? "High" : "Normal";
  }
  // ">10" or "≥10"
  const gt = r.match(/^\s*[>≥]\s*(-?\d+(?:\.\d+)?)/);
  if (gt) {
    const min = parseFloat(gt[1]);
    return num < min ? "Low" : "Normal";
  }
  // "11.5-15.0", "11.5 – 15.0", "11.5 to 15.0"
  const m = r.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)/i);
  if (m) {
    const min = parseFloat(m[1]);
    const max = parseFloat(m[2]);
    if (Number.isFinite(min) && Number.isFinite(max)) {
      if (num < min) return "Low";
      if (num > max) return "High";
      return "Normal";
    }
  }
  return "";
}

export function statusFromFlag(flag?: string): "Normal" | "Abnormal" | "Critical" {
  const f = (flag || "").toLowerCase();
  if (f === "high" || f === "low") return "Abnormal";
  return "Normal";
}
