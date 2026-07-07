import { useEffect, useState } from "react";

export type Department = "vyroba" | "logistika";

export const DEPARTMENT_LABEL: Record<Department, string> = {
  vyroba: "Výroba",
  logistika: "Logistika",
};

// Fixed list of logistics zones per user spec: 1/11 … 11/11
export const LOGISTICS_ZONES: string[] = Array.from({ length: 11 }, (_, i) => `${i + 1}/11`);

const STORAGE_KEY = "audit-planner.department.v1";
const EVENT = "department-store-change";

function read(): Department {
  if (typeof window === "undefined") return "vyroba";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "logistika" ? "logistika" : "vyroba";
  } catch {
    return "vyroba";
  }
}

function write(v: Department) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, v);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useDepartment() {
  const [dep, setDep] = useState<Department>(() => read());
  useEffect(() => {
    const sync = () => setDep(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return {
    department: dep,
    setDepartment: (v: Department) => {
      write(v);
      setDep(v);
    },
  };
}
