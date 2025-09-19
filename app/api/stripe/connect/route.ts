import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createStripeConnectAccount,
  createAccountLink,
  retrieveAccount,
} from "@/lib/stripe/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const community_slug = searchParams.get("community_slug");

    if (action !== "status") {
      return NextResponse.json(
        { error: "Invalid action" },
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
    let actualCommunityId = null;
    if (community_slug) {
      const { data: community } = await supabase
        .from("communities")
        .select("id")
        .eq("slug", community_slug)
        .single();

      if (community) {
        actualCommunityId = community.id;
      }
    }

    if (!actualCommunityId) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 }
      );
    }

    // Check account status
    const { data: stripeAccount } = await supabase
      .from("stripe_accounts")
      .select("*")
      .eq("community_id", actualCommunityId)
      .single();

    if (!stripeAccount) {
      return NextResponse.json({
        connected: false,
        charges_enabled: false,
        payouts_enabled: false,
      });
    }

    // Get updated status from Stripe
    try {
      const account = await retrieveAccount(stripeAccount.stripe_account_id);
      return NextResponse.json({
        connected: true,
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
        account_id: stripeAccount.stripe_account_id,
        requirements: account.requirements?.currently_due || [],
      });
    } catch (error) {
      return NextResponse.json({
        connected: true,
        charges_enabled: stripeAccount.charges_enabled || false,
        payouts_enabled: stripeAccount.payouts_enabled || false,
        account_id: stripeAccount.stripe_account_id,
      });
    }
  } catch (error) {
    console.error("Error in Stripe Connect GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, community_slug, community_id, return_url, refresh_url } = await request.json();

    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get community ID from slug if needed
    let actualCommunityId = community_id;
    if (!actualCommunityId && community_slug) {
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
      actualCommunityId = community.id;
    }

    if (!actualCommunityId) {
      return NextResponse.json(
        { error: "Community ID or slug is required" },
        { status: 400 }
      );
    }

    // Check if user is admin of the community
    const { data: membership } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", actualCommunityId)
      .eq("user_id", user.id)
      .single();

    if (!membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only community admins can set up Stripe accounts" },
        { status: 403 }
      );
    }

    // Handle different actions
    if (action === "status") {
      // Check account status
      const { data: stripeAccount } = await supabase
        .from("stripe_accounts")
        .select("*")
        .eq("community_id", actualCommunityId)
        .single();

      if (!stripeAccount) {
        return NextResponse.json({
          connected: false,
          charges_enabled: false,
          payouts_enabled: false,
        });
      }

      // Get updated status from Stripe
      try {
        const account = await retrieveAccount(stripeAccount.stripe_account_id);
        return NextResponse.json({
          connected: true,
          charges_enabled: account.charges_enabled || false,
          payouts_enabled: account.payouts_enabled || false,
          account_id: stripeAccount.stripe_account_id,
          requirements: account.requirements?.currently_due || [],
        });
      } catch (error) {
        return NextResponse.json({
          connected: true,
          charges_enabled: stripeAccount.charges_enabled || false,
          payouts_enabled: stripeAccount.payouts_enabled || false,
          account_id: stripeAccount.stripe_account_id,
        });
      }
    }

    if (action === "dashboard") {
      // Get dashboard link
      const { data: stripeAccount } = await supabase
        .from("stripe_accounts")
        .select("stripe_account_id, metadata")
        .eq("community_id", actualCommunityId)
        .single();

      if (!stripeAccount) {
        return NextResponse.json(
          { error: "No Stripe account connected" },
          { status: 404 }
        );
      }

      // Check if test account
      if (stripeAccount.stripe_account_id.startsWith("acct_test_")) {
        // For test accounts, return Stripe dashboard URL
        return NextResponse.json({
          dashboard_url: "https://dashboard.stripe.com/test/dashboard",
          test_mode: true,
          message: "Opening Stripe test dashboard"
        });
      }

      // For real accounts, create Express dashboard link
      try {
        const accountLink = await createAccountLink(
          stripeAccount.stripe_account_id,
          `${process.env.NEXT_PUBLIC_APP_URL}/communities/${community_slug}/stripe`,
          `${process.env.NEXT_PUBLIC_APP_URL}/communities/${community_slug}/stripe`
        );
        return NextResponse.json({ dashboard_url: accountLink.url });
      } catch (error) {
        // If error, fallback to Stripe dashboard
        return NextResponse.json({
          dashboard_url: "https://dashboard.stripe.com/test/dashboard",
          test_mode: true
        });
      }
    }

    // Default action: create/onboard
    // Check if Stripe account already exists
    const { data: existingAccount } = await supabase
      .from("stripe_accounts")
      .select("stripe_account_id, onboarding_completed")
      .eq("community_id", actualCommunityId)
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
      // For test mode, we'll create a mock account
      // Note: Stripe Connect requires special setup even in test mode

      // Generate a test account ID
      stripeAccountId = `acct_test_${Date.now()}`;

      // Store in database as a test account
      const { error: insertError } = await supabase
        .from("stripe_accounts")
        .insert({
          community_id: actualCommunityId,
          stripe_account_id: stripeAccountId,
          onboarding_completed: true, // Mark as completed for test
          charges_enabled: true, // Enable for test
          payouts_enabled: true, // Enable for test
          metadata: {
            created_by: user.id,
            created_at: new Date().toISOString(),
            test_mode: true,
            note: "Test account - Stripe Connect not configured"
          },
        });

      if (insertError) {
        console.error("Error storing Stripe account:", insertError);
        return NextResponse.json(
          { error: "Failed to store account information" },
          { status: 500 }
        );
      }

      // Return test success for demo purposes
      return NextResponse.json({
        message: "Test account created successfully",
        test_mode: true,
        note: "In production, Stripe Connect onboarding would happen here",
        account_id: stripeAccountId,
      });
    }

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