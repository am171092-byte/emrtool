import { useSyncExternalStore } from "react";
import {
  getAllPatients,
  getAllVisits,
  getPatient,
  getVisit,
  getVisitsForPatient,
  getRecentIds,
  subscribe,
} from "./mock-store";

const serverSnap = () => 0;

export function useAllPatients() {
  return useSyncExternalStore(subscribe, getAllPatients, () => [] as ReturnType<typeof getAllPatients>);
}
export function useAllVisits() {
  return useSyncExternalStore(subscribe, getAllVisits, () => [] as ReturnType<typeof getAllVisits>);
}
export function usePatient(id: string | undefined) {
  return useSyncExternalStore(
    subscribe,
    () => (id ? getPatient(id) : undefined),
    () => undefined,
  );
}
export function useVisit(id: string | undefined) {
  return useSyncExternalStore(
    subscribe,
    () => (id ? getVisit(id) : undefined),
    () => undefined,
  );
}
export function useVisitsForPatient(id: string | undefined) {
  return useSyncExternalStore(
    subscribe,
    () => (id ? getVisitsForPatient(id) : []),
    () => [] as ReturnType<typeof getVisitsForPatient>,
  );
}
export function useRecentIds() {
  return useSyncExternalStore(subscribe, getRecentIds, () => [] as string[]);
}

void serverSnap;
