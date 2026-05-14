-- Cupping: steep time memo (free text) and persisted grind size selection
ALTER TABLE public.brew_logs
  ADD COLUMN IF NOT EXISTS steep_time_memo text,
  ADD COLUMN IF NOT EXISTS grind_size text;
