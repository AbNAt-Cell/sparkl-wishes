import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, ShieldCheck, ShieldX, Upload, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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

const AdminUsers: React.FC = () => {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: string; currentValue: boolean } | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, is_admin, is_banned")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data as Array<{ id: string; full_name: string | null; avatar_url: string | null; is_admin?: boolean; is_banned?: boolean }>;
    },
  });

  const userActionMutation = useMutation({
    mutationFn: async ({ userId, isAdmin, isBanned }: { userId: string; isAdmin?: boolean; isBanned?: boolean }) => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: { action: "set_user_flags", payload: { userId, isAdmin, isBanned } },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      const action = variables.isAdmin !== undefined 
        ? (variables.isAdmin ? "promoted" : "demoted")
        : (variables.isBanned ? "banned" : "unbanned");
      toast.success(`User ${action} successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to update user: ${(error as Error).message}`);
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-actions", {
        body: { action: "export_users_csv" },
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (data) => {
      const blob = new Blob([data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "users.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Users exported successfully");
    },
    onError: (error) => {
      toast.error(`Failed to export: ${(error as Error).message}`);
    },
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(u => (u.full_name ?? "").toLowerCase().includes(term) || u.id.startsWith(term));
  }, [data, q]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedUsers = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleAction = (userId: string, action: "promote" | "demote" | "ban" | "unban", currentValue: boolean) => {
    setConfirmAction({ userId, action, currentValue });
  };

  const confirmUserAction = () => {
    if (!confirmAction) return;
    
    const { userId, action } = confirmAction;
    
    if (action === "promote" || action === "demote") {
      userActionMutation.mutate({ userId, isAdmin: action === "promote" });
    } else {
      userActionMutation.mutate({ userId, isBanned: action === "ban" });
    }
    
    setConfirmAction(null);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Users</span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Export CSV
            </Button>
            <span className="text-xs text-muted-foreground">{filtered.length} result(s)</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or user id"
          />
        </div>

        {isLoading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="divide-y">
              {paginatedUsers.map(user => (
                <div key={user.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={user.avatar_url || "https://placehold.co/40x40?text=%F0%9F%91%A4"}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate max-w-[220px] sm:max-w-[340px]">
                        {user.full_name || "Unnamed"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[240px]">{user.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={user.is_admin ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleAction(user.id, user.is_admin ? "demote" : "promote", user.is_admin || false)}
                      disabled={userActionMutation.isPending}
                    >
                      {user.is_admin ? <ShieldX className="w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                      {user.is_admin ? "Demote" : "Promote"}
                    </Button>
                    <Button
                      variant={user.is_banned ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleAction(user.id, user.is_banned ? "unban" : "ban", user.is_banned || false)}
                      disabled={userActionMutation.isPending}
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      {user.is_banned ? "Unban" : "Ban"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

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
          </>
        )}
      </CardContent>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "ban" && "Are you sure you want to ban this user? They will no longer be able to access the platform."}
              {confirmAction?.action === "unban" && "Are you sure you want to unban this user? They will regain access to the platform."}
              {confirmAction?.action === "promote" && "Are you sure you want to promote this user to admin? They will have full administrative privileges."}
              {confirmAction?.action === "demote" && "Are you sure you want to remove admin privileges from this user?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUserAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AdminUsers;


