import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
    queryKey: ["funding-progress", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("contribution_amount")
        .eq("item_id", itemId)
        .eq("payment_status", "completed")
        .eq("is_group_gift", true);

      if (error) throw error;

      const totalRaised = (data || []).reduce((sum: number, c: any) => sum + (c.contribution_amount || 0), 0);
      const remaining = Math.max(0, targetAmount - totalRaised);
      const percentage = targetAmount > 0 ? (totalRaised / targetAmount) * 100 : 0;

      return {
        totalRaised,
        remaining,
        percentage: Math.min(100, Math.max(0, percentage)),
        count: data?.length || 0,
      };
    },
    enabled: !!itemId,
    refetchInterval: 5000,
  });

  const totalRaised = fundingData?.totalRaised || 0;
  const remaining = fundingData?.remaining || targetAmount;
  const percentage = fundingData?.percentage || 0;
  const count = fundingData?.count || 0;

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-gradient-to-br from-green-50/50 to-blue-50/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Funding Progress</p>
          <p className="text-xs text-muted-foreground mt-1">
            {count} {count === 1 ? "contributor" : "contributors"} so far
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
      <Progress value={percentage} className="h-2" />
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{percentage.toFixed(0)}% funded</span>
        <span className="font-medium">
          {getCurrencySymbol(currency)}{remaining.toFixed(2)} remaining
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
      const { data } = await supabase
        .from("claims")
        .select("contribution_amount")
        .eq("item_id", itemId)
        .eq("payment_status", "completed")
        .eq("is_group_gift", true);
      const raised = (data || []).reduce((sum: number, c: any) => sum + (c.contribution_amount || 0), 0);
      return Math.max(0, itemPrice - raised);
    },
    enabled: allowGroupGifting && !!itemPrice && open,
    refetchInterval: 5000,
  });

  const paymentDisplayAmount = allowGroupGifting && itemPrice
    ? (claimType === "partial" ? parseFloat(contributionAmount) || 0 : groupGiftData ?? itemPrice)
    : itemPrice || 0;

  const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  const isOwnItem = currentUserId && wishlistOwnerId && currentUserId === wishlistOwnerId;

  useEffect(() => {
    if (!open || !itemId) return;
    (async () => {
      const { data } = await supabase
        .from("wishlist_items")
        .select("wishlists(currency)")
        .eq("id", itemId)
        .single();
      setCurrency(data?.wishlists?.currency || "USD");

      if (currentUserId && !formData.isAnonymous) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", currentUserId).single();
        const { data: { user } } = await supabase.auth.getUser();
        setFormData(prev => ({
          ...prev,
          name: profile?.full_name || "",
          email: user?.email || "",
        }));
      }
    })();
  }, [open, itemId, currentUserId]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  const handlePaystackPayment = async (claimId: string) => {
    const { data: claim } = await supabase.from("claims").select("contribution_amount").eq("id", claimId).single();
    const amount = (claim?.contribution_amount || 0) * 100;

    if (!window.PaystackPop) return toast.error("Payment system not ready");

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: formData.email,
      amount,
      currency,
      ref: `claim_${claimId}_${Date.now()}`,
      onClose: () => { toast.error("Payment cancelled"); setIsLoadingPayment(false); },
      callback: async (response: { reference: string }) => {
        await supabase.from("claims").update({
          payment_status: "completed",
          payment_method: "paystack",
          payment_reference: response.reference,
        }).eq("id", claimId);

        toast.success("Payment successful!");
        onOpenChange(false);
        onClaimSuccess();
      },
    });
    handler.openIframe();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.name || !formData.email || !formData.phone) {
        toast.error("Please fill all required fields");
        return;
      }

      let amount = itemPrice || 0;
      if (allowGroupGifting && itemPrice) {
        amount = claimType === "partial" ? parseFloat(contributionAmount) || 0 : (groupGiftData ?? itemPrice);
      }

      const { data: claim } = await supabase
        .from("claims")
        .insert({
          item_id: itemId,
          user_id: currentUserId || null,
          claimer_name: formData.name,
          claimer_email: formData.email,
          claimer_phone: formData.phone,
          notes: formData.notes || null,
          is_anonymous: formData.isAnonymous,
          payment_status: itemPrice ? "pending" : "not_required",
          is_group_gift: allowGroupGifting,
          contribution_amount: amount,
        })
        .select()
        .single();

      setClaimId(claim.id);
      toast.success("Item claimed!");

      if (itemPrice && (appSettings?.payments?.paystackEnabled ?? true)) {
        setShowPaymentButton(true);
      } else {
        onOpenChange(false);
        onClaimSuccess();
      }
    } catch (err) {
      toast.error("Failed to claim item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = () => {
    if (claimId) {
      onOpenChange(false);
      setIsLoadingPayment(true);
      handlePaystackPayment(claimId);
    }
  };

  const handleAnonymousToggle = (checked: boolean) => {
    if (checked) {
      setFormData({ name: "", email: "", phone: "", notes: "", isAnonymous: true });
    } else {
      // refetch user data
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* PERFECT CENTERED MODAL - THIS IS THE FIX */}
        <DialogContent
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                     w-[92vw] max-w-lg max-h-[90dvh] overflow-y-auto 
                     rounded-xl border bg-background p-6 shadow-2xl
                     !transform-none"
          style={{ transform: "translate(-50%, -50%)" }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-primary" />
              Claim "{itemName}"
            </DialogTitle>
            <DialogDescription className="text-base">
              Fill in your details below to claim this gift and proceed to payment.
            </DialogDescription>
          </DialogHeader>

          {isOwnItem ? (
            <Alert className="bg-destructive/10 border-destructive/20">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You cannot claim items from your own wishlist.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {allowGroupGifting && itemPrice && <FundingProgress itemId={itemId} targetAmount={itemPrice} currency={currency} />}

              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                {allowGroupGifting && itemPrice && (
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      <h3 className="font-medium text-sm">How much would you like to contribute?</h3>
                    </div>
                    <RadioGroup value={claimType} onValueChange={(v: any) => setClaimType(v)}>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-3 rounded-lg border bg-background">
                          <RadioGroupItem value="full" id="full" />
                          <Label htmlFor="full" className="cursor-pointer">Fund Remaining Amount</Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border bg-background">
                          <RadioGroupItem value="partial" id="partial" />
                          <Label htmlFor="partial" className="cursor-pointer">Partial Contribution</Label>
                        </div>
                        {claimType === "partial" && (
                          <Input
                            type="number"
                            placeholder="Enter amount"
                            value={contributionAmount}
                            onChange={(e) => setContributionAmount(e.target.value)}
                            required
                          />
                        )}
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label>Your Name *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Your Email *</Label>
                    <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Phone Number *</Label>
                    <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Message (Optional)</Label>
                    <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="anon" checked={formData.isAnonymous} onCheckedChange={handleAnonymousToggle} />
                    <Label htmlFor="anon" className="cursor-pointer">Claim anonymously</Label>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  {!showPaymentButton ? (
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Processing..." : "Continue to Payment"}
                    </Button>
                  ) : (
                    <Button onClick={handlePayment} className="w-full bg-green-600 hover:bg-green-700" disabled={isLoadingPayment}>
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
