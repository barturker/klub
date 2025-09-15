import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile with calculated completion
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Calculate completion percentage using the database function
    const { data: completionData, error: completionError } = await supabase
      .rpc('calculate_profile_completion', { profile_id: user.id });

    if (completionError) {
      console.error('Error calculating completion:', completionError);
    }

    const completion_percentage = completionData || 0;

    return NextResponse.json({
      profile,
      completion_percentage,
    });
  } catch (error) {
    console.error('Error in GET /api/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();

    // Allowed fields to update
    const allowedFields = [
      'display_name',
      'full_name',
      'bio',
      'location',
      'interests',
      'social_links',
      'privacy_level',
      'website',
      'username',
    ];

    // Filter out non-allowed fields
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    // Validate privacy_level if provided
    if (updates.privacy_level) {
      const validPrivacyLevels = ['public', 'members_only', 'private'];
      if (!validPrivacyLevels.includes(updates.privacy_level)) {
        return NextResponse.json(
          { error: 'Invalid privacy level' },
          { status: 400 }
        );
      }
    }

    // Validate interests array if provided
    if (updates.interests && !Array.isArray(updates.interests)) {
      return NextResponse.json(
        { error: 'Interests must be an array' },
        { status: 400 }
      );
    }

    // Validate social_links object if provided
    if (updates.social_links && typeof updates.social_links !== 'object') {
      return NextResponse.json(
        { error: 'Social links must be an object' },
        { status: 400 }
      );
    }

    // Sanitize text fields for XSS
    if (updates.bio) {
      updates.bio = updates.bio.substring(0, 1000); // Limit bio to 1000 chars
    }
    if (updates.display_name) {
      updates.display_name = updates.display_name.substring(0, 100);
    }
    if (updates.location) {
      updates.location = updates.location.substring(0, 100);
    }

    // Update profile
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Calculate new completion percentage
    const { data: completionData } = await supabase
      .rpc('calculate_profile_completion', { profile_id: user.id });

    return NextResponse.json({
      success: true,
      profile,
      completion_percentage: completionData || 0,
    });
  } catch (error) {
    console.error('Error in PATCH /api/profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}