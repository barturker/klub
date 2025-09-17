-- Update existing draft events to published status
-- This is a one-time fix for events that were created as draft

UPDATE public.events
SET status = 'published'
WHERE slug = 'xcededed'
  AND status = 'draft';

-- Optional: Update all draft events to published (uncomment if needed)
-- UPDATE public.events
-- SET status = 'published'
-- WHERE status = 'draft';