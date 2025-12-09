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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getCurrencySymbol } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

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
    <div className="p-4 rounded-lg border bg-gradient-to-br from-green-50 to-blue-50">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-medium text-sm">Funding Progress</p>
          <p className="text-xs text-muted-foreground">{data?.count || 0} contributor{(data?.count || 0) !== 1 && "s"}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg text-primary">{getCurrencySymbol(currency)}{raised.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">of {getCurrencySymbol(currency)}{targetAmount.toFixed(2)}</p>
        </div>
      </div>
      <Progress value={percentage} className="h-2 mb-2" />
      <div className="flex justify-between text-xs">
        <span>{percentage.toFixed(0)}% funded</span>
        <span className="font-medium">{getCurrencySymbol(currency)}{remaining.toFixed(2)} left</span>
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
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", notes: "", isAnonymous: false });
  const [claimType, setClaimType] = useState<"full" | "partial">("full");
  const [contributionAmount, setContributionAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);

  const isOwnItem = currentUserId === wishlistOwnerId;

  useEffect(() => {
    if (open && itemId) {
      supabase.from("wishlist_items").select("wishlists(currency)").eq("id", itemId).single().then(({ data }) => {
        setCurrency(data?.wishlists?.currency || "USD");
      });
    }
  }, [open, itemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // ... your claim logic
    setShowPayment(true);
    setIsSubmitting(false);
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
                    className="min-h-[70px] resize-none"
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

              <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Continue to Payment"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
