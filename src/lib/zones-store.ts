import { useEffect, useState } from "react";
import { DEFAULT_ZONES } from "./scheduler";

const STORAGE_KEY = "audit-planner.zones.v1";
const EVENT = "zones-store-change";

export interface ZonesState {
  all: string[];
  active: string[];
}

function read(): ZonesState {
  if (typeof window === "undefined") {
    return { all: DEFAULT_ZONES, active: DEFAULT_ZONES };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { all: DEFAULT_ZONES, active: DEFAULT_ZONES };
    const parsed = JSON.parse(raw) as Partial<ZonesState>;
    const all = Array.isArray(parsed.all) && parsed.all.length ? parsed.all : DEFAULT_ZONES;
    const active = Array.isArray(parsed.active) ? parsed.active.filter((n) => all.includes(n)) : all;
    return { all, active: active.length ? active : all };
  } catch {
    return { all: DEFAULT_ZONES, active: DEFAULT_ZONES };
  }
}

function write(state: ZonesState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useZonesStore() {
  const [state, setState] = useState<ZonesState>(() => read());

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
    save: (next: ZonesState) => {
      write(next);
      setState(next);
    },
  };
}
