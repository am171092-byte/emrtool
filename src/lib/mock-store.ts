import type { Patient, Visit, Attachment } from "./types";

const SEED_KEY = "rheumcare_seeded_v1";
const PATIENTS_KEY = "rheumcare_patients_v1";
const VISITS_KEY = "rheumcare_visits_v1";
const RECENT_KEY = "rheumcare_recent_v1";

const isBrowser = typeof window !== "undefined";

// In-memory cache so snapshots are stable references for useSyncExternalStore.
const cache: { patients: Patient[]; visits: Visit[]; recent: string[]; loaded: boolean } = {
  patients: [],
  visits: [],
  recent: [],
  loaded: false,
};

function readLS<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, val: T) {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(val));
}

const subs = new Set<() => void>();
const notify = () => subs.forEach((s) => s());
export function subscribe(fn: () => void) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const isoDaysAhead = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};
const dobYearsAgo = (years: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setMonth((d.getMonth() + 3) % 12);
  return d.toISOString().slice(0, 10);
};

function seed() {
  if (!isBrowser) return;
  if (localStorage.getItem(SEED_KEY)) return;

  const patients: Patient[] = [
    {
      id: "p_anita",
      fullName: "Anita Sharma",
      dob: dobYearsAgo(54),
      sex: "Female",
      phone: "+91 98220 14523",
      address: "12 MG Road, Pune",
      allergies: ["Penicillin"],
      medications: [
        { id: uid("m"), drug: "Methotrexate", dose: "15 mg", frequency: "Once weekly", duration: "Ongoing" },
        { id: uid("m"), drug: "Folic Acid", dose: "5 mg", frequency: "Once weekly", duration: "Ongoing" },
        { id: uid("m"), drug: "Hydroxychloroquine", dose: "200 mg", frequency: "Twice daily", duration: "Ongoing" },
      ],
      comorbidities: ["Hypothyroidism"],
      problemList: ["Seropositive RA", "Bilateral wrist synovitis"],
      primaryDiagnosis: "Rheumatoid Arthritis",
      investigations: [],
      attachments: [],
      vitals: [
        { id: uid("v"), date: isoDaysAgo(2), bpSystolic: 128, bpDiastolic: 82, hr: 78, weight: 62, height: 162, temperature: 36.7, spo2: 98 },
        { id: uid("v"), date: isoDaysAgo(40), bpSystolic: 132, bpDiastolic: 85, hr: 80, weight: 63, height: 162, temperature: 36.6, spo2: 98 },
      ],
      createdAt: isoDaysAgo(400),
      lastAccessedAt: isoDaysAgo(2),
      nextFollowUp: isoDaysAhead(5),
    },
    {
      id: "p_ramesh",
      fullName: "Ramesh Iyer",
      dob: dobYearsAgo(67),
      sex: "Male",
      phone: "+91 99000 11234",
      address: "204 Park Street, Mumbai",
      allergies: [],
      medications: [
        { id: uid("m"), drug: "Allopurinol", dose: "300 mg", frequency: "Once daily", duration: "Ongoing" },
        { id: uid("m"), drug: "Colchicine", dose: "0.5 mg", frequency: "Twice daily PRN", duration: "Flare" },
      ],
      comorbidities: ["Type 2 Diabetes", "Hypertension"],
      problemList: ["Chronic tophaceous gout"],
      primaryDiagnosis: "Gout",
      investigations: [],
      attachments: [],
      createdAt: isoDaysAgo(220),
      lastAccessedAt: isoDaysAgo(11),
      nextFollowUp: isoDaysAhead(2),
    },
    {
      id: "p_priya",
      fullName: "Priya Menon",
      dob: dobYearsAgo(31),
      sex: "Female",
      phone: "+91 98765 43210",
      address: "Flat 7, Coral Cove, Bangalore",
      allergies: ["Sulfa drugs"],
      medications: [
        { id: uid("m"), drug: "Hydroxychloroquine", dose: "300 mg", frequency: "Once daily", duration: "Ongoing" },
        { id: uid("m"), drug: "Mycophenolate", dose: "1 g", frequency: "Twice daily", duration: "Ongoing" },
        { id: uid("m"), drug: "Prednisolone", dose: "7.5 mg", frequency: "Once daily", duration: "Taper" },
      ],
      comorbidities: [],
      problemList: ["SLE — class IV lupus nephritis (in remission)"],
      primaryDiagnosis: "Systemic Lupus Erythematosus",
      investigations: [],
      attachments: [],
      createdAt: isoDaysAgo(620),
      lastAccessedAt: isoDaysAgo(1),
      nextFollowUp: isoDaysAhead(14),
    },
    {
      id: "p_arjun",
      fullName: "Arjun Patel",
      dob: dobYearsAgo(42),
      sex: "Male",
      phone: "+91 99887 65432",
      address: "Sector 14, Gandhinagar",
      allergies: [],
      medications: [
        { id: uid("m"), drug: "Adalimumab", dose: "40 mg", frequency: "Every 2 weeks", duration: "Ongoing" },
        { id: uid("m"), drug: "Methotrexate", dose: "10 mg", frequency: "Once weekly", duration: "Ongoing" },
      ],
      comorbidities: ["Psoriasis"],
      problemList: ["Psoriatic arthritis — peripheral pattern"],
      primaryDiagnosis: "Psoriatic Arthritis",
      investigations: [],
      attachments: [],
      createdAt: isoDaysAgo(180),
      lastAccessedAt: isoDaysAgo(7),
      nextFollowUp: isoDaysAhead(28),
    },
    {
      id: "p_meera",
      fullName: "Meera Krishnan",
      dob: dobYearsAgo(48),
      sex: "Female",
      phone: "+91 98112 33445",
      allergies: ["NSAIDs"],
      medications: [
        { id: uid("m"), drug: "Methotrexate", dose: "20 mg", frequency: "Once weekly", duration: "Ongoing" },
        { id: uid("m"), drug: "Sulfasalazine", dose: "1 g", frequency: "Twice daily", duration: "Ongoing" },
        { id: uid("m"), drug: "Prednisolone", dose: "5 mg", frequency: "Once daily", duration: "Bridge" },
      ],
      comorbidities: ["Sjögren's syndrome"],
      problemList: ["Seropositive RA", "Secondary Sjögren's"],
      primaryDiagnosis: "Rheumatoid Arthritis",
      investigations: [],
      attachments: [],
      createdAt: isoDaysAgo(900),
      lastAccessedAt: isoDaysAgo(4),
      nextFollowUp: isoDaysAhead(9),
    },
    {
      id: "p_david",
      fullName: "David Fernandes",
      dob: dobYearsAgo(36),
      sex: "Male",
      phone: "+91 90909 80808",
      allergies: [],
      medications: [
        { id: uid("m"), drug: "Secukinumab", dose: "150 mg", frequency: "Monthly", duration: "Ongoing" },
      ],
      comorbidities: [],
      problemList: ["Ankylosing spondylitis"],
      primaryDiagnosis: "Ankylosing Spondylitis",
      investigations: [],
      attachments: [],
      createdAt: isoDaysAgo(90),
      lastAccessedAt: isoDaysAgo(15),
      nextFollowUp: isoDaysAhead(45),
    },
  ];

  // Visits
  const visits: Visit[] = [];

  // Anita — multiple visits with DAS28
  const anitaVisits = [
    { days: 2, tjc: 2, sjc: 1, esr: 18, gh: 22, cc: "Routine follow-up. Mild morning stiffness <30 min." },
    { days: 60, tjc: 4, sjc: 3, esr: 28, gh: 38, cc: "Joint pain in wrists improving on MTX." },
    { days: 140, tjc: 6, sjc: 4, esr: 42, gh: 55, cc: "Active disease. Wrist swelling." },
    { days: 240, tjc: 9, sjc: 6, esr: 58, gh: 70, cc: "Initial presentation. Symmetric polyarthritis." },
  ];
  anitaVisits.forEach((v) => {
    visits.push({
      id: uid("vis"),
      patientId: "p_anita",
      date: isoDaysAgo(v.days),
      time: "10:30",
      chiefComplaint: v.cc,
      soap: {
        subjective: `Patient reports ${v.tjc > 5 ? "significant" : "mild"} joint pain, morning stiffness, fatigue.`,
        objective: `Tender joints: ${v.tjc}. Swollen joints: ${v.sjc}. BP stable.`,
        assessment: `RA — DAS28 ${v.tjc > 5 ? "moderate" : "remission/low"}.`,
        plan: `Continue MTX 15mg weekly + HCQ 200mg BD + Folic acid.`,
      },
      prescriptions: [],
      investigations: [
        { id: uid("inv"), testName: "ESR", result: String(v.esr), units: "mm/hr", referenceRange: "<20", status: v.esr <= 20 ? "Normal" : "Abnormal", date: isoDaysAgo(v.days) },
      ],
      nextFollowUp: v.days === 2 ? isoDaysAhead(5) : undefined,
      das28: {
        tjc: v.tjc, sjc: v.sjc, marker: "ESR", esr: v.esr, gh: v.gh,
        scoreEsr: 0.56 * Math.sqrt(v.tjc) + 0.28 * Math.sqrt(v.sjc) + 0.7 * Math.log(v.esr) + 0.014 * v.gh,
      },
    });
  });

  // Other patients — simpler visits
  [["p_ramesh", "Acute gout flare in 1st MTP. Started colchicine.", 11], ["p_priya", "Routine SLE follow-up. Stable.", 1], ["p_arjun", "Dactylitis 3rd toe right. Discussing biologic dose escalation.", 7], ["p_meera", "Tender wrists, dry eyes. Refill prescriptions.", 4], ["p_david", "Back pain controlled. Maintaining function.", 15]].forEach(([pid, cc, days]) => {
    visits.push({
      id: uid("vis"),
      patientId: pid as string,
      date: isoDaysAgo(days as number),
      time: "11:00",
      chiefComplaint: cc as string,
      soap: {
        subjective: cc as string,
        objective: "On exam: relevant findings noted.",
        assessment: "See problem list.",
        plan: "Continue current management. Review labs next visit.",
      },
      prescriptions: [],
      investigations: [],
    });
  });

  writeLS(PATIENTS_KEY, patients);
  writeLS(VISITS_KEY, visits);
  writeLS(RECENT_KEY, patients.map((p) => p.id));
  localStorage.setItem(SEED_KEY, "1");
}

