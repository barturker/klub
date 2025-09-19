-- Create ticket_orders table for tracking Stripe checkout sessions and completed orders
CREATE TABLE IF NOT EXISTS public.ticket_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_session_id TEXT UNIQUE,
    stripe_payment_intent_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    total_amount INTEGER NOT NULL, -- Amount in cents
    currency TEXT NOT NULL DEFAULT 'USD',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX idx_ticket_orders_event_id ON public.ticket_orders(event_id);
CREATE INDEX idx_ticket_orders_user_id ON public.ticket_orders(user_id);
CREATE INDEX idx_ticket_orders_stripe_session_id ON public.ticket_orders(stripe_session_id);
CREATE INDEX idx_ticket_orders_status ON public.ticket_orders(status);

-- Enable RLS
ALTER TABLE public.ticket_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for ticket_orders
-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON public.ticket_orders
    FOR SELECT
    USING (auth.uid() = user_id);

-- System can insert orders (via API with service role)
CREATE POLICY "System can manage orders" ON public.ticket_orders
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Event organizers can view orders for their events
CREATE POLICY "Organizers can view event orders" ON public.ticket_orders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = ticket_orders.event_id
            AND e.created_by = auth.uid()
        )
    );

-- Add updated_at trigger
CREATE TRIGGER update_ticket_orders_updated_at
    BEFORE UPDATE ON public.ticket_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();