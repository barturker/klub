-- Create function to generate unique event slug
CREATE OR REPLACE FUNCTION public.generate_event_slug(
  p_title TEXT,
  p_community_id UUID
)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Generate base slug from title
  base_slug := LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(p_title, '[^\w\s-]', '', 'g'),  -- Remove non-alphanumeric
        '\s+', '-', 'g'  -- Replace spaces with hyphens
      ),
      '-+', '-', 'g'  -- Replace multiple hyphens with single
    )
  );

  -- Remove leading/trailing hyphens
  base_slug := TRIM(BOTH '-' FROM base_slug);

  -- If empty, use 'event'
  IF base_slug = '' THEN
    base_slug := 'event';
  END IF;

  final_slug := base_slug;

  -- Check for uniqueness within the community
  WHILE EXISTS (
    SELECT 1 FROM events
    WHERE slug = final_slug
    AND community_id = p_community_id
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.generate_event_slug(TEXT, UUID) TO authenticated;