function ensureLoaded() {
  if (cache.loaded) return;
  if (isBrowser) {
    seed();
    cache.patients = readLS<Patient[]>(PATIENTS_KEY, []);
    cache.visits = readLS<Visit[]>(VISITS_KEY, []);
    cache.recent = readLS<string[]>(RECENT_KEY, []);
  }
  cache.loaded = true;
}

if (isBrowser) ensureLoaded();

// ---- accessors (return stable references from cache) ----
export function getAllPatients(): Patient[] {
  ensureLoaded();
  return cache.patients;
}
export function getAllVisits(): Visit[] {
  ensureLoaded();
  return cache.visits;
}
export function setPatients(p: Patient[]) {
  cache.patients = p;
  writeLS(PATIENTS_KEY, p);
  notify();
}
export function setVisits(v: Visit[]) {
  cache.visits = v;
  writeLS(VISITS_KEY, v);
  notify();
}
function setRecent(r: string[]) {
  cache.recent = r;
  writeLS(RECENT_KEY, r);
  notify();
}

export function getPatient(id: string): Patient | undefined {
  return getAllPatients().find((p) => p.id === id);
}
export function upsertPatient(p: Patient) {
  const all = [...getAllPatients()];
  const i = all.findIndex((x) => x.id === p.id);
  if (i >= 0) all[i] = p;
  else all.unshift(p);
  setPatients(all);
}
export function deletePatient(id: string) {
  setPatients(getAllPatients().filter((p) => p.id !== id));
  setVisits(getAllVisits().filter((v) => v.patientId !== id));
}

