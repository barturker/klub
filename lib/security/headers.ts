/**
 * Security Headers Configuration
 * Implements OWASP security best practices
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Content Security Policy configuration
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for development (remove in production)
    'https://js.stripe.com',
    'https://checkout.stripe.com',
    'https://cdn.jsdelivr.net', // For any CDN scripts
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-jsx
    'https://fonts.googleapis.com',
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
    'data:',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://*.supabase.co', // Supabase storage
    'https://stripe.com',
    'https://avatars.githubusercontent.com', // GitHub avatars
    'https://lh3.googleusercontent.com', // Google avatars
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co', // Supabase realtime
    'https://api.stripe.com',
    'https://checkout.stripe.com',
  ],
  'frame-src': [
    "'self'",
    'https://checkout.stripe.com',
    'https://js.stripe.com',
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
};

// Build CSP string
function buildCSP(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      if (sources.length === 0) return directive;
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

// Security headers to apply
export const securityHeaders = {
  // Content Security Policy
  'Content-Security-Policy': buildCSP(),

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Enable HSTS (HTTP Strict Transport Security)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Disable browser features
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(self)',

  // XSS Protection (for older browsers)
  'X-XSS-Protection': '1; mode=block',

  // DNS Prefetch Control
  'X-DNS-Prefetch-Control': 'on',

  // Download Options
  'X-Download-Options': 'noopen',

  // Permitted Cross-Domain Policies
  'X-Permitted-Cross-Domain-Policies': 'none',
};

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // API rate limits
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: 'Too many API requests',
  },

  // Auth rate limits (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts',
  },

  // Payment rate limits
  payment: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 payment attempts per hour
    message: 'Too many payment attempts',
  },

  // File upload rate limits
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20, // 20 uploads per hour
    message: 'Too many file uploads',
  },
};

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiting middleware
 * Note: Use Redis or Upstash in production for distributed systems
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const identifier = request.ip || request.headers.get('x-forwarded-for') || 'anonymous';
  const key = `${request.nextUrl.pathname}:${identifier}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Create new record
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return null; // Allow request
  }

  if (record.count >= config.maxRequests) {
    // Rate limit exceeded
    return NextResponse.json(
      { error: config.message },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((record.resetTime - now) / 1000)),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
        },
      }
    );
  }

  // Increment counter
  record.count++;
  return null; // Allow request
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([header, value]) => {
    response.headers.set(header, value);
  });
  return response;
}

/**
 * Security middleware for Next.js
 * Add this to your middleware.ts file
 */
export async function securityMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;

  // Apply rate limiting based on path
  if (pathname.startsWith('/api/auth')) {
    const rateLimitResponse = await rateLimit(request, rateLimitConfigs.auth);
    if (rateLimitResponse) return rateLimitResponse;
  } else if (pathname.startsWith('/api/checkout') || pathname.startsWith('/api/stripe')) {
    const rateLimitResponse = await rateLimit(request, rateLimitConfigs.payment);
    if (rateLimitResponse) return rateLimitResponse;
  } else if (pathname.startsWith('/api/upload')) {
    const rateLimitResponse = await rateLimit(request, rateLimitConfigs.upload);
    if (rateLimitResponse) return rateLimitResponse;
  } else if (pathname.startsWith('/api')) {
    const rateLimitResponse = await rateLimit(request, rateLimitConfigs.api);
    if (rateLimitResponse) return rateLimitResponse;
  }

  return null;
}

/**
 * CORS configuration for API routes
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * Validate and sanitize user input
 */
export function sanitizeInput(input: string): string {
  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove any script tags specifically
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Escape special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized.trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));

  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length];
  }

  return token;
}

/**
 * Hash sensitive data (use for logging, not for passwords)
 */
export function hashSensitiveData(data: string): string {
  // Simple hash for logging purposes
  // Use bcrypt or argon2 for passwords
  return Buffer.from(data).toString('base64').substring(0, 10) + '...';
}