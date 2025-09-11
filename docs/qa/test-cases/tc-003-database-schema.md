# Test Cases: Database Schema (Story 003)

## TC-003-01: Schema Creation

**Priority:** P0-Critical
**Type:** Database Test

### Preconditions

- Supabase project accessible
- SQL editor available
- Admin permissions

### Test Steps

1. Open Supabase SQL editor
2. Run schema creation script
3. Check Tables view in dashboard
4. Verify all tables created
5. Check column types and constraints

### Expected Results

- ✅ Communities table created
- ✅ Events table created
- ✅ Tickets table created
- ✅ All columns have correct types
- ✅ Primary keys are UUIDs
- ✅ Foreign keys established

### Actual Results

_To be filled during execution_

### Status: `Not Executed`

---

## TC-003-02: Row Level Security

**Priority:** P0-Critical
**Type:** Security Test

### Preconditions

- Tables created
- RLS policies defined

### Test Steps

1. Enable RLS on all tables
2. Create test policies
3. Test as anonymous user (read)
4. Test as authenticated user (read)
5. Test write operations with ownership

### Expected Results

- ✅ RLS enabled on all tables
- ✅ Anonymous can read public data
- ✅ Users can only modify own data
- ✅ Policies prevent unauthorized access
- ✅ No data leaks possible

### Actual Results

_To be filled during execution_

### Status: `Not Executed`

---

## TC-003-03: Data Relationships

**Priority:** P1-High
**Type:** Integration Test

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

_To be filled during execution_

### Status: `Not Executed`

---

## TC-003-04: Profile Auto-Creation

**Priority:** P0-Critical
**Type:** Trigger Test

### Preconditions

- Profile trigger created
- Auth system working

### Test Steps

1. Create new auth user via signup
2. Check profiles table immediately
3. Verify profile data
4. Check trigger logs
5. Test with different signup methods

### Expected Results

- ✅ Profile created automatically
- ✅ User ID matches auth.users
- ✅ Metadata populated correctly
- ✅ Timestamps set properly
- ✅ No duplicate profiles

### Actual Results

_To be filled during execution_

### Status: `Not Executed`

---

## TC-003-05: Index Performance

**Priority:** P2-Medium
**Type:** Performance Test

### Preconditions

- Indexes created
- Sample data loaded

### Test Steps

1. Query by community slug
2. Query events by date
3. Query tickets by user
4. Check query execution plans
5. Compare with/without indexes

### Expected Results

- ✅ Slug queries use index
- ✅ Date queries optimized
- ✅ Foreign key lookups fast
- ✅ Query time < 100ms
- ✅ No table scans on indexed columns

### Actual Results

_To be filled during execution_

### Status: `Not Executed`

---

## TC-003-06: Timestamp Triggers

**Priority:** P2-Medium
**Type:** Functional Test

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

_To be filled during execution_

### Status: `Not Executed`

---

## TC-003-07: TypeScript Type Generation

**Priority:** P1-High
**Type:** Development Test

### Preconditions

- Schema finalized
- Supabase CLI installed

### Test Steps

1. Run `supabase gen types typescript`
2. Check generated types file
3. Import types in TypeScript file
4. Test IntelliSense
5. Verify type safety

### Expected Results

- ✅ Types generated successfully
- ✅ All tables included
- ✅ Enums properly typed
- ✅ Relationships reflected
- ✅ No type errors in usage

### Actual Results

_To be filled during execution_

### Status: `Not Executed`

---

## TC-003-08: Data Constraints

**Priority:** P1-High
**Type:** Validation Test

### Preconditions

- Constraints defined
- Tables ready

### Test Steps

1. Try to insert null in NOT NULL field
2. Try duplicate slug
3. Try invalid foreign key
4. Try negative price
5. Try invalid enum value

### Expected Results

- ✅ NULL constraints enforced
- ✅ Unique constraints work
- ✅ Foreign key constraints active
- ✅ Check constraints validated
- ✅ Clear error messages

### Actual Results

_To be filled during execution_

### Status: `Not Executed`
