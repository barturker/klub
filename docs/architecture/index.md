# Klub Architecture Documentation

**Last Updated: January 17, 2025**

This document outlines the complete fullstack architecture for Klub, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

## Current Implementation Status

### ✅ Core Features Completed

- **Authentication System** - Supabase Auth with social logins (Google, GitHub, Email/Password)
- **Community Management** - Create, join, and manage communities with full CRUD operations
- **Privacy Levels** - Three-tier privacy system (public, private, invite-only)
- **Event Management** - Complete event lifecycle with recurring support
- **Member Management** - Role-based access control (member, moderator, admin)
- **File Uploads** - Avatar and cover image uploads via Supabase Storage
- **Responsive UI** - Mobile-first design with Tailwind CSS and shadcn/ui

### 🚧 In Active Development

- **Ticketing System** - QR code generation and validation
- **Payment Integration** - Stripe payment processing
- **Analytics Dashboard** - Community and event analytics
- **Advanced Search** - Full-text search with PostgreSQL

## Quick Start Guides

- [🚀 Modern Free Tech Stack](./modern-free-tech-stack.md) - **START HERE** - Technology choices
- [📋 2-Week MVP Plan](../simplified-mvp-plan.md) - Step-by-step implementation guide
- [💾 Database Schema](./supabase-database-schema.md) - **CURRENT** - Complete database design with privacy levels
- [📁 Source Tree](./source-tree.md) - **CURRENT** - Project structure and organization
- [📝 Coding Standards](./coding-standards.md) - Development guidelines
- [🎨 UI Components](./ui-components.md) - Component library documentation

## Architecture Overview

### Frontend Architecture
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React hooks + Context API
- **Performance**: Turbopack, Server Components

### Backend Architecture
- **Database**: PostgreSQL via Supabase
- **Auth**: Supabase Auth (JWT-based)
- **Storage**: Supabase Storage
- **APIs**: Next.js API routes + Supabase RPC
- **Real-time**: Supabase Realtime

### Security Architecture
- **RLS**: 100% Row Level Security coverage
- **Privacy**: Three-tier privacy controls
- **Auth**: Secure JWT tokens
- **RBAC**: Role-based access control

## Database Design Highlights

### Privacy Level Implementation

Communities now support three privacy levels (as of migration 00032):

```sql
privacy_level TEXT DEFAULT 'public' -- 'public', 'private', 'invite_only'

-- Generated columns for backward compatibility
is_public BOOLEAN GENERATED ALWAYS AS (
    CASE WHEN privacy_level IN ('private', 'invite_only')
    THEN false ELSE true END
) STORED
```

### Core Tables (14 Total)
1. **profiles** - User profiles extended from auth.users
2. **communities** - Community entities with privacy controls
3. **community_members** - Membership with roles
4. **events** - Event management with recurring support
5. **tickets** - Ticketing system
6. **orders** - Payment orders
7. **passes** - QR code passes
8. **checkins** - Event check-in records
9. **invitations** - Community invitations
10. **community_join_requests** - Join requests for private communities
11. **invitation_uses** - Invitation usage tracking
12. **community_settings_history** - Settings audit trail
13. **profile_views** - Profile view analytics
14. **rate_limits** - API rate limiting

### RLS Policies

All tables have comprehensive Row Level Security policies that respect privacy levels:

```sql
-- Example: Communities SELECT policy
CREATE POLICY "communities_select_privacy" ON communities
FOR SELECT USING (
    privacy_level = 'public'
    OR organizer_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM community_members cm
        WHERE cm.community_id = communities.id
        AND cm.user_id = auth.uid()
    )
);
```

## File Structure

```
klub/
├── app/                 # Next.js App Router
│   ├── (dashboard)/    # Authenticated routes
│   ├── api/           # API endpoints
│   └── auth/          # Auth pages
├── components/         # React components
│   ├── ui/           # shadcn/ui components
│   ├── communities/  # Community components
│   └── events/       # Event components
├── lib/               # Core utilities
│   └── supabase/     # Supabase integration
│       └── database.types.ts # Generated types (CURRENT)
├── supabase/          # Database layer
│   └── migrations/   # Version-controlled migrations
└── docs/             # Documentation
```

## Recent Updates

### January 17, 2025
- **Privacy Levels**: Migrated from boolean `is_public` to enum `privacy_level`
- **RLS Policies**: Updated all policies to respect privacy levels
- **Events**: Added complete event management with recurring support
- **Type Safety**: Regenerated database types from latest schema

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Run migrations
npx supabase db push --linked

# Generate types
npm run generate:types

# Start development (always on port 3000)
npm run dev
```

### Database Changes
1. Create migration in `/supabase/migrations/`
2. Follow naming: `NNNNN_description.sql`
3. Push to Supabase: `npx supabase db push --linked`
4. Regenerate types: `npm run generate:types`

## Key Design Decisions

### 1. Privacy-First Architecture
- Three privacy levels: public, private, invite-only
- RLS policies enforce privacy at database level
- Generated columns for backward compatibility

### 2. Type-Safe Development
- TypeScript strict mode
- Generated database types
- Zod validation schemas

### 3. Performance Optimization
- Server Components by default
- Composite database indexes
- Denormalized counters
- Full-text search with tsvector

### 4. Security by Design
- Row Level Security on all tables
- SECURITY DEFINER functions for elevated operations
- Parameterized queries throughout
- Content Security Policy headers

## Testing Strategy

- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Playwright
- **Type Checking**: `npm run typecheck`
- **Linting**: `npm run lint`

## Deployment

### Production Environment
```
Vercel (Frontend) ← → Supabase (Backend)
    ↓                      ↓
  CDN/Edge            PostgreSQL
                      Storage
                      Auth Service
```

## Change Log

| Date       | Version | Description                                                       | Author                |
| ---------- | ------- | ----------------------------------------------------------------- | --------------------- |
| 2025-09-10 | 1.0     | Initial architecture document based on PRD requirements           | Claude (AI Assistant) |
| 2025-09-10 | 1.1     | Added simplified PostgreSQL-first approach for reduced complexity | Winston (Architect)   |
| 2025-09-10 | 1.2     | Sharded architecture document into separate focused files         | Claude (AI Assistant) |
| 2025-09-11 | 2.0     | Complete overhaul to modern free-tier stack (Supabase + Next.js)  | PM + Claude           |
| 2025-01-17 | 3.0     | Updated with privacy levels, events, and current implementation   | Winston (Architect)   |

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

## Contact

For architecture questions:
- Technical docs: `/docs/architecture/`
- Migration rules: `/supabase/CLAUDE.md`
- Dev guidelines: `/CLAUDE.md`