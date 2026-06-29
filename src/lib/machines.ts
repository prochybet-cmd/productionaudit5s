// Přehled strojů podle zón / linek / projektů.
// Zdroj: tabulka dodaná uživatelem.

export interface MachineRow {
  zone: string;     // Z1-A, Z1-B, Z2, Z3, …
  line: string;     // L1, L2, …
  project: string;  // 730B, XFK, Caddy5, PPE/C, PO416, KEB24, VW275, různé …
  machine: string;  // SO040, MO347, PI500 …
}

export const MACHINES: MachineRow[] = [
  // Z2 / L1
  { zone: "Z2", line: "L1", project: "730B", machine: "SO040" },
  { zone: "Z2", line: "L1", project: "730B", machine: "SO330" },
  { zone: "Z2", line: "L1", project: "730B", machine: "SO672" },
  { zone: "Z2", line: "L1", project: "730B", machine: "SO523" },
  // Z2 / L2
  { zone: "Z2", line: "L2", project: "XFK", machine: "SO002" },
  { zone: "Z2", line: "L2", project: "XFK", machine: "SO329" },
  { zone: "Z2", line: "L2", project: "XFK", machine: "SO092" },
  { zone: "Z2", line: "L2", project: "XFK", machine: "SO664" },
  { zone: "Z2", line: "L2", project: "XFK", machine: "SO527" },
  // Z2 / L3
  { zone: "Z2", line: "L3", project: "Caddy5", machine: "SO552" },
  { zone: "Z2", line: "L3", project: "Caddy5", machine: "SO554" },
  { zone: "Z2", line: "L3", project: "Caddy5", machine: "SO550" },
  // Z2 / L4
  { zone: "Z2", line: "L4", project: "PO416", machine: "SO097" },
  { zone: "Z2", line: "L4", project: "PO416", machine: "SO176" },
  { zone: "Z2", line: "L4", project: "PO416", machine: "SO801" },
  { zone: "Z2", line: "L4", project: "730B", machine: "SO775" },
  { zone: "Z2", line: "L4", project: "XFK", machine: "SO707" },
  { zone: "Z2", line: "L4", project: "PO416", machine: "SO531" },
  { zone: "Z2", line: "L4", project: "Caddy5", machine: "SO555" },
  { zone: "Z2", line: "L4", project: "PO416", machine: "MO308" },
  // Z3 / L5
  { zone: "Z3", line: "L5", project: "730B", machine: "MO347" },
  { zone: "Z3", line: "L5", project: "PPE/C", machine: "MO352" },
  { zone: "Z3", line: "L5", project: "PPE/C", machine: "MO362" },
  { zone: "Z3", line: "L5", project: "PPE/C", machine: "MO363" },
  { zone: "Z3", line: "L5", project: "PPE/C", machine: "MO354" },
  { zone: "Z3", line: "L5", project: "PPE/C", machine: "MO360" },
  { zone: "Z3", line: "L5", project: "PPE/C", machine: "MO361" },
  { zone: "Z3", line: "L5", project: "PPE/C", machine: "MO353" },
  { zone: "Z3", line: "L5", project: "PPE/C", machine: "MO358" },
  // Z3 / L6
  { zone: "Z3", line: "L6", project: "PPE/C", machine: "MO357" },
  { zone: "Z3", line: "L6", project: "PPE/C", machine: "MO355" },
  { zone: "Z3", line: "L6", project: "PPE/C", machine: "MO359" },
  { zone: "Z3", line: "L6", project: "XFK", machine: "MO348" },
  // Z3 / L7
  { zone: "Z3", line: "L7", project: "Caddy5", machine: "SO556" },
  { zone: "Z3", line: "L7", project: "Caddy5", machine: "SO550" },
  // Z1-A / L7
  { zone: "Z1-A", line: "L7", project: "PO416", machine: "SO008" },
  { zone: "Z1-A", line: "L7", project: "PPE/C", machine: "SO005" },
  { zone: "Z1-A", line: "L7", project: "PPE/C", machine: "SO809" },
  // Z1-A / L8
  { zone: "Z1-A", line: "L8", project: "KEB24", machine: "SO054" },
  { zone: "Z1-A", line: "L8", project: "PPE/C", machine: "SO808" },
  { zone: "Z1-A", line: "L8", project: "PPE/C", machine: "SO003" },
  { zone: "Z1-A", line: "L8", project: "PPE/C", machine: "SO004" },
  // Z1-B / L9
  { zone: "Z1-B", line: "L9", project: "PPE/C", machine: "SO811/1" },
  { zone: "Z1-B", line: "L9", project: "PPE/C", machine: "SO083" },
  { zone: "Z1-B", line: "L9", project: "PPE/C", machine: "SO082" },
  { zone: "Z1-B", line: "L9", project: "PPE/C", machine: "SO811/2" },
  { zone: "Z1-B", line: "L9", project: "PPE/C", machine: "SO084" },
  { zone: "Z1-B", line: "L9", project: "PPE/C", machine: "SO085" },
  // Z1-B / L10
  { zone: "Z1-B", line: "L10", project: "PPE/C", machine: "SO041" },
  { zone: "Z1-B", line: "L10", project: "PPE/C", machine: "SO810" },
  { zone: "Z1-B", line: "L10", project: "PPE/C", machine: "SO538" },
  { zone: "Z1-B", line: "L10", project: "PO416", machine: "SO777" },
  { zone: "Z1-B", line: "L10", project: "různé", machine: "PI501" },
  { zone: "Z1-B", line: "L10", project: "PPE/C", machine: "MO356" },
  { zone: "Z1-B", line: "L10", project: "PPE/C", machine: "SO776" },
  // Z3 / L11
  { zone: "Z3", line: "L11", project: "různé", machine: "PI500" },
  { zone: "Z3", line: "L11", project: "Caddy5", machine: "MO368" },
  { zone: "Z3", line: "L11", project: "VW275", machine: "MO302" },
  { zone: "Z3", line: "L11", project: "Caddy5", machine: "MO367" },
  // Z3 / L20 (PI510)
  { zone: "Z3", line: "L20", project: "730B", machine: "PI510" },
  // L12 — Dílna op.
  { zone: "Z2", line: "L12", project: "různé", machine: "Dílna op." },
  // Z2 / L5
  { zone: "Z2", line: "L5", project: "PPE/C", machine: "RF002" },
];

export const Z_GROUP_ORDER = ["Z1-A", "Z1-B", "Z2", "Z3", "Z?"];
export const LINE_ORDER = [
  "L1","L2","L3","L4","L5","L6","L7","L8","L9","L10","L11","L12","L20",
];

export function groupMachines(rows: MachineRow[] = MACHINES) {
  // zone -> line -> rows
  const out = new Map<string, Map<string, MachineRow[]>>();
  for (const r of rows) {
    if (!out.has(r.zone)) out.set(r.zone, new Map());
    const byLine = out.get(r.zone)!;
    if (!byLine.has(r.line)) byLine.set(r.line, []);
    byLine.get(r.line)!.push(r);
  }
  return out;
}
