import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if community exists and user is the organizer
    const { data: community, error: fetchError } = await supabase
      .from('communities')
      .select('id, organizer_id, name')
      .eq('id', id)
      .single();

    if (fetchError || !community) {
      return NextResponse.json(
        { message: 'Community not found' },
        { status: 404 }
      );
    }

    // Only the organizer can delete the community
    if (community.organizer_id !== user.id) {
      return NextResponse.json(
        { message: 'Only the community organizer can delete this community' },
        { status: 403 }
      );
    }

    // Delete community (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('communities')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting community:', deleteError);
      return NextResponse.json(
        { message: 'Failed to delete community' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Community deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/communities/[id]:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}