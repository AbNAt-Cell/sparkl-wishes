import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, StarOff } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
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
  const queryClient = useQueryClient();

  const { data: wishlists, isLoading } = useQuery({
    queryKey: ["admin-wishlists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*, profiles(full_name, is_premium)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ wishlistId, isFeatured }: { wishlistId: string; isFeatured: boolean }) => {
      const { error } = await supabase
        .from("wishlists")
        .update({ is_featured: isFeatured })
        .eq("id", wishlistId);

      if (error) throw error;
    },
    onSuccess: (_, { isFeatured }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-wishlists"] });
      toast.success(isFeatured ? "Wishlist featured!" : "Wishlist unfeatured");
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const handleToggleFeatured = (wishlistId: string, currentStatus: boolean, isPremium: boolean) => {
    if (!currentStatus && !isPremium) {
      toast.error("Only premium users' wishlists can be featured");
      return;
    }
    toggleFeaturedMutation.mutate({ wishlistId, isFeatured: !currentStatus });
  };

  const totalPages = Math.ceil((wishlists?.length || 0) / itemsPerPage);
  const paginatedWishlists = wishlists?.slice((page - 1) * itemsPerPage, page * itemsPerPage);


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
              <TableHead>Premium</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Event Date</TableHead>
              <TableHead>Public</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedWishlists?.map((wishlist) => {
              const isPremium = (wishlist.profiles as any)?.is_premium || false;
              return (
                <TableRow key={wishlist.id}>
                  <TableCell className="font-medium">{wishlist.title}</TableCell>
                  <TableCell>{(wishlist.profiles as any)?.full_name}</TableCell>
                  <TableCell>
                    {isPremium ? (
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">Premium</Badge>
                    ) : (
                      <Badge variant="secondary">Free</Badge>
                    )}
                  </TableCell>
                  <TableCell>{wishlist.event_type}</TableCell>
                  <TableCell>
                    {wishlist.event_date ? format(new Date(wishlist.event_date), "PPP") : "-"}
                  </TableCell>
                  <TableCell>{wishlist.is_public ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    {wishlist.is_featured ? (
                      <Badge className="bg-yellow-500 text-white">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        Featured
                      </Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(wishlist.created_at), "PPP")}</TableCell>
                  <TableCell>
                    <Button
                      variant={wishlist.is_featured ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleToggleFeatured(wishlist.id, wishlist.is_featured || false, isPremium)}
                      disabled={toggleFeaturedMutation.isPending}
                    >
                      {wishlist.is_featured ? (
                        <>
                          <StarOff className="w-4 h-4 mr-1" />
                          Unfeature
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4 mr-1" />
                          Feature
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
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
