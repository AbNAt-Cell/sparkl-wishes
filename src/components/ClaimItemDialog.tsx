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

interface ClaimItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
  itemPrice: number | null;
  onClaimSuccess: () => void;
}

export const ClaimItemDialog = ({
  open,
  onOpenChange,
  itemId,
  itemName,
  itemPrice,
  onClaimSuccess,
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
  const [wishlistOwnerId, setWishlistOwnerId] = useState<string | null>(null);

  // Get Paystack key from environment
  const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  useEffect(() => {
    // Fetch wishlist's currency (not the claimer's location-based currency)
    const fetchWishlistCurrency = async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("wishlists(currency)")
        .eq("id", itemId)
        .single();

      if (!error && data?.wishlists?.currency) {
        setCurrency(data.wishlists.currency);
      } else {
        setCurrency("USD"); // Fallback
      }
    };

    if (open && itemId) {
      fetchWishlistCurrency();
    }
  }, [open, itemId]);

  const handlePaystackPayment = async (claimId: string) => {
    if (!itemPrice) {
      toast.error("No payment amount specified");
      setIsLoadingPayment(false);
      return;
    }

    // @ts-expect-error - Paystack is loaded via script
    if (!window.PaystackPop) {
      toast.error("Payment system not loaded. Please refresh and try again.");
      setIsLoadingPayment(false);
      return;
    }

    // Determine the amount to charge
    // For partial contributions, use the contribution amount
    // For full claims, use the item price
    const finalAmount = claimType === "partial" && contributionAmount 
      ? parseFloat(contributionAmount)
      : itemPrice;
    
    // Convert price to kobo (Paystack uses smallest currency unit)
    const amountInKobo = Math.round(finalAmount * 100);

    try {
      // @ts-expect-error - Paystack is loaded via script
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: formData.email,
        amount: amountInKobo,
        currency: currency,
        ref: `claim_${claimId}_${Date.now()}`,
        onClose: function() {
          toast.error("Payment cancelled");
          setIsLoadingPayment(false);
        },
        callback: function(response: { reference: string; status?: string }) {
          setIsLoadingPayment(false);
          
          // Paystack requires synchronous callback - wrap async operations
          (async () => {
            try {
              console.log("✅ Payment successful:", response.reference);
              
              // Update claim - database trigger will handle wallet crediting automatically
              const { error: claimError } = await supabase
                .from("claims")
                .update({
                  payment_status: "completed",
                  payment_method: "paystack",
                  payment_reference: response.reference,
                })
                .eq("id", claimId);

              if (claimError) {
                console.error("❌ Failed to update claim:", claimError);
                throw claimError;
              }

              console.log("✅ Claim updated - Database trigger will credit wallet");
              
              // Wait a moment for the trigger to complete
              await new Promise(resolve => setTimeout(resolve, 1000));

              toast.success("Payment successful! Funds have been credited to the wishlist owner.");
              setFormData({ name: "", email: "", phone: "", notes: "", isAnonymous: false });
              setShowPaymentButton(false);
              setClaimId(null);
              onOpenChange(false);
              onClaimSuccess();
            } catch (error) {
              console.error("❌ Payment processing error:", error);
              const errorMessage = error instanceof Error ? error.message : "Unknown error";
              
              // Show detailed error to user
              toast.error(
                `Payment received (ref: ${response.reference}) but claim update failed: ${errorMessage}. The wallet will still be credited automatically. If not, contact support with reference: ${response.reference}`,
                { duration: 10000 }
              );
              
              // Log for debugging
              console.error("Full error details:", {
                error,
                claimId,
                paymentReference: response.reference,
                timestamp: new Date().toISOString()
              });
            }
          })();
        },
      });

      handler.openIframe();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to initialize payment";
      toast.error(errorMessage);
      setIsLoadingPayment(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate partial contribution amount
      if (claimType === "partial") {
        const amount = parseFloat(contributionAmount);
        if (isNaN(amount) || amount <= 0) {
          toast.error("Please enter a valid contribution amount");
          setIsSubmitting(false);
          return;
        }
        if (itemPrice && amount > itemPrice) {
          toast.error(`Contribution cannot exceed ${getCurrencySymbol(currency)}${itemPrice}`);
          setIsSubmitting(false);
          return;
        }
      }

      // First, create the claim
      const { data: claimData, error: claimError } = await supabase
        .from("claims")
        .insert({
          item_id: itemId,
          claimer_name: formData.name,
          claimer_email: formData.email,
          claimer_phone: formData.phone,
          notes: formData.notes || null,
          is_anonymous: formData.isAnonymous,
          payment_status: itemPrice && itemPrice > 0 ? "pending" : "not_required",
          expires_at: itemPrice && itemPrice > 0 
            ? new Date(Date.now() + 10 * 60 * 1000).toISOString() 
            : null,
          is_group_gift: claimType === "partial",
          contribution_amount: claimType === "partial" ? parseFloat(contributionAmount) : null,
        })
        .select()
        .single();

      if (claimError) throw claimError;

      setClaimId(claimData.id);
      toast.success("Item claimed successfully!");

      // If there's a price, show payment button
      if (itemPrice && itemPrice > 0) {
        setShowPaymentButton(true);
      } else {
        setFormData({ name: "", email: "", phone: "", notes: "", isAnonymous: false });
        onOpenChange(false);
        onClaimSuccess();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to claim item";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!claimId) return;
    
    setIsLoadingPayment(true);
    handlePaystackPayment(claimId);
  };

  useEffect(() => {
    // Load Paystack script
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => {
      console.log("Paystack script loaded successfully");
    };
    script.onerror = () => {
      console.error("Failed to load Paystack script");
      toast.error("Failed to load payment system");
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
        <DialogContent className="pointer-events-auto max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-primary" />
              Claim "{itemName}"
            </DialogTitle>
            <DialogDescription className="text-base">
              {itemPrice && itemPrice > 0 ? (
                <div className="space-y-2">
                  <p>Fill in your details below to claim this gift and proceed to payment.</p>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Amount to pay:</span>
                      <span className="text-xl font-bold text-primary">
                        {getCurrencySymbol(currency)}{itemPrice.toFixed(2)} {currency}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p>Fill in your details below to claim this gift (no payment required).</p>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Claim Type Selection (only show if item has a price) */}
          {itemPrice && itemPrice > 0 && (
            <div className="space-y-4 p-4 rounded-lg border bg-gradient-to-br from-purple-50/30 to-pink-50/30">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Info className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium text-sm">Claim Type</h3>
              </div>
              
              <RadioGroup value={claimType} onValueChange={(value: "full" | "partial") => setClaimType(value)}>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white hover:bg-muted/20 cursor-pointer">
                    <RadioGroupItem value="full" id="full" />
                    <div className="flex-1">
                      <Label htmlFor="full" className="cursor-pointer font-medium">
                        Full Gift ({getCurrencySymbol(currency)}{itemPrice.toFixed(2)})
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Purchase the entire gift yourself
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white hover:bg-muted/20 cursor-pointer">
                    <RadioGroupItem value="partial" id="partial" />
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="partial" className="cursor-pointer font-medium">
                        Partial Contribution (Group Gift)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Contribute any amount - others can chip in too!
                      </p>
                      {claimType === "partial" && (
                        <div className="space-y-2 mt-3">
                          <Label htmlFor="contribution_amount">Your Contribution Amount *</Label>
                          <Input
                            id="contribution_amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={itemPrice}
                            value={contributionAmount}
                            onChange={(e) => setContributionAmount(e.target.value)}
                            placeholder="0.00"
                            required={claimType === "partial"}
                          />
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {[10, 25, 50, 100].filter(amt => amt <= itemPrice).map((amount) => (
                              <Button
                                key={amount}
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setContributionAmount(amount.toString())}
                              >
                                {getCurrencySymbol(currency)}{amount}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Personal Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Info className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Your Information</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="name">Your Name *</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Your name will be visible to the wishlist owner</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="John Doe"
                className="transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="email">Your Email *</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>We'll send your claim confirmation here</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="john@example.com"
                className="transition-all"
              />
              <p className="text-xs text-muted-foreground">Used for payment and confirmation</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="phone">Your Phone Number *</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Required for payment verification</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                placeholder="+1234567890"
                className="transition-all"
              />
            </div>
          </div>

          {/* Optional Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Info className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Additional Options</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Personal Message (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add a personal message for the wishlist owner..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Share why this gift is special to you</p>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-muted/30">
              <Checkbox
                id="anonymous"
                checked={formData.isAnonymous}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isAnonymous: checked as boolean })
                }
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="anonymous" className="cursor-pointer font-medium">
                  Claim anonymously
                </Label>
                <p className="text-xs text-muted-foreground">
                  Your name won't be shown to other gift givers, only to the wishlist owner
                </p>
              </div>
            </div>
          </div>
          
          {/* Payment Information */}
          {itemPrice && itemPrice > 0 && !showPaymentButton && (
            <Alert className="bg-primary/5 border-primary/20">
              <Shield className="h-4 w-4 text-primary" />
              <AlertDescription className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Secure Payment via Paystack
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your payment will be processed securely. We accept:
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      <span className="px-2 py-1 bg-background rounded">💳 Cards</span>
                      <span className="px-2 py-1 bg-background rounded">🏦 Bank Transfer</span>
                      <span className="px-2 py-1 bg-background rounded">📱 Mobile Money</span>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t">
            {!showPaymentButton ? (
              <>
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <CreditCard className="w-4 h-4 mr-2 animate-pulse" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {itemPrice && itemPrice > 0 ? (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Continue to Payment
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Claim Item
                        </>
                      )}
                    </>
                  )}
                </Button>
                {itemPrice && itemPrice > 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    You'll be redirected to Paystack to complete your payment securely
                  </p>
                )}
              </>
            ) : (
              <>
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <p className="font-medium">Claim Successful!</p>
                    <p className="text-sm">Complete your payment to finalize the gift.</p>
                  </AlertDescription>
                </Alert>
                <Button 
                  type="button" 
                  onClick={handlePayment} 
                  className="w-full h-11 text-base font-medium bg-green-600 hover:bg-green-700" 
                  disabled={isLoadingPayment}
                >
                  {isLoadingPayment ? (
                    <>
                      <CreditCard className="w-4 h-4 mr-2 animate-pulse" />
                      Opening Paystack...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pay {getCurrencySymbol(currency)}{itemPrice?.toFixed(2)}
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  🔒 Your payment is secured by Paystack's 256-bit encryption
                </p>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
};