export function touchRecent(id: string) {
  const recent = cache.recent;
  const next = [id, ...recent.filter((x) => x !== id)].slice(0, 20);
  // update lastAccessedAt
  const all = [...getAllPatients()];
  const i = all.findIndex((p) => p.id === id);
  if (i >= 0) {
    all[i] = { ...all[i], lastAccessedAt: new Date().toISOString() };
    cache.patients = all;
    writeLS(PATIENTS_KEY, all);
  }
  setRecent(next);
}
export function getRecentIds(): string[] {
  ensureLoaded();
  return cache.recent;
}

export function getVisitsForPatient(id: string): Visit[] {
  return getAllVisits()
    .filter((v) => v.patientId === id)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}
export function getVisit(visitId: string): Visit | undefined {
  return getAllVisits().find((v) => v.id === visitId);
}
export function upsertVisit(v: Visit) {
  const all = [...getAllVisits()];
  const i = all.findIndex((x) => x.id === v.id);
  if (i >= 0) all[i] = v;
  else all.unshift(v);
  setVisits(all);
}
export function deleteVisit(id: string) {
  setVisits(getAllVisits().filter((v) => v.id !== id));
}

export function addAttachment(patientId: string, a: Attachment) {
  const all = [...getAllPatients()];
  const i = all.findIndex((p) => p.id === patientId);
  if (i >= 0) {
    all[i] = { ...all[i], attachments: [a, ...all[i].attachments] };
    setPatients(all);
  }
}
export function deleteAttachment(patientId: string, aid: string) {
  const all = [...getAllPatients()];
  const i = all.findIndex((p) => p.id === patientId);
  if (i >= 0) {
    all[i] = { ...all[i], attachments: all[i].attachments.filter((a) => a.id !== aid) };
    setPatients(all);
  }
}
  const i = all.findIndex((p) => p.id === patientId);
  if (i >= 0) {
    all[i] = { ...all[i], attachments: all[i].attachments.filter((a) => a.id !== aid) };
    setPatients(all);
  }
}
