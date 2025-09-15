/**
 * Script to fix organizer roles
 * This ensures all community organizers are properly added as admin members
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixOrganizerRoles() {
  console.log('Starting to fix organizer roles...');

  try {
    // Get all communities
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('id, name, organizer_id, created_at');

    if (communitiesError) {
      console.error('Error fetching communities:', communitiesError);
      return;
    }

    console.log(`Found ${communities?.length || 0} communities`);

    for (const community of communities || []) {
      // Check if organizer is already a member
      const { data: existingMember, error: checkError } = await supabase
        .from('community_members')
        .select('id, role')
        .eq('community_id', community.id)
        .eq('user_id', community.organizer_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
        console.error(`Error checking membership for ${community.name}:`, checkError);
        continue;
      }

      if (!existingMember) {
        // Add organizer as admin
        const { error: insertError } = await supabase
          .from('community_members')
          .insert({
            community_id: community.id,
            user_id: community.organizer_id,
            role: 'admin',
            joined_at: community.created_at
          });

        if (insertError) {
          console.error(`Error adding organizer to ${community.name}:`, insertError);
        } else {
          console.log(`✅ Added organizer as admin to ${community.name}`);
        }
      } else if (existingMember.role !== 'admin') {
        // Update role to admin if not already
        const { error: updateError } = await supabase
          .from('community_members')
          .update({ role: 'admin' })
          .eq('id', existingMember.id);

        if (updateError) {
          console.error(`Error updating role for ${community.name}:`, updateError);
        } else {
          console.log(`✅ Updated organizer role to admin in ${community.name}`);
        }
      } else {
        console.log(`✓ Organizer already admin in ${community.name}`);
      }
    }

    console.log('Finished fixing organizer roles');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
fixOrganizerRoles();