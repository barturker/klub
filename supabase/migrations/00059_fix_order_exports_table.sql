-- Fix order_exports table structure
-- Add missing status column and other required fields

-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'order_exports'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.order_exports
        ADD COLUMN status export_status DEFAULT 'pending'::export_status NOT NULL;
    END IF;
END $$;

-- Add expires_at column if it doesn't exist (used in index)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'order_exports'
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE public.order_exports
        ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- Update existing export record indexes (drop and recreate if they reference non-existent columns)
DROP INDEX IF EXISTS idx_exports_community_status;
DROP INDEX IF EXISTS idx_exports_expires;

-- Create proper indexes
CREATE INDEX IF NOT EXISTS idx_exports_community_status
ON public.order_exports(community_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exports_expires
ON public.order_exports(expires_at) WHERE status = 'completed';

-- Add comment to explain the fix
COMMENT ON COLUMN public.order_exports.status IS 'Export status: pending, processing, completed, failed, expired';
COMMENT ON COLUMN public.order_exports.expires_at IS 'When the export file expires (for cleanup)';

-- Set default expires_at for completed exports (7 days from completion)
UPDATE public.order_exports
SET expires_at = completed_at + INTERVAL '7 days'
WHERE completed_at IS NOT NULL AND expires_at IS NULL;