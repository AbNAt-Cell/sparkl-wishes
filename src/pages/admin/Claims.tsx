import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminClaims: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const { data: claims, isLoading } = useQuery({
    queryKey: ["admin-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("*, wishlist_items(name, wishlists(title, currency, profiles(full_name)))")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ claimId, paymentReference }: { claimId: string; paymentReference: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: {
          action: "verify_payment",
          payload: { claimId, paymentReference },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-claims"] });
      toast.success("Payment verified and claim completed");
    },
    onError: (error) => {
      toast.error(`Failed to verify payment: ${error.message}`);
    },
  });

  const deleteClaimMutation = useMutation({
    mutationFn: async (claimId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: {
          action: "delete_claim",
          payload: { claimId },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-claims"] });
      toast.success("Claim deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedClaimId(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete claim: ${error.message}`);
    },
  });

  const filteredClaims = claims?.filter((claim) => {
    if (filter === "all") return true;
    if (filter === "pending") return claim.payment_status === "pending";
    if (filter === "expired") {
      return claim.payment_status === "pending" && claim.expires_at && new Date(claim.expires_at) < new Date();
    }
    if (filter === "completed") return claim.payment_status === "completed";
    if (filter === "failed") return claim.payment_status === "failed";
    return true;
  });

  const totalPages = Math.ceil((filteredClaims?.length || 0) / itemsPerPage);
  const paginatedClaims = filteredClaims?.slice((page - 1) * itemsPerPage, page * itemsPerPage);


  const handleVerifyPayment = (claimId: string, paymentReference: string) => {
    if (!paymentReference) {
      toast.error("No payment reference found for this claim");
      return;
    }
    verifyPaymentMutation.mutate({ claimId, paymentReference });
  };

  const handleDelete = (claimId: string) => {
    setSelectedClaimId(claimId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedClaimId) {
      deleteClaimMutation.mutate(selectedClaimId);
    }
  };


  const getStatusBadge = (claim: any) => {
    const isExpired = claim.expires_at && new Date(claim.expires_at) < new Date() && claim.payment_status === "pending";
    
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }

    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
    };
    return <Badge variant={variants[claim.payment_status] || "outline"}>{claim.payment_status}</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Claims Management</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Claims</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
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
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClaims?.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-medium">{claim.wishlist_items?.name}</TableCell>
                    <TableCell>{claim.wishlist_items?.wishlists?.title}</TableCell>
                    <TableCell>{claim.wishlist_items?.wishlists?.profiles?.full_name}</TableCell>
                    <TableCell>
                      {claim.is_anonymous ? "Anonymous" : claim.claimer_name || "-"}
                    </TableCell>
                    <TableCell>
                      {claim.contribution_amount 
                        ? formatCurrency(claim.contribution_amount, claim.wishlist_items?.wishlists?.currency || "USD", false)
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(claim)}</TableCell>
                    <TableCell>{format(new Date(claim.created_at), "PPp")}</TableCell>
                    <TableCell>
                      {claim.expires_at ? format(new Date(claim.expires_at), "PPp") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {claim.payment_status === "pending" && claim.payment_reference && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleVerifyPayment(claim.id, claim.payment_reference)}
                            disabled={verifyPaymentMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Verify Payment
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(claim.id)}
                          disabled={deleteClaimMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedClaims?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No claims found
                    </TableCell>
                  </TableRow>
                )}
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
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Claim</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this claim? This action cannot be undone and will make the item available again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminClaims;
