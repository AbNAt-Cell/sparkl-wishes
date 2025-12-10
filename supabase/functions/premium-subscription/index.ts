import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const { action, userId, email, callbackUrl, planCode } = await req.json();
    console.log("Premium subscription request:", { action, userId, email });

    if (action === "initialize") {
      // Fetch premium settings from app_settings
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "premium")
        .single();

      const premiumSettings = settingsData?.value || { price: 5000, currency: "NGN" };
      const amount = premiumSettings.price * 100; // Paystack uses kobo

      // Create or get Paystack plan for recurring billing
      // First, check if we have an existing plan
      let planCodeToUse = planCode;
      
      if (!planCodeToUse) {
        // Create a new plan via Paystack API
        const planResponse = await fetch("https://api.paystack.co/plan", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${paystackSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Premium Subscription",
            interval: "monthly",
            amount: amount,
            currency: premiumSettings.currency || "NGN",
          }),
        });

        const planData = await planResponse.json();
        console.log("Paystack plan response:", planData);

        if (!planData.status) {
          // Plan might already exist, try to list and find it
          const listResponse = await fetch("https://api.paystack.co/plan", {
            headers: {
              "Authorization": `Bearer ${paystackSecretKey}`,
            },
          });
          const listData = await listResponse.json();
          const existingPlan = listData.data?.find((p: any) => 
            p.name === "Premium Subscription" && p.interval === "monthly"
          );
          
          if (existingPlan) {
            planCodeToUse = existingPlan.plan_code;
          } else {
            throw new Error(planData.message || "Failed to create plan");
          }
        } else {
          planCodeToUse = planData.data.plan_code;
        }
      }

      // Initialize transaction with the plan for recurring billing
      const reference = `premium_${userId}_${Date.now()}`;
      
      const response = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount,
          reference,
          callback_url: callbackUrl,
          plan: planCodeToUse,
          metadata: {
            user_id: userId,
            type: "premium_subscription",
          },
        }),
      });

      const data = await response.json();
      console.log("Paystack initialize response:", data);

      if (!data.status) {
        throw new Error(data.message || "Failed to initialize payment");
      }

      return new Response(
        JSON.stringify({
          success: true,
          authorization_url: data.data.authorization_url,
          reference: data.data.reference,
          access_code: data.data.access_code,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      const { reference } = await req.json();
      
      const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          "Authorization": `Bearer ${paystackSecretKey}`,
        },
      });

      const data = await response.json();
      console.log("Verify response:", data);

      if (data.status && data.data.status === "success") {
        // Update user to premium
        const metadata = data.data.metadata;
        const userIdFromPayment = metadata?.user_id;

        if (userIdFromPayment) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ is_premium: true })
            .eq("id", userIdFromPayment);

          if (updateError) {
            console.error("Failed to update premium status:", updateError);
          } else {
            console.log("User upgraded to premium:", userIdFromPayment);
          }
        }

        return new Response(
          JSON.stringify({ success: true, premium: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, message: "Payment not verified" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "cancel") {
      // Cancel subscription - would need subscription code from Paystack
      // For now, just mark user as non-premium
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_premium: false })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({ success: true, message: "Subscription cancelled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Premium subscription error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
