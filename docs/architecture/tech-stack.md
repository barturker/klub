# Technology Stack

## Overview
Klub is built on a modern, performant, and scalable technology stack leveraging the latest versions of industry-leading frameworks and tools.

## Core Technologies

### Frontend Framework
**Next.js 15.5.3**
- App Router for file-based routing
- Server Components for optimal performance
- Turbopack for lightning-fast builds
- Built-in optimization for images, fonts, and scripts
- Incremental Static Regeneration (ISR)
- API Routes for backend functionality

### Runtime & Language
**TypeScript 5.x**
- Type-safe development experience
- Enhanced IDE support and autocomplete
- Compile-time error checking
- Better refactoring capabilities

**React 19.1.0**
- Latest React features and optimizations
- Concurrent features
- Server Components support
- Improved performance and memory usage

### Styling
**Tailwind CSS 4.x**
- Utility-first CSS framework
- PostCSS for processing
- JIT (Just-In-Time) compilation
- Responsive design utilities
- Dark mode support
- Custom design system capabilities

**tailwind-merge 3.3.1**
- Intelligent class merging
- Conflict resolution for dynamic classes

### Backend & Database
**Supabase 2.40.7**
- PostgreSQL database
- Real-time subscriptions
- Row Level Security (RLS)
- Authentication and authorization
- Storage for file uploads
- Edge Functions support
- Vector embeddings for AI features

**Database Tools**
- Migration system for schema versioning
- Type generation from database schema
- Backup and restore capabilities
- Time-travel functionality

### Authentication
**Supabase Auth**
- Multiple authentication providers
- JWT-based sessions
- Row Level Security integration
- Social login support
- Magic link authentication
- MFA capabilities

### Payments
**Stripe 18.5.0**
- Payment processing
- Subscription management
- Webhook handling
- PCI compliance
- International payment support

**@stripe/stripe-js 7.9.0**
- Client-side Stripe integration
- Payment Element components
- Secure payment form handling

### State Management & Forms
**React Hook Form 7.62.0**
- Performant form handling
- Built-in validation
- Minimal re-renders
- TypeScript support

**Zod 4.1.7**
- Schema validation
- Type inference
- Runtime type checking
- Form validation schemas

**@hookform/resolvers 5.2.1**
- Zod integration with React Hook Form
- Validation resolver

### UI/UX Libraries
**shadcn/ui (Latest)**
- Modern React component library
- 42+ pre-built components installed
- Radix UI primitives for accessibility
- Fully customizable and themeable
- Copy-paste approach (no vendor lock-in)
- Components include:
  - Form controls (Button, Input, Select, etc.)
  - Layout (Sidebar, Card, Dialog, Sheet)
  - Data display (Table, Badge, Avatar)
  - Navigation (Menu, Tabs, Breadcrumb)
  - Feedback (Alert, Toast, Progress)
  - Overlays (Popover, Tooltip, Dropdown)

**Radix UI**
- Unstyled, accessible component primitives
- Foundation for shadcn/ui components
- WAI-ARIA compliant
- Keyboard navigation support

**Lucide React 0.544.0**
- Modern icon library
- Tree-shakeable
- 1000+ icons available
- Consistent design language

**Sonner 2.0.7**
- Toast notifications
- Promise-based API
- Customizable styling
- Accessibility features

**clsx 2.1.1 & tailwind-merge 3.3.1**
- Conditional className utilities
- Optimized for performance
- Conflict resolution for Tailwind classes

**next-themes 0.4.6**
- Theme management for Next.js
- Dark/light mode support
- System preference detection
- No flash on load

### Development Tools

#### Build Tools
**Turbopack**
- Rust-based bundler
- Incremental computation
- Fast refresh
- Optimized for Next.js

#### Code Quality
**ESLint 9.x**
- Code linting
- Next.js specific rules
- TypeScript integration
- Custom rule configuration

**@eslint/eslintrc 3.x**
- ESLint configuration compatibility

**eslint-config-next 15.5.3**
- Next.js best practices
- Core Web Vitals rules
- Accessibility checks

#### Package Management
**npm**
- Dependency management
- Script execution
- Lock file for reproducible builds

### Environment & Configuration

#### Node.js
- Version 20.x (LTS)
- ES modules support
- Native TypeScript execution

#### Environment Variables
- `.env.local` for development
- `.env.production` for production
- Type-safe environment variable handling

### Deployment & Infrastructure

#### Recommended Platforms
**Vercel**
- Optimized for Next.js
- Edge network
- Automatic HTTPS
- Preview deployments
- Analytics and monitoring

**Alternative Options**
- Netlify
- AWS Amplify
- Railway
- Render

### Database Infrastructure
**Supabase Cloud**
- Managed PostgreSQL
- Automatic backups
- Global CDN for assets
- Real-time infrastructure
- Edge network

## Version Management

### Dependencies
```json
{
  "dependencies": {
    "@hookform/resolvers": "^5.2.1",
    "@stripe/stripe-js": "^7.9.0",
    "@supabase/ssr": "^0.7.0",
    "@supabase/supabase-js": "^2.57.4",
    "clsx": "^2.1.1",
    "next": "15.5.3",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-hook-form": "^7.62.0",
    "sonner": "^2.0.7",
    "stripe": "^18.5.0",
    "tailwind-merge": "^3.3.1",
    "zod": "^4.1.7"
  }
}
```

### Dev Dependencies
```json
{
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "15.5.3",
    "supabase": "^2.40.7",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

## API Architecture

### RESTful APIs
- Next.js API Routes
- Supabase REST API
- Type-safe API calls

### Real-time
- Supabase Realtime subscriptions
- WebSocket connections
- Presence features

### GraphQL (Optional Extension)
- Can be integrated via API Routes
- Type generation support

## Security Considerations

### Frontend Security
- Content Security Policy (CSP)
- XSS protection
- CSRF protection via SameSite cookies

### Backend Security
- Row Level Security (RLS) in Supabase
- JWT verification
- API rate limiting
- Environment variable protection

### Authentication Security
- Secure session management
- OAuth 2.0 compliance
- Password hashing (handled by Supabase)

## Performance Optimizations

### Build-time
- Static generation where possible
- Image optimization
- Code splitting
- Tree shaking

### Runtime
- Server Components for reduced bundle size
- Streaming SSR
- Lazy loading
- Prefetching

### Caching
- Next.js caching strategies
- Supabase query caching
- CDN caching for static assets

## Monitoring & Analytics

### Recommended Tools
- Vercel Analytics
- Sentry for error tracking
- LogRocket for session replay
- PostHog for product analytics

## Future Considerations

### Potential Additions
- Redis for caching
- Elasticsearch for advanced search
- WebRTC for real-time communication
- AI/ML integrations
- Internationalization (i18n)

### Scaling Considerations
- Database connection pooling
- Horizontal scaling capability
- Microservices architecture readiness
- Event-driven architecture support

## Development Workflow

### Local Development
```bash
npm run dev          # Start development server with Turbopack
```

### Database Management
```bash
npm run db:push      # Push migrations to database
npm run db:pull      # Pull schema from database
npm run db:migrate   # Create new migration
npm run db:types     # Generate TypeScript types
```

### Building & Deployment
```bash
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Conclusion
This technology stack provides a solid foundation for building a modern, scalable web application with excellent developer experience and performance characteristics.