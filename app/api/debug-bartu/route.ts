import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      return NextResponse.json({ error: 'Not authenticated', details: authError });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    // Get communities where user is organizer
    const { data: myOwnedCommunities, error: ownedError } = await supabase
      .from('communities')
      .select('id, name, slug, organizer_id, privacy_level')
      .eq('organizer_id', user?.id);

    // Get community memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('community_members')
      .select(`
        community_id,
        role,
        joined_at,
        communities (
          id,
          name,
          slug,
          organizer_id,
          privacy_level
        )
      `)
      .eq('user_id', user?.id);

    // Check Zımbads specifically
    const { data: zimbads, error: zimbadsError } = await supabase
      .from('communities')
      .select('*')
      .or('slug.eq.zimbads,name.ilike.%Zımbads%,name.ilike.%Zimbads%');

    // Check if user is member/admin of Zımbads
    let zimbadsMembership = null;
    if (zimbads && zimbads.length > 0) {
      const { data: membership } = await supabase
        .from('community_members')
        .select('*')
        .eq('community_id', zimbads[0].id)
        .eq('user_id', user?.id)
        .single();
      zimbadsMembership = membership;
    }

    return NextResponse.json({
      currentUser: {
        id: user?.id,
        email: user?.email,
        profile: profile
      },
      myOwnedCommunities: myOwnedCommunities || [],
      myMemberships: memberships || [],
      zimbadsInfo: {
        community: zimbads?.[0] || null,
        myMembership: zimbadsMembership
      },
      errors: {
        profileError,
        ownedError,
        membershipError,
        zimbadsError
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Server error', details: error });
  }
}