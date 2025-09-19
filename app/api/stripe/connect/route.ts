import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createStripeConnectAccount,
  createAccountLink,
  retrieveAccount,
} from "@/lib/stripe/server";

export async function POST(request: NextRequest) {
  try {
    const { community_id, return_url, refresh_url } = await request.json();

    if (!community_id) {
      return NextResponse.json(
        { error: "Community ID is required" },
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

    // Check if user is admin of the community
    const { data: membership } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", community_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only community admins can set up Stripe accounts" },
        { status: 403 }
      );
    }

    // Check if Stripe account already exists
    const { data: existingAccount } = await supabase
      .from("stripe_accounts")
      .select("stripe_account_id, onboarding_completed")
      .eq("community_id", community_id)
      .single();

    let stripeAccountId: string;

    if (existingAccount?.stripe_account_id) {
      stripeAccountId = existingAccount.stripe_account_id;

      // If onboarding is already completed, just return success
      if (existingAccount.onboarding_completed) {
        return NextResponse.json({
          onboarding_url: null,
          message: "Stripe account already set up",
          onboarding_completed: true,
        });
      }
    } else {
      // Create new Stripe Connect account
      const stripeAccount = await createStripeConnectAccount(
        user.email || "",
        "individual"
      );
      stripeAccountId = stripeAccount.id;

      // Store in database
      const { error: insertError } = await supabase
        .from("stripe_accounts")
        .insert({
          community_id,
          stripe_account_id: stripeAccountId,
          onboarding_completed: false,
          charges_enabled: false,
          payouts_enabled: false,
          metadata: {
            created_by: user.id,
            created_at: new Date().toISOString(),
          },
        });

      if (insertError) {
        console.error("Error storing Stripe account:", insertError);
        return NextResponse.json(
          { error: "Failed to store Stripe account information" },
          { status: 500 }
        );
      }
    }

    // Create account link for onboarding
    const accountLink = await createAccountLink(
      stripeAccountId,
      return_url || `${process.env.NEXT_PUBLIC_APP_URL}/communities/${community_id}/stripe/return`,
      refresh_url || `${process.env.NEXT_PUBLIC_APP_URL}/communities/${community_id}/stripe/refresh`
    );

    return NextResponse.json({
      onboarding_url: accountLink.url,
      expires_at: accountLink.expires_at,
    });
  } catch (error) {
    console.error("Error in Stripe Connect:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe Connect account" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const community_id = searchParams.get("community_id");

    if (!community_id) {
      return NextResponse.json(
        { error: "Community ID is required" },
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

    // Get Stripe account from database
    const { data: stripeAccountData } = await supabase
      .from("stripe_accounts")
      .select("*")
      .eq("community_id", community_id)
      .single();

    if (!stripeAccountData) {
      return NextResponse.json({
        connected: false,
        message: "No Stripe account connected",
      });
    }

    // Get latest status from Stripe
    try {
      const account = await retrieveAccount(stripeAccountData.stripe_account_id);

      // Update database with latest status
      const { error: updateError } = await supabase
        .from("stripe_accounts")
        .update({
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          onboarding_completed: account.details_submitted,
          country: account.country,
          business_type: account.business_type,
          default_currency: account.default_currency,
          updated_at: new Date().toISOString(),
        })
        .eq("id", stripeAccountData.id);

      if (updateError) {
        console.error("Error updating Stripe account status:", updateError);
      }

      return NextResponse.json({
        connected: true,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        requirements: account.requirements,
        stripe_account_id: account.id,
        country: account.country,
        default_currency: account.default_currency,
      });
    } catch (stripeError) {
      console.error("Error retrieving Stripe account:", stripeError);
      return NextResponse.json({
        connected: false,
        error: "Failed to retrieve account status",
      });
    }
  } catch (error) {
    console.error("Error checking Stripe Connect status:", error);
    return NextResponse.json(
      { error: "Failed to check account status" },
      { status: 500 }
    );
  }
}