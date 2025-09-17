import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// Create new invitation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    console.log('[POST /api/communities/[id]/invitations] Starting...');
    console.log('[POST] Community ID:', resolvedParams.id);

    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[POST] Auth check:', { userId: user?.id, authError });

    if (authError || !user) {
      console.log('[POST] Unauthorized - no user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin or moderator of the community
    console.log('[POST] Checking member role for:', { communityId: resolvedParams.id, userId: user.id });
    const { data: memberData, error: memberError } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', resolvedParams.id)
      .eq('user_id', user.id)
      .single();

    console.log('[POST] Member check result:', { memberData, memberError });

    if (memberError || !memberData) {
      console.log('[POST] User not a member');
      return NextResponse.json(
        { error: 'You are not a member of this community' },
        { status: 403 }
      );
    }

    if (!['admin', 'moderator'].includes(memberData.role)) {
      console.log('[POST] User not admin/moderator, role:', memberData.role);
      return NextResponse.json(
        { error: 'Only admins and moderators can create invitations' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { expires_in_days = 7, max_uses = 1 } = body;
    console.log('[POST] Request params:', { expires_in_days, max_uses });

    // Generate unique token (8 characters)
    const token = nanoid(8);

    // Calculate expiration date
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expires_in_days);

    // Create invitation
    console.log('[POST] Creating invitation with:', {
      community_id: resolvedParams.id,
      token,
      created_by: user.id,
      created_by_role: memberData.role,
      expires_at: expires_at.toISOString(),
      max_uses
    });

    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        community_id: resolvedParams.id,
        token,
        created_by: user.id,
        created_by_role: memberData.role,
        expires_at: expires_at.toISOString(),
        max_uses,
        uses_count: 0
      })
      .select()
      .single();

    if (invitationError) {
      console.error('[POST] Error creating invitation:', invitationError);
      return NextResponse.json(
        { error: 'Failed to create invitation', details: invitationError },
        { status: 500 }
      );
    }

    console.log('[POST] Invitation created successfully:', invitation);

    // Get app URL for constructing the invitation link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invite_url = `${appUrl}/invite/${invitation.token}`;

    return NextResponse.json({
      invitation_id: invitation.id,
      token: invitation.token,
      invite_url,
      expires_at: invitation.expires_at,
      max_uses: invitation.max_uses
    });
  } catch (error) {
    console.error('[POST] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}

// Get all invitations for a community
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    console.log('[GET /api/communities/[id]/invitations] Starting...');
    console.log('[GET] Community ID:', resolvedParams.id);

    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[GET] Auth check:', { userId: user?.id, authError });

    if (authError || !user) {
      console.log('[GET] Unauthorized - no user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin or moderator of the community
    console.log('[GET] Checking member role for:', { communityId: resolvedParams.id, userId: user.id });
    const { data: memberData, error: memberError } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', resolvedParams.id)
      .eq('user_id', user.id)
      .single();

    console.log('[GET] Member check result:', { memberData, memberError });

    if (memberError || !memberData) {
      console.log('[GET] User not a member');
      return NextResponse.json(
        { error: 'You are not a member of this community', details: memberError },
        { status: 403 }
      );
    }

    if (!['admin', 'moderator'].includes(memberData.role)) {
      console.log('[GET] User not admin/moderator, role:', memberData.role);
      return NextResponse.json(
        { error: 'Only admins and moderators can view invitations' },
        { status: 403 }
      );
    }

    // Get invitations
    console.log('[GET] Fetching invitations for community:', resolvedParams.id);
    const { data: invitations, error: invitationsError } = await supabase
      .from('invitations')
      .select('*')
      .eq('community_id', resolvedParams.id)
      .order('created_at', { ascending: false });

    console.log('[GET] Invitations query result:', {
      count: invitations?.length,
      error: invitationsError
    });

    if (invitationsError) {
      console.error('[GET] Error fetching invitations:', invitationsError);
      return NextResponse.json(
        { error: 'Failed to fetch invitations', details: invitationsError },
        { status: 500 }
      );
    }

    // Fetch invitation_uses for all invitations
    if (invitations && invitations.length > 0) {
      const invitationIds = invitations.map(inv => inv.id);
      console.log('[GET] Fetching invitation_uses for invitation IDs:', invitationIds);

      const { data: invitationUses, error: usesError } = await supabase
        .from('invitation_uses')
        .select('*')
        .in('invitation_id', invitationIds);

      console.log('[GET] Invitation uses query result:', {
        invitationUses,
        usesError,
        count: invitationUses?.length
      });

      // Group invitation_uses by invitation_id
      if (!usesError && invitationUses) {
        const usesMap = new Map();
        invitationUses.forEach(use => {
          if (!usesMap.has(use.invitation_id)) {
            usesMap.set(use.invitation_id, []);
          }
          usesMap.get(use.invitation_id).push(use);
        });

        // Attach invitation_uses to invitations
        invitations.forEach(inv => {
          inv.invitation_uses = usesMap.get(inv.id) || [];
        });
      }
    }

    // Fetch creator profiles and user profiles for invitation_uses
    if (invitations && invitations.length > 0) {
      // Get all unique creator IDs
      const creatorIds = [...new Set(invitations.map(inv => inv.created_by))];
      console.log('[GET] Fetching profiles for creator IDs:', creatorIds);

      // Get all unique user IDs from invitation_uses
      const userIds = [...new Set(
        invitations.flatMap(inv =>
          inv.invitation_uses ? inv.invitation_uses.map(use => use.user_id) : []
        )
      )];
      console.log('[GET] Fetching profiles for user IDs who used invitations:', userIds);

      // Combine all unique IDs
      const allUserIds = [...new Set([...creatorIds, ...userIds])];
      console.log('[GET] Fetching profiles for all user IDs:', allUserIds);

      // Fetch all profiles at once
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, display_name, email, avatar_url')
        .in('id', allUserIds);

      console.log('[GET] Profiles query result:', {
        profiles,
        profilesError,
        profileCount: profiles?.length
      });

      if (!profilesError && profiles) {
        const profileMap = new Map(profiles.map(p => [p.id, p]));

        // Enhance invitations with creator info
        invitations.forEach(inv => {
          inv.creator = profileMap.get(inv.created_by) || null;

          // Enhance invitation_uses with user profile info
          if (inv.invitation_uses && inv.invitation_uses.length > 0) {
            inv.invitation_uses = inv.invitation_uses.map(use => ({
              ...use,
              user: profileMap.get(use.user_id) || null
            }));
          }
        });

        console.log('[GET] Enhanced invitations with creator and user info:',
          invitations.map(inv => ({
            token: inv.token,
            created_by: inv.created_by,
            creator: inv.creator,
            invitation_uses: inv.invitation_uses
          }))
        );
      }
    }

    // Calculate stats
    const stats = {
      total: invitations?.length || 0,
      active: invitations?.filter(inv =>
        inv.uses_count < inv.max_uses &&
        new Date(inv.expires_at) > new Date()
      ).length || 0,
      used: invitations?.filter(inv =>
        inv.invitation_uses && inv.invitation_uses.length > 0
      ).length || 0,
      expired: invitations?.filter(inv => new Date(inv.expires_at) <= new Date()).length || 0
    };

    console.log('[GET] Stats calculated:', stats);

    return NextResponse.json({
      invitations: invitations || [],
      stats
    });
  } catch (error) {
    console.error('[GET] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}