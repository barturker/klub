# Supabase Migration Rules for Claude AI

## 🚫 Forbidden Operations (Hard Rules)

These rules must NEVER be violated:

❌ **ALTER TABLE ... DISABLE ROW LEVEL SECURITY** → RLS must ALWAYS remain ENABLED

❌ **Global RLS or bulk policy deletion** → Policy changes must be additive (add new, test, then remove old)

❌ **DROP TABLE, DROP TYPE, DROP POLICY, DROP FUNCTION** destructive changes → Only with explicit deprecation process, in separate migration with manual approval

❌ **Column rename/drop** → First add new column + populate + app transition → then remove old

❌ **ENUM modification** → Don't use ALTER TYPE. Prefer TEXT + CHECK approach

## ✅ Allowed Pattern for RLS/Policies

1. Add new policy → test → remove old in separate migration if needed
2. Policy names must be unique and descriptive (e.g., cjr_insert, csh_select_admins)
3. Privacy or ownership controls must be explicit in USING/WITH CHECK
4. To remove policy: first remove from app → verify in staging → separate PR for prod

## 🛡️ Safety Net

- All migrations must be idempotent (IF NOT EXISTS, named constraint/index/policy)
- Migration order: Columns → Constraints → Data Backfill → Indexes → Policies
- Large indexes use CREATE INDEX CONCURRENTLY (or separate transaction)
- Migration PRs must include: Problem, Options, Decision, Rollout & Rollback Plan

## 🚀 Proactive Migration Approach

When you detect database schema issues or improvements, **create and apply migrations immediately** without asking for permission. This saves time and ensures consistency.

## 📋 Migration Checklist

### Before Writing Any Migration

1. **Check column data types first**
   - If converting text → enum, UPDATE invalid values BEFORE conversion
   - Never assume columns are empty or have valid data
   - Use `information_schema.columns` to check current state

2. **Use DO blocks for safety**
   ```sql
   DO $$ 
   BEGIN
       -- Your changes here
       -- This prevents errors if objects already exist
   END $$;
   ```

3. **Always use IF NOT EXISTS patterns**
   ```sql
   -- For constraints
   IF NOT EXISTS (
       SELECT 1 FROM information_schema.table_constraints 
       WHERE constraint_name = 'constraint_name'
   ) THEN
       ALTER TABLE ...
   END IF;
   
   -- For indexes
   IF NOT EXISTS (
       SELECT 1 FROM pg_indexes 
       WHERE indexname = 'index_name'
   ) THEN
       CREATE INDEX ...
   END IF;
   ```

## 🎯 Migration Best Practices

### 1. Data Safety First

```sql
-- WRONG: Direct update that might fail
UPDATE orders SET status = 'pending' WHERE status = '';

-- RIGHT: Check data type first, handle all cases
IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'status' 
    AND data_type = 'text'
) THEN
    -- Safe update with comprehensive WHERE clause
    UPDATE orders 
    SET status = 'pending' 
    WHERE status IS NULL 
       OR status = '' 
       OR status NOT IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled');
END IF;
```

### 2. Foreign Keys Must Reference Existing Tables

```sql
-- Always check if the referenced table and column exist
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Add foreign key
    ALTER TABLE events 
    ADD CONSTRAINT events_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id);
END IF;
```

### 3. Handle Existing Data When Adding Constraints

```sql
-- Before adding NOT NULL
UPDATE table_name SET column_name = 'default_value' WHERE column_name IS NULL;

-- Before adding UNIQUE
-- Check for duplicates first
SELECT column_name, COUNT(*) 
FROM table_name 
GROUP BY column_name 
HAVING COUNT(*) > 1;
```

### 4. Enum Type Creation Pattern

```sql
DO $$ 
BEGIN
    -- Check if type doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled');
    END IF;
END $$;

-- When converting column to enum
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'status' 
        AND data_type = 'text'
    ) THEN
        -- Clean data first
        UPDATE orders 
        SET status = 'pending' 
        WHERE status NOT IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled');
        
        -- Use temporary column pattern
        ALTER TABLE orders ADD COLUMN status_new order_status;
        UPDATE orders SET status_new = status::order_status;
        ALTER TABLE orders DROP COLUMN status;
        ALTER TABLE orders RENAME COLUMN status_new TO status;
        ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
        ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending'::order_status;
    END IF;
END $$;
```

