// src/components/ClaimItemDialog.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, CheckCircle2, AlertCircle } from "lucide-react";

interface ClaimItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemPrice: number;
  allowGroupGifting?: boolean;
}

const FundingProgress = ({ targetAmount }: { targetAmount: number }) => (
  <div className="p-4 rounded-2xl border bg-card">
    <div className="flex justify-between mb-3">
      <div>
        <p className="font-semibold">Funding Progress</p>
        <p className="text-xs text-muted-foreground">1 contributor so far</p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-red-600">₦49,999.79</p>
        <p className="text-xs text-muted-foreground">of ₦200,000.00</p>
      </div>
    </div>
    <Progress value={25} className="h-3 mb-2" />
    <div className="flex justify-between text-sm">
      <span>25% funded</span>
      <span className="font-medium">₦150,000.21 remaining</span>
    </div>
  </div>
);

export const ClaimItemDialog = ({
  open,
  onOpenChange,
  itemName,
  itemPrice,
  allowGroupGifting = false,
}: ClaimItemDialogProps) => {
  const [claimType, setClaimType] = useState<"full" | "partial">("full");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Your existing logic goes here
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md rounded-3xl p-6 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-red-600" />
            </div>
            Claim "{itemName}"
          </DialogTitle>
          <p className="text-base text-muted-foreground mt-2">
            Fill in your details below to claim this gift and proceed to payment.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">

          {/* Funding Progress */}
          {allowGroupGifting && <FundingProgress targetAmount={itemPrice} />}

          {/* Group Gift Options */}
          {allowGroupGifting && (
            <div className="space-y-4 bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-2xl border">
              <div className="flex items-center gap-2 mb-3">
                <Info className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold">How much would you like to contribute?</h3>
              </div>

              <RadioGroup value={claimType} onValueChange={(v) => setClaimType(v as any)}>
                <label className="flex items-start gap-4 p-4 rounded-xl border bg-white cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="full" />
                  <div>
                    <div className="font-medium">Fund Remaining Amount</div>
                    <div className="text-sm text-muted-foreground">Pay whatever is left to fully fund this item</div>
                  </div>
                </label>

                <label className="flex items-start gap-4 p-4 rounded-xl border bg-white cursor-pointer hover:bg-gray-50">
                  <RadioGroupItem value="partial" />
                  <div className="flex-1">
                    <div className="font-medium">Partial Contribution (Group Gift)</div>
                    <div className="text-sm text-muted-foreground">Contribute any amount — others can chip in too!</div>
                  </div>
                </label>
              </RadioGroup>
            </div>
          )}

          {/* Your Information */}
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Your Information</h3>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Your Name *</Label>
                <Input placeholder="John Doe" className="mt-2" />
              </div>
              {/* Add email, phone the same way if needed */}
            </div>
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full h-12 text-lg font-semibold rounded-xl bg-red-600 hover:bg-red-700">
            Continue to Payment
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
