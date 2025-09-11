import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface RateLimitConfig {
  action: string;
  maxAttempts: number;
  windowHours?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  resetAt: Date;
  remainingAttempts: number;
}

/**
 * Check rate limit for a user action
 * @param userId - The user's ID
 * @param config - Rate limit configuration
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const supabase = await createClient();
  const { action, maxAttempts, windowHours = 24 } = config;

  try {
    // Call the database function to check rate limit
    const { data, error } = await supabase
      .rpc('check_rate_limit', {
        p_user_id: userId,
        p_action: action,
        p_max_attempts: maxAttempts,
        p_window_hours: windowHours,
      })
      .single();

    if (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request but log it
      return {
        allowed: true,
        currentCount: 0,
        resetAt: new Date(Date.now() + windowHours * 60 * 60 * 1000),
        remainingAttempts: maxAttempts,
      };
    }

    return {
      allowed: data.allowed,
      currentCount: data.current_count,
      resetAt: new Date(data.reset_at),
      remainingAttempts: Math.max(0, maxAttempts - data.current_count),
    };
  } catch (error) {
    console.error('Unexpected rate limit error:', error);
    // On unexpected error, allow the request
    return {
      allowed: true,
      currentCount: 0,
      resetAt: new Date(Date.now() + windowHours * 60 * 60 * 1000),
      remainingAttempts: maxAttempts,
    };
  }
}

/**
 * Increment rate limit counter for a user action
 * @param userId - The user's ID
 * @param action - The action being performed
 * @param windowHours - The window size in hours
 */
export async function incrementRateLimit(
  userId: string,
  action: string,
  windowHours: number = 24
): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.rpc('increment_rate_limit', {
      p_user_id: userId,
      p_action: action,
      p_window_hours: windowHours,
    });

    if (error) {
      console.error('Rate limit increment error:', error);
    }
  } catch (error) {
    console.error('Unexpected rate limit increment error:', error);
  }
}

/**
 * Rate limit middleware for API routes
 * @param config - Rate limit configuration
 * @returns Middleware function
 */
export function withRateLimit(config: RateLimitConfig) {
  return async function rateLimitMiddleware(
    request: Request,
    context: { params: any }
  ) {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(user.id, config);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `You have exceeded the rate limit of ${config.maxAttempts} ${config.action} per ${config.windowHours || 24} hours`,
          resetAt: rateLimitResult.resetAt,
          remainingAttempts: 0,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxAttempts.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
            'Retry-After': Math.ceil(
              (rateLimitResult.resetAt.getTime() - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    // Add rate limit headers to the response
    return {
      user,
      rateLimitHeaders: {
        'X-RateLimit-Limit': config.maxAttempts.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remainingAttempts.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
      },
    };
  };
}

/**
 * Clean up old rate limit records
 * This should be called periodically (e.g., via a cron job)
 */
export async function cleanupOldRateLimits(): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.rpc('cleanup_old_rate_limits');

    if (error) {
      console.error('Rate limit cleanup error:', error);
    }
  } catch (error) {
    console.error('Unexpected rate limit cleanup error:', error);
  }
}