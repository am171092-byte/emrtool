// Mock AI assistant. Returns canned but realistic responses. Replace with a
// fetch to `${import.meta.env.VITE_API_BASE_URL}/api/ai` when the backend exists.

export type AITask =
  | "soap_generation"
  | "drug_info"
  | "guideline_summary"
  | "safety_check"
  | "differential"
  | "similar_cases"
  | "chat";

const DRUG_INFO: Record<string, string> = {
  methotrexate: `**Methotrexate** — folate antagonist / antimetabolite.

- **Indications:** RA, PsA, SLE, JIA, vasculitis.
- **Dosing:** 7.5–25 mg once weekly, oral or SC. Co-prescribe folic acid 5 mg weekly (different day).
- **Monitoring:** CBC, LFTs, creatinine every 4–8 weeks initially, then every 12 weeks.
- **Key interactions:** Trimethoprim (marrow suppression), NSAIDs (reduced clearance), PPIs (reduced clearance at high MTX doses).
- **Contraindications:** Pregnancy (teratogen), severe hepatic/renal disease, active infection, significant alcohol use.`,
  hydroxychloroquine: `**Hydroxychloroquine** — antimalarial DMARD.

- **Indications:** RA, SLE, Sjögren's, dermatomyositis.
- **Dosing:** ≤5 mg/kg actual body weight/day. Typical 200–400 mg/day.
- **Monitoring:** Baseline and annual ophthalmology screen after 5 years (or sooner with risk factors).
- **Key interactions:** QT-prolonging drugs, digoxin.
- **Contraindications:** Pre-existing retinopathy, G6PD deficiency (caution).`,
  prednisolone: `**Prednisolone** — corticosteroid.

- **Indications:** Bridge therapy in RA, SLE flares, vasculitis, PMR/GCA.
- **Dosing:** RA bridge 5–10 mg/day. GCA 40–60 mg/day. Taper to lowest effective dose.
- **Monitoring:** BP, glucose, lipids, bone density. Consider PPI + bone protection if >7.5 mg ≥3 months.
- **Key interactions:** NSAIDs (GI bleed), live vaccines avoided.
- **Contraindications:** Systemic fungal infection.`,
};

const GUIDELINES: Record<string, string> = {
  ra: `**ACR/EULAR — Rheumatoid Arthritis (summary)**

- **Treat to target:** clinical remission or low disease activity within 6 months.
- **First-line:** Methotrexate ± short-course glucocorticoid bridge.
- **Inadequate response @3 months:** combine csDMARDs or switch to bDMARD/tsDMARD.
- **bDMARD options:** TNFi (adalimumab, etanercept, infliximab), IL-6i (tocilizumab), CTLA4-Ig (abatacept), B-cell (rituximab).
- **JAKi:** consider after TNFi failure; assess cardiovascular and VTE risk first.`,
  sle: `**EULAR — SLE (summary)**

- **Goal:** remission or LLDAS (low disease activity).
- **Backbone:** Hydroxychloroquine for all patients.
- **Glucocorticoids:** taper to ≤7.5 mg prednisolone equivalent within 3–6 months.
- **Organ-threatening:** MMF or cyclophosphamide for proliferative LN; rituximab as alternative.
- **Refractory:** belimumab, anifrolumab.`,
  gout: `**ACR — Gout (summary)**

- **Acute flare:** NSAID, colchicine, or glucocorticoid (any are first-line).
- **Urate-lowering therapy:** start in any patient with ≥2 flares/year, tophi, or radiographic damage.
- **Target serum urate:** <6 mg/dL (<360 µmol/L); <5 if tophaceous.
- **First-line ULT:** allopurinol (start ≤100 mg/day, titrate).
- **Flare prophylaxis** for 3–6 months when starting ULT (low-dose colchicine or NSAID).`,
};

