# Next.js Source Tree (Simplified)

## Project Structure - Single Next.js App

```plaintext
klub/                           # Root directory
├── app/                        # Next.js 14 App Router
│   ├── (auth)/                # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx       # /login page
│   │   ├── signup/
│   │   │   └── page.tsx       # /signup page
│   │   └── layout.tsx         # Auth layout wrapper
│   │
│   ├── (dashboard)/           # Protected routes group  
│   │   ├── dashboard/
│   │   │   └── page.tsx       # /dashboard page
│   │   ├── communities/
│   │   │   ├── page.tsx       # List communities
│   │   │   └── new/
│   │   │       └── page.tsx   # Create community
│   │   ├── events/
│   │   │   ├── page.tsx       # List events
│   │   │   └── new/
│   │   │       └── page.tsx   # Create event
│   │   └── layout.tsx         # Protected layout
│   │
│   ├── api/                   # API Routes
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts   # Supabase auth callback
│   │   ├── checkout/
│   │   │   └── route.ts       # Stripe checkout session
│   │   ├── webhook/
│   │   │   └── route.ts       # Stripe webhook handler
│   │   └── health/
│   │       └── route.ts       # Health check endpoint
│   │
│   ├── c/[slug]/              # Community pages (public)
│   │   ├── page.tsx           # Community profile
│   │   └── events/
│   │       └── page.tsx       # Community events
│   │
│   ├── e/[id]/                # Event pages (public)
│   │   └── page.tsx           # Event details & purchase
│   │
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Homepage
│   ├── globals.css            # Global styles
│   └── error.tsx              # Error boundary
│
├── components/                # React Components
│   ├── ui/                   # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── toast.tsx
│   │
│   ├── auth/                 # Auth components
│   │   ├── login-form.tsx
│   │   ├── signup-form.tsx
│   │   └── user-menu.tsx
│   │
│   ├── community/            # Community components
│   │   ├── community-card.tsx
│   │   ├── community-form.tsx
│   │   └── member-list.tsx
│   │
│   ├── events/               # Event components
│   │   ├── event-card.tsx
│   │   ├── event-form.tsx
│   │   ├── ticket-purchase.tsx
│   │   └── event-calendar.tsx
│   │
│   └── layout/               # Layout components
│       ├── header.tsx
│       ├── footer.tsx
│       ├── sidebar.tsx
│       └── mobile-nav.tsx
│
├── lib/                      # Library/utility code
│   ├── supabase/            # Supabase setup
│   │   ├── client.ts        # Browser client
│   │   ├── server.ts        # Server client
│   │   ├── middleware.ts    # Auth middleware
│   │   └── types.ts         # Database types
│   │
│   ├── stripe/              # Stripe setup
│   │   ├── client.ts        # Stripe client
│   │   └── webhooks.ts      # Webhook handlers
│   │
│   ├── utils/               # Utility functions
│   │   ├── format.ts        # Formatting helpers
│   │   ├── slugify.ts       # Slug generation
│   │   └── cn.ts            # Class name helper
│   │
│   └── validations/         # Zod schemas
│       ├── auth.ts          # Auth validation
│       ├── community.ts     # Community validation
│       └── event.ts         # Event validation
│
├── hooks/                    # Custom React hooks
│   ├── use-auth.ts          # Auth hook
│   ├── use-communities.ts   # Communities data
│   ├── use-events.ts        # Events data
│   └── use-toast.ts         # Toast notifications
│
├── types/                   # TypeScript types
│   ├── database.types.ts   # Generated from Supabase
│   ├── app.types.ts        # Application types
│   └── stripe.types.ts     # Stripe types
│
├── public/                  # Static assets
│   ├── images/
│   ├── fonts/
│   └── manifest.json        # PWA manifest
│
├── supabase/               # Supabase local dev (optional)
│   ├── migrations/         # SQL migrations
│   │   └── 001_initial.sql
│   ├── functions/          # Edge functions (if needed)
│   └── seed.sql           # Development seed data
│
├── .env.local              # Local environment variables
├── .env.example            # Environment template
├── next.config.js          # Next.js configuration
├── tailwind.config.ts      # Tailwind configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies
├── middleware.ts           # Next.js middleware
├── postcss.config.js       # PostCSS configuration
└── README.md              # Documentation
```

## Key Files Explained

### Core Application Files

#### `app/layout.tsx`
```tsx
// Root layout with providers
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

#### `middleware.ts`
```ts
// Protects routes and handles auth
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  await supabase.auth.getSession()
  return res
}

export const config = {
  matcher: ['/(dashboard|communities|events)/(.*)']
}
```

#### `lib/supabase/client.ts`
```ts
// Browser Supabase client
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

## Development Workflow

### Essential Commands
```bash
# Development
npm run dev          # Start dev server on localhost:3000

# Building
npm run build       # Build for production
npm run start       # Start production server

# Database
npm run db:types    # Generate TypeScript types from Supabase
npm run db:seed     # Seed development data

# Quality
npm run lint        # Run ESLint
npm run type-check  # Check TypeScript
npm run format      # Format with Prettier

# Testing (optional for MVP)
npm run test        # Run tests
npm run e2e         # Run E2E tests
```

## File Naming Conventions

### Components
- **PascalCase** for component files: `EventCard.tsx`
- **kebab-case** for non-component files: `use-auth.ts`
- **Index files** for barrel exports: `components/index.ts`

### Routes
- **Lowercase** for route segments: `app/dashboard/page.tsx`
- **Dynamic routes** with brackets: `app/c/[slug]/page.tsx`
- **Route groups** with parentheses: `app/(auth)/login/page.tsx`

### API Routes
- **route.ts** for all API handlers
- **HTTP methods** as exports: `export async function POST()`

## Environment Variables

### Required Variables (.env.local)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional
RESEND_API_KEY=re_xxx
POSTHOG_API_KEY=phc_xxx
```

## Deployment Structure

### Vercel Deployment
```
Production: main branch → klub.app
Preview: PR branches → pr-123.klub.vercel.app
```

### Build Output
```
.next/              # Build output (git ignored)
├── static/         # Static assets
├── server/         # Server-side code
└── cache/          # Build cache
```

## Why This Structure?

### Simplicity
- **Single app** instead of monorepo
- **No microservices** complexity
- **Standard Next.js** patterns

### Performance
- **App Router** for server components
- **Built-in optimization** from Next.js
- **Edge runtime** where possible

### Developer Experience
- **Fast refresh** in development
- **Type safety** throughout
- **Clear organization** by feature

### Cost Effective
- **Serverless** deployment
- **No DevOps** required
- **Automatic scaling**

## Migration Path

When you need to scale:

1. **Extract API** → Separate NestJS app (Month 6+)
2. **Add Mobile** → React Native app (Month 9+)
3. **Microservices** → Extract services (Year 2+)

But for MVP and first year, this single Next.js app handles everything!