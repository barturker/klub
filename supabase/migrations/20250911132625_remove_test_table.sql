-- Remove test table (we didn't like it)

-- Drop policies first
DROP POLICY IF EXISTS "Test table is viewable by everyone" ON test;

-- Drop trigger
DROP TRIGGER IF EXISTS update_test_updated_at ON test;

-- Drop indexes
DROP INDEX IF EXISTS idx_test_name;
DROP INDEX IF EXISTS idx_test_created_at;

-- Finally drop the table
DROP TABLE IF EXISTS test;

-- Note: This is the clean way to remove a table
-- All related objects are removed in correct order