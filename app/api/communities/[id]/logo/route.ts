import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import sharp from 'sharp';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
// const LOGO_SIZES = [
//   { size: 512, suffix: 'large' },
//   { size: 256, suffix: 'medium' },
//   { size: 128, suffix: 'small' },
//   { size: 64, suffix: 'thumbnail' },
// ];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      .eq('id', params.id)
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
      .eq('community_id', params.id)
      .eq('user_id', user.id)
      .single();

    const canUploadLogo = isOrganizer || membership?.role === 'admin';

    if (!canUploadLogo) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to upload a logo' },
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
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process and optimize the main logo (512x512)
    const processedLogo = await sharp(buffer)
      .resize(512, 512, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Generate thumbnail (128x128)
    const thumbnail = await sharp(buffer)
      .resize(128, 128, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Upload main logo to Supabase Storage
    const logoFileName = `${params.id}/logo-${Date.now()}.jpg`;
    const { error: logoError } = await supabase.storage
      .from('community-logos')
      .upload(logoFileName, processedLogo, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (logoError) {
      console.error('Error uploading logo:', logoError);
      return NextResponse.json(
        { error: 'Failed to upload logo' },
        { status: 500 }
      );
    }

    // Upload thumbnail
    const thumbnailFileName = `${params.id}/logo-thumbnail-${Date.now()}.jpg`;
    const { error: thumbnailError } = await supabase.storage
      .from('community-logos')
      .upload(thumbnailFileName, thumbnail, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (thumbnailError) {
      console.error('Error uploading thumbnail:', thumbnailError);
    }

    // Get public URLs
    const { data: logoUrlData } = supabase.storage
      .from('community-logos')
      .getPublicUrl(logoFileName);

    const { data: thumbnailUrlData } = supabase.storage
      .from('community-logos')
      .getPublicUrl(thumbnailFileName);

    // Delete old logo if exists
    if (community.logo_url) {
      try {
        const oldLogoPath = community.logo_url.split('/').pop();
        if (oldLogoPath) {
          await supabase.storage
            .from('community-logos')
            .remove([`${params.id}/${oldLogoPath}`]);
        }
      } catch (error) {
        console.error('Error deleting old logo:', error);
      }
    }

    // Update community with new logo URL
    const { error: updateError } = await supabase
      .from('communities')
      .update({ 
        logo_url: logoUrlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error updating community logo:', updateError);
      return NextResponse.json(
        { error: 'Failed to update community logo' },
        { status: 500 }
      );
    }

    // Record change in history
    await supabase
      .from('community_settings_history')
      .insert({
        community_id: params.id,
        changed_by: user.id,
        changes: {
          logo_url: {
            old: community.logo_url,
            new: logoUrlData.publicUrl,
          },
        },
      });

    return NextResponse.json({
      logo_url: logoUrlData.publicUrl,
      thumbnail_url: thumbnailUrlData.publicUrl,
      message: 'Logo uploaded successfully',
    });
  } catch (error) {
    console.error('Error processing logo upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}