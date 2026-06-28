import { useMemo, useSyncExternalStore } from "react";
import {
  getAllPatients,
  getAllVisits,
  getRecentIds,
  subscribe,
} from "./mock-store";

// Stable empty refs for SSR snapshots.
const EMPTY_ARR: never[] = [];
const ssrArr = () => EMPTY_ARR as unknown as never[];
const ssrUndef = () => undefined;

export function useAllPatients() {
  return useSyncExternalStore(subscribe, getAllPatients, ssrArr as () => ReturnType<typeof getAllPatients>);
}
export function useAllVisits() {
  return useSyncExternalStore(subscribe, getAllVisits, ssrArr as () => ReturnType<typeof getAllVisits>);
}
export function usePatient(id: string | undefined) {
  const all = useAllPatients();
  return useMemo(() => (id ? all.find((p) => p.id === id) : undefined), [all, id]);
}
export function useVisit(id: string | undefined) {
  const all = useAllVisits();
  return useMemo(() => (id ? all.find((v) => v.id === id) : undefined), [all, id]);
}
export function useVisitsForPatient(id: string | undefined) {
  const all = useAllVisits();
  return useMemo(
    () =>
      id
        ? all.filter((v) => v.patientId === id).sort((a, b) => +new Date(b.date) - +new Date(a.date))
        : [],
    [all, id],
  );
}
export function useRecentIds() {
  return useSyncExternalStore(subscribe, getRecentIds, ssrArr as () => string[]);
}

void ssrUndef;
