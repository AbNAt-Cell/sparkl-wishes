import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, TrendingUp, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";

interface AdminWalletData {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: "credit" | "debit";
  status: string;
  reference: string;
  description: string;
  created_at: string;
}

const AdminWalletPage: React.FC = () => {
  const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000000";

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["admin-wallet"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_wallets")
        .select("*")
        .eq("user_id", ADMIN_USER_ID)
        .single();

      if (error && error.code === "PGRST116") {
        // No wallet found, return default
        return null;
      }
      if (error) throw error;
      return data as AdminWalletData;
    },
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["admin-wallet-transactions", wallet?.id],
    queryFn: async () => {
      if (!wallet?.id) return [];
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as WalletTransaction[];
    },
    enabled: !!wallet?.id,
  });

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <Card className="border-dashed">
        <CardContent className="text-center py-12">
          <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Wallet Found</h3>
          <p className="text-sm text-muted-foreground">
            The admin wallet has not been created yet. It will be automatically created when the first platform fee is collected.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalCredits = transactions
    ?.filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0) || 0;

  const totalDebits = transactions
    ?.filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Platform Wallet</CardTitle>
              <CardDescription>All platform fees and income</CardDescription>
            </div>
            <div className="p-3 bg-white rounded-full shadow-md">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
              <p className="text-3xl font-bold text-purple-600">
                {formatCurrency(wallet.balance, wallet.currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Last updated: {formatDate(wallet.updated_at, "short")}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Total Credits
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalCredits, wallet.currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {transactions?.filter((t) => t.type === "credit").length || 0} transactions
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <Activity className="w-4 h-4 text-orange-600" />
                Total Debits
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(totalDebits, wallet.currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {transactions?.filter((t) => t.type === "debit").length || 0} transactions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Platform wallet activity</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading transactions...</p>
              </div>
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-start justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{transaction.description}</p>
                      <Badge
                        variant="outline"
                        className={
                          transaction.type === "credit"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-orange-50 text-orange-700 border-orange-200"
                        }
                      >
                        {transaction.type === "credit" ? "+" : "-"}
                        {formatCurrency(transaction.amount, wallet.currency)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Ref: {transaction.reference}</span>
                      <span>•</span>
                      <span>{formatDate(transaction.created_at, "short")}</span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      transaction.status === "completed"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                    }
                  >
                    {transaction.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWalletPage;
