-- Test table (we might not like this later)
CREATE TABLE test (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add some indexes
CREATE INDEX idx_test_name ON test(name);
CREATE INDEX idx_test_created_at ON test(created_at DESC);

-- Enable RLS
ALTER TABLE test ENABLE ROW LEVEL SECURITY;

-- Add policy
CREATE POLICY "Test table is viewable by everyone" 
  ON test FOR SELECT 
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_test_updated_at BEFORE UPDATE ON test
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();