import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

// Create new invitation
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Check if user is admin or moderator of the community
    const { data: memberData, error: memberError } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'You are not a member of this community' },
        { status: 403 }
      );
    }

    if (!['admin', 'moderator'].includes(memberData.role)) {
      return NextResponse.json(
        { error: 'Only admins and moderators can create invitations' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { expires_in_days = 7, max_uses = 1 } = body;

    // Generate unique token (8 characters)
    const token = nanoid(8);

    // Calculate expiration date
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expires_in_days);

    // Create invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        community_id: params.id,
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
      console.error('Error creating invitation:', invitationError);
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      );
    }

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
    console.error('Error in POST /api/communities/[id]/invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get all invitations for a community
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Check if user is admin or moderator of the community
    const { data: memberData, error: memberError } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: 'You are not a member of this community' },
        { status: 403 }
      );
    }

    if (!['admin', 'moderator'].includes(memberData.role)) {
      return NextResponse.json(
        { error: 'Only admins and moderators can view invitations' },
        { status: 403 }
      );
    }

    // Get invitations with creator info
    const { data: invitations, error: invitationsError } = await supabase
      .from('invitations')
      .select(`
        *,
        creator:profiles!invitations_created_by_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        invitation_uses(
          id,
          user_id,
          accepted_at,
          user:profiles!invitation_uses_user_id_fkey(
            id,
            username,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('community_id', params.id)
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    // Calculate stats
    const stats = {
      total: invitations.length,
      active: invitations.filter(inv =>
        inv.uses_count < inv.max_uses &&
        new Date(inv.expires_at) > new Date()
      ).length,
      used: invitations.filter(inv => inv.uses_count > 0).length,
      expired: invitations.filter(inv => new Date(inv.expires_at) <= new Date()).length
    };

    return NextResponse.json({
      invitations,
      stats
    });
  } catch (error) {
    console.error('Error in GET /api/communities/[id]/invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}