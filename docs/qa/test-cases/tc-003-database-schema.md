# Test Cases: Database Schema (Story 003)

## TC-003-01: Schema Creation

**Priority:** P0-Critical
**Type:** Database Test
**Status:** ✅ Completed

### Preconditions

- Supabase project accessible
- SQL editor available
- Admin permissions

### Test Steps

1. Open Supabase SQL editor
2. Run migration scripts (00001-00005)
3. Check Tables view in dashboard
4. Verify all 8 tables created
5. Check column types and constraints
6. Verify 6 enum types created

### Expected Results

- ✅ Profiles table created (synced with auth.users)
- ✅ Communities table created
- ✅ Community_members table created
- ✅ Events table created
- ✅ Tickets table created
- ✅ Orders table created
- ✅ Passes table created (QR codes)
- ✅ Checkins table created
- ✅ All columns have correct types
- ✅ Primary keys are UUIDs
- ✅ Foreign keys established with proper cascades
- ✅ 6 enum types created (event_status, member_role, ticket_status, order_status, payment_provider, pass_status)

### Actual Results

- ✅ All 8 tables created successfully
- ✅ 6 enum types implemented
- ✅ 23 performance indexes applied
- ✅ All constraints verified

### Status: `Completed`

---

## TC-003-02: Row Level Security

**Priority:** P0-Critical
**Type:** Security Test
**Status:** ✅ Completed

### Preconditions

- Tables created
- RLS policies defined

### Test Steps

1. Enable RLS on all tables
2. Apply migration 00005 for complete RLS
3. Test as anonymous user (read)
4. Test as authenticated user (read)
5. Test write operations with ownership
6. Test RPC-only tables (passes, checkins)

### Expected Results

- ✅ RLS enabled on all 8 tables
- ✅ Published events readable by all
- ✅ Draft events only visible to creators
- ✅ Orders visible to buyers and organizers
- ✅ Passes/checkins protected (RPC only)
- ✅ No direct write to passes/checkins

### Actual Results

- ✅ 100% RLS coverage achieved
- ✅ All policies tested and working
- ✅ RPC functions enforce security

### Status: `Completed`

---

## TC-003-03: Data Relationships

**Priority:** P1-High
**Type:** Integration Test
**Status:** ✅ Completed

### Preconditions

- All tables created
- Foreign keys configured

### Test Steps

1. Insert a community
2. Insert an event for that community
3. Insert a ticket for that event
4. Query with joins
5. Test cascade delete

### Expected Results

- ✅ Data inserts maintain referential integrity
- ✅ Cannot insert orphaned records
- ✅ Joins return correct data
- ✅ Cascade delete works properly
- ✅ No constraint violations

### Actual Results

- ✅ All relationships verified
- ✅ Cascade rules working correctly
- ✅ No orphaned records possible

### Status: `Completed`

---

## TC-003-04: Profile Auto-Creation & Triggers

**Priority:** P0-Critical
**Type:** Trigger Test
**Status:** ✅ Completed

### Preconditions

- Profile trigger created
- Auth system working
- Updated_at triggers applied

### Test Steps

1. Create new auth user via signup
2. Check profiles table immediately
3. Verify profile data
4. Update a record and check updated_at
5. Test search triggers on events/communities

### Expected Results

- ✅ Profile created automatically
- ✅ User ID matches auth.users
- ✅ Updated_at triggers work on all tables
- ✅ Search_tsv auto-updates on events
- ✅ Search_tsv auto-updates on communities

### Actual Results

- ✅ All triggers functioning correctly
- ✅ Search triggers with unaccent working
- ✅ Timestamps updating properly

### Status: `Completed`

---

## TC-003-05: Index Performance

**Priority:** P2-Medium
**Type:** Performance Test
**Status:** ✅ Completed

### Preconditions

- 23 indexes created
- Sample data loaded

### Test Steps

1. Query by community slug (case-insensitive)
2. Query events by date and status
3. Query tickets by user
4. Full-text search on events
5. Check query execution plans

### Expected Results

- ✅ Case-insensitive slug queries optimized
- ✅ Composite indexes for hot paths
- ✅ GIN indexes for full-text search
- ✅ Partial indexes for filtered queries
- ✅ Query time < 50ms

### Actual Results

- ✅ 23 performance indexes applied
- ✅ All hot query paths optimized
- ✅ Full-text search with PostgreSQL working

### Status: `Completed`

---

## TC-003-06: Timestamp Triggers

**Priority:** P2-Medium
**Type:** Functional Test
**Status:** ✅ Completed

### Preconditions

- updated_at triggers created
- Tables have timestamp columns

### Test Steps

1. Insert a record
2. Check created_at and updated_at
3. Update the record
4. Check updated_at changed
5. Verify created_at unchanged

### Expected Results

- ✅ created_at set on insert
- ✅ updated_at set on insert
- ✅ updated_at changes on update
- ✅ created_at never changes
- ✅ Timestamps in UTC

### Actual Results

- ✅ All timestamp triggers working
- ✅ UTC timestamps verified
- ✅ Automatic updates functioning

### Status: `Completed`

---

## TC-003-07: TypeScript Type Generation & Safety

**Priority:** P1-High
**Type:** Development Test
**Status:** ✅ Completed

### Preconditions

- Schema finalized
- Supabase CLI installed

### Test Steps

1. Run `supabase gen types typescript`
2. Check generated database.types.ts (2500+ lines)
3. Test branded types system
4. Test repository pattern
5. Test Zod validation schemas

### Expected Results

- ✅ Types generated successfully
- ✅ Branded types prevent ID confusion
- ✅ Repository pattern provides clean access
- ✅ Zod schemas validate all inputs
- ✅ Exhaustive enum handling with assertNever

### Actual Results

- ✅ Complete type safety achieved
- ✅ 7+ utility files created
- ✅ Repository pattern implemented
- ✅ 100% type-safe operations

### Status: `Completed`

---

## TC-003-08: Data Constraints & RPC Functions

**Priority:** P1-High
**Type:** Validation Test
**Status:** ✅ Completed

### Preconditions

- Constraints defined
- 4 RPC functions created

### Test Steps

1. Test unique constraints (passes, QR codes)
2. Test case-insensitive unique slugs
3. Test purchase_ticket atomic function
4. Test process_checkin function
5. Test generate_pass_for_ticket
6. Test get_event_stats aggregation

### Expected Results

- ✅ One pass per ticket enforced
- ✅ Globally unique QR codes
- ✅ Atomic ticket purchases (no overselling)
- ✅ Check-in prevents double entry
- ✅ Statistics calculated correctly

### Actual Results

- ✅ All constraints working
- ✅ 4 RPC functions tested
- ✅ Atomic operations verified

### Status: `Completed`

---

## Summary

**Total Test Cases:** 8
**Completed:** 8 ✅
**Failed:** 0
**Not Executed:** 0

### Key Achievements

- ✅ 8 core tables implemented
- ✅ 6 enum types for type safety
- ✅ 4 RPC functions for atomic operations
- ✅ 23 performance indexes
- ✅ 100% RLS coverage
- ✅ Full-text search with PostgreSQL
- ✅ Branded types system
- ✅ Repository pattern
- ✅ Zod validation layer
- ✅ 2500+ lines of auto-generated types

### Migration History

1. **00001** - Initial schema with auth triggers
2. **00002** - Complete schema with all tables
3. **00003** - Enum conversions and foreign keys
4. **00004** - Constraints and performance indexes
5. **00005** - RLS policies and search triggers

---