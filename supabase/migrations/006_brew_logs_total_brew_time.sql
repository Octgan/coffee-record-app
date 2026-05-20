-- Total extraction time measured by drip timer (seconds); nullable
ALTER TABLE public.brew_logs
  ADD COLUMN IF NOT EXISTS total_brew_time_sec integer;
