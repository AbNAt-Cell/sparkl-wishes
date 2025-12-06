import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wallet as WalletIcon, ArrowDownToLine, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { CurrencySelector } from "@/components/CurrencySelector";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const Wallet = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  
  // Detect user's currency based on IP with manual override support
  const { currency: detectedCurrency, isAutoDetected, setCurrency: setUserCurrency, resetToAutoDetected } = useUserCurrency("USD");
  
  // Get currency conversion function
  const { convert: convertCurrency } = useCurrencyConversion();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setSession(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["user-wallet", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_wallets")
        .select("*")
        .eq("user_id", session!.user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        throw error;
      }
      return data;
    },
    enabled: !!session?.user?.id,
  });

  // Use wallet currency if set, otherwise use detected/selected currency
  const displayCurrency = wallet?.currency || detectedCurrency;
  
  // Convert wallet balance to display currency
  const walletCurrency = wallet?.currency || "USD";
  const convertedBalance = wallet ? convertCurrency(wallet.balance, walletCurrency, displayCurrency) : 0;

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["wallet-transactions", wallet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", wallet!.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!wallet?.id,
  });

  const { data: withdrawalRequests, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["withdrawal-requests", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
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

      if (!bankName || !accountNumber || !accountName) {
        throw new Error("Please fill in all bank details");
      }

      const { error } = await supabase.from("withdrawal_requests").insert({
        user_id: session!.user.id,
        wallet_id: wallet.id,
        amount,
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName,
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      toast.success("Withdrawal request submitted successfully");
      setWithdrawDialogOpen(false);
      setWithdrawAmount("");
      setBankName("");
      setAccountNumber("");
      setAccountName("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleWithdrawAll = () => {
    if (wallet) {
      setWithdrawAmount(wallet.balance.toString());
    }
  };

  if (walletLoading || !session) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">My Wallet</h1>
            <CurrencySelector
              value={detectedCurrency}
              onChange={setUserCurrency}
              isAutoDetected={isAutoDetected}
              onReset={resetToAutoDetected}
            />
          </div>

          {/* Wallet Balance Card */}
          <Card className="mb-8 border-primary/20 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <WalletIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Available Balance</CardTitle>
                    <CardDescription>Your current wallet balance</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold text-primary">
                    {formatCurrency(convertedBalance, displayCurrency, false)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {displayCurrency}
                    {wallet?.currency && wallet.currency !== displayCurrency && (
                      <span className="ml-2 text-xs">
                        (Original: {formatCurrency(wallet.balance, wallet.currency, false)})
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  onClick={() => setWithdrawDialogOpen(true)}
                  disabled={!wallet || wallet.balance <= 0}
                  className="gap-2"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  Request Withdrawal
                </Button>
              </div>
            </CardContent>
          </Card>

        {/* Withdrawal Requests */}
        {withdrawalRequests && withdrawalRequests.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
              <CardDescription>Track your withdrawal request status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {withdrawalRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold">
                          {formatCurrency(request.amount, wallet?.currency || detectedCurrency, false)}
                        </p>
                        <Badge className={statusColors[request.status as keyof typeof statusColors]}>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {request.bank_name} • {request.account_number}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requested {formatDate(request.created_at, "long")}
                      </p>
                      {request.admin_notes && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          Note: {request.admin_notes}
                        </p>
                      )}
                    </div>
                    {request.status === "pending" && <Clock className="w-5 h-5 text-yellow-600" />}
                    {request.status === "completed" && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {request.status === "rejected" && <XCircle className="w-5 h-5 text-red-600" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Your wallet activity</CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : transactions && transactions.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-sm">
                          {formatDate(transaction.created_at, "short")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{transaction.description || "Transaction"}</p>
                            {transaction.reference && (
                              <p className="text-xs text-muted-foreground">
                                Ref: {transaction.reference}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === "credit" ? "default" : "secondary"}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-semibold ${
                              transaction.type === "credit" ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {transaction.type === "credit" ? "+" : "-"}
                            {formatCurrency(transaction.amount, wallet?.currency || detectedCurrency, false)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <WalletIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Withdrawal</DialogTitle>
            <DialogDescription>
              Submit a withdrawal request. An admin will process your request and transfer funds to your
              account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <Button variant="outline" onClick={handleWithdrawAll} size="sm">
                  Max
                </Button>
              </div>
              {wallet && (
                <p className="text-xs text-muted-foreground">
                  Available: {formatCurrency(wallet.balance, wallet.currency || detectedCurrency, false)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank">Bank Name</Label>
              <Input
                id="bank"
                placeholder="Enter bank name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account">Account Number</Label>
              <Input
                id="account"
                placeholder="Enter account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                placeholder="Enter account name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => withdrawMutation.mutate()} disabled={withdrawMutation.isPending}>
              {withdrawMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default Wallet;
