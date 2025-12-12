import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const Metric: React.FC<{ title: string; value: string | number; href: string }> = ({ title, value, href }) => (
  <Link to={href}>
    <Card className="shadow-card hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  </Link>
);

const AdminDashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const queries = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("wishlists").select("id", { count: "exact", head: true }),
        supabase.from("wishlist_items").select("id", { count: "exact", head: true }),
        supabase.from("claims").select("id", { count: "exact", head: true }),
        supabase.from("user_wallets").select("balance").eq("user_id", "00000000-0000-0000-0000-000000000000").single(),
      ]);

      return {
        users: queries[0].count ?? 0,
        wishlists: queries[1].count ?? 0,
        items: queries[2].count ?? 0,
        claims: queries[3].count ?? 0,
        adminWallet: queries[4].data?.balance ?? 0,
      };
    },
  });


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Metric title="Users" value={data?.users ?? 0} href="/admin/users" />
      <Metric title="Wishlists" value={data?.wishlists ?? 0} href="/admin/wishlists" />
      <Metric title="Items" value={data?.items ?? 0} href="/admin/items" />
      <Metric title="Claims" value={data?.claims ?? 0} href="/admin/claims" />
      <div className="lg:col-span-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Admin Wallet</h3>
            <p className="text-purple-100">Platform fees collected</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">${(data?.adminWallet ?? 0).toFixed(2)}</div>
            <p className="text-purple-100 text-sm">Total earnings</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


