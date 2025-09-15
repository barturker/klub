import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Validate invitation token
export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = await createClient();
    const { token } = params;

    // Call the is_invitation_valid function
    const { data, error } = await supabase
      .rpc('is_invitation_valid', { p_token: token })
      .single();

    if (error) {
      console.error('Error validating invitation:', error);
      return NextResponse.json(
        { error: 'Failed to validate invitation' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid invitation code'
        },
        { status: 404 }
      );
    }

    // Get additional community details
    const { data: community } = await supabase
      .from('communities')
      .select('name, slug, description, logo_url, cover_image_url, member_count')
      .eq('id', data.community_id)
      .single();

    return NextResponse.json({
      valid: data.valid,
      invitation_id: data.invitation_id,
      community: {
        id: data.community_id,
        name: community?.name || data.community_name,
        slug: community?.slug,
        description: community?.description,
        logo_url: community?.logo_url,
        cover_image_url: community?.cover_image_url,
        member_count: community?.member_count
      },
      expires_at: data.expires_at,
      uses_remaining: data.uses_remaining
    });
  } catch (error) {
    console.error('Error in GET /api/invitations/[token]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}