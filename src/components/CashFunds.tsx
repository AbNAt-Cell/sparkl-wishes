// @ts-nocheck
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, Plus, DollarSign, Loader2, Heart, TrendingUp, Target, Users } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getCurrencySymbol, formatCurrency } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { sendNotification } from "@/integrations/notifications";
import { useAppSettings } from "@/lib/settings";

interface CashFundsProps {
  wishlistId: string;
  currency: string;
  isOwner?: boolean;
}

interface CashFund {
  id: string;
  fund_name: string;
  fund_description?: string;
  target_amount?: number;
  current_amount: number;
  is_active: boolean;
}

interface ContributeFormData {
  name: string;
  email: string;
  amount: string;
  message: string;
  isAnonymous: boolean;
}

export const CashFunds: React.FC<CashFundsProps> = ({ wishlistId, currency, isOwner = false }) => {
  // Type looser client alias for experimental tables not in generated types yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb: any = supabase;
  const queryClient = useQueryClient();
  const [addFundOpen, setAddFundOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [selectedFund, setSelectedFund] = useState<CashFund | null>(null);
  const [fundFormData, setFundFormData] = useState({
    fund_name: "",
    fund_description: "",
    target_amount: "",
  });
  const [contributeFormData, setContributeFormData] = useState<ContributeFormData>({
    name: "",
    email: "",
    amount: "",
    message: "",
    isAnonymous: false,
  });

  const { data: appSettings } = useAppSettings();

  // Fetch cash funds
  const { data: funds, isLoading } = useQuery({
    queryKey: ["cash-funds", wishlistId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("cash_funds")
        .select("*")
        .eq("wishlist_id", wishlistId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as unknown as CashFund[];
    },
  });

  // Add fund mutation
  const addFundMutation = useMutation({
    mutationFn: async (data: typeof fundFormData) => {
      const { error } = await sb
        .from("cash_funds")
        .insert({
          wishlist_id: wishlistId,
          fund_name: data.fund_name,
          fund_description: data.fund_description || null,
          target_amount: data.target_amount ? parseFloat(data.target_amount) : null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-funds", wishlistId] });
      toast.success("Fund created successfully!");
      setFundFormData({ fund_name: "", fund_description: "", target_amount: "" });
      setAddFundOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to create fund: " + (error as Error).message);
    },
  });

  const handleAddFund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundFormData.fund_name.trim()) {
      toast.error("Please enter a fund name");
      return;
    }
    addFundMutation.mutate(fundFormData);
  };

  const handleContributeClick = (fund: CashFund) => {
    setSelectedFund(fund);
    setContributeOpen(true);
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund) return;

    const amount = parseFloat(contributeFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      // Create contribution record
      const { data: contribution, error: contributionError } = await sb
        .from("cash_contributions")
        .insert({
          fund_id: selectedFund.id,
          contributor_name: contributeFormData.name,
          contributor_email: contributeFormData.email || null,
          amount: amount,
          message: contributeFormData.message || null,
          is_anonymous: contributeFormData.isAnonymous,
          payment_status: "pending",
        })
        .select()
        .single();

      if (contributionError) throw contributionError;

      // Initialize Paystack payment
      const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (!paystackKey) {
        throw new Error("Paystack configuration missing");
      }
      if (!(appSettings?.payments.paystackEnabled ?? true)) {
        throw new Error("Payments are currently disabled");
      }

      // @ts-expect-error - Paystack is loaded via script tag
      const handler = window.PaystackPop.setup({
        key: paystackKey,
        email: contributeFormData.email || "guest@sparklwishes.com",
        amount: Math.round(amount * 100), // Convert to kobo/cents
        currency: currency,
        ref: `CONTRIB_${contribution.id}_${Date.now()}`,
        metadata: {
          contribution_id: contribution.id,
          fund_name: selectedFund.fund_name,
          contributor_name: contributeFormData.name,
        },
        callback: function(response: { reference: string }) {
          (async () => {
            try {
              // Update contribution status
              const { error: updateError } = await sb
                .from("cash_contributions")
                .update({
                  payment_status: "completed",
                  payment_reference: response.reference,
                })
                .eq("id", contribution.id);

              if (updateError) throw updateError;

              toast.success("Thank you for your contribution!");

              // Fire-and-forget: send contribution receipt
              sendNotification({
                type: "fund.contribution",
                to: [{ email: contributeFormData.email, name: contributeFormData.name }],
                subject: `Contribution received for ${selectedFund.fund_name}`,
                text: `Hi ${contributeFormData.name},\n\nWe received your contribution of ${amount.toFixed(2)} ${currency} to "${selectedFund.fund_name}" (ref ${response.reference}). Thank you!`,
                html: `<p>Hi ${contributeFormData.name},</p><p>We received your contribution of <strong>${amount.toFixed(2)} ${currency}</strong> to <strong>"${selectedFund.fund_name}"</strong> (ref <code>${response.reference}</code>). Thank you!</p>`,
              }).catch(() => {});
              setContributeFormData({
                name: "",
                email: "",
                amount: "",
                message: "",
                isAnonymous: false,
              });
              setContributeOpen(false);
              queryClient.invalidateQueries({ queryKey: ["cash-funds", wishlistId] });
            } catch (error) {
              toast.error("Payment received but update failed. Please contact support.");
            }
          })();
        },
        onClose: function() {
          toast.info("Payment cancelled");
        },
      });

      handler.openIframe();
    } catch (error) {
      toast.error("Failed to process contribution: " + (error as Error).message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!funds || funds.length === 0) {
    if (!isOwner) return null;

    return (
      <Card className="border-2 border-dashed">
        <CardContent className="text-center py-12">
          <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Cash Funds Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create flexible cash funds for honeymoon, house down payment, or any goal!
          </p>
          <Dialog open={addFundOpen} onOpenChange={setAddFundOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Cash Fund
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Cash Fund</DialogTitle>
                <DialogDescription>
                  Allow guests to contribute flexible amounts toward a goal
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddFund} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fund_name">Fund Name *</Label>
                  <Input
                    id="fund_name"
                    value={fundFormData.fund_name}
                    onChange={(e) => setFundFormData({ ...fundFormData, fund_name: e.target.value })}
                    required
                    placeholder="e.g., Honeymoon Fund, Baby Fund"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fund_description">Description</Label>
                  <Textarea
                    id="fund_description"
                    value={fundFormData.fund_description}
                    onChange={(e) => setFundFormData({ ...fundFormData, fund_description: e.target.value })}
                    placeholder="Tell guests what this fund is for..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_amount">Target Amount (Optional)</Label>
                  <Input
                    id="target_amount"
                    type="number"
                    step="0.01"
                    value={fundFormData.target_amount}
                    onChange={(e) => setFundFormData({ ...fundFormData, target_amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={addFundMutation.isPending}>
                  {addFundMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Fund"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Cash Funds</h3>
        </div>
        {isOwner && (
          <Dialog open={addFundOpen} onOpenChange={setAddFundOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Fund
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Cash Fund</DialogTitle>
                <DialogDescription>
                  Allow guests to contribute flexible amounts toward a goal
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddFund} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fund_name">Fund Name *</Label>
                  <Input
                    id="fund_name"
                    value={fundFormData.fund_name}
                    onChange={(e) => setFundFormData({ ...fundFormData, fund_name: e.target.value })}
                    required
                    placeholder="e.g., Honeymoon Fund, Baby Fund"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fund_description">Description</Label>
                  <Textarea
                    id="fund_description"
                    value={fundFormData.fund_description}
                    onChange={(e) => setFundFormData({ ...fundFormData, fund_description: e.target.value })}
                    placeholder="Tell guests what this fund is for..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_amount">Target Amount (Optional)</Label>
                  <Input
                    id="target_amount"
                    type="number"
                    step="0.01"
                    value={fundFormData.target_amount}
                    onChange={(e) => setFundFormData({ ...fundFormData, target_amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={addFundMutation.isPending}>
                  {addFundMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Fund"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {funds.map((fund) => {
          const progressPercentage = fund.target_amount
            ? (fund.current_amount / fund.target_amount) * 100
            : 0;

          return (
            <Card key={fund.id} className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Heart className="w-5 h-5 text-green-600" />
                      {fund.fund_name}
                    </CardTitle>
                    {fund.fund_description && (
                      <CardDescription className="mt-2">
                        {fund.fund_description}
                      </CardDescription>
                    )}
                  </div>
                  {fund.target_amount && (
                    <Badge variant="outline" className="bg-white">
                      <Target className="w-3 h-3 mr-1" />
                      Goal: {formatCurrency(fund.target_amount, currency, false)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-green-700">
                      {formatCurrency(fund.current_amount, currency)}
                    </span>
                    {fund.target_amount && (
                      <span className="text-sm text-muted-foreground">
                        {Math.round(progressPercentage)}% reached
                      </span>
                    )}
                  </div>
                  {fund.target_amount && (
                    <Progress value={progressPercentage} className="h-2 [&>div]:bg-green-500" />
                  )}
                </div>

                <Button
                  onClick={() => handleContributeClick(fund)}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Contribute
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contribute Dialog */}
      <Dialog open={contributeOpen} onOpenChange={setContributeOpen}>
        <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contribute to {selectedFund?.fund_name}</DialogTitle>
            <DialogDescription>
              Make a flexible contribution toward this fund
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContribute} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contrib_name">Your Name *</Label>
                <Input
                  id="contrib_name"
                  value={contributeFormData.name}
                  onChange={(e) => setContributeFormData({ ...contributeFormData, name: e.target.value })}
                  required
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contrib_email">Email *</Label>
                <Input
                  id="contrib_email"
                  type="email"
                  value={contributeFormData.email}
                  onChange={(e) => setContributeFormData({ ...contributeFormData, email: e.target.value })}
                  required
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contrib_amount">Amount ({currency}) *</Label>
              <Input
                id="contrib_amount"
                type="number"
                step="0.01"
                value={contributeFormData.amount}
                onChange={(e) => setContributeFormData({ ...contributeFormData, amount: e.target.value })}
                required
                placeholder="0.00"
              />
              <div className="flex gap-2 mt-2">
                {[10, 25, 50, 100, 250].map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setContributeFormData({ ...contributeFormData, amount: amount.toString() })}
                  >
                    {getCurrencySymbol(currency)}{amount}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contrib_message">Message (Optional)</Label>
              <Textarea
                id="contrib_message"
                value={contributeFormData.message}
                onChange={(e) => setContributeFormData({ ...contributeFormData, message: e.target.value })}
                placeholder="Leave a message..."
                rows={3}
              />
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="contrib_anonymous"
                checked={contributeFormData.isAnonymous}
                onCheckedChange={(checked) =>
                  setContributeFormData({ ...contributeFormData, isAnonymous: checked as boolean })
                }
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="contrib_anonymous" className="cursor-pointer font-medium text-sm">
                  Contribute anonymously
                </Label>
                <p className="text-xs text-muted-foreground">
                  Your name won't be displayed publicly
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={!(appSettings?.payments.paystackEnabled ?? true)}>
              <DollarSign className="w-4 h-4 mr-2" />
              {(appSettings?.payments.paystackEnabled ?? true) ? "Continue to Payment" : "Payments Disabled"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

