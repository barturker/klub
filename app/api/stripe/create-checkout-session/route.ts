import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      eventId,
      selectedTickets,
      discountCode,
      currency = "USD"
    } = body;

    if (!eventId || !selectedTickets || selectedTickets.length === 0) {
      return NextResponse.json(
        { error: "Event ID and ticket selection required" },
        { status: 400 }
      );
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(`
        *,
        community:communities(*)
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Fetch ticket tiers
    const ticketIds = selectedTickets.map((t: any) => t.tierId);
    const { data: tiers, error: tiersError } = await supabase
      .from("ticket_tiers")
      .select("*")
      .in("id", ticketIds)
      .eq("event_id", eventId);

    if (tiersError || !tiers) {
      return NextResponse.json(
        { error: "Invalid ticket selection" },
        { status: 400 }
      );
    }

    // Create line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let subtotal = 0;

    for (const selection of selectedTickets) {
      const tier = tiers.find(t => t.id === selection.tierId);
      if (!tier) continue;

      const quantity = selection.quantity;
      const price = tier.price_cents;
      subtotal += price * quantity;

      console.log("Tier price:", tier.name, price, "cents");
      console.log("Quantity:", quantity);
      console.log("Line item total:", price * quantity, "cents");

      lineItems.push({
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: `${event.title} - ${tier.name}`,
            description: tier.description || `Ticket for ${event.title}`,
            metadata: {
              event_id: eventId,
              tier_id: tier.id,
              tier_name: tier.name,
            },
          },
          unit_amount: price,
        },
        quantity: quantity,
      });
    }

    // Calculate platform fees (5.9% + 30 cents) - same as UI
    const platformFeePercentage = 0.059; // 5.9%
    const platformFeeFixed = 30; // 30 cents
    const platformFees = Math.round(subtotal * platformFeePercentage + platformFeeFixed);

    // Add platform fee as a separate line item
    lineItems.push({
      price_data: {
        currency: currency.toLowerCase(),
        product_data: {
          name: "Service Fee",
          description: "Platform service and processing fee",
        },
        unit_amount: platformFees,
      },
      quantity: 1,
    });

    const totalAmount = subtotal + platformFees;
    console.log("Subtotal:", subtotal, "cents =", subtotal / 100, currency);
    console.log("Platform fees:", platformFees, "cents =", platformFees / 100, currency);
    console.log("Total being sent to Stripe:", totalAmount, "cents =", totalAmount / 100, currency);

    // Handle discount code if provided
    let discountId: string | undefined;
    if (discountCode) {
      // Validate discount code in database
      const { data: discount } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("event_id", eventId)
        .eq("code", discountCode.toUpperCase())
        .single();

      if (discount && discount.is_active) {
        // Create or retrieve Stripe coupon
        try {
          const coupon = await stripe.coupons.create({
            percent_off: discount.discount_type === "percentage" ? discount.discount_value : undefined,
            amount_off: discount.discount_type === "fixed" ? discount.discount_value : undefined,
            currency: currency.toLowerCase(),
            name: discount.code,
            metadata: {
              event_id: eventId,
              discount_code_id: discount.id,
            },
          });
          discountId = coupon.id;
        } catch (error) {
          console.error("Error creating Stripe coupon:", error);
        }
      }
    }

    // Create Stripe checkout session with multiple payment methods
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], // Card payments (includes Apple Pay, Google Pay via browser)
      mode: "payment",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: lineItems,
      discounts: discountId ? [{ coupon: discountId }] : undefined,
      metadata: {
        event_id: eventId,
        user_id: user.id,
        community_id: event.community_id,
        ticket_selections: JSON.stringify(selectedTickets),
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/stripe-checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/communities/${event.community.slug}/events/${event.slug}`,
    });

    // Store the pending order in the database
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      event_id: eventId,
      buyer_id: user.id,
      status: "pending",
      amount_cents: totalAmount, // Total including fees
      fee_cents: platformFees, // Actual platform fee amount
      currency: currency.toLowerCase(),
      quantity: selectedTickets.reduce((acc: number, t: any) => acc + t.quantity, 0),
      buyer_email: user.email || "",
      metadata: {
        stripe_session_id: session.id,
        selectedTickets,
        discountCode,
        subtotal_cents: subtotal,
        platform_fee_cents: platformFees,
      },
    }).select().single();

    if (orderError) {
      console.error("Error creating order record:", orderError);
      // Continue anyway - order will be created via webhook
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}