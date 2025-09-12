import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // In this case, 'id' parameter is actually the slug
    const slug = params.id;
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      description: data.description,
      slug: data.slug,
      organizer_id: data.organizer_id,
      member_count: data.member_count,
      is_public: data.is_public,
      avatar_url: data.avatar_url,
      cover_image_url: data.cover_image_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
    });
  } catch (error) {
    console.error('Error fetching community by slug:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}