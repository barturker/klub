import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBalance } from "@/lib/stripe/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const community_slug = searchParams.get("community_slug");

    if (!community_slug) {
      return NextResponse.json(
        { error: "Community slug is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get community ID from slug
    const { data: community } = await supabase
      .from("communities")
      .select("id")
      .eq("slug", community_slug)
      .single();

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Get Stripe account
    const { data: stripeAccount } = await supabase
      .from("stripe_accounts")
      .select("stripe_account_id")
      .eq("community_id", community.id)
      .single();

    if (!stripeAccount) {
      return NextResponse.json(
        { error: "No Stripe account connected" },
        { status: 404 }
      );
    }

    // Check if test account (mock account we created)
    if (stripeAccount.stripe_account_id.startsWith("acct_test_")) {
      // For test accounts, try to get the main account balance
      try {
        // Get balance from main Stripe account (not connected account)
        const stripe = new (await import("stripe")).default(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: "2024-12-18.acacia",
        });

        const balance = await stripe.balance.retrieve();

        // Get the primary balance (usually USD)
        const available = balance.available?.[0] || { amount: 0, currency: "usd" };
        const pending = balance.pending?.[0] || { amount: 0, currency: "usd" };

        return NextResponse.json({
          available: available.amount,
          pending: pending.amount,
          currency: available.currency,
          account_type: "main_account",
          note: "Showing main Stripe account balance (not Connect account)"
        });
      } catch (error) {
        console.error("Error fetching main account balance:", error);
        return NextResponse.json({
          available: 0,
          pending: 0,
          currency: "usd",
          test_mode: true,
          message: "Could not fetch balance"
        });
      }
    }

    // For real connected accounts
    try {
      const balance = await getBalance(stripeAccount.stripe_account_id);

      // Get the primary balance (usually USD)
      const available = balance.available?.[0] || { amount: 0, currency: "usd" };
      const pending = balance.pending?.[0] || { amount: 0, currency: "usd" };

      return NextResponse.json({
        available: available.amount,
        pending: pending.amount,
        currency: available.currency,
        account_type: "connected_account"
      });
    } catch (error) {
      console.error("Error fetching connected account balance:", error);

      // Fallback to main account balance
      try {
        const stripe = new (await import("stripe")).default(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: "2024-12-18.acacia",
        });

        const balance = await stripe.balance.retrieve();
        const available = balance.available?.[0] || { amount: 0, currency: "usd" };
        const pending = balance.pending?.[0] || { amount: 0, currency: "usd" };

        return NextResponse.json({
          available: available.amount,
          pending: pending.amount,
          currency: available.currency,
          account_type: "main_account",
          fallback: true
        });
      } catch (fallbackError) {
        return NextResponse.json({
          available: 0,
          pending: 0,
          currency: "usd",
          error: true
        });
      }
    }
  } catch (error) {
    console.error("Error in balance endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}