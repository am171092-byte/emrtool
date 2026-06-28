export type Sex = "Male" | "Female" | "Other";

export type Allergy = string;
export type Comorbidity = string;

export interface Medication {
  id: string;
  drug: string;
  dose: string;
  frequency: string;
  duration: string;
}

export interface Vitals {
  bpSystolic?: number;
  bpDiastolic?: number;
  hr?: number;
  weight?: number;
  height?: number;
  temperature?: number;
  spo2?: number;
}

export interface Prescription {
  id: string;
  drug: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Investigation {
  id: string;
  testName: string;
  result?: string;
  units?: string;
  referenceRange?: string;
  status?: "Normal" | "Abnormal" | "Critical";
  urgency?: "Routine" | "Urgent";
  notes?: string;
  date?: string;
}

export interface JointState {
  id: string;       // e.g. "L_MCP1"
  tender: boolean;
  swollen: boolean;
  note?: string;
}

export interface JointMap {
  joints: JointState[];
  tjc: number;
  sjc: number;
}

export interface DAS28Data {
  tjc: number;
  sjc: number;
  marker: "ESR" | "CRP";
  esr?: number;
  crp?: number;
  gh: number;
  scoreEsr?: number;
  scoreCrp?: number;
  activity?: string;
}

export interface Visit {
  id: string;
  patientId: string;
  date: string;       // ISO
  time: string;       // HH:MM
  chiefComplaint: string;
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  vitals?: Vitals;
  prescriptions: Prescription[];
  investigations: Investigation[];
  nextFollowUp?: string;
  followUpNote?: string;
  jointMap?: JointMap;
  das28?: DAS28Data;
}

export interface VitalsEntry extends Vitals {
  id: string;
  date: string;
}

export interface Attachment {
  id: string;
  filename: string;
  size: number;
  type: string;
  date: string;
  dataUrl?: string;
}

export interface Patient {
  id: string;
  fullName: string;
  dob: string;        // ISO date
  sex: Sex;
  phone: string;
  address?: string;
  allergies: Allergy[];
  medications: Medication[];
  pastMedicalHistory?: string;
  comorbidities: Comorbidity[];
  problemList: string[];
  vitals?: VitalsEntry[];
  investigations: Investigation[];
  attachments: Attachment[];
  primaryDiagnosis?: string;
  createdAt: string;
  lastAccessedAt?: string;
  nextFollowUp?: string;
  nextVisitReason?: string;
  das28History?: DAS28Entry[];
}

export interface DAS28Entry extends DAS28Data {
  id: string;
  date: string;
  joints?: JointState[];
}

export interface Doctor {
  name: string;
  email: string;
  avatar?: string;
  clinicName?: string;
  specialty?: string;
  phone?: string;
  registrationNo?: string;
  address?: string;
  profileComplete?: boolean;
}
