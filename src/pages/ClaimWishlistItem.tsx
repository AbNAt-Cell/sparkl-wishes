import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ArrowLeft, Info, Shield, CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { getCurrencySymbol } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { sendNotification } from "@/integrations/notifications";
import { useAppSettings } from "@/lib/settings";
import { convertTokenFeeToLocalCurrency } from "@/lib/utils";

// Funding Progress Component for Group Gifts
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

const ClaimWishlistItem = () => {
  const navigate = useNavigate();
  const { itemId, shareCode } = useParams<{ itemId: string; shareCode?: string }>();
  const [session, setSession] = useState<Session | null>(null);
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
  const [deliveryType, setDeliveryType] = useState<"personal_delivery" | "cash_equivalent">("cash_equivalent");
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [showPaymentButton, setShowPaymentButton] = useState(false);
  const { data: appSettings } = useAppSettings();

  const { data: item, isLoading: itemLoading } = useQuery({
    queryKey: ["wishlist-item", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*, wishlists(currency, user_id, share_code)")
        .eq("id", itemId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!itemId,
  });

  const wishlist = item?.wishlists as any;
  const itemPrice = item?.price_max || null;
  const allowGroupGifting = item?.allow_group_gifting || false;
  const wishlistOwnerId = wishlist?.user_id;
  const currentUserId = session?.user?.id;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (wishlist?.currency) {
      setCurrency(wishlist.currency);
    }

    if (currentUserId && !formData.isAnonymous) {
      const initializeForm = async () => {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", currentUserId)
          .single();

        const { data: { user } } = await supabase.auth.getUser();
        
        setFormData(prev => ({
          ...prev,
          name: profileData?.full_name || "",
          email: user?.email || "",
        }));
      };
      initializeForm();
    }
  }, [wishlist, currentUserId]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const { data: groupGiftData } = useQuery({
    queryKey: ["group-gift-remaining", itemId],
    queryFn: async () => {
      if (!allowGroupGifting || !itemPrice) return null;
      
      const { data, error } = await supabase
        .from("claims")
        .select("contribution_amount, payment_status, is_group_gift")
        .eq("item_id", itemId!)
        .eq("payment_status", "completed")
        .eq("is_group_gift", true);

      if (error) throw error;

      const totalRaised = (data || []).reduce((sum: number, claim: any) => {
        const amount = claim.contribution_amount;
        return sum + (amount && amount > 0 ? amount : 0);
      }, 0);

      return Math.max(0, itemPrice - totalRaised);
    },
    enabled: allowGroupGifting && !!itemPrice && !!itemId,
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

  // Check if Paystack is properly configured
  if (!PAYSTACK_PUBLIC_KEY && itemPrice && itemPrice > 0) {
    console.warn("Paystack public key not configured. Payments may not work.");
  }
  const isOwnItem = currentUserId && wishlistOwnerId && currentUserId === wishlistOwnerId;

  const handlePaystackPayment = async (claimId: string) => {
    const { data: claimData, error: fetchError } = await supabase
      .from("claims")
      .select("contribution_amount")
      .eq("id", claimId)
      .single();

    const contribAmount = (claimData as { contribution_amount?: number } | null)?.contribution_amount;
    if (fetchError || !claimData || !contribAmount) {
      toast.error("Failed to fetch payment amount");
      setIsLoadingPayment(false);
      return;
    }

    const finalAmount = contribAmount;
    const amountInKobo = Math.round(finalAmount * 100);

    // @ts-expect-error - Paystack is loaded via script
    if (!window.PaystackPop) {
      toast.error("Payment system not loaded. Please refresh and try again.");
      setIsLoadingPayment(false);
      return;
    }

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
          
          (async () => {
            try {
              const { error: claimError } = await supabase
                .from("claims")
                .update({
                  payment_status: "completed",
                  payment_method: "paystack",
                  payment_reference: response.reference,
                })
                .eq("id", claimId);

              if (claimError) throw claimError;

              await new Promise(resolve => setTimeout(resolve, 1000));

              toast.success("Payment successful! Funds have been credited to the wishlist owner.");
              setFormData({ name: "", email: "", phone: "", notes: "", isAnonymous: false });
              setShowPaymentButton(false);
              setClaimId(null);
              
              const redirectPath = shareCode ? `/share/${shareCode}` : "/dashboard";
              navigate(redirectPath);

              sendNotification({
                type: "payment.completed",
                to: [{ email: formData.email, name: formData.name }],
                subject: `Payment confirmed for "${item?.name}"`,
                text: `Hi ${formData.name || "there"},\n\nWe received your payment for "${item?.name}" (ref ${response.reference}). Thank you for your generosity!`,
                html: `<p>Hi ${formData.name || "there"},</p><p>We received your payment for <strong>"${item?.name}"</strong> (ref <code>${response.reference}</code>). Thank you for your generosity!</p>`,
              }).catch(() => {});
            } catch (error) {
              console.error("Payment processing error:", error);
              toast.error(`Payment received but claim update failed. Contact support with reference: ${response.reference}`, { duration: 10000 });
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
      if (!itemId) {
        toast.error("Invalid item ID");
        setIsSubmitting(false);
        return;
      }

      if (isOwnItem) {
        toast.error("You cannot claim items from your own wishlist");
        setIsSubmitting(false);
        return;
      }

      if (!formData.name || !formData.email) {
        toast.error("Please fill in your name and email");
        setIsSubmitting(false);
        return;
      }

      if (!allowGroupGifting) {
        const { data: existingClaims } = await supabase
          .from("claims")
          .select("id, payment_status")
          .eq("item_id", itemId!)
          .in("payment_status", ["pending", "completed"]);

        if (existingClaims && existingClaims.length > 0) {
          toast.error("This item has already been claimed by someone else!");
          setIsSubmitting(false);
          navigate(shareCode ? `/share/${shareCode}` : "/dashboard");
          return;
        }
      }

      if (allowGroupGifting && itemPrice && itemPrice > 0) {
        const { data: existingClaims } = await supabase
          .from("claims")
          .select("contribution_amount, payment_status, is_group_gift")
          .eq("item_id", itemId!)
          .eq("payment_status", "completed")
          .eq("is_group_gift", true);

        const totalRaised = (existingClaims || []).reduce((sum: number, claim: any) => {
          const amount = claim.contribution_amount;
          return sum + (amount && amount > 0 ? amount : 0);
        }, 0);

        const remainingAmount = Math.max(0, itemPrice - totalRaised);

        if (remainingAmount <= 0) {
          toast.error("This item is already fully funded! No more contributions needed.");
          setIsSubmitting(false);
          navigate(shareCode ? `/share/${shareCode}` : "/dashboard");
          return;
        }

        if (claimType === "partial") {
          const contributionValue = parseFloat(contributionAmount);
          if (isNaN(contributionValue) || contributionValue <= 0) {
            toast.error("Please enter a valid contribution amount");
            setIsSubmitting(false);
            return;
          }

          if (contributionValue > remainingAmount) {
            toast.error(`Contribution would exceed target! Only ${getCurrencySymbol(currency)}${remainingAmount.toFixed(2)} needed.`);
            setIsSubmitting(false);
            return;
          }
        }
      }

      let paymentAmount = itemPrice || 0;
      
      // For physical items with personal delivery, use token fee instead of full price
      if (item?.item_type === "physical" && !allowGroupGifting && deliveryType === "personal_delivery") {
        const tokenFeeNGN = appSettings?.tokenFees?.personalDeliveryFeeNGN || 2000;
        paymentAmount = convertTokenFeeToLocalCurrency(tokenFeeNGN, currency);
      } else if (allowGroupGifting && itemPrice && itemPrice > 0) {
        const { data: existingClaims } = await supabase
          .from("claims")
          .select("contribution_amount, is_group_gift")
          .eq("item_id", itemId!)
          .eq("payment_status", "completed")
          .eq("is_group_gift", true);

        const totalRaised = (existingClaims || []).reduce((sum: number, claim: any) => {
          const amount = claim.contribution_amount;
          return sum + (amount && amount > 0 ? amount : 0);
        }, 0);

        const remainingAmount = Math.max(0, itemPrice - totalRaised);

        if (claimType === "partial") {
          paymentAmount = parseFloat(contributionAmount);
        } else {
          paymentAmount = remainingAmount;
        }
      }

      let claimUserId = currentUserId;
      if (!claimUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        claimUserId = user?.id ?? null;
      }

      console.log("Attempting to create claim with data:", {
        item_id: itemId!,
        user_id: claimUserId,
        claimer_name: formData.name,
        claimer_email: formData.email,
        claimer_phone: formData.phone,
        notes: formData.notes || null,
        is_anonymous: formData.isAnonymous,
        payment_status: itemPrice && itemPrice > 0 ? "pending" : "not_required",
        expires_at: itemPrice && itemPrice > 0
          ? new Date(Date.now() + 20 * 60 * 1000).toISOString()
          : null,
        is_group_gift: allowGroupGifting,
        contribution_amount: paymentAmount,
      });

      // Try using RPC function first
      let claimData, claimError;

      try {
        // Use RPC function - note: it returns a UUID directly, not a complex object
        const rpcResult = await supabase.rpc('create_wishlist_claim', {
          p_item_id: itemId!,
          p_claimer_name: formData.name,
          p_claimer_email: formData.email,
          p_claimer_phone: formData.phone || null,
          p_notes: formData.notes || null,
          p_is_anonymous: formData.isAnonymous,
          p_is_group_gift: allowGroupGifting,
          p_contribution_amount: paymentAmount || null,
        });

        if (rpcResult.data) {
          // RPC returns UUID string directly - fetch full claim data
          const { data: fullClaim } = await supabase
            .from('claims')
            .select('*')
            .eq('id', rpcResult.data)
            .single();
          claimData = fullClaim;
          claimError = null;
        } else {
          throw new Error(rpcResult.error?.message || 'RPC failed');
        }
      } catch (rpcErr) {
        console.log("RPC failed, trying direct insert:", rpcErr);

        // Fallback to direct insert with minimal required fields first
        let result = await supabase
          .from("claims")
          .insert({
            item_id: itemId!,
            claimer_name: formData.name,
            claimer_email: formData.email,
            claim_type: deliveryType || 'cash_equivalent',
          })
          .select()
          .single();

        if (result.error) {
          claimData = null;
          claimError = result.error;
        } else {
          // If minimal insert worked, update with additional fields
          const updateData: any = {};
          if (claimUserId) updateData.user_id = claimUserId;
          if (formData.phone) updateData.claimer_phone = formData.phone;
          if (formData.notes) updateData.notes = formData.notes;
          if (formData.isAnonymous !== undefined) updateData.is_anonymous = formData.isAnonymous;
          if (itemPrice && itemPrice > 0) {
            updateData.payment_status = "pending";
            updateData.expires_at = new Date(Date.now() + 20 * 60 * 1000).toISOString();
          } else {
            updateData.payment_status = "not_required";
          }
          if (allowGroupGifting) updateData.is_group_gift = true;
          if (paymentAmount) updateData.contribution_amount = paymentAmount;

          if (Object.keys(updateData).length > 0) {
            const updateResult = await supabase
              .from("claims")
              .update(updateData)
              .eq("id", result.data.id)
              .select()
              .single();

            if (updateResult.error) {
              console.warn("Failed to update claim with additional fields:", updateResult.error);
              // Continue with the minimal data
            } else {
              result = updateResult;
            }
          }

          claimData = result.data;
          claimError = null;
        }
      }

      if (claimError) {
        console.error("Claim insertion error:", claimError);
        throw claimError;
      }

      setClaimId(claimData.id);
      toast.success("Item claimed successfully!");

      sendNotification({
        type: "claim.created",
        to: [{ email: formData.email, name: formData.name }],
        subject: `You claimed "${item?.name}" on Sparkl Wishes`,
        text: `Hi ${formData.name || "there"},\n\nYou successfully claimed "${item?.name}". ${itemPrice && itemPrice > 0 ? "Please proceed to payment to finalize your gift." : "No payment is required."}\n\nThank you!`,
        html: `<p>Hi ${formData.name || "there"},</p><p>You successfully claimed <strong>"${item?.name}"</strong>. ${itemPrice && itemPrice > 0 ? "Please proceed to payment to finalize your gift." : "No payment is required."}</p><p>Thank you!</p>`,
      }).catch(() => {});

      const paymentEnabled = appSettings?.payments?.paystackEnabled ?? true;

      if (itemPrice && itemPrice > 0 && paymentEnabled) {
        setShowPaymentButton(true);
      } else {
        setFormData({ name: "", email: "", phone: "", notes: "", isAnonymous: false });
        navigate(shareCode ? `/share/${shareCode}` : "/dashboard");
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

  const handleAnonymousToggle = async (checked: boolean) => {
    if (checked) {
      setFormData({
        name: "",
        email: "",
        phone: "",
        notes: "",
        isAnonymous: true,
      });
    } else {
      if (currentUserId) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", currentUserId)
          .single();

        const { data: { user } } = await supabase.auth.getUser();
        
        setFormData({
          name: profileData?.full_name || "",
          email: user?.email || "",
          phone: "",
          notes: "",
          isAnonymous: false,
        });
      }
    }
  };

  // Show loading state while item data is being fetched
  if (itemLoading || !item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading item...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <Button variant="ghost" onClick={() => navigate(shareCode ? `/share/${shareCode}` : "/dashboard")} className="mb-6">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </Button>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-primary" />
                Claim "{item.name}"
              </CardTitle>
              <CardDescription className="text-base">
                {itemPrice && itemPrice > 0 
                  ? "Fill in your details below to claim this gift and proceed to payment."
                  : "Fill in your details below to claim this gift (no payment required)."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isOwnItem ? (
                <Alert className="bg-destructive/10 border-destructive/20">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">
                    You cannot claim items from your own wishlist. Share your wishlist with friends and family so they can get gifts for you!
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {itemPrice && itemPrice > 0 && !allowGroupGifting && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Amount to pay:</span>
                        <span className="text-xl font-bold text-primary">
                          {getCurrencySymbol(currency)}{itemPrice.toFixed(2)} {currency}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {allowGroupGifting && itemPrice && itemPrice > 0 && (
                      <FundingProgress itemId={itemId!} targetAmount={itemPrice} currency={currency} />
                    )}

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
                                      {[10, 25, 50, 100].filter(amt => amt <= itemPrice!).map((amount) => (
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

                    {item?.item_type === "physical" && !allowGroupGifting && (
                      <div className="space-y-4 p-4 rounded-lg border bg-gradient-to-br from-blue-50/30 to-cyan-50/30">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          <h3 className="font-medium text-sm">How will you get this gift?</h3>
                        </div>
                        
                        <RadioGroup value={deliveryType} onValueChange={(value: "personal_delivery" | "cash_equivalent") => setDeliveryType(value)}>
                          <div className="space-y-3">
                            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white hover:bg-muted/20 cursor-pointer">
                              <RadioGroupItem value="personal_delivery" id="personal-delivery" />
                              <div className="flex-1">
                                <Label htmlFor="personal-delivery" className="cursor-pointer font-medium">
                                  I'll Personally Deliver It
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Pay a token fee of {getCurrencySymbol(currency)}{(convertTokenFeeToLocalCurrency(appSettings?.tokenFees?.personalDeliveryFeeNGN || 2000, currency)).toFixed(2)} to confirm your commitment
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-start space-x-3 p-3 rounded-lg border bg-white hover:bg-muted/20 cursor-pointer">
                              <RadioGroupItem value="cash_equivalent" id="cash-equivalent" />
                              <div className="flex-1">
                                <Label htmlFor="cash-equivalent" className="cursor-pointer font-medium">
                                  Pay Cash Equivalent
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Send money instead: {getCurrencySymbol(currency)}{itemPrice ? itemPrice.toFixed(2) : 'TBD'} {currency}
                                </p>
                              </div>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    )}

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
                          placeholder="+1234567890"
                        />
                      </div>
                    </div>

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
                    
                    {itemPrice && itemPrice > 0 && !showPaymentButton && (
                      <Alert className="bg-primary/5 border-primary/20">
                        <Shield className="h-4 w-4 text-primary" />
                        <AlertDescription>
                          <p className="text-sm font-medium text-foreground">
                            {(appSettings?.payments.paystackEnabled ?? true) ? "Secure Payment via Paystack" : "Payments temporarily unavailable"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(appSettings?.payments.paystackEnabled ?? true) ? "Your payment will be processed securely." : "The wishlist owner has disabled payments at the moment."}
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="space-y-3 pt-4 border-t">
                      {!showPaymentButton ? (
                        <>
                          <Button 
                            type="submit" 
                            className="w-full h-11 text-base font-medium" 
                            disabled={isSubmitting || (itemPrice && itemPrice > 0 && !(appSettings?.payments.paystackEnabled ?? true))}
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
                                    {(appSettings?.payments.paystackEnabled ?? true) ? "Continue to Payment" : "Payments Disabled"}
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
                                Pay {getCurrencySymbol(currency)}{paymentDisplayAmount.toFixed(2)}
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
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default ClaimWishlistItem;



