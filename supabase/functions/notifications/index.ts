import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type EmailRecipient = { email: string; name?: string };

type NotificationPayload = {
  type:
    | "claim.created"
    | "claim.cancelled"
    | "payment.partial"
    | "payment.completed"
    | "fund.contribution"
    | "thankyou.sent";
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: EmailRecipient;
  from?: EmailRecipient; // optional override; otherwise use default sender
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const DEFAULT_FROM_EMAIL = Deno.env.get("BREVO_FROM_EMAIL") ?? "no-reply@sparklwishes.com";
const DEFAULT_FROM_NAME = Deno.env.get("BREVO_FROM_NAME") ?? "Sparkl Wishes";

async function sendBrevoEmail(payload: NotificationPayload) {
  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY not set");
  }

  const body = {
    sender: {
      email: payload.from?.email ?? DEFAULT_FROM_EMAIL,
      name: payload.from?.name ?? DEFAULT_FROM_NAME,
    },
    to: payload.to.map((r) => ({ email: r.email, name: r.name })),
    cc: payload.cc?.map((r) => ({ email: r.email, name: r.name })),
    bcc: payload.bcc?.map((r) => ({ email: r.email, name: r.name })),
    subject: payload.subject,
    htmlContent: payload.html,
    textContent: payload.text,
    replyTo: payload.replyTo
      ? { email: payload.replyTo.email, name: payload.replyTo.name }
      : undefined,
    headers: { "X-Notification-Type": payload.type },
  };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Brevo error ${res.status}: ${text}`);
  }

  return await res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const payload = (await req.json()) as NotificationPayload;

    // Basic validation
    if (!payload?.type || !payload?.to?.length || !payload?.subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, to, subject" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await sendBrevoEmail(payload);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


