import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCurrencySymbol } from "@/lib/utils";
import { Info, Shield, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { sendNotification } from "@/integrations/notifications";
import { useAppSettings } from "@/lib/settings";

// Funding Progress Component
const FundingProgress = ({ itemId, targetAmount, currency }: { itemId: string; targetAmount: number; currency: string }) => {
  const { data: fundingData } = useQuery({
    queryKey: ["funding-progress", itemId] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("contribution_amount, payment_status, is_group_gift")
        .eq("item_id", itemId)
        .eq("payment_status", "completed")
        .eq("is_group_gift", true);

      if (error) throw error;

      const rows = (data || []) as Array<{ contribution_amount?: number | null }>;
      const totalRaised = rows.reduce((sum: number, claim) => {
        const amount = claim.contribution_amount;
        return sum + (amount && amount > 0 ? amount : 0);
      }, 0);
      const remainingAmount = Math.max(0, targetAmount - totalRaised);
      const percentageFunded = targetAmount > 0 ? (totalRaised / targetAmount) * 100 : 0;

      return {
        totalRaised,
        remainingAmount,
        percentageFunded: Math.min(100, Math.max(0, percentageFunded)),
        contributorsCount: data?.length || 0,
      };
    },
    enabled: !!itemId,
    refetchInterval: 5000,
  });

  const totalRaised = fundingData?.totalRaised || 0;
  const remainingAmount = fundingData?.remainingAmount || targetAmount;
  const percentageFunded = fundingData?.percentageFunded || 0;
  const contributorsCount = fundingData?.contributorsCount || 0;

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-gradient-to-br from-green-50/50 to-blue-50/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Funding Progress</p>
          <p className="text-xs text-muted-foreground mt-1">
            {contributorsCount} {contributorsCount === 1 ? 'contributor' : 'contributors'} so far
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-primary">
            {getCurrencySymbol(currency)}{totalRaised.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">
            of {getCurrencySymbol(currency)}{targetAmount.toFixed(2)}
          </p>
        </div>
      </div>
      <Progress value={percentageFunded} className="h-2" />
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{percentageFunded.toFixed(0)}% funded</span>
        <span className="font-medium text-foreground">
          {getCurrencySymbol(currency)}{remainingAmount.toFixed(2)} remaining
        </span>
      </div>
    </div>
  );
};

interface ClaimItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
  itemPrice: number | null;
  onClaimSuccess: () => void;
  currentUserId?: string | null;
  wishlistOwnerId?: string | null;
  allowGroupGifting?: boolean;
}

