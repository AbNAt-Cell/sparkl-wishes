import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Users, Gift } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getCurrencySymbol, formatPrice } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

declare global {
  interface Window {
    PaystackPop: any;
  }
}

const FundingProgress = ({ itemId, targetAmount, currency }: { itemId: string; targetAmount: number; currency: string }) => {
  const { data } = useQuery({
    queryKey: ["funding", itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from("claims")
        .select("contribution_amount")
        .eq("item_id", itemId)
        .eq("payment_status", "completed")
        .eq("is_group_gift", true);
      const raised = (data || []).reduce((s: number, c: any) => s + (c.contribution_amount || 0), 0);
      return { raised, remaining: Math.max(0, targetAmount - raised), count: data?.length || 0 };
    },
    enabled: !!itemId,
  });

  const raised = data?.raised || 0;
  const remaining = data?.remaining || targetAmount;
  const percentage = targetAmount > 0 ? (raised / targetAmount) * 100 : 0;

  return (
    <div className="p-3 rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-medium text-sm">Funding Progress</p>
          <p className="text-xs text-muted-foreground">{data?.count || 0} contributor{(data?.count || 0) !== 1 && "s"}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-base text-primary">{getCurrencySymbol(currency)}{formatPrice(raised)}</p>
          <p className="text-xs text-muted-foreground">of {getCurrencySymbol(currency)}{formatPrice(targetAmount)}</p>
        </div>
      </div>
      <Progress value={percentage} className="h-2 mb-2" />
      <div className="flex justify-between text-xs">
        <span>{percentage.toFixed(0)}% funded</span>
        <span className="font-medium">{getCurrencySymbol(currency)}{formatPrice(remaining)} left</span>
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
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", notes: "", isAnonymous: false });
  const [claimType, setClaimType] = useState<"full" | "partial">("full");
  const [contributionAmount, setContributionAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingAmount, setRemainingAmount] = useState(itemPrice || 0);

  const isOwnItem = currentUserId === wishlistOwnerId;

  // Fetch currency and remaining amount
  useEffect(() => {
    if (open && itemId) {
      supabase.from("wishlist_items").select("wishlists(currency)").eq("id", itemId).single().then(({ data }) => {
        setCurrency(data?.wishlists?.currency || "NGN");
      });

      // Calculate remaining amount for group gifting
      if (allowGroupGifting && itemPrice) {
        supabase
          .from("claims")
          .select("contribution_amount")
          .eq("item_id", itemId)
          .eq("payment_status", "completed")
          .eq("is_group_gift", true)
          .then(({ data }) => {
            const raised = (data || []).reduce((s: number, c: any) => s + (c.contribution_amount || 0), 0);
            setRemainingAmount(Math.max(0, itemPrice - raised));
          });
      }
    }
  }, [open, itemId, allowGroupGifting, itemPrice]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({ name: "", email: "", phone: "", notes: "", isAnonymous: false });
      setClaimType("full");
      setContributionAmount("");
      setIsSubmitting(false);
    }
  }, [open]);

  const getPaymentAmount = () => {
    if (claimType === "full") {
      return allowGroupGifting ? remainingAmount : (itemPrice || 0);
    }
    return parseFloat(contributionAmount) || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentAmount = getPaymentAmount();
    if (paymentAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (claimType === "partial" && paymentAmount > remainingAmount) {
      toast.error(`Amount cannot exceed remaining ${getCurrencySymbol(currency)}${formatPrice(remainingAmount)}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Create claim record
      const { data: claim, error } = await supabase
        .from("claims")
        .insert({
          item_id: itemId,
          claimer_name: formData.name,
          claimer_email: formData.email,
          claimer_phone: formData.phone,
          notes: formData.notes,
          is_anonymous: formData.isAnonymous,
          contribution_amount: paymentAmount,
          is_group_gift: claimType === "partial" || allowGroupGifting,
          payment_status: "pending",
          expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Initialize Paystack payment
      const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (!paystackKey) {
        toast.error("Payment not configured");
        setIsSubmitting(false);
        return;
      }

      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: formData.email,
        amount: Math.round(paymentAmount * 100),
        currency: currency,
        ref: `claim_${claim.id}_${Date.now()}`,
        metadata: {
          claim_id: claim.id,
          item_id: itemId,
          claimer_name: formData.name,
        },
        callback: async (response: any) => {
          try {
            // Check if claim was already updated by webhook
            const { data: existingClaim } = await supabase
              .from("claims")
              .select("payment_status, status")
              .eq("id", claim.id)
              .single();

            // If already completed, just refresh and close
            if (existingClaim?.payment_status === "completed" || existingClaim?.status === "completed") {
              console.log("Claim already completed (likely by webhook)");
              toast.success("Payment successful! Thank you for your gift.");
              queryClient.invalidateQueries({ queryKey: ["funding", itemId] });
              queryClient.invalidateQueries({ queryKey: ["wishlist-items"] });
              queryClient.invalidateQueries({ queryKey: ["shared-wishlist-items"] });
              onClaimSuccess();
              onOpenChange(false);
              setIsSubmitting(false);
              return;
            }

            // Update claim with payment reference and both status fields
            const { error: updateError } = await supabase
              .from("claims")
              .update({
                payment_reference: response.reference,
                payment_method: "paystack",
                payment_status: "completed",
                status: "completed", // Also set main status field
              })
              .eq("id", claim.id);

            if (updateError) {
              console.error("Failed to update claim:", updateError);
              // Payment succeeded but update failed - webhook will handle it
              toast.warning("Payment successful! Processing your claim...");
              // Still invalidate queries and close - webhook will complete the update
              queryClient.invalidateQueries({ queryKey: ["funding", itemId] });
              queryClient.invalidateQueries({ queryKey: ["wishlist-items"] });
              queryClient.invalidateQueries({ queryKey: ["shared-wishlist-items"] });
              onClaimSuccess();
              onOpenChange(false);
              setIsSubmitting(false);
              return;
            }

            // Wait a moment for the database trigger to process
            await new Promise(resolve => setTimeout(resolve, 500));

            toast.success("Payment successful! Thank you for your gift.");
            queryClient.invalidateQueries({ queryKey: ["funding", itemId] });
            queryClient.invalidateQueries({ queryKey: ["wishlist-items"] });
            queryClient.invalidateQueries({ queryKey: ["shared-wishlist-items"] });
            onClaimSuccess();
            onOpenChange(false);
            setIsSubmitting(false);
          } catch (error: any) {
            console.error("Error in payment callback:", error);
            // Payment succeeded, so show success but note processing
            toast.warning("Payment successful! Your claim is being processed...");
            queryClient.invalidateQueries({ queryKey: ["funding", itemId] });
            queryClient.invalidateQueries({ queryKey: ["wishlist-items"] });
            queryClient.invalidateQueries({ queryKey: ["shared-wishlist-items"] });
            onClaimSuccess();
            onOpenChange(false);
            setIsSubmitting(false);
          }
        },
        onClose: () => {
          toast.info("Payment cancelled. Your claim will expire in 20 minutes if not completed.");
          setIsSubmitting(false);
        },
      });

      handler.openIframe();
    } catch (error: any) {
      console.error("Claim error:", error);
      toast.error(error.message || "Failed to process claim");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[85dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="truncate">Claim "{itemName}"</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Fill in your details to claim this gift.
          </DialogDescription>
        </DialogHeader>

        {isOwnItem ? (
          <Alert className="bg-destructive/10 border-destructive/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>You cannot claim your own wishlist items.</AlertDescription>
          </Alert>
        ) : (
          <>
            {allowGroupGifting && itemPrice && (
              <FundingProgress itemId={itemId} targetAmount={itemPrice} currency={currency} />
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {/* Claim Type Selection */}
              {allowGroupGifting && itemPrice && remainingAmount > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">How would you like to contribute?</Label>
                  <RadioGroup
                    value={claimType}
                    onValueChange={(v) => setClaimType(v as "full" | "partial")}
                    className="grid grid-cols-2 gap-2"
                  >
                    <Label
                      htmlFor="full"
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                        claimType === "full" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value="full" id="full" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium flex items-center gap-1">
                          <Gift className="w-3 h-3" /> Full
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {getCurrencySymbol(currency)}{formatPrice(remainingAmount)}
                        </span>
                      </div>
                    </Label>
                    <Label
                      htmlFor="partial"
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                        claimType === "partial" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value="partial" id="partial" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium flex items-center gap-1">
                          <Users className="w-3 h-3" /> Partial
                        </span>
                        <span className="text-xs text-muted-foreground">Custom amount</span>
                      </div>
                    </Label>
                  </RadioGroup>
                </div>
              )}

              {/* Contribution Amount (for partial) */}
              {claimType === "partial" && allowGroupGifting && (
                <div>
                  <Label className="text-sm">Contribution Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {getCurrencySymbol(currency)}
                    </span>
                    <Input
                      type="number"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="h-10 pl-8"
                      min="100"
                      max={remainingAmount}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max: {getCurrencySymbol(currency)}{formatPrice(remainingAmount)}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Name *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    required 
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-sm">Email *</Label>
                  <Input 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                    required 
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-sm">Phone *</Label>
                  <Input 
                    value={formData.phone} 
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                    required 
                    className="h-10"
                  />
                </div>
                <div>
                  <Label className="text-sm">Message (optional)</Label>
                  <Textarea 
                    value={formData.notes} 
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                    className="min-h-[60px] resize-none"
                  />
                </div>
                <div className="flex items-center gap-2 py-1">
                  <Checkbox 
                    id="anon" 
                    checked={formData.isAnonymous} 
                    onCheckedChange={(c) => setFormData({ ...formData, isAnonymous: !!c })} 
                  />
                  <Label htmlFor="anon" className="cursor-pointer text-sm">
                    Claim anonymously
                  </Label>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Amount to pay</span>
                  <span className="text-lg font-bold text-primary">
                    {getCurrencySymbol(currency)}{formatPrice(getPaymentAmount())}
                  </span>
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={isSubmitting || getPaymentAmount() <= 0}>
                {isSubmitting ? "Processing..." : `Pay ${getCurrencySymbol(currency)}${formatPrice(getPaymentAmount())}`}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