### 5. Index Creation Rules

```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_events_community_status_start
ON events(community_id, status, start_at DESC)
WHERE status = 'published'; -- Partial index for efficiency

-- Unique indexes for business rules
CREATE UNIQUE INDEX idx_passes_ticket_unique
ON passes(ticket_id); -- One pass per ticket

-- Case-insensitive unique constraints
CREATE UNIQUE INDEX idx_communities_slug_ci
ON communities(LOWER(slug));
```

### 6. RLS Policy Pattern

```sql
-- Always DROP IF EXISTS before CREATE
DROP POLICY IF EXISTS "policy_name" ON table_name;

CREATE POLICY "policy_name"
ON table_name
FOR ALL -- or SELECT/INSERT/UPDATE/DELETE
USING (
    -- Visibility condition
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM related_table
        WHERE condition
    )
)
WITH CHECK (
    -- Write permission condition (for INSERT/UPDATE)
    user_id = auth.uid()
);
```

## 🔍 Common Issues to Watch For

### Issue 1: Empty String vs NULL in Enums
**Problem**: PostgreSQL enums don't accept empty strings
**Solution**: Always update empty strings to valid enum values before conversion

### Issue 2: Missing Foreign Key Relationships
**Detection**: When you see columns like `user_id`, `buyer_id`, `created_by`
**Action**: Immediately add FK constraints to `profiles(id)` or `auth.users(id)`

### Issue 3: Missing Unique Constraints
**Detection**: Business logic implies uniqueness (e.g., one pass per ticket)
**Action**: Add unique constraints or indexes

### Issue 4: Unindexed Foreign Keys
**Detection**: FK columns without indexes
**Action**: Add indexes for all FK columns

### Issue 5: Case-Sensitive Uniqueness
**Detection**: Username, email, slug columns
**Action**: Use LOWER() in unique indexes

## 📝 Migration Naming Convention

```
NNNNN_description_of_change.sql

Examples:
00001_initial_schema.sql
00002_complete_schema.sql
00003_schema_improvements.sql
00004_final_constraints_and_indexes.sql
00005_add_payment_tables.sql
```

## 🚨 When to Create Migrations Immediately

1. **Missing Foreign Keys**: Create migration instantly
2. **String fields that should be enums**: Create migration instantly
3. **Missing indexes on foreign keys**: Create migration instantly
4. **Missing unique constraints**: Create migration instantly
5. **Performance issues** (missing composite indexes): Create migration instantly
6. **Security issues** (missing RLS policies): Create migration instantly

## 🎬 Migration Workflow

1. **Detect issue** → Create migration file immediately
2. **Write safe, idempotent SQL** using patterns above
3. **Push to Supabase** using `npx supabase db push --linked`
4. **Regenerate types** using `npx supabase gen types typescript --linked > lib/supabase/database.types.ts`
5. **Update TypeScript helpers** if needed

## 💡 Pro Tips

- **Always validate data before constraints**: Check for violations before adding constraints
- **Use transactions implicitly**: Migrations run in transactions by default
- **Keep migrations idempotent**: Should be safe to run multiple times
- **Document with comments**: Add COMMENT ON for complex constraints
- **Test with sample data**: Consider edge cases with existing data

## 🔄 Rollback Strategy

Each migration should have a conceptual rollback:
- If adding columns → DROP COLUMN
- If adding constraints → DROP CONSTRAINT
- If creating indexes → DROP INDEX
- If creating types → DROP TYPE CASCADE (careful!)

## 📊 Performance Considerations

- **Index foreign keys**: Always index FK columns
- **Composite indexes**: Order matters (most selective first)
- **Partial indexes**: Use WHERE clause for filtered queries
- **Don't over-index**: Each index slows down writes

## 🔐 Security by Default

- **Enable RLS** on all tables
- **Default deny** then explicitly allow
- **Use auth.uid()** for user context
- **Check ownership** before allowing mutations

---

**Remember**: When in doubt, create the migration. It's easier to improve a migration than to fix a broken production database!