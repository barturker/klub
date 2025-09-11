# Source Tree Structure

## Overview

The Klub project follows a modern Next.js 15 application structure with TypeScript, utilizing Turbopack for optimized builds and Supabase for backend services.

## Root Directory Structure

```
klub/
├── .bmad-core/          # BMAD agent configuration and templates
├── .claude/             # Claude AI configuration
├── .git/                # Git version control
├── .next/               # Next.js build output (gitignored)
├── app/                 # Next.js App Router pages and layouts
├── components/          # React components
├── docs/                # Documentation
├── lib/                 # Utility functions and configurations
├── node_modules/        # Dependencies (gitignored)
├── public/              # Static assets
├── scripts/             # Build and maintenance scripts
├── supabase/            # Database migrations and configuration
├── .env.example         # Environment variables template
├── .env.local           # Local environment variables (gitignored)
├── .gitignore           # Git ignore rules
├── eslint.config.mjs    # ESLint configuration
├── next.config.ts       # Next.js configuration
├── next-env.d.ts        # Next.js TypeScript declarations
├── package.json         # Project dependencies and scripts
├── package-lock.json    # Dependency lock file
├── postcss.config.mjs   # PostCSS configuration
├── README.md            # Project documentation
└── tsconfig.json        # TypeScript configuration
```

## Core Directories

### `/app` - Application Router

The main application directory following Next.js 15 App Router conventions:

- `layout.tsx` - Root layout component
- `page.tsx` - Home page component
- `globals.css` - Global styles
- `favicon.ico` - Site favicon

### `/components` - Component Library

Organized component structure:

- `/ui` - UI components (buttons, forms, etc.)
- `/shared` - Shared/common components

### `/lib` - Core Libraries

Application core utilities and integrations:

- `/supabase` - Supabase client configuration
  - `client.ts` - Browser client
  - `server.ts` - Server-side client
  - `types.ts` - Database types
- `/stripe` - Stripe payment integration
- `utils.ts` - Utility functions

### `/supabase` - Database Layer

Database configuration and migrations:

- `/migrations` - Database migration files
- `config.toml` - Supabase configuration
- `seed.sql` - Database seed data

### `/scripts` - Automation Scripts

Development and maintenance scripts:

- `db-backup.js` - Database backup utility
- `db-restore.js` - Database restoration
- `time-travel.sh` - Database rollback utility

### `/docs` - Documentation

Project documentation:

- `/architecture` - Architecture documentation
- `/prd` - Product requirement documents
- `/stories` - User stories and tasks
- `/qa` - Quality assurance documentation

### `/public` - Static Assets

Publicly accessible static files:

- Images
- SVG icons
- Static resources

## File Naming Conventions

### TypeScript/JavaScript Files

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Configs**: kebab-case (e.g., `eslint.config.mjs`)
- **Types**: PascalCase with `.types.ts` suffix

### Directories

- **Features**: kebab-case (e.g., `user-management`)
- **Components**: PascalCase or kebab-case

## Import Aliases

The project uses the `@/*` alias for root imports:

```typescript
import { Component } from '@/components/ui/Component';
import { utils } from '@/lib/utils';
```

## Build Outputs

- `.next/` - Next.js build artifacts
- `node_modules/` - NPM dependencies

## Environment Files

- `.env.example` - Template for environment variables
- `.env.local` - Local development environment (not committed)
- `.env.production` - Production environment (managed separately)

## Key Configuration Files

### `tsconfig.json`

- Target: ES2017
- Strict mode enabled
- Path aliases configured
- Next.js plugin integrated

### `package.json`

- Scripts for development, building, and database management
- Dependencies managed with npm
- Turbopack enabled for faster builds

### `next.config.ts`

- Next.js 15 configuration
- Turbopack optimization
- Environment variable handling

## Development Workflow Files

- `.gitignore` - Version control exclusions
- `eslint.config.mjs` - Code quality rules
- `postcss.config.mjs` - CSS processing

## Database Structure

The project uses Supabase with:

- Migration-based schema management
- Type generation from database
- Backup and restore capabilities
- Time-travel functionality for rollbacks

## Best Practices

1. Keep components modular and reusable
2. Separate business logic into `/lib`
3. Use TypeScript types consistently
4. Follow Next.js App Router conventions
5. Maintain clear separation between client and server code
6. Store sensitive configuration in environment variables
7. Document API contracts and data models
8. Use migrations for all database changes
