import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Accept invitation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    console.log('🔵 Accept invitation endpoint called');
    const supabase = await createClient();
    const resolvedParams = await params;
    const { token } = resolvedParams;
    console.log('🎫 Token:', token);

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('👤 User:', user?.id, 'Auth error:', authError);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to accept an invitation' },
        { status: 401 }
      );
    }

    // Call the accept_invitation function
    console.log('🚀 Calling accept_invitation RPC with:', {
      p_token: token,
      p_user_id: user.id
    });

    const { data, error } = await supabase
      .rpc('accept_invitation', {
        p_token: token,
        p_user_id: user.id
      })
      .single();

    console.log('📦 RPC Response:', { data, error });

    if (error) {
      console.error('❌ Error accepting invitation:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });

      // Return more specific error message
      return NextResponse.json(
        {
          error: error.message || 'Failed to accept invitation',
          details: error.details,
          code: error.code
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to process invitation' },
        { status: 500 }
      );
    }

    // Get community slug for redirect
    let redirect_url = '/dashboard';
    if (data.success && data.community_id) {
      const { data: community } = await supabase
        .from('communities')
        .select('slug')
        .eq('id', data.community_id)
        .single();

      if (community) {
        redirect_url = `/explore/${community.slug}`;
      }
    }

    return NextResponse.json({
      success: data.success,
      message: data.message,
      community_id: data.community_id,
      redirect_url
    }, {
      status: data.success ? 200 : 400
    });
  } catch (error) {
    console.error('Error in POST /api/invitations/[token]/accept:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}