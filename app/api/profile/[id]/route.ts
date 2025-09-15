import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const profileId = params.id;

    // Get current user (for privacy checks)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get target profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Track profile view if viewer is authenticated and not viewing own profile
    if (user && user.id !== profileId) {
      await supabase
        .from('profile_views')
        .insert({
          profile_id: profileId,
          viewer_id: user.id,
        })
        .select(); // Don't fail if insert fails
    }

    // Apply privacy settings
    let visibleProfile = { ...profile };
    if (profile.privacy_level === 'private' && (!user || user.id !== profileId)) {
      // Private profiles - only show basic info
      visibleProfile = {
        id: profile.id,
        display_name: profile.display_name || profile.full_name,
        avatar_url: profile.avatar_url,
        privacy_level: profile.privacy_level,
        member_since: profile.member_since,
      };
    } else if (profile.privacy_level === 'members_only' && !user) {
      // Members only - non-authenticated users see limited info
      visibleProfile = {
        id: profile.id,
        display_name: profile.display_name || profile.full_name,
        avatar_url: profile.avatar_url,
        privacy_level: profile.privacy_level,
        bio: profile.bio ? profile.bio.substring(0, 100) + '...' : null,
        member_since: profile.member_since,
      };
    }

    // Never expose email in public profiles unless it's the user's own profile
    if (!user || user.id !== profileId) {
      delete visibleProfile.email;
    }

    // Get shared communities if viewer is authenticated
    let sharedCommunities = [];
    if (user) {
      const { data: viewerCommunities } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id);

      const { data: profileCommunities } = await supabase
        .from('community_members')
        .select('community_id, communities(id, name, slug)')
        .eq('user_id', profileId);

      if (viewerCommunities && profileCommunities) {
        const viewerCommunityIds = viewerCommunities.map(c => c.community_id);
        sharedCommunities = profileCommunities
          .filter(c => viewerCommunityIds.includes(c.community_id))
          .map(c => c.communities)
          .filter(Boolean);
      }
    }

    // Check if current user is following this profile (placeholder for future)
    const isFollowing = false; // To be implemented with follow system

    return NextResponse.json({
      profile: visibleProfile,
      is_following: isFollowing,
      shared_communities: sharedCommunities,
    });
  } catch (error) {
    console.error('Error in GET /api/profile/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}