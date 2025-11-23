import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const AdminWishlists: React.FC = () => {
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

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

  const totalPages = Math.ceil((wishlists?.length || 0) / itemsPerPage);
  const paginatedWishlists = wishlists?.slice((page - 1) * itemsPerPage, page * itemsPerPage);

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
            {paginatedWishlists?.map((wishlist) => (
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

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <PaginationItem key={p}>
                    <PaginationLink
                      onClick={() => setPage(p)}
                      isActive={page === p}
                      className="cursor-pointer"
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminWishlists;
