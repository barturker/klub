import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as z from 'zod';

const settingsSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  website_url: z.union([z.string().url(), z.literal('')]).optional().nullable(),
  custom_domain: z.string().optional().nullable(),
  theme_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  privacy_level: z.enum(['public', 'private', 'invite_only']).optional(),
  features: z.object({
    events: z.boolean().optional(),
    discussions: z.boolean().optional(),
    resources: z.boolean().optional(),
  }).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: community, error } = await supabase
      .from('communities')
      .select('*')
      .eq('id', resolvedParams.id)
      .single();

    if (error || !community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isOrganizer = community.organizer_id === user.id;
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', resolvedParams.id)
      .eq('user_id', user.id)
      .single();

    const canViewSettings = isOrganizer || membership?.role === 'admin';

    return NextResponse.json({
      settings: community,
      permissions: {
        canEdit: canViewSettings,
        isOrganizer,
        isAdmin: membership?.role === 'admin',
      },
    });
  } catch (error) {
    console.error('Error fetching community settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if community exists and user has permission
    const { data: community, error: fetchError } = await supabase
      .from('communities')
      .select('*')
      .eq('id', resolvedParams.id)
      .single();

    if (fetchError || !community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isOrganizer = community.organizer_id === user.id;
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', resolvedParams.id)
      .eq('user_id', user.id)
      .single();

    const canEditSettings = isOrganizer || membership?.role === 'admin';

    if (!canEditSettings) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to edit this community' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = settingsSchema.parse(body);

    // Track changes for history
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    const changedFields: string[] = [];

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined && community[key] !== value) {
        oldValues[key] = community[key];
        newValues[key] = value;
        changedFields.push(key);
      }
    });

    if (changedFields.length === 0) {
      return NextResponse.json({
        success: true,
        updated_fields: [],
        message: 'No changes detected',
      });
    }

    // Update community settings
    const { data: updatedCommunity, error: updateError } = await supabase
      .from('communities')
      .update(validatedData)
      .eq('id', resolvedParams.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating community:', updateError);
      return NextResponse.json(
        { error: 'Failed to update community settings' },
        { status: 500 }
      );
    }

    // Record changes in history table
    if (changedFields.length > 0) {
      const { error: historyError } = await supabase
        .from('community_settings_history')
        .insert({
          community_id: resolvedParams.id,
          changed_by: user.id,
          old_values: oldValues,
          new_values: newValues,
          changed_fields: changedFields,
          change_type: 'update',
        });

      if (historyError) {
        console.error('Error recording settings history:', historyError);
      }
    }

    return NextResponse.json({
      success: true,
      updated_fields: changedFields,
      data: updatedCommunity,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating community settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}