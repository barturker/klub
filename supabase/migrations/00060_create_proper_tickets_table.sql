-- Create a proper tickets table for individual ticket instances
-- This table will store actual tickets with QR codes that users can present at events

-- Drop the old tickets table if it exists (it's not properly structured)
DROP TABLE IF EXISTS public.tickets CASCADE;

-- Drop and recreate ticket status enum with proper values
DROP TYPE IF EXISTS ticket_status CASCADE;
CREATE TYPE ticket_status AS ENUM ('valid', 'used', 'cancelled', 'refunded', 'expired', 'pending', 'active');

-- Create the new tickets table
CREATE TABLE public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticket_number TEXT NOT NULL, -- Human-readable ticket number (e.g., TKT-2024-ABC123)
    qr_code TEXT NOT NULL UNIQUE, -- Unique QR code for validation
    attendee_name TEXT NOT NULL,
    attendee_email TEXT NOT NULL,
    ticket_type TEXT, -- General Admission, VIP, etc.
    price_paid INTEGER NOT NULL, -- Amount in cents
    currency TEXT NOT NULL DEFAULT 'USD',
    status ticket_status DEFAULT 'valid' NOT NULL,
    checked_in_at TIMESTAMPTZ, -- When the ticket was scanned/used
    checked_in_by UUID REFERENCES auth.users(id), -- Who scanned the ticket
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX idx_tickets_order_id ON public.tickets(order_id);
CREATE INDEX idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX idx_tickets_qr_code ON public.tickets(qr_code);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_ticket_number ON public.tickets(ticket_number);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS policies for tickets
-- Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON public.tickets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Event organizers can view and manage tickets for their events
CREATE POLICY "Organizers can manage event tickets" ON public.tickets
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = tickets.event_id
            AND e.created_by = auth.uid()
        )
    );

-- Community admins can view tickets for their community events
CREATE POLICY "Community admins can view tickets" ON public.tickets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.events e
            JOIN public.communities c ON e.community_id = c.id
            JOIN public.community_members cm ON c.id = cm.community_id
            WHERE e.id = tickets.event_id
            AND cm.user_id = auth.uid()
            AND cm.role = 'admin'
        )
    );

-- Add updated_at trigger
CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS generate_ticket_number();

-- Create a function to generate unique ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    v_year TEXT;
    v_random TEXT;
    v_number TEXT;
    v_exists BOOLEAN;
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');

    LOOP
        -- Generate random alphanumeric string
        v_random := UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6));
        v_number := 'TKT-' || v_year || '-' || v_random;

        -- Check if this number already exists
        SELECT EXISTS(SELECT 1 FROM public.tickets WHERE ticket_number = v_number) INTO v_exists;

        EXIT WHEN NOT v_exists;
    END LOOP;

    RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS generate_qr_code();

-- Create a function to generate unique QR codes
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TEXT AS $$
DECLARE
    v_code TEXT;
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a unique QR code (UUID + timestamp)
        v_code := ENCODE(SHA256((gen_random_uuid()::TEXT || NOW()::TEXT)::BYTEA), 'hex');

        -- Check if this code already exists
        SELECT EXISTS(SELECT 1 FROM public.tickets WHERE qr_code = v_code) INTO v_exists;

        EXIT WHEN NOT v_exists;
    END LOOP;

    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS generate_tickets_for_order(UUID);

-- Create a function to generate tickets after successful payment
CREATE OR REPLACE FUNCTION generate_tickets_for_order(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
    v_order RECORD;
    v_event RECORD;
    v_ticket_count INTEGER;
    i INTEGER;
BEGIN
    -- Get order details
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    -- Get event details
    SELECT * INTO v_event FROM public.events WHERE id = v_order.event_id;

    -- Extract ticket count from quantity or metadata (default to 1)
    v_ticket_count := COALESCE(v_order.quantity, (v_order.metadata->>'ticket_count')::INTEGER, 1);

    -- Generate tickets
    FOR i IN 1..v_ticket_count LOOP
        INSERT INTO public.tickets (
            order_id,
            event_id,
            user_id,
            ticket_number,
            qr_code,
            attendee_name,
            attendee_email,
            ticket_type,
            price_paid,
            currency,
            status,
            metadata
        ) VALUES (
            p_order_id,
            v_order.event_id,
            v_order.buyer_id,
            generate_ticket_number(),
            generate_qr_code(),
            COALESCE(v_order.buyer_name, v_order.metadata->>'buyer_name', 'Ticket Holder ' || i),
            COALESCE(v_order.buyer_email, v_order.metadata->>'buyer_email', (SELECT email FROM auth.users WHERE id = v_order.buyer_id)),
            COALESCE(v_order.metadata->>'ticket_type', 'General Admission'),
            v_order.amount_cents / v_ticket_count, -- Divide total by ticket count
            v_order.currency,
            'valid',
            jsonb_build_object(
                'order_id', p_order_id,
                'event_name', v_event.title,
                'event_date', v_event.start_at,
                'ticket_index', i,
                'total_tickets', v_ticket_count
            )
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_tickets_for_order TO authenticated;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS check_in_ticket(TEXT);

-- Create a function to check in a ticket
CREATE OR REPLACE FUNCTION check_in_ticket(p_qr_code TEXT)
RETURNS JSONB AS $$
DECLARE
    v_ticket RECORD;
    v_event RECORD;
BEGIN
    -- Get ticket details
    SELECT * INTO v_ticket FROM public.tickets WHERE qr_code = p_qr_code;

    IF v_ticket IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid ticket code'
        );
    END IF;

    IF v_ticket.status != 'valid' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ticket is ' || v_ticket.status
        );
    END IF;

    IF v_ticket.checked_in_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ticket already checked in at ' || v_ticket.checked_in_at
        );
    END IF;

    -- Get event details
    SELECT * INTO v_event FROM public.events WHERE id = v_ticket.event_id;

    -- Check if event has started or is within check-in window (e.g., 2 hours before)
    IF v_event.start_at > NOW() + INTERVAL '2 hours' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Check-in not yet open for this event'
        );
    END IF;

    -- Update ticket as checked in
    UPDATE public.tickets
    SET
        status = 'used',
        checked_in_at = NOW(),
        checked_in_by = auth.uid(),
        updated_at = NOW()
    WHERE id = v_ticket.id;

    RETURN jsonb_build_object(
        'success', true,
        'ticket', jsonb_build_object(
            'id', v_ticket.id,
            'ticket_number', v_ticket.ticket_number,
            'attendee_name', v_ticket.attendee_name,
            'event_id', v_ticket.event_id,
            'checked_in_at', NOW()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_in_ticket TO authenticated;

-- Add a comment to document the table
COMMENT ON TABLE public.tickets IS 'Individual ticket instances with QR codes for event admission';
COMMENT ON COLUMN public.tickets.qr_code IS 'Unique QR code for ticket validation at event check-in';
COMMENT ON COLUMN public.tickets.ticket_number IS 'Human-readable ticket number for customer service';