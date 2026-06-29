import { useEffect, useState } from "react";
import { DEFAULT_AUDITORS } from "./scheduler";

const STORAGE_KEY = "audit-planner.auditors.v1";
const EVENT = "auditors-store-change";

export interface AuditorsState {
  all: string[]; // master list
  active: string[]; // subset used in planning
}

function read(): AuditorsState {
  if (typeof window === "undefined") {
    return { all: DEFAULT_AUDITORS, active: DEFAULT_AUDITORS };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { all: DEFAULT_AUDITORS, active: DEFAULT_AUDITORS };
    const parsed = JSON.parse(raw) as Partial<AuditorsState>;
    const all = Array.isArray(parsed.all) && parsed.all.length ? parsed.all : DEFAULT_AUDITORS;
    const active = Array.isArray(parsed.active) ? parsed.active.filter((n) => all.includes(n)) : all;
    return { all, active: active.length ? active : all };
  } catch {
    return { all: DEFAULT_AUDITORS, active: DEFAULT_AUDITORS };
  }
}

function write(state: AuditorsState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useAuditorsStore() {
  const [state, setState] = useState<AuditorsState>(() => read());

  useEffect(() => {
    const sync = () => setState(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    all: state.all,
    active: state.active,
    save: (next: AuditorsState) => {
      write(next);
      setState(next);
    },
  };
}
