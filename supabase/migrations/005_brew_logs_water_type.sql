-- Water used for brewing (all methods; nullable when not recorded)
ALTER TABLE public.brew_logs
  ADD COLUMN IF NOT EXISTS water_type text;
