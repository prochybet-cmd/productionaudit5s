
CREATE TABLE public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone TEXT NOT NULL,
  auditor TEXT NOT NULL,
  audit_date DATE NOT NULL,
  total_score NUMERIC NOT NULL,
  max_score INTEGER NOT NULL DEFAULT 125,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audits TO anon, authenticated;
GRANT ALL ON public.audits TO service_role;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read audits" ON public.audits FOR SELECT USING (true);
CREATE POLICY "Anyone can insert audits" ON public.audits FOR INSERT WITH CHECK (true);

CREATE TABLE public.audit_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 5),
  note TEXT
);
GRANT SELECT, INSERT ON public.audit_scores TO anon, authenticated;
GRANT ALL ON public.audit_scores TO service_role;
ALTER TABLE public.audit_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read scores" ON public.audit_scores FOR SELECT USING (true);
CREATE POLICY "Anyone can insert scores" ON public.audit_scores FOR INSERT WITH CHECK (true);

CREATE INDEX idx_audits_date ON public.audits(audit_date);
CREATE INDEX idx_audits_zone ON public.audits(zone);
CREATE INDEX idx_audits_auditor ON public.audits(auditor);
CREATE INDEX idx_audit_scores_audit ON public.audit_scores(audit_id);
CREATE INDEX idx_audit_scores_category ON public.audit_scores(category);
