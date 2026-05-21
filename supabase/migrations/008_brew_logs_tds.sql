-- TDS (Total Dissolved Solids) concentration in %, pro-mode brew logs
ALTER TABLE public.brew_logs
  ADD COLUMN IF NOT EXISTS tds numeric;
