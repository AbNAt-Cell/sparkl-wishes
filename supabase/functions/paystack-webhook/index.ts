import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY") ?? "";

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // === 1. Verify Paystack Signature ===
    const signature = req.headers.get("x-paystack-signature");
    const bodyText = await req.text();

    if (!signature || !paystackSecretKey) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const hash = createHmac("sha512", paystackSecretKey).update(bodyText).digest("hex");
    if (hash !== signature) {
      console.error("Invalid Paystack signature");
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }

    const event = JSON.parse(bodyText);
    console.log("Paystack webhook event:", event.event);

    // === Handle subscription events ===
    if (event.event === "subscription.create") {
      const { customer, subscription_code, plan } = event.data;
      console.log("Subscription created:", { customer, subscription_code, plan });

      // Find user by email and mark as premium
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", customer?.metadata?.user_id)
        .single();

      if (profiles) {
        await supabase
          .from("profiles")
          .update({ is_premium: true })
          .eq("id", profiles.id);
        console.log("User marked as premium via subscription:", profiles.id);
      }

      return new Response(JSON.stringify({ message: "Subscription created" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.event === "subscription.disable" || event.event === "subscription.not_renew") {
      const { customer } = event.data;
      console.log("Subscription cancelled/disabled:", customer);

      // Find user and remove premium status
      if (customer?.metadata?.user_id) {
        await supabase
          .from("profiles")
          .update({ is_premium: false })
          .eq("id", customer.metadata.user_id);
        console.log("User premium status removed:", customer.metadata.user_id);
      }

      return new Response(JSON.stringify({ message: "Subscription disabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.event === "invoice.payment_failed") {
      const { customer, subscription } = event.data;
      console.log("Invoice payment failed:", { customer, subscription });

      // Optionally remove premium status after failed payment
      if (customer?.metadata?.user_id) {
        await supabase
          .from("profiles")
          .update({ is_premium: false })
          .eq("id", customer.metadata.user_id);
        console.log("User premium removed due to payment failure:", customer.metadata.user_id);
      }

      return new Response(JSON.stringify({ message: "Invoice payment failed handled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === 2. Handle charge.success ===
    if (event.event === "charge.success") {
      const { reference, amount, customer, metadata } = event.data;

      // Check if this is a premium subscription payment
      if (reference?.startsWith("premium_") || metadata?.type === "premium_subscription") {
        const userId = metadata?.user_id || reference?.split("_")[1];
        
        if (userId) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ is_premium: true })
            .eq("id", userId);

          if (updateError) {
            console.error("Failed to update premium status:", updateError);
          } else {
            console.log("User upgraded to premium via charge:", userId);
          }

          // Send notification
          if (customer?.email) {
            supabase.functions.invoke("notifications", {
              body: {
                type: "premium.activated",
                to: [{ email: customer.email }],
                subject: "Welcome to Premium! 🎉",
                text: "Your premium subscription is now active. Enjoy your featured wishlists!",
                html: `<p>Your premium subscription is now active! 🎉</p>
                       <p>You can now have your wishlists featured on the homepage.</p>`,
              },
            }).catch(err => console.warn("Notification failed:", err));
          }
        }

        return new Response(JSON.stringify({ message: "Premium payment processed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Handle claim payments
      const match = reference?.match(/^claim_([a-f0-9-]+)_/);
      if (!match) {
        return new Response(JSON.stringify({ message: "Ignored: not a claim reference" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const claimId = match[1];

      // === 3. Fetch claim with current status ===
      const { data: claim, error: fetchError } = await supabase
        .from("claims")
        .select("id, status, payment_status, item_id, contribution_amount")
        .eq("id", claimId)
        .single();

      if (fetchError || !claim) {
        console.error("Claim not found:", claimId);
        return new Response("Claim not found", { status: 404, headers: corsHeaders });
      }

      // === 4. Prevent duplicate processing ===
      if (claim.payment_status === "completed" || claim.status === "completed") {
        console.log("Already processed claim:", claimId);
        return new Response(JSON.stringify({ message: "Already processed" }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      // === 5. Mark claim as FULLY COMPLETED ===
      const { error: updateError } = await supabase
        .from("claims")
        .update({
          status: "completed",
          payment_status: "completed",
          payment_method: "paystack",
          payment_reference: reference,
        })
        .eq("id", claimId);

      if (updateError) {
        console.error("Failed to update claim:", updateError);
        throw updateError;
      }

      console.log(`Claim ${claimId} fully completed via Paystack`);

      // === 6. Get item name for notification ===
      const { data: item } = await supabase
        .from("wishlist_items")
        .select("name")
        .eq("id", claim.item_id)
        .single();

      const itemName = item?.name || "your wishlist item";

      // === 7. Send notification (optional) ===
      if (customer?.email) {
        supabase.functions.invoke("notifications", {
          body: {
            type: "claim.paid",
            to: [{ email: customer.email }],
            subject: `You paid for "${itemName}"`,
            text: `Your payment (₦${amount / 100}) was successful! Thank you for supporting this wish.`,
            html: `<p>Your payment of <strong>₦${(amount / 100).toLocaleString()}</strong> was successful!</p>
                   <p>Thank you for helping make <strong>"${itemName}"</strong> come true 🎉</p>`,
          },
        }).catch(err => console.warn("Notification failed:", err));
      }

      return new Response(JSON.stringify({ message: "Claim completed successfully" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other events
    return new Response(JSON.stringify({ message: "Event received" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
