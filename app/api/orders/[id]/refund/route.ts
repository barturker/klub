import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount_cents, reason, reason_details, notify_customer } =
      await request.json();

    // Validate input
    if (!amount_cents || amount_cents <= 0) {
      return NextResponse.json(
        { error: "Invalid refund amount" },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: "Refund reason is required" },
        { status: 400 }
      );
    }

    // Get the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
        *,
        event:events (
          id,
          title,
          community_id,
          community:communities (
            id,
            name
          )
        )
      `
      )
      .eq("id", params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check user has permission (must be community admin/moderator)
    const { data: member } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", order.event.community_id)
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "admin" && member.role !== "moderator")) {
      return NextResponse.json(
        { error: "You don't have permission to refund this order" },
        { status: 403 }
      );
    }

    // Check if order can be refunded
    if (order.status !== "paid" && order.status !== "partially_refunded") {
      return NextResponse.json(
        { error: "Order cannot be refunded in its current state" },
        { status: 400 }
      );
    }

    // Calculate remaining refundable amount
    const { data: existingRefunds } = await supabase
      .from("refunds")
      .select("amount_cents")
      .eq("order_id", params.id)
      .eq("status", "succeeded");

    const totalRefunded =
      existingRefunds?.reduce((sum, r) => sum + r.amount_cents, 0) || 0;
    const remainingRefundable = order.amount_cents - totalRefunded;

    if (amount_cents > remainingRefundable) {
      return NextResponse.json(
        {
          error: `Refund amount exceeds remaining refundable amount (${remainingRefundable} cents)`,
        },
        { status: 400 }
      );
    }

    // Create refund record in database first
    const { data: refund, error: refundError } = await supabase
      .from("refunds")
      .insert({
        order_id: params.id,
        amount_cents,
        reason,
        reason_details,
        status: "pending",
        processed_by: user.id,
      })
      .select()
      .single();

    if (refundError || !refund) {
      console.error("Error creating refund record:", refundError);
      return NextResponse.json(
        { error: "Failed to create refund record" },
        { status: 500 }
      );
    }

    // Process refund with Stripe
    try {
      let stripeRefund;

      if (order.stripe_payment_intent_id) {
        // Create Stripe refund
        stripeRefund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_intent_id,
          amount: amount_cents,
          reason: mapRefundReason(reason),
          metadata: {
            order_id: order.id,
            refund_id: refund.id,
            processed_by: user.id,
          },
        });

        // Update refund record with Stripe details
        await supabase
          .from("refunds")
          .update({
            stripe_refund_id: stripeRefund.id,
            status: stripeRefund.status === "succeeded" ? "succeeded" : "processing",
            processed_at: new Date().toISOString(),
          })
          .eq("id", refund.id);
      } else {
        // For orders without Stripe payment intent (test mode or manual orders)
        // Just mark as succeeded
        await supabase
          .from("refunds")
          .update({
            status: "succeeded",
            processed_at: new Date().toISOString(),
          })
          .eq("id", refund.id);
      }

      // Update order status
      const newOrderStatus =
        amount_cents === remainingRefundable
          ? "refunded"
          : "partially_refunded";

      await supabase
        .from("orders")
        .update({
          status: newOrderStatus,
          refunded_at: new Date().toISOString(),
        })
        .eq("id", params.id);

      // Update ticket status if full refund
      if (newOrderStatus === "refunded") {
        await supabase
          .from("tickets")
          .update({ status: "refunded" })
          .eq("order_id", params.id);
      }

      // Send notification email if requested
      if (notify_customer) {
        // TODO: Implement email notification
        // await sendRefundNotification(order, refund);
      }

      return NextResponse.json({
        refund_id: refund.id,
        stripe_refund_id: stripeRefund?.id,
        status: stripeRefund?.status || "succeeded",
        amount_cents,
        message: "Refund processed successfully",
      });
    } catch (stripeError: any) {
      // Update refund record with failure
      await supabase
        .from("refunds")
        .update({
          status: "failed",
          metadata: { error: stripeError.message },
        })
        .eq("id", refund.id);

      console.error("Stripe refund error:", stripeError);
      return NextResponse.json(
        { error: "Failed to process refund with payment provider" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing refund:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Map our refund reasons to Stripe's reasons
function mapRefundReason(reason: string): Stripe.RefundCreateParams.Reason {
  switch (reason) {
    case "requested_by_customer":
      return "requested_by_customer";
    case "duplicate":
      return "duplicate";
    case "fraudulent":
      return "fraudulent";
    default:
      return "requested_by_customer";
  }
}