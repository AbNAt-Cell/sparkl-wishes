import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const AdminItems: React.FC = () => {
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*, wishlists(title, currency, profiles(full_name))")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const totalPages = Math.ceil((items?.length || 0) / itemsPerPage);
  const paginatedItems = items?.slice((page - 1) * itemsPerPage, page * itemsPerPage);


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
              <TableHead>Product Link</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.wishlists?.title}</TableCell>
                <TableCell>{item.wishlists?.profiles?.full_name}</TableCell>
                <TableCell>
                  {item.price_min && item.price_max
                    ? `${formatCurrency(item.price_min, item.wishlists?.currency || "USD", false)} - ${formatCurrency(item.price_max, item.wishlists?.currency || "USD", false)}`
                    : "-"}
                </TableCell>
                <TableCell>{item.allow_group_gifting ? "Yes" : "No"}</TableCell>
                <TableCell>
                  {item.external_link ? (
                    <div className="flex items-center justify-end gap-2">
                      <a href={item.external_link} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        View
                      </a>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(item.external_link);
                            // optional feedback
                          } catch {
                            // ignore
                          }
                        }}
                        className="h-8 w-8"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{format(new Date(item.created_at), "PPP")}</TableCell>
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

export default AdminItems;
