-- Smart dose / ratio / total water for brew logs
ALTER TABLE public.brew_logs
  ADD COLUMN IF NOT EXISTS coffee_dose_g numeric,
  ADD COLUMN IF NOT EXISTS brew_ratio numeric,
  ADD COLUMN IF NOT EXISTS total_water_ml integer;
