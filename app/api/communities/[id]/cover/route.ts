import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import sharp from 'sharp';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for cover images
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const COVER_WIDTH = 1920;
const COVER_HEIGHT = 480;

export async function POST(
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

    // Check permissions
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

    const isOrganizer = community.organizer_id === user.id;
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', resolvedParams.id)
      .eq('user_id', user.id)
      .single();

    const canUploadCover = isOrganizer || membership?.role === 'admin';

    if (!canUploadCover) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to upload a cover image' },
        { status: 403 }
      );
    }

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB for cover images.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process and optimize the cover image
    const processedCover = await sharp(buffer)
      .resize(COVER_WIDTH, COVER_HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    // Generate mobile version (smaller for faster loading)
    const mobileCover = await sharp(buffer)
      .resize(768, 192, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();

    // Upload main cover to Supabase Storage
    const coverFileName = `${resolvedParams.id}/cover-${Date.now()}.jpg`;
    const { error: coverError } = await supabase.storage
      .from('community-covers')
      .upload(coverFileName, processedCover, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (coverError) {
      console.error('Error uploading cover:', coverError);
      return NextResponse.json(
        { error: 'Failed to upload cover image' },
        { status: 500 }
      );
    }

    // Upload mobile version
    const mobileCoverFileName = `${resolvedParams.id}/cover-mobile-${Date.now()}.jpg`;
    const { error: mobileError } = await supabase.storage
      .from('community-covers')
      .upload(mobileCoverFileName, mobileCover, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (mobileError) {
      console.error('Error uploading mobile cover:', mobileError);
    }

    // Get public URLs
    const { data: coverUrlData } = supabase.storage
      .from('community-covers')
      .getPublicUrl(coverFileName);

    const { data: mobileUrlData } = supabase.storage
      .from('community-covers')
      .getPublicUrl(mobileCoverFileName);

    // Delete old cover if exists
    if (community.cover_image_url) {
      try {
        const oldCoverPath = community.cover_image_url.split('/').pop();
        if (oldCoverPath) {
          await supabase.storage
            .from('community-covers')
            .remove([`${resolvedParams.id}/${oldCoverPath}`]);
        }
      } catch (error) {
        console.error('Error deleting old cover:', error);
      }
    }

    // Update community with new cover URL
    const { error: updateError } = await supabase
      .from('communities')
      .update({ 
        cover_image_url: coverUrlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolvedParams.id);

    if (updateError) {
      console.error('Error updating community cover:', updateError);
      return NextResponse.json(
        { error: 'Failed to update community cover image' },
        { status: 500 }
      );
    }

    // Record change in history
    await supabase
      .from('community_settings_history')
      .insert({
        community_id: resolvedParams.id,
        changed_by: user.id,
        changes: {
          cover_image_url: {
            old: community.cover_image_url,
            new: coverUrlData.publicUrl,
          },
        },
      });

    return NextResponse.json({
      cover_url: coverUrlData.publicUrl,
      mobile_cover_url: mobileUrlData.publicUrl,
      message: 'Cover image uploaded successfully',
    });
  } catch (error) {
    console.error('Error processing cover upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check permissions
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

    const isOrganizer = community.organizer_id === user.id;
    const { data: membership } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', resolvedParams.id)
      .eq('user_id', user.id)
      .single();

    const canDeleteCover = isOrganizer || membership?.role === 'admin';

    if (!canDeleteCover) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete the cover image' },
        { status: 403 }
      );
    }

    // Delete cover image from storage
    if (community.cover_image_url) {
      try {
        const coverPath = community.cover_image_url.split('/').pop();
        if (coverPath) {
          await supabase.storage
            .from('community-covers')
            .remove([`${resolvedParams.id}/${coverPath}`]);
        }
      } catch (error) {
        console.error('Error deleting cover from storage:', error);
      }
    }

    // Update community to remove cover URL
    const { error: updateError } = await supabase
      .from('communities')
      .update({ 
        cover_image_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolvedParams.id);

    if (updateError) {
      console.error('Error removing community cover:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove community cover image' },
        { status: 500 }
      );
    }

    // Record change in history
    await supabase
      .from('community_settings_history')
      .insert({
        community_id: resolvedParams.id,
        changed_by: user.id,
        changes: {
          cover_image_url: {
            old: community.cover_image_url,
            new: null,
          },
        },
      });

    return NextResponse.json({
      message: 'Cover image removed successfully',
    });
  } catch (error) {
    console.error('Error deleting cover:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}