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

  try {
    // Verify webhook signature
    const signature = req.headers.get("x-paystack-signature");
    const body = await req.text();
    
    if (!signature) {
      console.error("❌ Missing Paystack signature");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the signature
    const hash = createHmac("sha512", paystackSecretKey)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      console.error("❌ Invalid Paystack signature");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Webhook signature verified");

    // Parse the webhook payload
    const event = JSON.parse(body);
    console.log("📥 Webhook event:", event.event);

    // Only process successful charge events
    if (event.event === "charge.success") {
      const { reference, amount, currency, customer } = event.data;
      console.log("💰 Payment successful:", { reference, amount, currency });

      // Extract claim ID from reference (format: claim_{claimId}_{timestamp})
      const match = reference.match(/^claim_([a-f0-9-]+)_/);
      if (!match) {
        console.log("⚠️ Reference doesn't match claim pattern, skipping");
        return new Response(JSON.stringify({ message: "Not a claim payment" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const claimId = match[1];
      console.log("🎯 Processing claim:", claimId);

      const supabase = createClient(supabaseUrl, serviceKey);

      // Check if claim exists and is still pending
      const { data: claim, error: fetchError } = await supabase
        .from("claims")
        .select("id, payment_status, item_id, contribution_amount")
        .eq("id", claimId)
        .single();

      if (fetchError || !claim) {
        console.error("❌ Claim not found:", claimId);
        return new Response(JSON.stringify({ error: "Claim not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only update if still pending (prevent duplicate processing)
      if (claim.payment_status !== "pending") {
        console.log("⚠️ Claim already processed:", claim.payment_status);
        return new Response(JSON.stringify({ message: "Already processed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update claim to completed - this will trigger wallet crediting
      const { error: updateError } = await supabase
        .from("claims")
        .update({
          payment_status: "completed",
          payment_method: "paystack",
          payment_reference: reference,
        })
        .eq("id", claimId);

      if (updateError) {
        console.error("❌ Failed to update claim:", updateError);
        throw updateError;
      }

      console.log("✅ Claim marked as paid - Database trigger will credit wallet");

      // Get item name for notification
      const { data: itemData } = await supabase
        .from("wishlist_items")
        .select("name")
        .eq("id", claim.item_id)
        .single();

      const itemName = itemData?.name || "wishlist item";

      // Send notification to claimer (optional, fire-and-forget)
      if (customer?.email) {
        try {
          await supabase.functions.invoke("notifications", {
            body: {
              type: "payment.completed",
              to: [{ email: customer.email, name: customer.first_name || "there" }],
              subject: `Payment confirmed for "${itemName}"`,
              text: `Hi ${customer.first_name || "there"},\n\nWe received your payment for "${itemName}" (ref ${reference}). Thank you for your generosity!`,
              html: `<p>Hi ${customer.first_name || "there"},</p><p>We received your payment for <strong>"${itemName}"</strong> (ref <code>${reference}</code>). Thank you for your generosity!</p>`,
            },
          });
        } catch (notifError) {
          console.warn("⚠️ Failed to send notification:", notifError);
        }
      }

      return new Response(JSON.stringify({ message: "Payment processed successfully" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For other events, just acknowledge
    return new Response(JSON.stringify({ message: "Event received" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
