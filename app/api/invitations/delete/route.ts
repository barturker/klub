import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Delete/revoke invitation
export async function POST(request: Request) {
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

    // Get invitation ID from request body
    const { invitationId } = await request.json();

    if (!invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    // Get invitation details to check permissions
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        *,
        community:communities!invitations_community_id_fkey(
          id,
          organizer_id
        ),
        member:community_members!inner(
          role
        )
      `)
      .eq('id', invitationId)
      .eq('community_members.user_id', user.id)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check permissions:
    // - Admins can delete any invitation
    // - Moderators can only delete their own invitations
    // - Organizer can delete any invitation
    const isOrganizer = invitation.community.organizer_id === user.id;
    const isAdmin = invitation.member.role === 'admin';
    const isModerator = invitation.member.role === 'moderator';
    const isOwnInvitation = invitation.created_by === user.id;

    if (!isOrganizer && !isAdmin && !(isModerator && isOwnInvitation)) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this invitation' },
        { status: 403 }
      );
    }

    // Delete the invitation
    const { error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete invitation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation deleted successfully'
    });
  } catch (error) {
    console.error('Error in POST /api/invitations/delete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}