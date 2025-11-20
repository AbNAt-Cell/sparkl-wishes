import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const AdminClaims: React.FC = () => {
  const { data: claims, isLoading } = useQuery({
    queryKey: ["admin-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("*, wishlist_items(name, wishlists(title, profiles(full_name)))")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Claims</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Wishlist</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Claimer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims?.map((claim) => (
              <TableRow key={claim.id}>
                <TableCell className="font-medium">{claim.wishlist_items?.name}</TableCell>
                <TableCell>{claim.wishlist_items?.wishlists?.title}</TableCell>
                <TableCell>{claim.wishlist_items?.wishlists?.profiles?.full_name}</TableCell>
                <TableCell>
                  {claim.is_anonymous ? "Anonymous" : claim.claimer_name || "-"}
                </TableCell>
                <TableCell>
                  {claim.contribution_amount ? `$${claim.contribution_amount}` : "-"}
                </TableCell>
                <TableCell>{getStatusBadge(claim.payment_status || "pending")}</TableCell>
                <TableCell>{format(new Date(claim.created_at), "PPP")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AdminClaims;
