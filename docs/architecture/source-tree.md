# Source Tree Structure

## Overview

The Klub project follows a modern Next.js 15 application structure with TypeScript, utilizing Turbopack for optimized builds and Supabase for backend services.

**Last Updated: January 17, 2025**

## Root Directory Structure

```
klub/
├── .bmad-core/          # BMAD agent configuration and templates
├── .claude/             # Claude AI configuration
├── .git/                # Git version control
├── .next/               # Next.js build output (gitignored)
├── .swc/                # SWC compiler cache (gitignored)
├── __tests__/           # Unit test files
├── app/                 # Next.js App Router pages and layouts
├── components/          # React components
├── docs/                # Documentation
├── e2e/                 # End-to-end Playwright tests
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions and configurations
├── node_modules/        # Dependencies (gitignored)
├── playwright-report/   # Playwright test reports (gitignored)
├── public/              # Static assets
├── scripts/             # Build and maintenance scripts
├── supabase/            # Database migrations and configuration
├── test-results/        # Test execution results (gitignored)
├── .env.example         # Environment variables template
├── .env.local           # Local environment variables (gitignored)
├── .gitignore           # Git ignore rules
├── .prettierignore      # Prettier ignore rules
├── .prettierrc          # Prettier configuration
├── CLAUDE.md            # Claude AI development instructions
├── components.json      # shadcn/ui configuration
├── eslint.config.mjs    # ESLint configuration
├── jest.config.js       # Jest testing configuration
├── jest.setup.js        # Jest setup and matchers
├── middleware.ts        # Next.js middleware
├── next.config.ts       # Next.js configuration
├── next-env.d.ts        # Next.js TypeScript declarations
├── package.json         # Project dependencies and scripts
├── package-lock.json    # Dependency lock file
├── playwright.config.ts # Playwright E2E configuration
├── postcss.config.mjs   # PostCSS configuration
├── README.md            # Project documentation
├── tailwind.config.ts   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## Core Directories

### `/app` - Application Router

The main application directory following Next.js 15 App Router conventions:

```
app/
├── (dashboard)/         # Dashboard routes (authenticated)
│   ├── communities/     # Community management
│   │   ├── new/        # Create new community
│   │   └── [slug]/     # Community-specific pages
│   │       ├── events/ # Event management
│   │       │   ├── create/     # Create event
│   │       │   └── [eventSlug]/ # Event details
│   │       └── settings/       # Community settings
│   ├── dashboard/       # Main dashboard
│   ├── events/         # All events view
│   ├── profile/        # User profile
│   │   └── [id]/      # Public profile view
│   ├── settings/       # User settings
│   └── tickets/        # User tickets
├── api/                # API routes
│   ├── communities/    # Community API endpoints
│   │   ├── check-slug/ # Slug availability
│   │   └── [id]/      # Community-specific APIs
│   │       ├── by-slug/      # Get by slug
│   │       ├── cover/        # Cover image upload
│   │       ├── events/       # Community events
│   │       ├── invitations/  # Invitations
│   │       ├── logo/         # Logo upload
│   │       └── settings/     # Settings API
│   ├── dashboard/      # Dashboard APIs
│   │   └── analytics/ # Analytics endpoints
│   ├── events/        # Events API
│   ├── profile/       # Profile API
│   ├── storage/       # Storage operations
│   └── tickets/       # Ticketing API
├── auth/              # Authentication pages
│   ├── callback/      # Auth callback handler
│   ├── login/        # Login page
│   └── signup/       # Signup page
├── dashboard/         # Old dashboard (deprecated)
├── explore/          # Public explore page
├── invite/           # Invitation handling
├── layout.tsx        # Root layout
├── page.tsx          # Home page
├── globals.css       # Global styles
└── favicon.ico       # Site favicon
```

### `/components` - Component Library

Organized component structure:

```
components/
├── ui/               # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── select.tsx
│   ├── tabs.tsx
│   ├── textarea.tsx
│   └── ...more UI components
├── auth/            # Authentication components
│   ├── auth-button.tsx
│   ├── auth-form.tsx
│   └── user-nav.tsx
├── communities/     # Community components
│   ├── community-card.tsx
│   ├── community-form.tsx
│   ├── community-grid.tsx
│   └── member-list.tsx
├── events/          # Event components
│   ├── event-card.tsx
│   ├── event-form.tsx
│   ├── event-list.tsx
│   └── event-wizard.tsx
├── profile/         # Profile components
│   ├── profile-form.tsx
│   └── profile-header.tsx
├── shared/          # Shared components
│   ├── avatar-upload.tsx
│   ├── image-upload.tsx
│   ├── loading.tsx
│   └── navigation.tsx
└── tickets/         # Ticketing components
    ├── ticket-card.tsx
    └── qr-scanner.tsx
