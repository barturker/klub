import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all communities where current user is organizer
    const { data: communities, error: communitiesError } = await supabase
      .from('communities')
      .select('id, name, organizer_id, created_at')
      .eq('organizer_id', user.id);

    if (communitiesError) {
      console.error('Error fetching communities:', communitiesError);
      return NextResponse.json(
        { error: 'Failed to fetch communities' },
        { status: 500 }
      );
    }

    const results = [];

    for (const community of communities || []) {
      // Check if organizer is already a member
      const { data: existingMember, error: checkError } = await supabase
        .from('community_members')
        .select('id, role')
        .eq('community_id', community.id)
        .eq('user_id', community.organizer_id)
        .maybeSingle(); // Use maybeSingle instead of single

      if (checkError) {
        console.error(`Error checking membership for ${community.name}:`, checkError);
        results.push({
          community: community.name,
          status: 'error',
          message: checkError.message
        });
        continue;
      }

      if (!existingMember) {
        // Add organizer as admin
        const { data: insertData, error: insertError } = await supabase
          .from('community_members')
          .insert({
            community_id: community.id,
            user_id: community.organizer_id,
            role: 'admin',
            joined_at: community.created_at
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Error adding organizer to ${community.name}:`, insertError);
          results.push({
            community: community.name,
            status: 'error',
            message: insertError.message
          });
        } else {
          console.log(`Successfully added organizer as admin to ${community.name}`, insertData);
          results.push({
            community: community.name,
            status: 'added',
            message: 'Added organizer as admin'
          });
        }
      } else if (existingMember.role !== 'admin') {
        // Update role to admin if not already
        const { error: updateError } = await supabase
          .from('community_members')
          .update({ role: 'admin' })
          .eq('id', existingMember.id);

        if (updateError) {
          console.error(`Error updating role for ${community.name}:`, updateError);
          results.push({
            community: community.name,
            status: 'error',
            message: updateError.message
          });
        } else {
          results.push({
            community: community.name,
            status: 'updated',
            message: 'Updated organizer role to admin'
          });
        }
      } else {
        results.push({
          community: community.name,
          status: 'ok',
          message: 'Organizer already admin'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        added: results.filter(r => r.status === 'added').length,
        updated: results.filter(r => r.status === 'updated').length,
        ok: results.filter(r => r.status === 'ok').length,
        errors: results.filter(r => r.status === 'error').length
      }
    });
  } catch (error) {
    console.error('Error in GET /api/fix-organizers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}