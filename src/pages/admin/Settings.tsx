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

const AdminSettings: React.FC = () => {
  const { data, isLoading } = useAppSettings();
  const [paystackEnabled, setPaystackEnabled] = useState(true);
  const [allowedMethods, setAllowedMethods] = useState<string[]>([]);
  const [platformFeePercent, setPlatformFeePercent] = useState("0.05");
  const [platformFeeMin, setPlatformFeeMin] = useState("0");
  const [platformFeeMax, setPlatformFeeMax] = useState("100");

  useEffect(() => {
    if (!data) return;
    setPaystackEnabled(data.payments.paystackEnabled);
    setAllowedMethods(data.payments.allowedMethods);
    setPlatformFeePercent(String(data.payments.platformFeePercent));
    setPlatformFeeMin(String(data.payments.platformFeeMin));
    setPlatformFeeMax(String(data.payments.platformFeeMax));
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="py-12 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const toggleMethod = (m: string, checked: boolean) => {
    setAllowedMethods(prev => checked ? Array.from(new Set([...prev, m])) : prev.filter(x => x !== m));
  };

  const save = async () => {
    const payload = {
      paystackEnabled,
      allowedMethods,
      platformFeePercent: parseFloat(platformFeePercent || "0"),
      platformFeeMin: parseFloat(platformFeeMin || "0"),
      platformFeeMax: parseFloat(platformFeeMax || "0"),
    };
    const { error } = await supabase.functions.invoke("admin-actions", {
      body: { action: "update_setting", payload: { key: "payments", value: payload } },
    });
    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved");
    }
  };

  return (
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

        <Button onClick={save} className="w-full sm:w-auto">Save Changes</Button>
      </CardContent>
    </Card>
  );
};

export default AdminSettings;