```

### `/hooks` - Custom React Hooks

Reusable React hooks for application logic:

```
hooks/
├── use-auth.ts              # Authentication state
├── use-communities.ts       # Community operations
├── use-events.ts           # Event operations
├── use-profile.ts          # Profile management
├── use-supabase.ts         # Supabase client
├── use-tickets.ts          # Ticketing operations
├── use-upload.ts           # File upload handling
└── use-debounce.ts         # Utility hooks
```

### `/lib` - Core Libraries

Application core utilities and integrations:

```
lib/
├── supabase/              # Supabase integration
│   ├── client.ts         # Browser client
│   ├── server.ts         # Server-side client
│   ├── middleware.ts     # Auth middleware
│   ├── database.types.ts # Generated types (current)
│   └── helpers.ts        # Helper functions
├── stripe/               # Stripe payment integration
│   ├── client.ts        # Stripe client
│   └── webhook.ts       # Webhook handlers
├── constants.ts         # App constants
├── types.ts            # TypeScript types
├── utils.ts            # Utility functions
└── validators.ts       # Validation schemas
```

### `/supabase` - Database Layer

Database configuration and migrations:

```
supabase/
├── migrations/           # Database migrations
│   ├── 00001_initial_schema.sql
│   ├── 00002_complete_schema.sql
│   ├── ...
│   ├── 00028_events_table.sql
│   ├── 00029_fix_events_table.sql
│   ├── 00030_update_event_status.sql
│   └── 00032_fix_privacy_and_rls.sql
├── functions/           # Edge functions
├── seed.sql            # Database seed data
├── config.toml         # Supabase configuration
└── CLAUDE.md           # Migration guidelines
```

### `/docs` - Documentation

Project documentation:

```
docs/
├── architecture/        # Architecture documentation
│   ├── index.md
│   ├── coding-standards.md
│   ├── source-tree.md (this file)
│   ├── supabase-database-schema.md
│   ├── tech-stack.md
│   └── ui-components.md
├── prd/                # Product requirements
│   └── ...PRD documents
├── stories/            # Development stories
│   ├── sprint-1/
│   ├── sprint-2/
│   └── sprint-3/
├── qa/                 # QA documentation
├── brief.md           # Project brief
└── DATABASE-ARCHITECTURE.md
```

### `/scripts` - Automation Scripts

Development and maintenance scripts:

```
scripts/
├── generate-types.sh    # Generate TypeScript types
├── setup-local.sh      # Local environment setup
└── migrate.sh          # Database migration runner
```

## Key Files

### Configuration Files

- `next.config.ts` - Next.js configuration with image domains, redirects
- `middleware.ts` - Auth middleware for protected routes
- `tailwind.config.ts` - Tailwind CSS with custom theme
- `components.json` - shadcn/ui component configuration
- `tsconfig.json` - TypeScript strict mode configuration

### Development Files

- `CLAUDE.md` - AI assistant guidelines
- `.env.example` - Environment variables template
- `supabase/CLAUDE.md` - Database migration rules

## Environment Variables

Required in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

## Build Output

Generated directories (gitignored):

- `.next/` - Next.js build output
- `.swc/` - SWC compiler cache
- `node_modules/` - NPM packages
- `test-results/` - Test execution results
- `playwright-report/` - E2E test reports

## Development Workflow

1. **Feature Development**: Work in feature branches
2. **Database Changes**: Through migrations in `/supabase/migrations/`
3. **Type Generation**: Run `npm run generate:types`
4. **Testing**: Unit tests in `__tests__/`, E2E in `e2e/`
5. **Documentation**: Update relevant docs in `/docs/`

## Notable Patterns

- **Route Groups**: `(dashboard)` for authenticated routes
- **Dynamic Routes**: `[slug]`, `[id]` for dynamic content
- **API Routes**: RESTful endpoints in `/app/api/`
- **Parallel Routes**: Dashboard layout with nested routing
- **Server Components**: Default for all pages
- **Client Components**: Marked with `'use client'`