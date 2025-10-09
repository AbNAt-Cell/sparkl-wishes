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
import { loadStripe } from "@stripe/stripe-js";
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
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paystack">("stripe");
  const [claimId, setClaimId] = useState<string | null>(null);
  const [showPaymentButton, setShowPaymentButton] = useState(false);

  // Sandbox keys - replace with production keys later
  const STRIPE_PUBLIC_KEY = "pk_test_51QYgYyP8ccfONcKJOIjlN09HcMhC0gKo8BdyPLMRAchz1jJPTzM1lxdpn6J5AEt6c7XNgqOLQ8wJZ1Sq0qcYqE2F00JnOOhMjL";
  const PAYSTACK_PUBLIC_KEY = "pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx";

  useEffect(() => {
    // Detect user's country and set currency
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        const currencyMap: { [key: string]: string } = {
          US: "USD", GB: "GBP", EU: "EUR", CA: "CAD", AU: "AUD",
          NG: "NGN", KE: "KES", ZA: "ZAR", IN: "INR", JP: "JPY",
        };
        setCurrency(currencyMap[data.country_code] || "USD");
      })
      .catch(() => setCurrency("USD"));
  }, []);

  const handleStripePayment = async (claimId: string) => {
    try {
      const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
      if (!stripe) throw new Error("Stripe failed to load");

      // In production, you'd call your backend to create a payment intent
      // For now, we'll simulate the flow and update payment status
      toast.success("Stripe payment integration ready. Backend needed for checkout.");
      
      // Update claim with payment info
      await supabase
        .from("claims")
        .update({
          payment_status: "completed",
          payment_method: "stripe",
          payment_reference: `stripe_${Date.now()}`,
        })
        .eq("id", claimId);

      setFormData({ name: "", email: "", phone: "", notes: "", isAnonymous: false });
      setShowPaymentButton(false);
      setClaimId(null);
      onOpenChange(false);
      onClaimSuccess();
    } catch (error: any) {
      toast.error("Stripe payment failed: " + error.message);
    }
  };

  const handlePaystackPayment = (claimId: string) => {
    if (!itemPrice) return;

    // Convert price to kobo (Paystack uses smallest currency unit)
    const amountInKobo = Math.round(itemPrice * 100);

    // @ts-ignore - Paystack is loaded via script
    const handler = window.PaystackPop?.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: formData.email,
      amount: amountInKobo,
      currency: currency,
      ref: `claim_${claimId}_${Date.now()}`,
      onClose: () => {
        toast.error("Payment cancelled");
        setIsLoadingPayment(false);
      },
      callback: async (response: any) => {
        // Update claim with payment info
        await supabase
          .from("claims")
          .update({
            payment_status: "completed",
            payment_method: "paystack",
            payment_reference: response.reference,
          })
          .eq("id", claimId);

        toast.success(`Payment successful! Reference: ${response.reference}`);
        setFormData({ name: "", email: "", phone: "", notes: "", isAnonymous: false });
        setShowPaymentButton(false);
        setClaimId(null);
        onOpenChange(false);
        onClaimSuccess();
        setIsLoadingPayment(false);
      },
    });

    handler?.openIframe();
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
          notes: formData.notes || null,
          is_anonymous: formData.isAnonymous,
          payment_status: itemPrice && itemPrice > 0 ? "pending" : "not_required",
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
    } catch (error: any) {
      toast.error("Failed to claim item: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!claimId) return;
    
    setIsLoadingPayment(true);
    
    if (paymentMethod === "stripe") {
      await handleStripePayment(claimId);
      setIsLoadingPayment(false);
    } else {
      handlePaystackPayment(claimId);
    }
  };

  useEffect(() => {
    // Load Paystack script
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "stripe" | "paystack")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="stripe" id="stripe" />
                  <Label htmlFor="stripe" className="cursor-pointer font-normal">
                    Stripe (Card Payment)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="paystack" id="paystack" />
                  <Label htmlFor="paystack" className="cursor-pointer font-normal">
                    Paystack (Card, Bank Transfer, USSD)
                  </Label>
                </div>
              </RadioGroup>
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
