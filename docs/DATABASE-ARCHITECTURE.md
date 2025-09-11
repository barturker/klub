# Database Architecture Documentation

## Overview
The Klub database is built on Supabase (PostgreSQL) with enterprise-grade type safety, security, and performance optimizations.

## Current Schema Status

### Core Tables
1. **profiles** - User profiles linked to auth.users
2. **communities** - Community/organization entities
3. **community_members** - Membership junction table with roles
4. **events** - Event entities with full metadata
5. **tickets** - Purchased tickets
6. **orders** - Order records for payments
7. **passes** - QR code passes for tickets (1:1 with tickets)
8. **checkins** - Check-in records for event entry

### Enum Types
- `event_status`: draft, published, cancelled, completed
- `member_role`: member, moderator, admin
- `ticket_status`: pending, confirmed, cancelled, refunded, checked_in
- `order_status`: pending, processing, paid, failed, refunded, cancelled
- `payment_provider`: stripe, iyzico, paypal, manual
- `pass_status`: valid, used, revoked, expired

### Key Features Implemented

#### 1. Foreign Key Relationships
- ✅ `events.created_by` → `profiles.id`
- ✅ `orders.buyer_id` → `profiles.id`
- ✅ `checkins.scanned_by` → `profiles.id`
- ✅ All tables properly linked with CASCADE/RESTRICT rules

#### 2. Unique Constraints
- ✅ One pass per ticket (`passes.ticket_id` UNIQUE)
- ✅ Globally unique QR codes (`passes.secure_code` UNIQUE)
- ✅ One successful check-in per ticket
- ✅ Case-insensitive unique slugs and usernames

#### 3. Performance Indexes
```sql
-- Hot query paths optimized
idx_events_community_status_start: (community_id, status, start_at DESC)
idx_tickets_event_status: (event_id, status)
idx_orders_event_status_created: (event_id, status, created_at DESC)
idx_orders_buyer_created: (buyer_id, created_at DESC)
idx_passes_status: WHERE status = 'valid'
```

#### 4. Full-Text Search
- PostGIS and pg_trgm extensions enabled
- Automatic `search_tsv` triggers for events and communities
- Accent-insensitive search with `unaccent`
- GIN indexes for fast text search

#### 5. Row Level Security (RLS)
```typescript
// Events
- Published events: Public read
- Draft events: Owner only
- Modifications: Owner/creator only

// Orders
- Buyers see their orders
- Event organizers see event orders

// Passes & Checkins
- Write-protected (RPC only)
- Event staff read access
```

## Type Safety Architecture

### Generated Types (`database.types.ts`)
- Auto-generated from live schema
- Full type coverage for tables, views, functions, enums
- Relationship metadata included

### Helper Types (`db-helpers.ts`)
```typescript
// Generic helpers
Row<'events'>      // Select type
Insert<'events'>   // Insert type
Update<'events'>   // Update type
Enum<'event_status'> // Enum type

// Direct exports
type Event = Row<'events'>
type Order = Row<'orders'>
```

### Branded Types (`branded-types.ts`)
```typescript
// Prevent ID confusion
type EventId = Brand<string, 'EventId'>
type TicketId = Brand<string, 'TicketId'>

// Money safety
type Cents = Brand<number, 'Cents'>
type Dollars = Brand<number, 'Dollars'>

// Exhaustiveness checking
assertNever(value) // Compile-time enum coverage
```

### Advanced Utils (`type-utils.ts`)
```typescript
// Typed RPC calls
await rpc('purchase_ticket', { p_event_id, p_user_id, p_amount })

// Pre-built selects
selectEventWithRelations // Includes community & creator

// Query helpers
getMyTickets(userId)
searchEvents(query)
getCommunityEvents(communityId)
```

### Validation Layer (`validation.ts`)
```typescript
// Zod schemas synced with DB
eventCreateSchema
orderStatusSchema
ticketStatusSchema

// Helpers
parseOrThrow(schema, data)
safeParse(schema, data)
formatZodErrors(error)
```

### Repository Pattern (`repositories/index.ts`)
```typescript
// Clean data access layer
db.events.getPublished()
db.events.getById(eventId)
db.tickets.purchase(eventId, userId, amount)
db.checkins.processCheckin(code, scannedBy)

// All operations validated
// Branded types enforced
// Consistent error handling
```

