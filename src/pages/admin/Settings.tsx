import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useAppSettings } from "@/lib/settings";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";

const AdminSettings: React.FC = () => {
  const { data, isLoading } = useAppSettings();
  const queryClient = useQueryClient();
  
  // Payment settings
  const [paystackEnabled, setPaystackEnabled] = useState(true);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [allowedMethods, setAllowedMethods] = useState<string[]>([]);
  const [platformFeePercent, setPlatformFeePercent] = useState("0.05");
  const [platformFeeMin, setPlatformFeeMin] = useState("0");
  const [platformFeeMax, setPlatformFeeMax] = useState("100");

  // Premium settings
  const [premiumEnabled, setPremiumEnabled] = useState(true);
  const [premiumPrice, setPremiumPrice] = useState("5000");
  const [premiumCurrency, setPremiumCurrency] = useState("NGN");
  // Feature toggles
  const [cashFundsEnabled, setCashFundsEnabled] = useState(true);
  
  // WhatsApp settings
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState("");

  useEffect(() => {
    if (!data) return;
    setPaystackEnabled(data.payments.paystackEnabled);
    setStripeEnabled(Boolean(data.payments.stripeEnabled));
    setAllowedMethods(data.payments.allowedMethods);
    setPlatformFeePercent(String(data.payments.platformFeePercent));
    setPlatformFeeMin(String(data.payments.platformFeeMin));
    setPlatformFeeMax(String(data.payments.platformFeeMax));
    
    setPremiumEnabled(data.premium.enabled);
    setPremiumPrice(String(data.premium.price));
    setPremiumCurrency(data.premium.currency);
    setCashFundsEnabled(Boolean(data.features?.cashFundsEnabled));
    
    setWhatsappEnabled(Boolean(data.whatsapp?.enabled));
    setWhatsappLink(data.whatsapp?.whatsappLink || "");
  }, [data]);


  const toggleMethod = (m: string, checked: boolean) => {
    setAllowedMethods(prev => checked ? Array.from(new Set([...prev, m])) : prev.filter(x => x !== m));
  };

  const savePayments = async () => {
    const payload = {
      paystackEnabled,
      stripeEnabled,
      allowedMethods,
      platformFeePercent: parseFloat(platformFeePercent || "0"),
      platformFeeMin: parseFloat(platformFeeMin || "0"),
      platformFeeMax: parseFloat(platformFeeMax || "0"),
    };
    const { error } = await supabase.functions.invoke("admin-actions", {
      body: { action: "update_setting", payload: { key: "payments", value: payload } },
    });
    if (error) {
      toast.error("Failed to save payment settings");
    } else {
      toast.success("Payment settings saved");
      // Invalidate cache to refresh settings across app
      await queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    }
  };

  const savePremium = async () => {
    const payload = {
      enabled: premiumEnabled,
      price: parseFloat(premiumPrice || "0"),
      currency: premiumCurrency,
    };
    const { error } = await supabase.functions.invoke("admin-actions", {
      body: { action: "update_setting", payload: { key: "premium", value: payload } },
    });
    if (error) {
      toast.error("Failed to save premium settings");
    } else {
      toast.success("Premium settings saved");
      await queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    }
  };

  const saveFeatures = async () => {
    const payload = {
      cashFundsEnabled,
    };
    const { error } = await supabase.functions.invoke("admin-actions", {
      body: { action: "update_setting", payload: { key: "features", value: payload } },
    });
    if (error) {
      toast.error("Failed to save feature settings");
    } else {
      toast.success("Feature settings saved");
      await queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    }
  };

  const saveWhatsApp = async () => {
    const payload = {
      enabled: whatsappEnabled,
      whatsappLink,
    };
    const { error } = await supabase.functions.invoke("admin-actions", {
      body: { action: "update_setting", payload: { key: "whatsapp", value: payload } },
    });
    if (error) {
      toast.error("Failed to save WhatsApp settings");
    } else {
      toast.success("WhatsApp settings saved");
      await queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    }
  };

  const currencies = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"];

  return (
    <div className="space-y-6">
      {/* Premium Settings */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Premium Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="premiumEnabled" 
                checked={premiumEnabled} 
                onCheckedChange={(v) => setPremiumEnabled(Boolean(v))} 
              />
              <Label htmlFor="premiumEnabled">Enable Premium Feature</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              When enabled, users can subscribe to premium for featured wishlists
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="premiumPrice">Premium Price</Label>
              <Input 
                id="premiumPrice" 
                type="number" 
                step="1" 
                value={premiumPrice} 
                onChange={(e) => setPremiumPrice(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="premiumCurrency">Currency</Label>
              <Select value={premiumCurrency} onValueChange={setPremiumCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={savePremium} className="w-full sm:w-auto">Save Premium Settings</Button>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Payments & Fees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Enable Paystack</Label>
            <div className="flex items-center gap-2">
              <Checkbox id="paystackEnabled" checked={paystackEnabled} onCheckedChange={(v) => setPaystackEnabled(Boolean(v))} />
              <Label htmlFor="paystackEnabled">Paystack enabled</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Enable Stripe</Label>
            <div className="flex items-center gap-2">
              <Checkbox id="stripeEnabled" checked={stripeEnabled} onCheckedChange={(v) => setStripeEnabled(Boolean(v))} />
              <Label htmlFor="stripeEnabled">Stripe enabled</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Allowed Methods</Label>
            <div className="flex flex-wrap gap-4">
              {[
                { key: "card", label: "Card" },
                { key: "bank_transfer", label: "Bank Transfer" },
                { key: "mobile_money", label: "Mobile Money" },
              ].map(opt => (
                <div key={opt.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`m-${opt.key}`}
                    checked={allowedMethods.includes(opt.key)}
                    onCheckedChange={(v) => toggleMethod(opt.key, Boolean(v))}
                  />
                  <Label htmlFor={`m-${opt.key}`}>{opt.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="feePercent">Platform Fee (%)</Label>
              <Input id="feePercent" type="number" step="0.01" value={platformFeePercent} onChange={(e) => setPlatformFeePercent(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeMin">Fee Min</Label>
              <Input id="feeMin" type="number" step="0.01" value={platformFeeMin} onChange={(e) => setPlatformFeeMin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeMax">Fee Max</Label>
              <Input id="feeMax" type="number" step="0.01" value={platformFeeMax} onChange={(e) => setPlatformFeeMax(e.target.value)} />
            </div>
          </div>

          <Button onClick={savePayments} className="w-full sm:w-auto">Save Payment Settings</Button>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox id="cashFundsEnabled" checked={cashFundsEnabled} onCheckedChange={(v) => setCashFundsEnabled(Boolean(v))} />
              <Label htmlFor="cashFundsEnabled">Enable Cash Funds</Label>
            </div>
            <p className="text-sm text-muted-foreground">Toggle the Cash Funds feature (flexible contributions) site-wide.</p>
            <Button onClick={saveFeatures} className="w-full sm:w-auto">Save Features</Button>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Settings */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>WhatsApp Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="whatsappEnabled" 
                checked={whatsappEnabled} 
                onCheckedChange={(v) => setWhatsappEnabled(Boolean(v))} 
              />
              <Label htmlFor="whatsappEnabled">Enable Floating WhatsApp Icon</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Enable a floating WhatsApp icon that appears on all pages
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappLink">WhatsApp Link</Label>
            <Input 
              id="whatsappLink" 
              type="text" 
              placeholder="https://wa.me/1234567890 or https://wa.me/1234567890?text=Hello"
              value={whatsappLink} 
              onChange={(e) => setWhatsappLink(e.target.value)}
              disabled={!whatsappEnabled}
            />
            <p className="text-xs text-muted-foreground">
              Enter a WhatsApp link. Example: https://wa.me/1234567890 (replace with your phone number)
            </p>
          </div>

          <Button onClick={saveWhatsApp} className="w-full sm:w-auto">Save WhatsApp Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
