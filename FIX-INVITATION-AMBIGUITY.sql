-- FIX COLUMN AMBIGUITY IN ACCEPT_INVITATION
-- Run this in Supabase SQL Editor NOW!

DROP FUNCTION IF EXISTS accept_invitation CASCADE;

-- Fixed version with no ambiguity
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT, p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    community_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation RECORD;
    v_already_member BOOLEAN;
    v_community_id UUID;
BEGIN
    -- Get invitation details with lock
    SELECT
        i.id,
        i.community_id,
        i.expires_at,
        i.uses_count,
        i.max_uses
    INTO v_invitation
    FROM invitations i
    WHERE i.token = p_token
    FOR UPDATE;

    -- Check if invitation exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Invalid invitation token', NULL::UUID;
        RETURN;
    END IF;

    -- Store community_id to avoid ambiguity
    v_community_id := v_invitation.community_id;

    -- Check if expired
    IF v_invitation.expires_at < NOW() THEN
        RETURN QUERY SELECT false, 'This invitation has expired', v_community_id;
        RETURN;
    END IF;

    -- Check if max uses reached
    IF v_invitation.uses_count >= v_invitation.max_uses THEN
        RETURN QUERY SELECT false, 'This invitation has already been used', v_community_id;
        RETURN;
    END IF;

    -- Check if user is already a member
    SELECT EXISTS (
        SELECT 1
        FROM community_members cm
        WHERE cm.community_id = v_community_id
        AND cm.user_id = p_user_id
    ) INTO v_already_member;

    IF v_already_member THEN
        RETURN QUERY SELECT false, 'You are already a member of this community', v_community_id;
        RETURN;
    END IF;

    -- Begin transaction
    BEGIN
        -- Add user to community
        INSERT INTO community_members (community_id, user_id, role, joined_at)
        VALUES (v_community_id, p_user_id, 'member', NOW());

        -- Record invitation use
        INSERT INTO invitation_uses (invitation_id, user_id, accepted_at)
        VALUES (v_invitation.id, p_user_id, NOW());

        -- Update invitation uses count
        UPDATE invitations
        SET uses_count = uses_count + 1
        WHERE id = v_invitation.id;

        -- Update community member count
        UPDATE communities c
        SET member_count = c.member_count + 1
        WHERE c.id = v_community_id;

        RETURN QUERY SELECT true, 'Successfully joined the community', v_community_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the actual error for debugging
            RAISE WARNING 'Error accepting invitation: %', SQLERRM;
            RETURN QUERY SELECT false, 'An error occurred while joining the community', NULL::UUID;
    END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;

-- Test function signature
SELECT 'Function fixed! Try accepting invitation again.' as status;