-- Hand drip: paper filter type / brand (nullable for other brew methods)
ALTER TABLE public.brew_logs
  ADD COLUMN IF NOT EXISTS paper_filter text;