## RPC Functions

### purchase_ticket
- Atomic ticket purchase with inventory check
- Uses FOR UPDATE lock to prevent overselling
- Returns ticket_id on success

### process_checkin
- Validates pass secure_code
- Marks pass as used
- Creates checkin record
- Prevents double check-ins

### generate_pass_for_ticket
- Creates unique QR code
- One pass per ticket enforced
- Returns secure_code

### get_event_stats
- Returns aggregate statistics
- Total tickets, checked in, revenue
- Attendance rate calculation

## Migration History

1. **00001_initial_schema.sql** - Base tables and auth triggers
2. **00002_complete_schema.sql** - All tables, enums, functions, RLS
3. **00003_schema_improvements.sql** - Enum conversions, FKs, indexes
4. **00004_final_constraints_and_indexes.sql** - Unique constraints, performance
5. **00005_complete_rls_and_search.sql** - RLS policies, search triggers

## Security Model

### Authentication
- Supabase Auth (auth.users)
- Profiles table synced via trigger
- JWT-based session management

### Authorization Layers
1. **RLS Policies** - Database level
2. **RPC Functions** - Business logic with SECURITY DEFINER
3. **API Validation** - Zod schemas
4. **Type Safety** - Compile-time checks

### Protected Operations
- Direct writes to `passes` and `checkins` disabled
- All modifications through validated RPCs
- Atomic operations for payments

## Performance Optimizations

### Indexing Strategy
- Foreign keys indexed
- Composite indexes for common queries
- Partial indexes for filtered queries
- GIN indexes for full-text search

### Query Optimization
- Pre-built select statements
- Relationship eager loading
- Pagination built-in
- Connection pooling via Supabase

### Caching Strategy
- Edge caching for public events
- Client-side caching with SWR/React Query
- Database query result caching

## Development Workflow

### Making Schema Changes
1. Create migration in `supabase/migrations/`
2. Follow patterns in `supabase/CLAUDE.md`
3. Push with `npx supabase db push --linked`
4. Regenerate types: `npx supabase gen types typescript --linked > lib/supabase/database.types.ts`

### Type Safety Workflow
1. Schema changes → Migration
2. Migration → Push to Supabase
3. Supabase → Generate types
4. Types → Update helpers if needed
5. Test with repository pattern

## Testing Strategy

### Unit Tests
- Repository functions
- Validation schemas
- Type guards
- Branded type conversions

### Integration Tests
- RPC functions
- RLS policies
- Transaction rollbacks
- Concurrent operations

### E2E Tests
- Full purchase flow
- Check-in process
- Search functionality
- Permission scenarios

## Monitoring & Maintenance

### Health Checks
- Connection pool status
- Query performance metrics
- RLS policy effectiveness
- Index usage statistics

### Regular Maintenance
- VACUUM and ANALYZE schedules
- Index rebuild when needed
- Statistics updates
- Query plan reviews

## Future Enhancements

### Planned Features
- [ ] Waitlist management
- [ ] Recurring events
- [ ] Multi-currency support
- [ ] Advanced analytics RPCs
- [ ] Webhook integrations

### Performance Improvements
- [ ] Materialized views for stats
- [ ] Partitioned tables for large datasets
- [ ] Read replicas for analytics
- [ ] GraphQL subscriptions

## Key Files Reference

```
/lib/supabase/
├── database.types.ts     # Auto-generated types
├── db-helpers.ts         # Type helpers
├── type-utils.ts         # Advanced utilities
├── validation.ts         # Zod schemas
├── branded-types.ts      # Branded type system
├── client.ts            # Client instance
└── server.ts            # Server instance

/lib/repositories/
└── index.ts             # Repository pattern

/lib/utils/
└── json.ts              # JSON sanitizer

/supabase/
├── migrations/          # SQL migrations
├── config.toml         # Local config
└── CLAUDE.md           # Migration rules
```

## Contact & Support

For database-related questions or issues:
1. Check this documentation first
2. Review migration files for schema details
3. Test locally with `supabase start`
4. Use type helpers for safety