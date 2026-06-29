-- Tighten permissive INSERT policies on audits and audit_scores
DROP POLICY IF EXISTS "Anyone can insert audits" ON public.audits;
DROP POLICY IF EXISTS "Anyone can insert scores" ON public.audit_scores;

CREATE POLICY "Public can insert valid audits"
ON public.audits
FOR INSERT
TO public
WITH CHECK (
  length(btrim(zone)) BETWEEN 1 AND 100
  AND length(btrim(auditor)) BETWEEN 1 AND 100
  AND audit_date >= DATE '2024-01-01'
  AND audit_date <= (CURRENT_DATE + INTERVAL '1 day')
  AND max_score > 0
  AND max_score <= 1000
  AND total_score >= 0
  AND total_score <= max_score
  AND (note IS NULL OR length(note) <= 4000)
);

CREATE POLICY "Public can insert valid scores"
ON public.audit_scores
FOR INSERT
TO public
WITH CHECK (
  item_id BETWEEN 1 AND 25
  AND score BETWEEN 0 AND 5
  AND category IN ('seiri', 'seiton', 'seiso', 'seiketsu', 'shitsuke')
  AND (note IS NULL OR length(note) <= 2000)
);