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
        .eq("is_group_gift", true); // Only count group gift contributions

      if (error) throw error;

      const rows = (data || []) as Array<{ contribution_amount?: number | null }>;
      // Sum only valid contribution amounts (filter out nulls)
      const totalRaised = rows.reduce((sum: number, claim) => {
        const amount = claim.contribution_amount;
        return sum + (amount && amount > 0 ? amount : 0);
      }, 0);
      const remainingAmount = Math.max(0, targetAmount - totalRaised);
      const percentageFunded = targetAmount > 0 ? (totalRaised / targetAmount) * 100 : 0;

      return {
        totalRaised,
        remainingAmount,
        percentageFunded: Math.min(100, Math.max(0, percentageFunded)), // Clamp between 0-100
        contributorsCount: data?.length || 0,
      };
    },
    enabled: !!itemId,
    refetchInterval: 5000, // Refresh every 5 seconds
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
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const { data: appSettings } = useAppSettings();

  // Query to get remaining amount for group gifts
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

  // Calculate the display amount for the payment button
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

  // Get Paystack key from environment
  const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

  // Check if user is trying to claim their own item
  const isOwnItem = currentUserId && wishlistOwnerId && currentUserId === wishlistOwnerId;

  useEffect(() => {
    const initializeDialog = async () => {
      // Fetch wishlist's currency
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

      // Auto-fill form with user's profile data if logged in
      if (currentUserId && !formData.isAnonymous) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", currentUserId)
          .single();

        if (!profileError && profileData) {
          // Get user email from auth
          const { data: { user } } = await supabase.auth.getUser();
          
          setFormData(prev => ({
            ...prev,
            name: profileData.full_name || "",
            email: user?.email || "",
            phone: prev.phone, // Keep phone as is (not in profile)
          }));
        }
      }
    };

    if (open && itemId) {
      initializeDialog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemId, currentUserId]);

  // When dialog opens for guests, try to prefill email from localStorage and check if they've already claimed
  useEffect(() => {
    const checkGuestClaim = async () => {
      if (!open || !itemId || currentUserId) return;
      try {
        const cachedEmail = localStorage.getItem('guest_claimer_email');
        if (cachedEmail) {
          setFormData(prev => ({ ...prev, email: cachedEmail }));
          const identifier = cachedEmail.toLowerCase().trim();
          const { data: existing, error } = await supabase
            .from('claims')
            .select('id')
            .eq('item_id', itemId)
            .eq('claimer_identifier', identifier)
            .in('payment_status', ['pending', 'completed'])
            .limit(1);
          if (!error && existing && existing.length > 0) {
            setAlreadyClaimed(true);
          } else {
            setAlreadyClaimed(false);
          }
        }
      } catch (err) {
        console.warn('Guest claim check failed', err);
      }
    };

    checkGuestClaim();
  }, [open, itemId, currentUserId]);

  const handlePaystackPayment = async (claimId: string) => {
    // Fetch the claim to get the exact contribution amount
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

    // @ts-expect-error - Paystack is loaded via script
    if (!window.PaystackPop) {
      toast.error("Payment system not loaded. Please refresh and try again.");
      setIsLoadingPayment(false);
      return;
    }
    
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

              // Fire-and-forget: payment completion receipt to claimer
              sendNotification({
                type: "payment.completed",
                to: [{ email: formData.email, name: formData.name }],
                subject: `Payment confirmed for "${itemName}"`,
                text: `Hi ${formData.name || "there"},\n\nWe received your payment for "${itemName}" (ref ${response.reference}). Thank you for your generosity!`,
                html: `<p>Hi ${formData.name || "there"},</p><p>We received your payment for <strong>"${itemName}"</strong> (ref <code>${response.reference}</code>). Thank you for your generosity!</p>`,
              }).catch(() => {});
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
    console.log("🚀 Starting claim submission...");
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.email) {
        toast.error("Please fill in your name and email");
        setIsSubmitting(false);
        return;
      }

      console.log("✅ Form data validated:", { name: formData.name, email: formData.email, itemId, itemPrice });

      // Check if item is already claimed (only for single-claim items)
      if (!allowGroupGifting) {
        console.log("🔍 Checking for existing claims (single-claim item)...");
        const { data: existingClaims, error: checkError } = await supabase
          .from("claims")
          .select("id, payment_status")
          .eq("item_id", itemId)
          .in("payment_status", ["pending", "completed"]);

        if (checkError) {
          console.error("❌ Error checking existing claims:", checkError);
          throw new Error("Failed to verify item availability");
        }

        if (existingClaims && existingClaims.length > 0) {
          console.log("⚠️ Item already claimed");
          toast.error("This item has already been claimed by someone else!");
          setIsSubmitting(false);
          onOpenChange(false);
          return;
        }
        console.log("✅ No existing claims found");
      }

      // For group gifting, check funding progress and prevent overpayment
      if (allowGroupGifting && itemPrice && itemPrice > 0) {
        // Get all completed GROUP GIFT contributions so far (exclude single gifts)
        const { data: existingClaims, error: checkError } = await supabase
          .from("claims")
          .select("contribution_amount, payment_status, is_group_gift")
          .eq("item_id", itemId)
          .eq("payment_status", "completed")
          .eq("is_group_gift", true); // Only count group gift contributions

        if (checkError) {
          console.error("Error checking existing contributions:", checkError);
        }

        // Calculate total raised so far from group gift contributions only
        const rows = existingClaims ?? [];
        const totalRaised = rows.reduce((sum: number, claim: any) => {
          const amount = claim.contribution_amount;
          return sum + (amount && amount > 0 ? amount : 0);
        }, 0);

        const remainingAmount = Math.max(0, itemPrice - totalRaised);

        // Check if item is already fully funded
        if (remainingAmount <= 0) {
          toast.error("This item is already fully funded! No more contributions needed.");
          setIsSubmitting(false);
          onOpenChange(false);
          return;
        }

        // Validate contribution amount for group gifts
        if (claimType === "partial") {
          const contributionValue = parseFloat(contributionAmount);
          if (isNaN(contributionValue) || contributionValue <= 0) {
            toast.error("Please enter a valid contribution amount");
            setIsSubmitting(false);
            return;
          }

          // Prevent overpayment
          if (contributionValue > remainingAmount) {
            toast.error(
              `Contribution would exceed target! Only ${getCurrencySymbol(currency)}${remainingAmount.toFixed(2)} needed to fully fund this item.`
            );
            setIsSubmitting(false);
            return;
          }
        } else {
          // Full payment for group gift = remaining amount
          // This ensures no overpayment even if someone chooses "full"
          if (remainingAmount < itemPrice) {
            toast.info(
              `This item only needs ${getCurrencySymbol(currency)}${remainingAmount.toFixed(2)} more to be fully funded.`
            );
          }
        }
      }

      // Validate partial contribution amount for non-group gifts
      if (!allowGroupGifting && claimType === "partial") {
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

      // Calculate the actual payment amount
      let paymentAmount = itemPrice || 0;
      
      if (allowGroupGifting && itemPrice && itemPrice > 0) {
        // For group gifts, calculate remaining amount needed (only count group gift contributions)
        const { data: existingClaims } = await supabase
          .from("claims")
          .select("contribution_amount, is_group_gift")
          .eq("item_id", itemId)
          .eq("payment_status", "completed")
          .eq("is_group_gift", true); // Only count group gift contributions

        const rows2 = existingClaims ?? [];
        const totalRaised = rows2.reduce((sum: number, claim: any) => {
          const amount = claim.contribution_amount;
          return sum + (amount && amount > 0 ? amount : 0);
        }, 0);

        const remainingAmount = Math.max(0, itemPrice - totalRaised);

        if (claimType === "partial") {
          paymentAmount = parseFloat(contributionAmount);
        } else {
          // Full payment for group gift = remaining amount (prevents overpayment)
          paymentAmount = remainingAmount;
        }
      }

      // First, create the claim
      console.log("💾 Creating claim in database...", {
        itemId,
        paymentAmount,
        allowGroupGifting,
        claimType,
      });

      // Get current user ID if available (guest claims are allowed)
      let claimUserId = currentUserId;
      if (!claimUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        claimUserId = user?.id ?? null;
      }

      // Use RPC function to bypass RLS and allow guest claims
      console.log("🔄 Calling RPC function create_wishlist_claim...");
      let claimData;
      
      try {
        const { data: rpcResponse, error: rpcError } = await supabase
          .rpc('create_wishlist_claim', {
            p_item_id: itemId,
            p_user_id: claimUserId,
            p_claimer_name: formData.name,
            p_claimer_email: formData.email,
            p_claimer_phone: formData.phone || null,
            p_notes: formData.notes || null,
            p_is_anonymous: formData.isAnonymous,
            p_is_group_gift: allowGroupGifting,
            p_contribution_amount: paymentAmount,
          });

        if (rpcError) {
          console.warn("⚠️ RPC call failed, attempting direct insert:", rpcError);
          
          // Fallback to direct insert for backward compatibility
          const { data: directData, error: directError } = await supabase
            .from("claims")
            .insert({
              item_id: itemId,
              user_id: claimUserId,
              claimer_name: formData.name,
              claimer_email: formData.email,
              claimer_phone: formData.phone || null,
              notes: formData.notes || null,
              is_anonymous: formData.isAnonymous,
              payment_status: itemPrice && itemPrice > 0 ? "pending" : "not_required",
              expires_at: itemPrice && itemPrice > 0 
                ? new Date(Date.now() + 20 * 60 * 1000).toISOString() 
                : null,
              is_group_gift: allowGroupGifting,
              contribution_amount: paymentAmount,
            })
            .select()
            .single();

          if (directError) {
            console.error("❌ Both RPC and direct insert failed:", directError);
            throw directError;
          }
          
          claimData = directData;
          console.log("✅ Claim created via direct insert:", claimData.id);
        } else {
          const rpcResult = rpcResponse as { success: boolean; claim?: any; error?: string } | null;
          
          if (!rpcResult?.success || !rpcResult?.claim) {
            console.warn("⚠️ RPC returned unsuccessful response, trying direct insert:", rpcResult);
            
            // Fallback to direct insert
            const { data: directData, error: directError } = await supabase
              .from("claims")
              .insert({
                item_id: itemId,
                user_id: claimUserId,
                claimer_name: formData.name,
                claimer_email: formData.email,
                claimer_phone: formData.phone || null,
                notes: formData.notes || null,
                is_anonymous: formData.isAnonymous,
                payment_status: itemPrice && itemPrice > 0 ? "pending" : "not_required",
                expires_at: itemPrice && itemPrice > 0 
                  ? new Date(Date.now() + 20 * 60 * 1000).toISOString() 
                  : null,
                is_group_gift: allowGroupGifting,
                contribution_amount: paymentAmount,
              })
              .select()
              .single();

            if (directError) {
              console.error("❌ Both RPC and direct insert failed:", directError);
              throw directError;
            }
            
            claimData = directData;
            console.log("✅ Claim created via direct insert:", claimData.id);
          } else {
            claimData = rpcResult.claim;
            console.log("✅ Claim created successfully via RPC:", claimData.id);
          }
        }
      } catch (rpcFallbackError) {
        console.error("❌ Failed to create claim (RPC with fallback):", rpcFallbackError);
        throw rpcFallbackError;
      }

      setClaimId(claimData.id);
      toast.success("Item claimed successfully!");

      // Fire-and-forget: send claim confirmation to claimer via Brevo
      sendNotification({
        type: "claim.created",
        to: [{ email: formData.email, name: formData.name }],
        subject: `You claimed "${itemName}" on Sparkl Wishes`,
        text: `Hi ${formData.name || "there"},\n\nYou successfully claimed "${itemName}". ${itemPrice && itemPrice > 0 ? "Please proceed to payment to finalize your gift." : "No payment is required."}\n\nThank you!`,
        html: `<p>Hi ${formData.name || "there"},</p><p>You successfully claimed <strong>"${itemName}"</strong>. ${itemPrice && itemPrice > 0 ? "Please proceed to payment to finalize your gift." : "No payment is required."}</p><p>Thank you!</p>`,
      }).catch(() => {});

      // If there's a price, show payment button based on settings
      const paymentEnabled = appSettings?.payments?.paystackEnabled ?? true;
      console.log("💳 Payment settings:", { itemPrice, paymentEnabled, appSettings: appSettings?.payments });

      setIsSubmitting(false);

      if (itemPrice && itemPrice > 0 && paymentEnabled) {
        console.log("✅ Showing payment button");
        setShowPaymentButton(true);
      } else {
        console.log("✅ No payment required, completing claim");
        setFormData({ name: "", email: "", phone: "", notes: "", isAnonymous: false });
        onOpenChange(false);
        onClaimSuccess();
      }
    } catch (error) {
      console.error("❌ Claim submission error:", error);
      console.error("Error details:", {
        type: error instanceof Error ? error.constructor.name : typeof error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : "No stack trace",
      });
      const errorMessage = error instanceof Error ? error.message : "Failed to claim item";
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    if (!claimId) return;
    
    // Close the dialog BEFORE opening Paystack popup to avoid z-index issues
    onOpenChange(false);
    
    setIsLoadingPayment(true);
    handlePaystackPayment(claimId);
  };

  const handleAnonymousToggle = async (checked: boolean) => {
    if (checked) {
      // Clear form when going anonymous
      setFormData({
        name: "",
        email: "",
        phone: "",
        notes: "",
        isAnonymous: true,
      });
    } else {
      // Re-populate with user data when unchecking anonymous
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
      } else {
        setFormData({
          ...formData,
          isAnonymous: false,
        });
      }
    }

      // If guest already claimed, prevent duplicate submission
      if (!currentUserId) {
        const guestIdentifier = formData.email ? formData.email.toLowerCase().trim() : null;
        if (guestIdentifier) {
          const { data: dup, error: dupErr } = await supabase
            .from('claims')
            .select('id')
            .eq('item_id', itemId)
            .eq('claimer_identifier', guestIdentifier)
            .in('payment_status', ['pending', 'completed'])
            .limit(1);
          if (!dupErr && dup && dup.length > 0) {
            toast.error('You have already claimed this item with this email.');
            setIsSubmitting(false);
            return;
          }
        }
      }
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
              {itemPrice && itemPrice > 0 
                ? "Fill in your details below to claim this gift and proceed to payment."
                : "Fill in your details below to claim this gift (no payment required)."}
            </DialogDescription>
          </DialogHeader>
          
          {/* Prevent users from claiming their own items */}
          {isOwnItem ? (
            <Alert className="bg-destructive/10 border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive">
                You cannot claim items from your own wishlist. Share your wishlist with friends and family so they can get gifts for you!
              </AlertDescription>
            </Alert>
          ) : (
            <>
          {/* Payment amount display - outside DialogDescription to avoid nesting issues */}
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
          {/* Funding Progress for Group Gifting */}
          {allowGroupGifting && itemPrice && itemPrice > 0 && (
            <FundingProgress itemId={itemId} targetAmount={itemPrice} currency={currency} />
          )}

          {/* Claim Type Selection (Group Gifting) */}
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
          
          {/* Payment Information */}
          {itemPrice && itemPrice > 0 && !showPaymentButton && (
            <Alert className="bg-primary/5 border-primary/20">
              <Shield className="h-4 w-4 text-primary" />
              <AlertDescription className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {(appSettings?.payments.paystackEnabled ?? true) ? "Secure Payment via Paystack" : "Payments temporarily unavailable"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(appSettings?.payments.paystackEnabled ?? true) ? "Your payment will be processed securely. We accept:" : "The wishlist owner has disabled payments at the moment."}
                    </p>
                    {(appSettings?.payments.paystackEnabled ?? true) && (
                      <div className="flex flex-wrap gap-2 mt-2 text-xs">
                        {appSettings?.payments.allowedMethods?.includes("card") && (
                          <span className="px-2 py-1 bg-background rounded">💳 Cards</span>
                        )}
                        {appSettings?.payments.allowedMethods?.includes("bank_transfer") && (
                          <span className="px-2 py-1 bg-background rounded">🏦 Bank Transfer</span>
                        )}
                        {appSettings?.payments.allowedMethods?.includes("mobile_money") && (
                          <span className="px-2 py-1 bg-background rounded">📱 Mobile Money</span>
                        )}
                      </div>
                    )}
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
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
};
