import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet as WalletIcon, ArrowDownToLine, Loader2 } from "lucide-react";
import { getCurrencySymbol } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface WalletProps {
  userId: string;
}

export const Wallet = ({ userId }: WalletProps) => {
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankDetails, setBankDetails] = useState({
    accountNumber: "",
    bankCode: "",
    accountName: "",
  });
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_wallets")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code === "PGRST116") {
        // Wallet doesn't exist, create one
        const { data: newWallet, error: createError } = await supabase
          .from("user_wallets")
          .insert({ user_id: userId, balance: 0, currency: "USD" })
          .select()
          .single();
        
        if (createError) throw createError;
        return newWallet;
      }
      
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["wallet-transactions", wallet?.id],
    queryFn: async () => {
      if (!wallet?.id) return [];
      
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!wallet?.id,
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(withdrawAmount);
      if (!amount || amount <= 0) {
        throw new Error("Please enter a valid amount");
      }
      if (!wallet || amount > wallet.balance) {
        throw new Error("Insufficient balance");
      }

      const { data, error } = await supabase.functions.invoke("paystack-withdraw", {
        body: {
          amount,
          accountNumber: bankDetails.accountNumber,
          bankCode: bankDetails.bankCode,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Withdrawal initiated successfully!");
      setWithdrawAmount("");
      setBankDetails({ accountNumber: "", bankCode: "", accountName: "" });
      setWithdrawDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["wallet", userId] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions", wallet?.id] });
    },
    onError: (error: any) => {
      toast.error("Withdrawal failed: " + error.message);
    },
  });

  if (walletLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <WalletIcon className="w-5 h-5" />
                My Wallet
              </CardTitle>
              <CardDescription>Manage your balance and withdrawals</CardDescription>
            </div>
            <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!wallet || wallet.balance <= 0}>
                  <ArrowDownToLine className="w-4 h-4 mr-2" />
                  Withdraw
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Withdraw Funds</DialogTitle>
                  <DialogDescription>
                    Withdraw your balance to your bank account using Paystack
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="Enter amount"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Available: {getCurrencySymbol(wallet?.currency || "USD")} {wallet?.balance.toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      placeholder="1234567890"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankCode">Bank Code</Label>
                    <Input
                      id="bankCode"
                      placeholder="e.g., 058 for GTBank"
                      value={bankDetails.bankCode}
                      onChange={(e) => setBankDetails({ ...bankDetails, bankCode: e.target.value })}
                    />
                  </div>
                  <Button 
                    onClick={() => withdrawMutation.mutate()} 
                    className="w-full"
                    disabled={withdrawMutation.isPending}
                  >
                    {withdrawMutation.isPending ? "Processing..." : "Confirm Withdrawal"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
            <p className="text-4xl font-bold text-primary">
              {getCurrencySymbol(wallet?.currency || "USD")} {wallet?.balance.toFixed(2) || "0.00"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest wallet activity</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : transactions && transactions.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{transaction.description || "Transaction"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()} at{" "}
                        {new Date(transaction.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        transaction.type === "credit" ? "text-green-600" : "text-red-600"
                      }`}>
                        {transaction.type === "credit" ? "+" : "-"}
                        {getCurrencySymbol(wallet?.currency || "USD")} {Math.abs(transaction.amount).toFixed(2)}
                      </p>
                      <Badge variant={
                        transaction.status === "completed" ? "default" : 
                        transaction.status === "pending" ? "secondary" : "destructive"
                      }>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">No transactions yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
