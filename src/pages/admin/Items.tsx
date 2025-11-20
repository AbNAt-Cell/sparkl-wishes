import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const AdminItems: React.FC = () => {
  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*, wishlists(title, profiles(full_name))")
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Wishlist Items</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Wishlist</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Price Range</TableHead>
              <TableHead>Group Gift</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.wishlists?.title}</TableCell>
                <TableCell>{item.wishlists?.profiles?.full_name}</TableCell>
                <TableCell>
                  {item.price_min && item.price_max
                    ? `$${item.price_min} - $${item.price_max}`
                    : "-"}
                </TableCell>
                <TableCell>{item.allow_group_gifting ? "Yes" : "No"}</TableCell>
                <TableCell>{format(new Date(item.created_at), "PPP")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AdminItems;
