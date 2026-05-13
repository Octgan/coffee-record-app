-- Optional extraction parameters (water / bloom / coffee maker course)
ALTER TABLE public.brew_logs
  ADD COLUMN IF NOT EXISTS water_temp_c smallint,
  ADD COLUMN IF NOT EXISTS bloom_time_sec smallint,
  ADD COLUMN IF NOT EXISTS coffee_maker_course text;