function pickKey(input: string, dict: Record<string, string>): string | null {
  const q = input.toLowerCase();
  for (const k of Object.keys(dict)) {
    if (q.includes(k)) return k;
  }
  return null;
}

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function aiAssist(task: AITask, payload: Record<string, unknown>): Promise<string> {
  await delay(700 + Math.random() * 800);

  switch (task) {
    case "soap_generation": {
      const cc = String(payload.chiefComplaint ?? "Joint pain");
      return `**Subjective**
Patient presents with: ${cc}. Reports morning stiffness ~45 minutes, improving with activity. Denies fevers, weight loss, or rash. No recent infections.

**Objective**
Alert, comfortable. BP and vitals stable.
Joint exam: symmetrical synovitis of bilateral MCPs and wrists; no effusion in larger joints. Grip strength reduced. No skin lesions, no nail changes.

**Assessment**
Active inflammatory polyarthritis, consistent with seropositive Rheumatoid Arthritis. Moderate disease activity by DAS28 estimation.

**Plan**
1. Continue Methotrexate 15 mg weekly, escalate if no response in 6 weeks.
2. Add short prednisolone bridge 7.5 mg taper over 6 weeks.
3. Repeat ESR, CRP, LFTs in 4 weeks.
4. Reinforce folic acid adherence.
5. Review in 4 weeks with labs.`;
    }
    case "drug_info": {
      const drug = String(payload.drug_name ?? "").toLowerCase();
      const key = Object.keys(DRUG_INFO).find((k) => drug.includes(k));
      if (key) return DRUG_INFO[key];
      return `**${payload.drug_name}**\n\nThis is a mock response. In production this would call the AI backend. Common monitoring includes CBC, LFTs, and renal function. Always check current interaction databases.`;
    }
    case "guideline_summary": {
      const topic = String(payload.topic ?? "");
      const key = pickKey(topic, GUIDELINES);
      if (key) return GUIDELINES[key];
      return `**Guideline summary — ${topic}**\n\nMock response. Refer to current ACR/EULAR publications for authoritative recommendations.`;
    }
    case "safety_check": {
      const meds = (payload.medications as string[]) ?? [];
      const allergies = (payload.allergies as string[]) ?? [];
      const flags: string[] = [];
      if (meds.includes("Methotrexate") && meds.some((m) => m.toLowerCase().includes("trimethoprim"))) {
        flags.push("🔴 **Methotrexate + Trimethoprim** — risk of severe marrow suppression. Avoid combination.");
      }
      if (allergies.some((a) => a.toLowerCase().includes("sulfa")) && meds.includes("Sulfasalazine")) {
        flags.push("🔴 **Sulfasalazine** prescribed with documented sulfa allergy.");
      }
      if (meds.includes("Prednisolone") && meds.some((m) => /naproxen|diclofenac|etoricoxib|celecoxib/i.test(m))) {
        flags.push("🟠 **Steroid + NSAID** — increased GI bleed risk. Consider PPI cover.");
      }
      if (flags.length === 0) flags.push("🟢 No critical interactions detected in this mock pass. Always verify with up-to-date references.");
      return `**Safety check**\n\n${flags.join("\n\n")}`;
    }
    case "differential": {
      return `**Differential diagnosis (informational only)**

1. **Rheumatoid arthritis** — symmetrical small-joint synovitis, morning stiffness, raised inflammatory markers.
2. **Psoriatic arthritis** — asymmetric, dactylitis, enthesitis, nail/skin changes.
3. **Viral arthritis** — parvovirus, chikungunya, hepatitis B/C.
4. **Polymyalgia rheumatica** — proximal stiffness in >50yr, raised ESR.
5. **Crystal arthropathy** — gout, pseudogout.

> Clinical judgment is essential. Confirm with serology (RF, anti-CCP, ANA), imaging, and joint aspiration where appropriate.`;
    }
    case "similar_cases": {
      return `**Similar case patterns**

Published cohorts describe similar presentations responding well to early MTX-based combination therapy with short steroid bridging. Outcomes are best when treatment-to-target is achieved within 6 months.

> Mock response. Real implementation would summarise published cases via the AI backend.`;
    }
    case "chat":
    default: {
      const messages = (payload.messages as { role: string; content: string }[]) ?? [];
      const last = messages[messages.length - 1]?.content ?? "";
      return `Thanks for the question.

> **You asked:** ${last}

This is a mock response from the in-app assistant. When the backend is connected, this will route through your secured Gemini proxy with de-identified context. Clinical judgment always applies.`;
    }
  }
}

export function deidentify(text: string, patientName?: string): string {
  if (!patientName) return text;
  const first = patientName.split(" ")[0];
  return text.replaceAll(patientName, "[PATIENT]").replaceAll(first, "[PATIENT]");
}
