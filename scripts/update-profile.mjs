// Script to update user profile with username
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load env vars manually
const envFile = readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateProfile() {
  const userId = '4e91b95a-a446-4668-90c4-aec5698eeff8';

  // First, check current profile
  const { data: currentProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  console.log('Current profile:', currentProfile);

  if (fetchError) {
    console.error('Error fetching profile:', fetchError);
    return;
  }

  // Update profile with username
  const { data, error } = await supabase
    .from('profiles')
    .update({
      username: 'barturker',
      full_name: 'Bar Turker'
    })
    .eq('id', userId)
    .select();

  if (error) {
    console.error('Error updating profile:', error);
  } else {
    console.log('Profile updated successfully:', data);
  }
}

updateProfile().catch(console.error);