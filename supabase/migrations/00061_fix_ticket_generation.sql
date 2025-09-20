-- Fix ticket generation by updating the function and ensuring it works
-- This migration improves the generate_tickets_for_order function

-- First drop the old function
DROP FUNCTION IF EXISTS generate_tickets_for_order(UUID);

-- Create an improved version that returns result
CREATE OR REPLACE FUNCTION generate_tickets_for_order(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_event RECORD;
    v_ticket_count INTEGER;
    v_tickets_created INTEGER := 0;
    v_ticket_id UUID;
    i INTEGER;
BEGIN
    -- Get order details
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;

    IF v_order IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found',
            'order_id', p_order_id
        );
    END IF;

    -- Check if tickets already exist for this order
    SELECT COUNT(*) INTO v_tickets_created FROM public.tickets WHERE order_id = p_order_id;

    IF v_tickets_created > 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Tickets already exist for this order',
            'order_id', p_order_id,
            'tickets_count', v_tickets_created
        );
    END IF;

    -- Get event details
    SELECT * INTO v_event FROM public.events WHERE id = v_order.event_id;

    -- Extract ticket count from quantity or metadata (default to 1)
    v_ticket_count := COALESCE(v_order.quantity, (v_order.metadata->>'ticket_count')::INTEGER, 1);

    -- Generate tickets
    FOR i IN 1..v_ticket_count LOOP
        v_ticket_id := gen_random_uuid();

        INSERT INTO public.tickets (
            id,
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
            v_ticket_id,
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

        v_tickets_created := v_tickets_created + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'tickets_created', v_tickets_created,
        'event_name', v_event.title
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'order_id', p_order_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users and anon (for webhooks)
GRANT EXECUTE ON FUNCTION generate_tickets_for_order TO authenticated, anon;

-- Create a combined function that updates order and generates tickets in one transaction
CREATE OR REPLACE FUNCTION process_successful_payment(
    p_session_id TEXT,
    p_payment_intent_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_tickets_result JSONB;
BEGIN
    -- Find and update the order
    UPDATE orders
    SET
        status = 'paid'::order_status,
        stripe_payment_intent_id = p_payment_intent_id,
        paid_at = NOW(),
        updated_at = NOW()
    WHERE (metadata->>'stripe_session_id' = p_session_id OR stripe_session_id = p_session_id)
    AND status IN ('pending', 'processing')
    RETURNING * INTO v_order;

    IF v_order IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found or already processed',
            'session_id', p_session_id
        );
    END IF;

    -- Generate tickets for the order
    SELECT generate_tickets_for_order(v_order.id) INTO v_tickets_result;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_status', 'paid',
        'tickets_result', v_tickets_result,
        'session_id', p_session_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'session_id', p_session_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_successful_payment TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION process_successful_payment IS 'Processes successful Stripe payment by updating order status and generating tickets in a single transaction';
COMMENT ON FUNCTION generate_tickets_for_order IS 'Generates tickets for a paid order, returns JSON result with success status and details';