// src/components/ClaimItemDialog.tsx
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

// Funding Progress Component (unchanged logic, just mobile-friendly styling)
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
    <div className="p-4 rounded-2xl border bg-card shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-foreground">Funding Progress</p>
          <p className="text-xs text-muted-foreground mt-1">
            {contributorsCount} {contributorsCount === 1 ? 'contributor' : 'contributors'} so far
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">
            ₦{totalRaised.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">
            of ₦{targetAmount.toFixed(2)}
          </p>
        </div>
      </div>
      <Progress value={percentageFunded} className="h-3 mb-2" />
      <div className="flex justify-between text-sm">
        <span className="font-medium">{percentageFunded.toFixed(0)}% funded</span>
        <span className="text-foreground font-medium">
          ₦{remainingAmount.toFixed(2)} remaining
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
  const [currency, setCurrency] = useState("NGN");
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [showPaymentButton, setShowPaymentButton] = useState(false);
  const { data: appSettings } = useAppSettings();

  const isOwnItem = currentUserId && wishlistOwnerId && currentUserId === wishlistOwnerId;

  // ... (all your existing logic stays 100% unchanged)

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-md mx-auto rounded-3xl p-5 max-h-[92vh] overflow-y-auto">
          <DialogHeader className="text-left pb-4">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-red-600" />
              </div>
              Claim "{itemName}"
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Fill in your details below to claim this gift and proceed to payment.
            </DialogDescription>
          </DialogHeader>

          {isOwnItem ? (
            <Alert className="bg-red-50 border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-700 font-medium">
                You cannot claim items from your own wishlist.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Funding Progress */}
              {allowGroupGifting && itemPrice && <FundingProgress itemId={itemId} targetAmount={itemPrice} currency={currency} />}

              {/* Group Gift Options */}
              {allowGroupGifting && itemPrice && (
                <div className="space-y-4 bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-2xl border">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold">How much would you like to contribute?</h3>
                  </div>

                  <RadioGroup value={claimType} onValueChange={(v: "full" | "partial") => setClaimType(v)}>
                    <div className="space-y-3">
                      <label className="flex items-center gap-4 p-4 rounded-xl border bg-white cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="full" />
                        <div>
                          <div className="font-medium">Fund Remaining Amount</div>
                          <div className="text-sm text-muted-foreground">Pay whatever is left to fully fund this item</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-4 p-4 rounded-xl border bg-white cursor-pointer hover:bg-gray-50">
                        <RadioGroupItem value="partial" />
                        <div className="flex-1">
                          <div className="font-medium">Partial Contribution (Group Gift)</div>
                          <div className="text-sm text-muted-foreground">Contribute any amount — others can chip in too!</div>
                          {claimType === "partial" && (
                            <div className="mt-4 space-y-3">
                              <Input
                                type="number"
                                placeholder="Enter amount"
                                value={contributionAmount}
                                onChange={(e) => setContributionAmount(e.target.value)}
                                className="text-lg font-medium"
                              />
                              <div className="flex flex-wrap gap-2">
                                {[5000, 10000, 20000, 50000].map(
