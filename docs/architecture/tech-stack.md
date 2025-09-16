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

**Radix UI (Complete Suite)**

- Comprehensive collection of accessible primitives
- All major components installed:
  - Accordion, Alert Dialog, Aspect Ratio
  - Avatar, Checkbox, Collapsible
  - Context Menu, Dialog, Dropdown Menu
  - Hover Card, Label, Menubar
  - Navigation Menu, Popover, Progress
  - Radio Group, Scroll Area, Select
  - Separator, Slider, Switch, Tabs
  - Toggle, Toggle Group, Tooltip
- WAI-ARIA compliant
- Keyboard navigation support

**Icon Libraries**

- **Lucide React 0.544.0** - Modern icon library with 1000+ icons
- **@tabler/icons-react 3.34.1** - Additional icon set with 5000+ icons

**Data Visualization**

- **Recharts 3.2.0** - Composable charting library built on React components
- **@tanstack/react-table 8.21.3** - Powerful table component with sorting, filtering, pagination

**Animation & Motion**

- **Framer Motion 12.23.12** - Production-ready motion library
- **motion 12.23.12** - Animation utilities
- **tailwindcss-animate 1.0.7** - Tailwind CSS animation utilities

**Form & Input Components**

- **react-hook-form 7.62.0** - Performant form handling
- **react-day-picker 9.9.0** - Date picker component
- **react-color 2.19.3** & **react-colorful 5.6.1** - Color picker components
- **react-image-crop 11.0.10** & **react-easy-crop 5.5.0** - Image cropping utilities
- **cmdk 1.1.1** - Command menu component (⌘K interface)

**Layout & UI Utilities**

- **react-resizable-panels 3.0.5** - Resizable panel layouts
- **vaul 1.1.2** - Drawer component for mobile and desktop
- **class-variance-authority 0.7.1** - CSS class variant management
- **Sonner 2.0.7** - Toast notifications

**Utility Libraries**

- **clsx 2.1.1 & tailwind-merge 3.3.1** - Class name utilities
- **date-fns 4.1.0** - Modern date utility library
- **slugify 1.6.6** - URL slug generation
- **nanoid 5.1.5** - Unique ID generation
- **sharp 0.34.3** - High-performance image processing

**Theme Management**

- **next-themes 0.4.6** - Theme management with dark mode support

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

**Prettier 3.6.2**

- Code formatting
- Consistent code style
- **prettier-plugin-tailwindcss 0.6.14** - Tailwind class sorting
- **eslint-config-prettier 10.1.8** - ESLint/Prettier conflict resolution

#### Testing Frameworks

**Unit & Integration Testing**

- **Jest 30.1.3** - JavaScript testing framework
- **jest-environment-jsdom 30.1.2** - DOM environment for Jest
- **@testing-library/react 16.3.0** - React component testing
- **@testing-library/jest-dom 6.8.0** - Custom Jest matchers
- **@testing-library/user-event 14.6.1** - User interaction simulation

**End-to-End Testing**

- **Playwright 1.55.0** - Cross-browser E2E testing
- **@playwright/test 1.55.0** - Playwright test runner
- Multiple test modes (headed, UI mode)
- Test report generation

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

### Key Dependencies (Abbreviated)

```json
{
  "dependencies": {
    "@hookform/resolvers": "^5.2.1",
    "@radix-ui/*": "Latest versions for all components",
    "@stripe/stripe-js": "^7.9.0",
    "@supabase/ssr": "^0.7.0",
    "@supabase/supabase-js": "^2.57.4",
    "@tabler/icons-react": "^3.34.1",
    "@tanstack/react-table": "^8.21.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^12.23.12",
    "lucide-react": "^0.544.0",
    "nanoid": "^5.1.5",
    "next": "15.5.3",
    "next-themes": "^0.4.6",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-hook-form": "^7.62.0",
    "recharts": "^3.2.0",
    "sharp": "^0.34.3",
    "slugify": "^1.6.6",
    "sonner": "^2.0.7",
    "stripe": "^18.5.0",
    "tailwind-merge": "^3.3.1",
    "tailwindcss-animate": "^1.0.7",
    "vaul": "^1.1.2",
    "zod": "^4.1.7"
  }
}
```

### Dev Dependencies

```json
{
  "devDependencies": {
    "@eslint/eslintrc": "^3",
    "@playwright/test": "^1.55.0",
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/jest": "^30.0.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/testing-library__jest-dom": "^5.14.9",
    "eslint": "^9",
    "eslint-config-next": "15.5.3",
    "eslint-config-prettier": "^10.1.8",
    "jest": "^30.1.3",
    "jest-environment-jsdom": "^30.1.2",
    "playwright": "^1.55.0",
    "prettier": "^3.6.2",
    "prettier-plugin-tailwindcss": "^0.6.14",
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

### Building & Deployment

```bash
npm run build        # Production build
npm run start        # Start production server
```

### Code Quality

```bash
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run format:check # Check formatting without changes
```

### Testing

```bash
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:e2e     # Run end-to-end tests
npm run test:e2e:ui  # Run E2E tests with UI
npm run test:e2e:headed # Run E2E tests in headed mode
```

### Database Management

```bash
npm run db:push      # Push migrations to database
npm run db:pull      # Pull schema from database
npm run db:migrate   # Create new migration
npm run db:status    # Check migration status
npm run db:types     # Generate TypeScript types
npm run db:diff      # Generate migration diff
npm run db:link      # Link to Supabase project
npm run db:backup    # Backup database
npm run db:restore   # Restore database
npm run db:checkpoint # Save database checkpoint
npm run db:restore-checkpoint # Restore from checkpoint
```

## Conclusion

This technology stack provides a solid foundation for building a modern, scalable web application with excellent developer experience and performance characteristics.
