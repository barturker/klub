import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateUniqueSlug } from '@/lib/utils/slug-generator';
import { checkRateLimit, incrementRateLimit } from '@/lib/middleware/rate-limit';
import { z } from 'zod';

const createCommunitySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

// Rate limit configuration: 10 communities per day
const RATE_LIMIT_CONFIG = {
  action: 'create_community',
  maxAttempts: 10,
  windowHours: 24,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(user.id, RATE_LIMIT_CONFIG);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `You have exceeded the limit of ${RATE_LIMIT_CONFIG.maxAttempts} communities per day`,
          resetAt: rateLimitResult.resetAt,
          remainingAttempts: 0,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxAttempts.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
            'Retry-After': Math.ceil(
              (rateLimitResult.resetAt.getTime() - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    const body = await request.json();
    const validatedData = createCommunitySchema.parse(body);

    // Check if the user already has a community with the same name
    // NOTE: We're NOT joining with community_members to avoid RLS issues
    const { data: existingCommunities, error: checkError } = await supabase
      .from('communities')
      .select('id, name')
      .eq('organizer_id', user.id)
      .eq('name', validatedData.name);

    if (checkError) {
      console.error('Error checking existing communities:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing communities' },
        { status: 500 }
      );
    }

    if (existingCommunities && existingCommunities.length > 0) {
      return NextResponse.json(
        { 
          error: 'Duplicate community name',
          message: 'You already have a community with this name. Please choose a different name.'
        },
        { status: 400 }
      );
    }

    const slug = await generateUniqueSlug(validatedData.name);

    const { data, error } = await supabase
      .from('communities')
      .insert({
        name: validatedData.name,
        description: validatedData.description || null,
        slug,
        organizer_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating community - Full error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        data: {
          name: validatedData.name,
          slug,
          organizer_id: user.id
        }
      });

      // Return more detailed error for debugging
      return NextResponse.json(
        {
          error: 'Failed to create community',
          debug: {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          }
        },
        { status: 500 }
      );
    }

    // Increment rate limit counter after successful creation
    await incrementRateLimit(user.id, RATE_LIMIT_CONFIG.action, RATE_LIMIT_CONFIG.windowHours);

    // Prepare response with rate limit headers
    const response = NextResponse.json({
      id: data.id,
      slug: data.slug,
      created_at: data.created_at,
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', RATE_LIMIT_CONFIG.maxAttempts.toString());
    response.headers.set('X-RateLimit-Remaining', (rateLimitResult.remainingAttempts - 1).toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString());

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}