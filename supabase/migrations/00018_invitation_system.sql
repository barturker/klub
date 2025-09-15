-- Member Invitation System Migration
-- This migration adds tables and policies for community invitation functionality

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_by_role member_role NOT NULL DEFAULT 'member',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    uses_count INTEGER DEFAULT 0 NOT NULL,
    max_uses INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraints
    CONSTRAINT valid_max_uses CHECK (max_uses > 0),
    CONSTRAINT valid_uses_count CHECK (uses_count >= 0),
    CONSTRAINT uses_not_exceed_max CHECK (uses_count <= max_uses)
);

-- Create invitation_uses table to track who used which invitation
CREATE TABLE IF NOT EXISTS invitation_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    accepted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Prevent same user from using same invitation multiple times
    UNIQUE(invitation_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_community ON invitations(community_id);
CREATE INDEX IF NOT EXISTS idx_invitations_created_by ON invitations(created_by);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitation_uses_invitation ON invitation_uses(invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitation_uses_user ON invitation_uses(user_id);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_uses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invitations table

-- Community admins and moderators can view all invitations for their communities
CREATE POLICY "Community admins can view invitations"
ON invitations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM community_members
        WHERE community_members.community_id = invitations.community_id
        AND community_members.user_id = auth.uid()
        AND community_members.role IN ('admin', 'moderator')
    )
);

-- Community admins and moderators can create invitations
CREATE POLICY "Community admins can create invitations"
ON invitations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM community_members
        WHERE community_members.community_id = invitations.community_id
        AND community_members.user_id = auth.uid()
        AND community_members.role IN ('admin', 'moderator')
    )
    AND created_by = auth.uid()
);

-- Admins can delete any invitation, moderators can only delete their own
CREATE POLICY "Admins can delete any invitation"
ON invitations FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM community_members
        WHERE community_members.community_id = invitations.community_id
        AND community_members.user_id = auth.uid()
        AND community_members.role = 'admin'
    )
);

CREATE POLICY "Moderators can delete own invitations"
ON invitations FOR DELETE
USING (
    created_by = auth.uid()
    AND EXISTS (
        SELECT 1 FROM community_members
        WHERE community_members.community_id = invitations.community_id
        AND community_members.user_id = auth.uid()
        AND community_members.role = 'moderator'
    )
);

-- Allow updating uses_count when invitation is used
CREATE POLICY "System can update invitation uses"
ON invitations FOR UPDATE
USING (true)
WITH CHECK (true);

-- Public can view invitation by token (for validation)
CREATE POLICY "Public can view invitation by token"
ON invitations FOR SELECT
USING (true);

-- RLS Policies for invitation_uses table

-- Community admins can view invitation uses
CREATE POLICY "Community admins can view invitation uses"
ON invitation_uses FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM invitations
        JOIN community_members ON community_members.community_id = invitations.community_id
        WHERE invitations.id = invitation_uses.invitation_id
        AND community_members.user_id = auth.uid()
        AND community_members.role IN ('admin', 'moderator')
    )
);

-- System can insert invitation uses when invitation is accepted
CREATE POLICY "System can insert invitation uses"
ON invitation_uses FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Function to check if invitation is valid
CREATE OR REPLACE FUNCTION is_invitation_valid(p_token TEXT)
RETURNS TABLE (
    valid BOOLEAN,
    invitation_id UUID,
    community_id UUID,
    community_name TEXT,
    expires_at TIMESTAMPTZ,
    uses_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN i.id IS NULL THEN false
            WHEN i.expires_at < NOW() THEN false
            WHEN i.uses_count >= i.max_uses THEN false
            ELSE true
        END as valid,
        i.id as invitation_id,
        i.community_id,
        c.name as community_name,
        i.expires_at,
        (i.max_uses - i.uses_count) as uses_remaining
    FROM invitations i
    LEFT JOIN communities c ON c.id = i.community_id
    WHERE i.token = p_token;
END;
$$;

-- Function to accept invitation
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
    -- Get invitation details
    SELECT * INTO v_invitation
    FROM invitations
    WHERE token = p_token;

    -- Check if invitation exists
    IF v_invitation.id IS NULL THEN
        RETURN QUERY SELECT false, 'Invalid invitation code', NULL::UUID;
        RETURN;
    END IF;

    -- Check if invitation is expired
    IF v_invitation.expires_at < NOW() THEN
        RETURN QUERY SELECT false, 'This invitation has expired', NULL::UUID;
        RETURN;
    END IF;

    -- Check if invitation has reached max uses
    IF v_invitation.uses_count >= v_invitation.max_uses THEN
        RETURN QUERY SELECT false, 'This invitation is no longer valid', NULL::UUID;
        RETURN;
    END IF;

    -- Check if user is already a member
    SELECT EXISTS (
        SELECT 1 FROM community_members
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
            RETURN QUERY SELECT false, 'An error occurred while joining the community', NULL::UUID;
    END;
END;
$$;

-- Add comment for documentation
COMMENT ON TABLE invitations IS 'Stores community invitation links with expiration and usage tracking';
COMMENT ON TABLE invitation_uses IS 'Tracks which users have used which invitations';
COMMENT ON FUNCTION is_invitation_valid IS 'Validates an invitation token and returns its status';
COMMENT ON FUNCTION accept_invitation IS 'Accepts an invitation and adds user to the community';