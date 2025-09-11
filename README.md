# Klub - Enterprise-Grade Event & Community Platform

A production-ready event management and community platform with enterprise-grade type safety, built with Next.js 15, Supabase, and TypeScript.

## 🚀 Current Status: Database Layer Complete

### ✅ Completed Features
- **Full database schema** with 8 core tables
- **100% type-safe operations** with branded types
- **Row Level Security (RLS)** on all tables  
- **5 migrations applied** to production
- **Repository pattern** for clean data access
- **Zod validation** on all inputs
- **Full-text search** with PostgreSQL
- **Atomic transactions** for payments

## 🎯 Tech Stack

### Core Technologies
- **Frontend:** Next.js 15.5 with App Router + Turbopack
- **Database:** Supabase (PostgreSQL 15 + PostGIS + pg_trgm)
- **Type Safety:** TypeScript 5.6 + Zod + Branded Types
- **UI:** shadcn/ui (42+ components) + Tailwind CSS 4
- **Auth:** Supabase Auth with RLS
- **Payments:** Stripe (configured, ready)
- **Hosting:** Vercel (free tier)

### Database Features
- **6 Enum Types:** event_status, member_role, ticket_status, order_status, payment_provider, pass_status
- **4 RPC Functions:** purchase_ticket, process_checkin, generate_pass_for_ticket, get_event_stats  
- **23 Indexes:** Optimized for performance
- **RLS Policies:** Secure by default
- **Search Triggers:** Automatic tsvector updates

## 📊 Database Schema

### Core Tables
| Table | Purpose | Key Features |
|-------|---------|--------------|
| `profiles` | User profiles | Synced with auth.users |
| `communities` | Organizations | Full-text search, slug |
| `community_members` | Memberships | Role-based (member/moderator/admin) |
| `events` | Event listings | Status enum, geolocation, search |
| `tickets` | Purchased tickets | Linked to users and events |
| `orders` | Payment records | Multiple providers, status tracking |
| `passes` | QR codes | 1:1 with tickets, unique codes |
| `checkins` | Entry records | Prevent double check-ins |

## 🛡️ Type Safety Architecture

```typescript
// Branded Types - Prevent ID confusion
type EventId = Brand<string, 'EventId'>
type Cents = Brand<number, 'Cents'>

// Repository Pattern - Clean data access
const event = await db.events.getById(toEventId('uuid'))
const ticketId = await db.tickets.purchase(
  eventId, 
  userId, 
  toCents(25.99) // $25.99 → 2599 cents
)

// Exhaustive Enum Handling
switch(status) {
  case 'draft': return 'gray'
  case 'published': return 'green'
  case 'cancelled': return 'red'
  case 'completed': return 'blue'
  default: return assertNever(status) // Compile error if enum changes
}
```

## 🚦 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase account (free)

### Installation

```bash
# Clone repository
git clone https://github.com/barturker/klub.git
cd klub

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://uchbiaeauxadjsjnjmjf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run Development Server
```bash
npm run dev --turbo
# Visit http://localhost:3000
```

## 📁 Project Structure

```
klub/
├── app/                      # Next.js 15 App Router
│   ├── api/                 # API routes with validation
│   │   └── example-usage.ts # Complete API examples
│   ├── auth/               # Authentication pages
│   └── (dashboard)/        # Protected routes
│
├── components/              # React components
│   ├── ui/                 # shadcn/ui components (42+)
│   └── features/           # Feature components
│
├── lib/                    # Core libraries
│   ├── supabase/          # Database layer ⭐
│   │   ├── database.types.ts     # Auto-generated (2500+ lines)
│   │   ├── db-helpers.ts         # Type helpers
│   │   ├── type-utils.ts         # Advanced utilities
│   │   ├── validation.ts         # Zod schemas
│   │   ├── branded-types.ts      # Branded type system
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   ├── repositories/       # Repository pattern
│   │   └── index.ts       # Data access layer
│   └── utils/             # Utilities
│       └── json.ts        # JSON sanitizer
│
├── supabase/              # Database configuration
│   ├── migrations/        # 5 migrations applied ✅
│   │   ├── 00001_initial_schema.sql
│   │   ├── 00002_complete_schema.sql
│   │   ├── 00003_schema_improvements.sql
│   │   ├── 00004_final_constraints_and_indexes.sql
│   │   └── 00005_complete_rls_and_search.sql
│   ├── config.toml       # Local config
│   └── CLAUDE.md         # Migration best practices
│
└── docs/                  # Documentation
    ├── DATABASE-ARCHITECTURE.md  # Complete DB docs ⭐
    ├── stories/          # User stories
    │   └── active/      # Current sprint
    └── architecture/    # System design
