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
        })
        .select()
        .single();

      if (claimError) throw claimError;

      // If there's a price, proceed to payment
      if (itemPrice && itemPrice > 0) {
        setIsLoadingPayment(true);
        // TODO: Integrate payment gateway here
        // For now, just show success
        toast.success("Item claimed! Payment processing will be added soon.");
      } else {
        toast.success("Item claimed successfully!");
      }

      setFormData({ name: "", email: "", phone: "", notes: "", isAnonymous: false });
      onOpenChange(false);
      onClaimSuccess();
    } catch (error: any) {
      toast.error("Failed to claim item: " + error.message);
    } finally {
      setIsSubmitting(false);
      setIsLoadingPayment(false);
    }
  };

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
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Claiming..." : "Claim Item"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
