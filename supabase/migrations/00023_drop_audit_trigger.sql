-- Drop the broken audit trigger that's trying to use non-existent 'changes' column
DROP TRIGGER IF EXISTS audit_community_members_changes ON community_members;

-- Drop the associated function
DROP FUNCTION IF EXISTS audit_community_members_changes() CASCADE;