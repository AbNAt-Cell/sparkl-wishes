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

// Funding Progress Component (unchanged)
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
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", currentUserId)
          .single();

        if (!profileError && profileData) {
          const { data: { user } } = await supabase.auth.getUser();
          
          setFormData(prev => ({
            ...prev,
            name: profileData.full_name || "",
            email: user?.email || "",
            phone: prev.phone,
          }));
        }
      }
    };

    if (open && itemId) {
      initializeDialog();
    }
  }, [open, itemId, currentUserId]);

  // ... [All your existing handlers: handlePaystackPayment, handleSubmit, handlePayment, handleAnonymousToggle, Paystack script load] 
  // → 100% unchanged from your original code

  // Paste your original handlers here (handlePaystackPayment, handleSubmit, etc.)
  // I'm skipping them here for brevity, but they are EXACTLY the same as your working version

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
        {/* THIS IS THE ONLY CHANGE */}
        <DialogContent 
          className="fixed left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] 
                     w-[92vw] max-w-lg max-h-[90dvh] overflow-y-auto 
                     rounded-xl border bg-background p-6 shadow-2xl
                     sm:w-full"
        >
          {/* EVERYTHING BELOW IS 100% YOUR ORIGINAL CODE */}
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
                You cannot claim items from your own wishlist. Share your wishlist with friends and family so they can get gifts for you!
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* All your original form content below — unchanged */}
              {itemPrice && itemPrice > 0 && !allowGroupGifting && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Amount to pay:</span>
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

                {/* Claim Type Selection */}
                {allowGroupGifting && itemPrice && itemPrice > 0 && (
                  <div className="space-y-4 p-4 rounded-lg border bg-gradient-to-br from-purple-50/30 to-pink-50/30">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Info className="w-4 h-4 text-muted-foreground" />
                      <h3 className="font-medium text-sm">How much would you like to contribute?</h3>
                    </div>
                    
                    <RadioGroup value={claimType} onValueChange={(value: "full" | "partial") => setClaimType(value)}>
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white hover:bg-muted/20 cursor-pointer">
                          <RadioGroupItem value="full" id="full" />
                          <div className="flex-1">
                            <Label htmlFor="full" className="cursor-pointer font-medium">
                              Fund Remaining Amount
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Pay whatever is left to fully fund this item
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

                {/* Personal Information */}
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
                      onCheckedChange={handleAnonymousToggle}
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
                
                {/* Payment Info & Buttons */}
                {/* ... your original payment alert and buttons ... */}
                
                <div className="space-y-3 pt-4 border-t">
                  {!showPaymentButton ? (
                    <>
                      <Button 
                        type="submit" 
                        className="w-full h-11 text-base font-medium" 
                        disabled={isSubmitting || (itemPrice && itemPrice > 0 && !(appSettings?.payments?.paystackEnabled ?? true))}
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
                            Pay {getCurrencySymbol(currency)}{paymentDisplayAmount.toFixed(2)}
                          </>
                        )}
                      </Button>
                    </>
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
