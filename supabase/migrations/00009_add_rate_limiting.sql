-- Add rate limiting support for community creation
-- Created: 2025-01-11

-- Create rate_limits table to track API usage
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1 NOT NULL,
  window_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, action, window_start)
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_attempts INTEGER,
  p_window_hours INTEGER DEFAULT 24
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, reset_at TIMESTAMPTZ) AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Calculate the start of the current window
  v_window_start := date_trunc('hour', NOW() - INTERVAL '1 hour' * (p_window_hours - 1));
  v_reset_at := v_window_start + INTERVAL '1 hour' * p_window_hours;
  
  -- Get current count for this window
  SELECT COALESCE(SUM(count), 0) INTO v_current_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND window_start >= v_window_start;
  
  -- Return the result
  RETURN QUERY
  SELECT 
    (v_current_count < p_max_attempts) AS allowed,
    v_current_count AS current_count,
    v_reset_at AS reset_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment rate limit
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_window_hours INTEGER DEFAULT 24
)
RETURNS VOID AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Calculate the start of the current window (hourly buckets)
  v_window_start := date_trunc('hour', NOW());
  
  -- Insert or update the rate limit record
  INSERT INTO rate_limits (user_id, action, count, window_start)
  VALUES (p_user_id, p_action, 1, v_window_start)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET 
    count = rate_limits.count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up old rate limit records (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS VOID AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on rate_limits table
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own rate limits
CREATE POLICY "Users can view own rate limits"
  ON rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can manage all rate limits (for functions)
CREATE POLICY "System can manage rate limits"
  ON rate_limits FOR ALL
  USING (auth.uid() IS NOT NULL);