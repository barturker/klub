import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { verifyWebhookSignature } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

async function generateTicketCode(): Promise<string> {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `TKT${timestamp}${random}`.toUpperCase();
}

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.text();
    const signature = headers().get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await verifyWebhookSignature(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment succeeded:", paymentIntent.id);

        // Update order status
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .update({
            status: "completed",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: paymentIntent.id,
            stripe_charge_id: paymentIntent.latest_charge as string,
            payment_method: paymentIntent.payment_method_types[0],
            metadata: {
              ...(paymentIntent.metadata || {}),
              payment_completed: true,
            },
          })
          .eq("metadata->>stripe_payment_intent_id", paymentIntent.id)
          .select()
          .single();

        if (orderError) {
          console.error("Error updating order:", orderError);
          return NextResponse.json(
            { error: "Failed to update order" },
            { status: 500 }
          );
        }

        if (order) {
          // Generate tickets for the order
          const ticketCode = await generateTicketCode();

          const { error: ticketError } = await supabase
            .from("tickets")
            .insert({
              order_id: order.id,
              event_id: order.event_id,
              ticket_tier_id: order.ticket_tier_id,
              attendee_email: order.buyer_email || paymentIntent.metadata?.user_email,
              attendee_name: order.buyer_name || paymentIntent.metadata?.user_name,
              ticket_code: ticketCode,
              status: "valid",
              metadata: {
                payment_intent_id: paymentIntent.id,
                created_from_webhook: true,
              },
            });

          if (ticketError) {
            console.error("Error creating ticket:", ticketError);
          }

          // TODO: Send confirmation email with ticket
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment failed:", paymentIntent.id);

        // Update order status
        await supabase
          .from("orders")
          .update({
            status: "failed",
            failed_at: new Date().toISOString(),
            metadata: {
              ...(paymentIntent.metadata || {}),
              failure_reason: paymentIntent.last_payment_error?.message,
              failure_code: paymentIntent.last_payment_error?.code,
            },
          })
          .eq("metadata->>stripe_payment_intent_id", paymentIntent.id);
        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment canceled:", paymentIntent.id);

        // Update order status
        await supabase
          .from("orders")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            metadata: {
              ...(paymentIntent.metadata || {}),
              cancellation_reason: paymentIntent.cancellation_reason,
            },
          })
          .eq("metadata->>stripe_payment_intent_id", paymentIntent.id);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        console.log("Charge refunded:", charge.id);

        // Update order status
        const { data: order } = await supabase
          .from("orders")
          .update({
            status: "refunded",
            refunded_at: new Date().toISOString(),
            metadata: {
              refund_amount: charge.amount_refunded,
              refund_id: charge.refunds?.data[0]?.id,
            },
          })
          .eq("stripe_charge_id", charge.id)
          .select()
          .single();

        if (order) {
          // Invalidate tickets for refunded order
          await supabase
            .from("tickets")
            .update({
              status: "refunded",
              metadata: {
                refunded_at: new Date().toISOString(),
              },
            })
            .eq("order_id", order.id);
        }
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        console.log("Stripe Connect account updated:", account.id);

        // Update Stripe account status
        await supabase
          .from("stripe_accounts")
          .update({
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            onboarding_completed: account.details_submitted,
            metadata: {
              requirements: account.requirements,
              capabilities: account.capabilities,
              updated_from_webhook: new Date().toISOString(),
            },
          })
          .eq("stripe_account_id", account.id);
        break;
      }

      case "payout.paid": {
        const payout = event.data.object as Stripe.Payout;
        console.log("Payout completed:", payout.id);

        // Log payout completion
        // You might want to create a payouts table to track these
        break;
      }

      case "payout.failed": {
        const payout = event.data.object as Stripe.Payout;
        console.log("Payout failed:", payout.id);

        // Log payout failure
        // Notify the organizer about the failed payout
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session completed:", session.id);

        // Handle checkout session completion if using Checkout
        // This is an alternative to payment_intent.succeeded
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // Handle subscription events if you add subscription features
        console.log("Subscription event:", event.type);
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    // Return success response
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Stripe webhooks require raw body, so we need to disable body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};