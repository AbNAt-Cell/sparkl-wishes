import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const AdminWithdrawals: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | "complete" | null>(null);

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*, user_wallets(currency)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get user names separately
      const userIds = data.map(w => w.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      return data.map(w => ({
        ...w,
        profiles: profiles?.find(p => p.id === w.user_id) || null
      }));
    },
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ requestId, status, notes }: { requestId: string; status: string; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: {
          action: "update_withdrawal_status",
          payload: { requestId, status, adminNotes: notes },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast.success("Withdrawal request updated successfully");
      setActionDialogOpen(false);
      setSelectedRequest(null);
      setAdminNotes("");
      setActionType(null);
    },
    onError: (error) => {
      toast.error(`Failed to update withdrawal: ${error.message}`);
    },
  });

  const filteredWithdrawals = withdrawals?.filter((withdrawal) => {
    if (filter === "all") return true;
    return withdrawal.status === filter;
  });

  const totalPages = Math.ceil((filteredWithdrawals?.length || 0) / itemsPerPage);
  const paginatedWithdrawals = filteredWithdrawals?.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleAction = (request: any, type: "approve" | "reject" | "complete") => {
    setSelectedRequest(request);
    setActionType(type);
    setActionDialogOpen(true);
  };

  const confirmAction = () => {
    if (!selectedRequest || !actionType) return;

    const statusMap = {
      approve: "approved",
      reject: "rejected",
      complete: "completed",
    };

    updateWithdrawalMutation.mutate({
      requestId: selectedRequest.id,
      status: statusMap[actionType],
      notes: adminNotes || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "approved":
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Withdrawal Requests</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedWithdrawals?.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="font-medium">
                      {withdrawal.profiles?.full_name || "Unknown"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(withdrawal.amount, withdrawal.user_wallets?.currency || "USD", false)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{withdrawal.bank_name}</p>
                        <p className="text-muted-foreground">{withdrawal.account_number}</p>
                        <p className="text-muted-foreground">{withdrawal.account_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[withdrawal.status as keyof typeof statusColors]}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(withdrawal.status)}
                          {withdrawal.status}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(withdrawal.created_at), "PPp")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                      {withdrawal.admin_notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {withdrawal.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(withdrawal, "approve")}
                              disabled={updateWithdrawalMutation.isPending}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAction(withdrawal, "reject")}
                              disabled={updateWithdrawalMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {withdrawal.status === "approved" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleAction(withdrawal, "complete")}
                            disabled={updateWithdrawalMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Mark Completed
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedWithdrawals?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No withdrawal requests found
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

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Approve Withdrawal"}
              {actionType === "reject" && "Reject Withdrawal"}
              {actionType === "complete" && "Complete Withdrawal"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" && "Approve this withdrawal request. You'll need to manually transfer funds."}
              {actionType === "reject" && "Reject this withdrawal request with a reason."}
              {actionType === "complete" && "Mark this withdrawal as completed after transferring funds."}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4">
              <div className="mb-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Withdrawal Details:</p>
                <p className="text-sm">Amount: {formatCurrency(selectedRequest.amount, selectedRequest.user_wallets?.currency || "USD", false)}</p>
                <p className="text-sm">Bank: {selectedRequest.bank_name}</p>
                <p className="text-sm">Account: {selectedRequest.account_number}</p>
                <p className="text-sm">Name: {selectedRequest.account_name}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes for the user..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={updateWithdrawalMutation.isPending}
              variant={actionType === "reject" ? "destructive" : "default"}
            >
              {updateWithdrawalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminWithdrawals;
