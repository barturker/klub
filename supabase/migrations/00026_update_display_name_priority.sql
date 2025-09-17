-- Update display_name to be used as primary display field
-- This ensures any user who sets their display_name will have it shown in invitations

-- First, ensure barturker's profile has a proper display_name
UPDATE profiles
SET
  display_name = CASE
    WHEN display_name IS NOT NULL AND display_name != '' THEN display_name
    WHEN full_name IS NOT NULL AND full_name != '' THEN full_name
    WHEN username IS NOT NULL THEN username
    ELSE 'Bar Turker'
  END,
  updated_at = NOW()
WHERE id = '4e91b95a-a446-4668-90c4-aec5698eeff8';

-- Add a comment to document the display priority
COMMENT ON COLUMN profiles.display_name IS 'Primary display name shown in UI. Falls back to full_name, username, or email prefix if not set.';