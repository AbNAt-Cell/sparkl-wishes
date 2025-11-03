import { supabase } from "@/integrations/supabase/client";

type EmailRecipient = { email: string; name?: string };

export type NotificationPayload = {
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
  from?: EmailRecipient;
};

export async function sendNotification(payload: NotificationPayload) {
  try {
    const { data, error } = await supabase.functions.invoke("notifications", {
      body: payload,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    // Intentionally swallow email errors to not block UX flows
    console.error("Notification send failed:", err);
    return null;
  }
}