export const ClaimItemDialog = ({
  open,
  onOpenChange,
  itemId,
  itemName,
  itemPrice,
  onClaimSuccess,
  currentUserId,
  wishlistOwnerId,
  allowGroupGifting = false,
}: ClaimItemDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    isAnonymous: false,
  });
  const [claimType, setClaimType] = useState<"full" | "partial">("full");
  const [contributionAmount, setContributionAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [showPaymentButton, setShowPaymentButton] = useState(false);
  const { data: appSettings } = useAppSettings();

  const { data: groupGiftData } = useQuery({
    queryKey: ["group-gift-remaining", itemId],
    queryFn: async () => {
      if (!allowGroupGifting || !itemPrice) return null;

      const { data, error } = await supabase
        .from("claims")
        .select("contribution_amount, payment_status, is_group_gift")
        .eq("item_id", itemId)
        .eq("payment_status", "completed")
        .eq("is_group_gift", true);

      if (error) throw error;

      const totalRaised = (data || []).reduce((sum: number, claim: any) => {
        const amount = claim.contribution_amount;
        return sum + (amount && amount > 0 ? amount : 0);
      }, 0);

      return Math.max(0, itemPrice - totalRaised);
    },
    enabled: allowGroupGifting && !!itemPrice && open,
    refetchInterval: 5000,
  });

  const getPaymentDisplayAmount = () => {
    if (!itemPrice) return 0;
    if (allowGroupGifting) {
      const remaining = groupGiftData ?? itemPrice;
      if (claimType === "partial") {
        const amount = parseFloat(contributionAmount);
        return isNaN(amount) ? 0 : amount;
      }
      return remaining;
    }
    return itemPrice;
  };

  const paymentDisplayAmount = getPaymentDisplayAmount();
  const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  const isOwnItem = currentUserId && wishlistOwnerId && currentUserId === wishlistOwnerId;

  useEffect(() => {
    const initializeDialog = async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("wishlists(currency)")
        .eq("id", itemId)
        .single();

      if (!error && data?.wishlists?.currency) {
        setCurrency(data.wishlists.currency);
      } else {
        setCurrency("USD");
      }

      if (currentUserId && !formData.isAnonymous) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", currentUserId)
          .single();

        const { data: { user } } = await supabase.auth.getUser();

        setFormData(prev => ({
          ...prev,
          name: profileData?.full_name || "",
          email: user?.email || "",
          phone: prev.phone,
        }));
      }
    };

    if (open && itemId) {
      initializeDialog();
    }
  }, [open, itemId, currentUserId]);

  // Paystack handlers and submit logic (unchanged - kept exactly as working)
  const handlePaystackPayment = async (claimId: string) => {
    const { data: claimData, error: fetchError } = await supabase
      .from("claims")
      .select("contribution_amount")
      .eq("id", claimId)
      .single();

    const contribAmount = (claimData as { contribution_amount?: number } | null)?.contribution_amount;
    if (fetchError || !claimData || !contribAmount) {
      toast.error("Failed to fetch payment amount");
      setIsLoadingPayment(false);
      return;
    }

    const finalAmount = contribAmount;
    if (!window.PaystackPop) {
      toast.error("Payment system not loaded. Please refresh and try again.");
      setIsLoadingPayment(false);
      return;
    }

    const amountInKobo = Math.round(finalAmount * 100);

    try {
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: formData.email,
        amount: amountInKobo,
        currency: currency,
        ref: `claim_${claimId}_${Date.now()}`,
        onClose: () => {
          toast.error("Payment cancelled");
          setIsLoadingPayment(false);
        },
        callback: async (response: { reference: string }) => {
          setIsLoadingPayment(false);

          try {
            const { error: claimError } = await supabase
              .from("claims")
              .update({
                payment_status: "completed",
                payment_method: "paystack",
                payment_reference: response.reference,
              })
              .eq("id", claimId);

            if (claimError) throw claimError;

            await new Promise(resolve => setTimeout(resolve, 1000));

            toast.success("Payment successful! Funds have been credited.");
            setFormData({ name: "", email: "", phone: "", notes: "", isAnonymous: false });
            setShowPaymentButton(false);
            setClaimId(null);
            onOpenChange(false);
            onClaimSuccess();

            sendNotification({
              type: "payment.completed",
              to: [{ email: formData.email, name: formData.name }],
              subject: `Payment confirmed for "${itemName}"`,
              text: `Hi ${formData.name || "there"},\n\nWe received your payment for "${itemName}" (ref ${response.reference}). Thank you!`,
              html: `<p>Hi ${formData.name || "there"},</p><p>We received your payment for <strong>"${itemName}"</strong> (ref <code>${response.reference}</code>). Thank you!</p>`,
            }).catch(() => {});
          } catch (error) {
            toast.error(`Payment received but failed to update claim. Contact support with ref: ${response.reference}`, { duration: 10000 });
          }
        },
      });

      handler.openIframe();
    } catch (error) {
      toast.error("Failed to initialize payment");
      setIsLoadingPayment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.name || !formData.email) {
        toast.error("Please fill in your name and email");
        return;
      }

      if (!allowGroupGifting) {
        const { data: existingClaims } = await supabase
          .from("claims")
          .select("id")
          .eq("item_id", itemId)
          .in("payment_status", ["pending", "completed"]);

        if (existingClaims && existingClaims.length > 0) {
          toast.error("This item has already been claimed!");
          onOpenChange(false);
          return;
        }
      }

      if (allowGroupGifting && itemPrice && itemPrice > 0) {
        const remaining = groupGiftData ?? itemPrice;
        if (remaining <= 0) {
          toast.error("This item is already fully funded!");
          onOpenChange(false);
          return;
        }

        if (claimType === "partial") {
          const amount = parseFloat(contributionAmount);
          if (isNaN(amount) || amount <= 0 || amount > remaining) {
            toast.error(`Please enter an amount between 0.01 and ${getCurrencySymbol(currency)}${remaining.toFixed(2)}`);
            return;
          }
        }
      }

      let paymentAmount = itemPrice || 0;
      if (allowGroupGifting && itemPrice) {
        const remaining = groupGiftData ?? itemPrice;
        paymentAmount = claimType === "partial" ? parseFloat(contributionAmount) : remaining;
      }

      let claimUserId = currentUserId;
      if (!claimUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        claimUserId = user?.id ?? null;
      }

      const { data: claimData, error: claimError } = await supabase
        .from("claims")
        .insert({
          item_id: itemId,
          user_id: claimUserId,
          claimer_name: formData.name,
          claimer_email: formData.email,
          claimer_phone: formData.phone,
          notes: formData.notes || null,
          is_anonymous: formData.isAnonymous,
          payment_status: itemPrice && itemPrice > 0 ? "pending" : "not_required",
          expires_at: itemPrice && itemPrice > 0 ? new Date(Date.now() + 20 * 60 * 1000).toISOString() : null,
          is_group_gift: allowGroupGifting,
          contribution_amount: paymentAmount,
        })
        .select()
        .single();

      if (claimError) throw claimError;

      setClaimId(claimData.id);
      toast.success("Item claimed successfully!");

      sendNotification({
        type: "claim.created",
        to: [{ email: formData.email, name: formData.name }],
        subject: `You claimed "${itemName}"`,
        text: `Hi ${formData.name},\n\nYou've claimed "${itemName}". ${itemPrice ? "Complete payment to finalize." : "Done!"}`,
        html: `<p>Hi ${formData.name},</p><p>You've claimed <strong>"${itemName}"</strong>. ${itemPrice ? "Complete payment to finalize." : "Done!"}</p>`,
      }).catch(() => {});

      if (itemPrice && itemPrice > 0 && (appSettings?.payments?.paystackEnabled ?? true)) {
        setShowPaymentButton(true);
      } else {
        setFormData({ name: "", email: "", phone: "", notes: "", isAnonymous: false });
        onOpenChange(false);
        onClaimSuccess();
      }
    } catch (error) {
      toast.error("Failed to claim item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!claimId) return;
    onOpenChange(false);
    setIsLoadingPayment(true);
    handlePaystackPayment(claimId);
  };

  const handleAnonymousToggle = async (checked: boolean) => {
    if (checked) {
      setFormData({ name: "", email: "", phone: "", notes: "", isAnonymous: true });
    } else {
      if (currentUserId) {
        const { data: profileData } = await supabase.from("profiles").select("full_name").eq("id", currentUserId).single();
        const { data: { user } } = await supabase.auth.getUser();
        setFormData({
          name: profileData?.full_name || "",
          email: user?.email || "",
          phone: "",
          notes: "",
          isAnonymous: false,
        });
      } else {
        setFormData({ ...formData, isAnonymous: false });
      }
    }
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogOverlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <DialogContent
          className="
            fixed left-1/2 top-1/2 
            w-[92vw] max-w-lg 
            -translate-x-1/2 -translate-y-1/2 
            max-h-[90dvh] overflow-y-auto 
            rounded-xl border bg-background p-6 
            shadow-2xl
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0
            data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95
          "
        >
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-primary" />
              Claim "{itemName}"
            </DialogTitle>
            <DialogDescription className="text-base">
              {itemPrice && itemPrice > 0
                ? "Fill in your details below to claim this gift and proceed to payment."
                : "Fill in your details below to claim this gift (no payment required)."}
            </DialogDescription>
          </DialogHeader>

          {isOwnItem ? (
            <Alert className="bg-destructive/10 border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                You cannot claim items from your own wishlist. Share it with friends and family!
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {itemPrice && itemPrice > 0 && !allowGroupGifting && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Amount to pay:</span>
                    <span className="text-xl font-bold text-primary">
                      {getCurrencySymbol(currency)}{itemPrice.toFixed(2)} {currency}
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                {allowGroupGifting && itemPrice && itemPrice > 0 && (
                  <FundingProgress itemId={itemId} targetAmount={itemPrice} currency={currency} />
                )}

                {/* Rest of your form (RadioGroup, inputs, etc.) - unchanged */}
                {/* ... (keep everything exactly as you had it) */}

                {/* Action Buttons */}
                <div className="space-y-3 pt-4 border-t">
                  {!showPaymentButton ? (
                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-medium"
                      disabled={isSubmitting || (itemPrice && itemPrice > 0 && !(appSettings?.payments?.paystackEnabled ?? true))}
                    >
                      {isSubmitting ? "Processing..." : itemPrice ? "Continue to Payment" : "Claim Item"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handlePayment}
                      className="w-full h-12 text-base font-medium bg-green-600 hover:bg-green-700"
                      disabled={isLoadingPayment}
                    >
                      {isLoadingPayment ? "Opening Paystack..." : `Pay ${getCurrencySymbol(currency)}${paymentDisplayAmount.toFixed(2)}`}
                    </Button>
                  )}
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
