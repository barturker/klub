-- Fix barturker profile with username and full name
UPDATE profiles
SET
  username = 'barturker',
  full_name = 'Bar Turker',
  updated_at = NOW()
WHERE id = '4e91b95a-a446-4668-90c4-aec5698eeff8' AND username IS NULL;