-- Seed data for development
-- This file is automatically run when you run `supabase db reset`

-- Only seed in development environment
DO $$
BEGIN
  -- You can add test data here when needed
  -- Example:
  /*
  INSERT INTO profiles (id, username, full_name)
  VALUES 
    ('00000000-0000-0000-0000-000000000001', 'testuser1', 'Test User 1'),
    ('00000000-0000-0000-0000-000000000002', 'testuser2', 'Test User 2');
  */
END $$;