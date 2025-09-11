# Technical Assumptions

## Repository Structure: Monorepo

The project will use a monorepo structure with Nx to manage multiple applications and shared packages. This enables code reuse across iOS, Android, and web apps while maintaining clear boundaries. Structure includes:
- `/apps` - iOS, Android, web, admin applications  
- `/packages` - Shared libraries (UI components, API client, utilities, types)
- `/services` - Backend microservices
- `/infrastructure` - IaC templates and deployment configs

## Service Architecture

**CRITICAL DECISION** - Hybrid approach starting with modular monolith, evolving to microservices:
- **Phase 1 (MVP):** Modular monolith with clear domain boundaries (auth, payments, communities, events, analytics)
- **Phase 2:** Extract payment processing and notifications as separate services
- **Phase 3:** Full microservices for scale (separate services per domain)

Initial architecture uses Next.js 14 with API Routes, Server Components for optimal performance, Supabase (PostgreSQL) with built-in caching, and Vercel Edge Functions for event-driven tasks. Services communicate via Supabase Realtime for live updates and Trigger.dev for async workflows.

## Testing Requirements

**CRITICAL DECISION** - Comprehensive testing strategy from day one:
- **Unit Tests:** Minimum 80% coverage for business logic using Jest
- **Integration Tests:** API endpoints and database operations tested with Supertest
- **E2E Tests:** Critical user flows (signup, payment, event creation) using Detox for mobile, Cypress for web
- **Contract Tests:** API contracts validated between frontend and backend
- **Performance Tests:** Load testing with k6 for 10,000 concurrent users
- **Manual Testing:** Convenience methods for rapid developer testing including test data seeders and environment switchers

## Additional Technical Assumptions and Requests

- **Mobile Framework:** React Native with Expo for rapid development and OTA updates (30 free builds/month)
- **State Management:** Zustand for lightweight state + React Query for server state caching
- **Payment Processing:** Stripe Connect for marketplace payments (pay per transaction only)
- **Authentication:** Supabase Auth with social logins, magic links, MFA (50K MAUs free)
- **Real-time:** Supabase Realtime for live updates and presence (included free)
- **File Storage:** Supabase Storage with CDN (1GB free) + Cloudinary backup (25GB bandwidth free)
- **Search:** PostgreSQL full-text search (free) with Algolia later (10K searches free)
- **Analytics:** PostHog for product analytics (1M events free) + Sentry for errors (5K free)
- **CI/CD:** Vercel auto-deploy + GitHub Actions (2000 minutes free/month)
- **Infrastructure:** Vercel (serverless) + Supabase (managed) - no DevOps needed
- **Database Migrations:** Supabase Migrations with version control
- **API Documentation:** tRPC for type-safe APIs (no docs needed)
- **Feature Flags:** PostHog feature flags (included free)
- **Monitoring:** Vercel Analytics (free) + PostHog for custom events
- **Mobile Distribution:** Expo EAS for beta testing (free tier included)