```

## 🔥 Usage Examples

### Type-Safe Database Operations
```typescript
import db from '@/lib/repositories'
import { toEventId, toProfileId, toCents } from '@/lib/supabase/branded-types'

// Get published events
const events = await db.events.getPublished()

// Get event with relations
const event = await db.events.getById(toEventId('uuid'))

// Purchase ticket (atomic transaction)
const ticketId = await db.tickets.purchase(
  toEventId(eventId),
  toProfileId(userId),
  toCents(25.99)
)

// Process check-in
const result = await db.checkins.processCheckin(
  secureCode,
  toProfileId(scannerId)
)
```

### Validation Examples
```typescript
import { parseOrThrow, eventCreateSchema } from '@/lib/supabase/validation'

// API endpoint with validation
export async function POST(req: Request) {
  const body = await req.json()
  const validated = parseOrThrow(eventCreateSchema, body)
  
  const event = await db.events.create(validated)
  return NextResponse.json(event)
}
```

### RPC Functions
```typescript
import { rpc } from '@/lib/supabase/type-utils'

// Type-safe RPC calls
const stats = await rpc('get_event_stats', {
  p_event_id: eventId
})
// Returns: { total_tickets, checked_in, revenue, attendance_rate }
```

## 📝 Available Scripts

```bash
npm run dev           # Development with Turbopack
npm run build         # Production build
npm run start         # Production server
npm run lint          # ESLint
npm run typecheck     # TypeScript check
npm run db:types      # Regenerate DB types

# Database commands
npx supabase start           # Local Supabase
npx supabase db push --linked # Push migrations
npx supabase gen types typescript --linked > lib/supabase/database.types.ts
```

## 🔐 Security Features

- **Row Level Security (RLS)** on all tables
- **Protected RPCs** for passes and checkins
- **Input validation** with Zod
- **Branded types** prevent ID confusion
- **Atomic transactions** for payments
- **SQL injection protection** via parameterized queries

## 📈 Performance Optimizations

- **23 database indexes** for query performance
- **Composite indexes** for common queries
- **Partial indexes** for filtered queries
- **GIN indexes** for full-text search
- **Repository pattern** for query reuse
- **Pre-built selects** for relations

## 📚 Key Documentation

| Document | Description |
|----------|-------------|
| [DATABASE-ARCHITECTURE.md](docs/DATABASE-ARCHITECTURE.md) | Complete database documentation |
| [Migration Rules](supabase/CLAUDE.md) | Best practices for migrations |
| [API Examples](app/api/example-usage.ts) | Complete API implementation examples |
| [Type System](lib/supabase/branded-types.ts) | Branded types documentation |
| [Repository Pattern](lib/repositories/index.ts) | Data access patterns |

## 🎯 Development Roadmap

### ✅ Phase 1: Database Layer (COMPLETE)
- [x] Full schema with 8 tables
- [x] 6 enum types
- [x] 4 RPC functions  
- [x] 23 performance indexes
- [x] RLS policies
- [x] Type-safe operations
- [x] Repository pattern
- [x] Validation layer

### 🚧 Phase 2: Core Features (IN PROGRESS)
- [ ] Authentication flow
- [ ] Community creation
- [ ] Event creation
- [ ] Event discovery

### 📋 Phase 3: Revenue Features
- [ ] Stripe integration
- [ ] Ticket purchasing
- [ ] Order management
- [ ] Check-in system

### 🔮 Phase 4: Advanced Features
- [ ] Analytics dashboard
- [ ] Email notifications
- [ ] Waitlist management
- [ ] Recurring events

## 🤝 Contributing

1. Follow patterns in existing code
2. Use branded types for IDs
3. Add Zod validation for inputs
4. Write idempotent migrations
5. Update types after schema changes

## 🆘 Support

1. Check [DATABASE-ARCHITECTURE.md](docs/DATABASE-ARCHITECTURE.md)
2. Review [API Examples](app/api/example-usage.ts)
3. See [Migration Rules](supabase/CLAUDE.md)
4. Open an issue on GitHub

---

**Stack:** Next.js 15.5 + Supabase + TypeScript + Zod  
**Database:** PostgreSQL 15 + PostGIS + pg_trgm  
**Status:** Database layer production-ready ✅  
**Next:** Building UI components