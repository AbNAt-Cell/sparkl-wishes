import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Wallet as WalletIcon, TrendingUp, TrendingDown, Download, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCurrencySymbol } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Wallet = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    accountNumber: "",
    accountName: "",
    bankCode: "",
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch wallet data
  const { data: wallets, isLoading: walletsLoading, refetch: refetchWallets } = useQuery({
    queryKey: ["user-wallets", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_wallets")
        .select("*")
        .eq("user_id", session!.user!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["wallet-transactions", session?.user?.id],
    queryFn: async () => {
      if (!wallets || wallets.length === 0) return [];
      
      const walletIds = wallets.map(w => w.id);
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .in("wallet_id", walletIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!wallets && wallets.length > 0,
  });

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsWithdrawing(true);

    try {
      const amount = parseFloat(withdrawForm.amount);
      const primaryWallet = wallets?.[0];

      if (!primaryWallet) {
        throw new Error("No wallet found");
      }

      if (amount > primaryWallet.balance) {
        throw new Error("Insufficient funds");
      }

      if (amount < 100) {
        throw new Error("Minimum withdrawal amount is 100");
      }

      // In a real implementation, you would:
      // 1. Call Paystack Transfer API via your backend
      // 2. Verify the transfer
      // 3. Update the wallet balance and create transaction

      // For now, we'll simulate the withdrawal
      toast.info("Withdrawal request submitted. Processing via Paystack...");

      // Create a withdrawal transaction record
      const { error: txError } = await supabase
        .from("wallet_transactions")
        .insert({
          wallet_id: primaryWallet.id,
          type: "debit",
          amount: amount,
          status: "pending",
          reference: `withdrawal_${Date.now()}`,
          description: `Withdrawal to ${withdrawForm.accountNumber}`,
        });

      if (txError) throw txError;

      // Update wallet balance
      const { error: balanceError } = await supabase
        .from("user_wallets")
        .update({
          balance: primaryWallet.balance - amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", primaryWallet.id);

      if (balanceError) throw balanceError;

      toast.success("Withdrawal initiated! Funds will arrive in 1-2 business days.");
      setWithdrawDialogOpen(false);
      setWithdrawForm({
        amount: "",
        accountNumber: "",
        accountName: "",
        bankCode: "",
      });
      refetchWallets();
    } catch (error: any) {
      toast.error(error.message || "Withdrawal failed");
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!session) return null;

  const primaryWallet = wallets?.[0];
  const totalBalance = wallets?.reduce((sum, wallet) => sum + wallet.balance, 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <Navbar user={session.user} />
      
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="space-y-8">
          {/* Wallet Balance Card */}
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center shadow-glow">
                      <WalletIcon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    My Wallet
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Track your wishlist earnings and withdraw funds
                  </CardDescription>
                </div>
                {primaryWallet && primaryWallet.balance > 0 && (
                  <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="shadow-elegant">
                        <Download className="w-4 h-4 mr-2" />
                        Withdraw
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Withdraw Funds</DialogTitle>
                        <DialogDescription>
                          Enter your bank details to withdraw funds via Paystack
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleWithdraw} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Amount *</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="100"
                            max={primaryWallet.balance}
                            value={withdrawForm.amount}
                            onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                            required
                            placeholder="Minimum: 100"
                          />
                          <p className="text-xs text-muted-foreground">
                            Available: {getCurrencySymbol(primaryWallet.currency)}{primaryWallet.balance.toFixed(2)}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bank">Bank *</Label>
                          <Select
                            value={withdrawForm.bankCode}
                            onValueChange={(value) => setWithdrawForm({ ...withdrawForm, bankCode: value })}
                            required
                          >
                            <SelectTrigger id="bank">
                              <SelectValue placeholder="Select your bank" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="044">Access Bank</SelectItem>
                              <SelectItem value="063">Diamond Bank</SelectItem>
                              <SelectItem value="050">EcoBank</SelectItem>
                              <SelectItem value="070">Fidelity Bank</SelectItem>
                              <SelectItem value="011">First Bank</SelectItem>
                              <SelectItem value="058">GTBank</SelectItem>
                              <SelectItem value="030">Heritage Bank</SelectItem>
                              <SelectItem value="301">Jaiz Bank</SelectItem>
                              <SelectItem value="082">Keystone Bank</SelectItem>
                              <SelectItem value="221">Stanbic IBTC Bank</SelectItem>
                              <SelectItem value="068">Standard Chartered Bank</SelectItem>
                              <SelectItem value="232">Sterling Bank</SelectItem>
                              <SelectItem value="033">United Bank for Africa</SelectItem>
                              <SelectItem value="032">Union Bank</SelectItem>
                              <SelectItem value="035">Wema Bank</SelectItem>
                              <SelectItem value="057">Zenith Bank</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accountNumber">Account Number *</Label>
                          <Input
                            id="accountNumber"
                            type="text"
                            pattern="[0-9]{10}"
                            maxLength={10}
                            value={withdrawForm.accountNumber}
                            onChange={(e) => setWithdrawForm({ ...withdrawForm, accountNumber: e.target.value })}
                            required
                            placeholder="10-digit account number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accountName">Account Name *</Label>
                          <Input
                            id="accountName"
                            type="text"
                            value={withdrawForm.accountName}
                            onChange={(e) => setWithdrawForm({ ...withdrawForm, accountName: e.target.value })}
                            required
                            placeholder="As shown on your bank statement"
                          />
                        </div>
                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                          <p className="text-sm text-amber-800">
                            ⚠️ Please ensure your bank details are correct. Transfers to wrong accounts cannot be reversed.
                          </p>
                        </div>
                        <Button type="submit" className="w-full" disabled={isWithdrawing}>
                          {isWithdrawing ? "Processing..." : `Withdraw ${withdrawForm.amount ? getCurrencySymbol(primaryWallet.currency) + withdrawForm.amount : ""}`}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {walletsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : wallets && wallets.length > 0 ? (
                <div className="space-y-6">
                  {wallets.map((wallet) => (
                    <div key={wallet.id} className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                      <div className="flex items-baseline gap-2 mb-2">
                        <h3 className="text-4xl font-bold text-primary">
                          {getCurrencySymbol(wallet.currency)}{wallet.balance.toFixed(2)}
                        </h3>
                        <span className="text-sm text-muted-foreground">{wallet.currency}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Available Balance
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No wallet yet. Create a wishlist to start receiving payments!
                  </p>
                  <Button onClick={() => navigate("/create-wishlist")}>
                    Create Wishlist
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transactions */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All your wallet transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : transactions && transactions.length > 0 ? (
                <div className="space-y-2">
                  {transactions.map((tx) => {
                    const wallet = wallets?.find(w => w.id === tx.wallet_id);
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {tx.type === 'credit' ? (
                              <TrendingUp className="w-5 h-5 text-green-600" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{tx.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(tx.created_at).toLocaleString()}
                            </p>
                            {tx.reference && (
                              <p className="text-xs text-muted-foreground">
                                Ref: {tx.reference}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${
                            tx.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {tx.type === 'credit' ? '+' : '-'}{getCurrencySymbol(wallet?.currency || 'USD')}{tx.amount.toFixed(2)}
                          </p>
                          <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Wallet;

