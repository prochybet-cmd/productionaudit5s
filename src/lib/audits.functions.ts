import { createServerFn } from "@tanstack/react-start";
import { requireUnlocked } from "./gate.functions";

type AuditRow = {
  id: string;
  zone: string;
  auditor: string;
  audit_date: string;
  total_score: number;
  max_score: number;
  note: string | null;
  created_at: string;
  department: string;
};

type ScoreRow = {
  id: string;
  audit_id: string;
  item_id: number;
  category: string;
  score: number;
  note: string | null;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listAudits = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const db = await admin();
  const { data, error } = await db
    .from("audits")
    .select("*")
    .order("audit_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditRow[];
});

export const listAuditsByDeptRange = createServerFn({ method: "GET" })
  .inputValidator((data: { department: string; from: string; to: string }) => data)
  .handler(async ({ data }) => {
    await requireUnlocked();
    const db = await admin();
    const { data: rows, error } = await db
      .from("audits")
      .select("id, zone, auditor, audit_date, created_at")
      .eq("department", data.department)
      .gte("audit_date", data.from)
      .lte("audit_date", data.to);
    if (error) throw new Error(error.message);
    return (rows ?? []) as Pick<AuditRow, "id" | "zone" | "auditor" | "audit_date" | "created_at">[];
  });

export const listAuditsAndScores = createServerFn({ method: "GET" }).handler(async () => {
  await requireUnlocked();
  const db = await admin();
  const [a, s] = await Promise.all([
    db.from("audits").select("*"),
    db.from("audit_scores").select("*"),
  ]);
  if (a.error) throw new Error(a.error.message);
  if (s.error) throw new Error(s.error.message);
  return {
    audits: (a.data ?? []) as AuditRow[],
    scores: (s.data ?? []) as ScoreRow[],
  };
});

export const getAuditWithScores = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireUnlocked();
    const db = await admin();
    const [a, s] = await Promise.all([
      db.from("audits").select("*").eq("id", data.id).single(),
      db.from("audit_scores").select("*").eq("audit_id", data.id).order("item_id"),
    ]);
    if (a.error) throw new Error(a.error.message);
    if (s.error) throw new Error(s.error.message);
    return {
      audit: a.data as AuditRow,
      scores: (s.data ?? []) as ScoreRow[],
    };
  });

type SaveAuditInput = {
  zone: string;
  auditor: string;
  audit_date: string;
  total_score: number;
  max_score: number;
  note: string | null;
  department: string;
  scores: Array<{
    item_id: number;
    category: string;
    score: number;
    note: string | null;
  }>;
};

export const saveAudit = createServerFn({ method: "POST" })
  .inputValidator((data: SaveAuditInput) => data)
  .handler(async ({ data }) => {
    await requireUnlocked();

    // Server-side validation
    if (!data.zone?.trim() || data.zone.length > 100) throw new Error("Invalid zone");
    if (!data.auditor?.trim() || data.auditor.length > 100) throw new Error("Invalid auditor");
    if (!data.audit_date) throw new Error("Invalid date");
    if (data.max_score <= 0 || data.max_score > 1000) throw new Error("Invalid max_score");
    if (data.total_score < 0 || data.total_score > data.max_score) throw new Error("Invalid total_score");
    if (data.note && data.note.length > 4000) throw new Error("Note too long");
    if (!Array.isArray(data.scores) || data.scores.length === 0) throw new Error("Missing scores");
    for (const s of data.scores) {
      if (!Number.isInteger(s.item_id) || s.item_id < 1 || s.item_id > 25) throw new Error("Invalid item_id");
      if (!Number.isInteger(s.score) || s.score < 0 || s.score > 5) throw new Error("Invalid score");
      if (!["seiri", "seiton", "seiso", "seiketsu", "shitsuke"].includes(s.category)) throw new Error("Invalid category");
      if (s.note && s.note.length > 2000) throw new Error("Score note too long");
    }

    const db = await admin();
    const { data: audit, error: e1 } = await db
      .from("audits")
      .insert({
        zone: data.zone.trim(),
        auditor: data.auditor.trim(),
        audit_date: data.audit_date,
        total_score: data.total_score,
        max_score: data.max_score,
        note: data.note,
        department: data.department,
      })
      .select()
      .single();
    if (e1 || !audit) throw new Error(e1?.message ?? "Insert failed");

    const rows = data.scores.map((s) => ({
      audit_id: audit.id,
      item_id: s.item_id,
      category: s.category,
      score: s.score,
      note: s.note,
    }));
    const { error: e2 } = await db.from("audit_scores").insert(rows);
    if (e2) {
      // best-effort cleanup
      await db.from("audits").delete().eq("id", audit.id);
      throw new Error(e2.message);
    }

    return { id: audit.id as string };
  });
