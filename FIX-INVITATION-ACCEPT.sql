-- FIX INVITATION ACCEPT ERROR
-- Run this in Supabase SQL Editor after the auth fix

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS is_invitation_valid CASCADE;
DROP FUNCTION IF EXISTS accept_invitation CASCADE;

-- Create function to validate invitation
CREATE OR REPLACE FUNCTION is_invitation_valid(p_token TEXT)
RETURNS TABLE (
    valid BOOLEAN,
    community_id UUID,
    community_name TEXT,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    -- Get invitation details
    SELECT
        i.*,
        c.name as community_name
    INTO v_invitation
    FROM invitations i
    JOIN communities c ON c.id = i.community_id
    WHERE i.token = p_token
    LIMIT 1;

    -- Check if invitation exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ;
        RETURN;
    END IF;

    -- Check if expired
    IF v_invitation.expires_at < NOW() THEN
        RETURN QUERY SELECT false, v_invitation.community_id, v_invitation.community_name, v_invitation.expires_at;
        RETURN;
    END IF;

    -- Check if max uses reached
    IF v_invitation.uses_count >= v_invitation.max_uses THEN
        RETURN QUERY SELECT false, v_invitation.community_id, v_invitation.community_name, v_invitation.expires_at;
        RETURN;
    END IF;

    -- Invitation is valid
    RETURN QUERY SELECT true, v_invitation.community_id, v_invitation.community_name, v_invitation.expires_at;
END;
$$;

-- Create function to accept invitation
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
BEGIN
    -- Get invitation details with lock
    SELECT * INTO v_invitation
    FROM invitations
    WHERE token = p_token
    FOR UPDATE;

    -- Check if invitation exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Invalid invitation token', NULL::UUID;
        RETURN;
    END IF;

    -- Check if expired
    IF v_invitation.expires_at < NOW() THEN
        RETURN QUERY SELECT false, 'This invitation has expired', v_invitation.community_id;
        RETURN;
    END IF;

    -- Check if max uses reached
    IF v_invitation.uses_count >= v_invitation.max_uses THEN
        RETURN QUERY SELECT false, 'This invitation has already been used', v_invitation.community_id;
        RETURN;
    END IF;

    -- Check if user is already a member
    SELECT EXISTS (
        SELECT 1
        FROM community_members
        WHERE community_id = v_invitation.community_id
        AND user_id = p_user_id
    ) INTO v_already_member;

    IF v_already_member THEN
        RETURN QUERY SELECT false, 'You are already a member of this community', v_invitation.community_id;
        RETURN;
    END IF;

    -- Begin transaction
    BEGIN
        -- Add user to community
        INSERT INTO community_members (community_id, user_id, role, joined_at)
        VALUES (v_invitation.community_id, p_user_id, 'member', NOW());

        -- Record invitation use
        INSERT INTO invitation_uses (invitation_id, user_id, accepted_at)
        VALUES (v_invitation.id, p_user_id, NOW());

        -- Update invitation uses count
        UPDATE invitations
        SET uses_count = uses_count + 1
        WHERE id = v_invitation.id;

        -- Update community member count
        UPDATE communities
        SET member_count = member_count + 1
        WHERE id = v_invitation.community_id;

        RETURN QUERY SELECT true, 'Successfully joined the community', v_invitation.community_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the actual error for debugging
            RAISE WARNING 'Error accepting invitation: %', SQLERRM;
            RETURN QUERY SELECT false, 'An error occurred while joining the community', NULL::UUID;
    END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_invitation_valid TO anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation TO authenticated;

-- Test if functions work
SELECT 'Functions created successfully!' as status;