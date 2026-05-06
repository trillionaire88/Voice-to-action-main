-- Optional poll end times must be at least one hour after the poll row is created (covers weak mobile date inputs and API bypass).

ALTER TABLE public.polls DROP CONSTRAINT IF EXISTS polls_end_time_minimum_after_create;

ALTER TABLE public.polls
  ADD CONSTRAINT polls_end_time_minimum_after_create
  CHECK (end_time IS NULL OR end_time > created_at + INTERVAL '1 hour');
