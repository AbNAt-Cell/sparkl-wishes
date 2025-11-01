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

    // Convert price to kobo (Paystack uses smallest currency unit)
    const amountInKobo = Math.round(itemPrice * 100);

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
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className="pointer-events-auto">
        <DialogHeader>
          <DialogTitle>Claim Item</DialogTitle>
          <DialogDescription>
            Claim "{itemName}" by providing your details
            {itemPrice && itemPrice > 0 && (
              <span className="block mt-2 font-semibold text-primary">
                Amount to pay: {currency} {itemPrice.toFixed(2)}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Your Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="john@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Your Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              placeholder="+1234567890"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              rows={3}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="anonymous"
              checked={formData.isAnonymous}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isAnonymous: checked as boolean })
              }
            />
            <Label htmlFor="anonymous" className="cursor-pointer font-normal">
              Claim anonymously (your name won't be shown to others)
            </Label>
          </div>
          
          {itemPrice && itemPrice > 0 && !showPaymentButton && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-sm text-muted-foreground">
                💳 Payment will be processed securely via <strong className="text-primary">Paystack</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Accepts cards, bank transfers, and mobile money
              </p>
            </div>
          )}
          
          {!showPaymentButton ? (
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Claim Item"}
            </Button>
          ) : (
            <Button type="button" onClick={handlePayment} className="w-full" disabled={isLoadingPayment}>
              {isLoadingPayment ? "Processing Payment..." : `Pay ${currency} ${itemPrice?.toFixed(2)}`}
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
