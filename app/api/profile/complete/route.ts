import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Calculate completion percentage
    const { data: completionPercentage, error: completionError } = await supabase
      .rpc('calculate_profile_completion', { profile_id: user.id });

    if (completionError) {
      console.error('Error calculating completion:', completionError);
      return NextResponse.json(
        { error: 'Failed to calculate completion' },
        { status: 500 }
      );
    }

    // Determine missing fields
    const missingFields = [];

    if (!profile.display_name && !profile.full_name) {
      missingFields.push('name');
    }
    if (!profile.avatar_url) {
      missingFields.push('avatar');
    }
    if (!profile.bio || profile.bio.length < 20) {
      missingFields.push('bio');
    }
    if (!profile.location) {
      missingFields.push('location');
    }
    if (!profile.interests || profile.interests.length === 0) {
      missingFields.push('interests');
    }
    if (!profile.social_links || Object.keys(profile.social_links).length === 0) {
      missingFields.push('social_links');
    }
    if (!profile.website) {
      missingFields.push('website');
    }

    return NextResponse.json({
      completion_percentage: completionPercentage || 0,
      missing_fields: missingFields,
      profile_complete: completionPercentage >= 80,
    });
  } catch (error) {
    console.error('Error in POST /api/profile/complete:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}