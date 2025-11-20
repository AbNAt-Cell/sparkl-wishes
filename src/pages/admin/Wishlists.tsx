import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const AdminWishlists: React.FC = () => {
  const { data: wishlists, isLoading } = useQuery({
    queryKey: ["admin-wishlists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*, profiles(full_name)")
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
        <CardTitle>All Wishlists</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Event Date</TableHead>
              <TableHead>Public</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {wishlists?.map((wishlist) => (
              <TableRow key={wishlist.id}>
                <TableCell className="font-medium">{wishlist.title}</TableCell>
                <TableCell>{wishlist.profiles?.full_name}</TableCell>
                <TableCell>{wishlist.event_type}</TableCell>
                <TableCell>
                  {wishlist.event_date ? format(new Date(wishlist.event_date), "PPP") : "-"}
                </TableCell>
                <TableCell>{wishlist.is_public ? "Yes" : "No"}</TableCell>
                <TableCell>{format(new Date(wishlist.created_at), "PPP")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AdminWishlists;
