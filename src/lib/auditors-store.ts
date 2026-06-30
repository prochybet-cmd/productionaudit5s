import { useEffect, useState } from "react";
import {
  ALL_ZONE_GROUPS,
  DEFAULT_AUDITORS,
  defaultInfoFor,
  type AuditorInfo,
  type ZoneGroup,
} from "./scheduler";

const STORAGE_KEY = "audit-planner.auditors.v2";
const LEGACY_KEY = "audit-planner.auditors.v1";
const EVENT = "auditors-store-change";

export interface AuditorRecord {
  name: string;
  active: boolean;
  supervisor: boolean;
  groups: ZoneGroup[];
}

export interface AuditorsState {
  records: AuditorRecord[];
}

function defaultRecords(): AuditorRecord[] {
  return DEFAULT_AUDITORS.map((name) => {
    const info = defaultInfoFor(name);
    return { name, active: true, supervisor: info.supervisor, groups: info.groups };
  });
}

function migrateLegacy(): AuditorRecord[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { all?: string[]; active?: string[] };
    const all = Array.isArray(parsed.all) && parsed.all.length ? parsed.all : DEFAULT_AUDITORS;
    const active = new Set(Array.isArray(parsed.active) ? parsed.active : all);
    return all.map((name) => {
      const info = defaultInfoFor(name);
      return {
        name,
        active: active.has(name),
        supervisor: info.supervisor,
        groups: info.groups,
      };
    });
  } catch {
    return null;
  }
}

function read(): AuditorsState {
  if (typeof window === "undefined") return { records: defaultRecords() };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const migrated = migrateLegacy();
      return { records: migrated ?? defaultRecords() };
    }
    const parsed = JSON.parse(raw) as Partial<AuditorsState>;
    if (!Array.isArray(parsed.records) || parsed.records.length === 0) {
      return { records: defaultRecords() };
    }
    const records = parsed.records.map((r) => ({
      name: String(r.name),
      active: r.active !== false,
      supervisor: Boolean(r.supervisor),
      groups: (Array.isArray(r.groups) ? r.groups : []).filter((g) =>
        ALL_ZONE_GROUPS.includes(g as ZoneGroup),
      ) as ZoneGroup[],
    }));
    return { records };
  } catch {
    return { records: defaultRecords() };
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

  const all = state.records.map((r) => r.name);
  const active = state.records.filter((r) => r.active).map((r) => r.name);
  const infos: AuditorInfo[] = state.records.map((r) => ({
    name: r.name,
    supervisor: r.supervisor,
    groups: r.groups,
  }));
  const activeInfos = infos.filter((i) => active.includes(i.name));

  return {
    records: state.records,
    all,
    active,
    infos,
    activeInfos,
    save: (next: AuditorsState) => {
      write(next);
      setState(next);
    },
  };
}
