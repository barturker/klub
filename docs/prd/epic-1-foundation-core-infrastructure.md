# Epic 1: Foundation & Core Infrastructure

**Goal:** Establish the technical foundation with Next.js 14 app, Supabase backend, and Vercel deployment while delivering a basic community creation feature that validates the end-to-end system works. This epic ensures all subsequent development has proper infrastructure with zero monthly costs using free tiers.

## Story 1.1: Project Setup & Monorepo Configuration

As a **developer**,
I want **a properly configured monorepo with all necessary tooling**,
so that **the team can efficiently develop and share code across multiple applications**.

**Acceptance Criteria:**

1. Next.js 14 app created with App Router, TypeScript, and Tailwind CSS
2. Directory structure created: /app (routes), /components, /lib (utilities), /types
3. TypeScript configured with strict mode and path aliases
4. ESLint and Prettier configured with Next.js recommended rules
5. Git hooks configured with Husky for pre-commit checks
6. Package.json scripts created for dev, build, start, and lint
7. README.md created with setup instructions
8. Environment variables configured (.env.local) for Supabase keys

## Story 1.2: CI/CD Pipeline Setup

As a **developer**,
I want **automated deployments with Vercel**,
so that **every git push automatically deploys with preview URLs**.

**Acceptance Criteria:**

1. Vercel connected to GitHub repository for automatic deployments
2. Preview deployments created for every pull request
3. Production deployment triggered on merge to main branch
4. Environment variables configured in Vercel dashboard
5. Custom domain configured (if available)
6. GitHub Actions for running tests before merge (using free 2000 minutes)
7. Deployment notifications configured in GitHub
8. Instant rollback available through Vercel dashboard

## Story 1.3: Database & ORM Setup

As a **developer**,
I want **Supabase database with built-in features**,
so that **we get auth, realtime, and storage without additional setup**.

**Acceptance Criteria:**

1. Supabase project created with free tier (500MB database)
2. Database schema created using Supabase SQL editor
3. Row Level Security (RLS) policies configured for all tables
4. Seed data loaded using Supabase seed.sql file
5. Supabase client initialized in Next.js app
6. TypeScript types generated from database schema
7. Realtime subscriptions tested for live updates
8. Daily backups enabled (included in free tier)

## Story 1.4: Authentication System Implementation

As a **user**,
I want **to create an account and securely log in**,
so that **I can access the platform's features**.

**Acceptance Criteria:**

1. Supabase Auth configured with email/password authentication
2. Social login implemented (Google, GitHub, Discord - all free)
3. Magic link authentication option available
4. Password reset flow with email verification
5. Session management handled by Supabase automatically
6. Rate limiting included by Supabase (built-in)
7. User profiles created automatically in public.profiles table
8. Protected routes implemented using Supabase middleware

## Story 1.5: API Routes Foundation

As a **developer**,
I want **Next.js API routes with type safety**,
so that **we have a simple, fast API without additional backend**.

**Acceptance Criteria:**

1. API routes structure created in /app/api folder
2. tRPC configured for type-safe API calls (optional but recommended)
3. Supabase server client configured for API routes
4. CORS headers configured for mobile app access
5. API route protection using Supabase auth
6. Error handling middleware implemented
7. Request validation using Zod schemas
8. API response caching with proper headers

## Story 1.6: Basic Community Creation

As an **organizer**,
I want **to create a basic community with name and description**,
so that **I can start building my community on the platform**.

**Acceptance Criteria:**

1. Community table created in Supabase with fields: id, name, description, slug, organizer_id
2. API route POST /api/communities for creating community
3. Unique slug generation using slugify library
4. RLS policy ensuring users can only edit their own communities
5. API route GET /api/communities/[slug] to fetch community
6. Authentication required via Supabase middleware
7. Rate limiting using Upstash Redis (10K requests free)
8. Server action for form submission with validation

## Story 1.7: Monitoring & Analytics Setup

As a **developer**,
I want **monitoring and analytics from day one**,
so that **we can track performance and errors with zero cost**.

**Acceptance Criteria:**

1. Health check API route at /api/health returning status
2. PostHog analytics configured (1M events free/month)
3. Sentry error tracking integrated (5K errors free/month)
4. Vercel Analytics enabled for Web Vitals (free)
5. Custom events tracked for key user actions
6. Performance monitoring with Vercel Speed Insights
7. Supabase dashboard for database metrics (included)
8. Homepage displays "klub - Community Platform" with sign-up CTA
