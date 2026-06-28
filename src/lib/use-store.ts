import { useMemo, useSyncExternalStore, useEffect } from "react";
import {
  getAllPatients,
  getAllVisits,
  getRecentIds,
  subscribe,
  loadFromBackend,
  loadPatient,
  loadVisitsForPatient,
  loadVisit,
} from "./api-store";

const EMPTY_ARR: never[] = [];
const ssrArr = () => EMPTY_ARR as unknown as never[];

export function useAllPatients() {
  useEffect(() => { loadFromBackend(); }, []);
  return useSyncExternalStore(subscribe, getAllPatients, ssrArr as () => ReturnType<typeof getAllPatients>);
}

export function useAllVisits() {
  return useSyncExternalStore(subscribe, getAllVisits, ssrArr as () => ReturnType<typeof getAllVisits>);
}

export function usePatient(id: string | undefined) {
  const all = useAllPatients();
  useEffect(() => { if (id) loadPatient(id); }, [id]);
  return useMemo(() => (id ? all.find((p) => p.id === id) : undefined), [all, id]);
}

export function useVisit(id: string | undefined) {
  const all = useAllVisits();
  useEffect(() => { if (id) loadVisit(id); }, [id]);
  return useMemo(() => (id ? all.find((v) => v.id === id) : undefined), [all, id]);
}

export function useVisitsForPatient(id: string | undefined) {
  const all = useAllVisits();
  useEffect(() => { if (id) loadVisitsForPatient(id); }, [id]);
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
