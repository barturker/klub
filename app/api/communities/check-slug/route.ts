import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('communities')
      .select('slug')
      .eq('slug', slug)
      .single();

    if (error && error.code === 'PGRST116') {
      return NextResponse.json({
        available: true,
        suggestion: slug,
      });
    }

    if (data) {
      let counter = 1;
      let suggestion = `${slug}-${counter}`;
      let isAvailable = false;

      while (!isAvailable && counter < 10) {
        const { data: checkData } = await supabase
          .from('communities')
          .select('slug')
          .eq('slug', suggestion)
          .single();

        if (!checkData) {
          isAvailable = true;
        } else {
          counter++;
          suggestion = `${slug}-${counter}`;
        }
      }

      return NextResponse.json({
        available: false,
        suggestion,
      });
    }

    return NextResponse.json({
      available: true,
      suggestion: slug,
    });
  } catch (error) {
    console.error('Error checking slug:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}