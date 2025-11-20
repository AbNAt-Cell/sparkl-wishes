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
      ]);

      return {
        users: queries[0].count ?? 0,
        wishlists: queries[1].count ?? 0,
        items: queries[2].count ?? 0,
        claims: queries[3].count ?? 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Metric title="Users" value={data?.users ?? 0} href="/admin/users" />
      <Metric title="Wishlists" value={data?.wishlists ?? 0} href="/admin/wishlists" />
      <Metric title="Items" value={data?.items ?? 0} href="/admin/items" />
      <Metric title="Claims" value={data?.claims ?? 0} href="/admin/claims" />
    </div>
  );
};

export default AdminDashboard;


