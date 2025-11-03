import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, ShieldCheck, ShieldX, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminUsers: React.FC = () => {
  const [q, setQ] = useState("");
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

  const filtered = useMemo(() => {
    const list = data ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(u => (u.full_name ?? "").toLowerCase().includes(term) || u.id.startsWith(term));
  }, [data, q]);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Users</span>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { data, error } = await supabase.functions.invoke("admin-actions", {
                  body: { action: "export_users_csv" },
                });
                if (error) return;
                const blob = new Blob([data as unknown as string], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "users.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Upload className="w-4 h-4 mr-2" /> Export CSV
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
          <div className="divide-y">
            {filtered.map(user => (
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
                    onClick={async () => {
                      await supabase.functions.invoke("admin-actions", {
                        body: { action: "set_user_flags", payload: { userId: user.id, isAdmin: !user.is_admin } },
                      });
                      await supabase.removeAllChannels();
                      location.reload();
                    }}
                  >
                    {user.is_admin ? <ShieldX className="w-4 h-4 mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                    {user.is_admin ? "Demote" : "Promote"}
                  </Button>
                  <Button
                    variant={user.is_banned ? "destructive" : "outline"}
                    size="sm"
                    onClick={async () => {
                      await supabase.functions.invoke("admin-actions", {
                        body: { action: "set_user_flags", payload: { userId: user.id, isBanned: !user.is_banned } },
                      });
                      await supabase.removeAllChannels();
                      location.reload();
                    }}
                  >
                    {user.is_banned ? "Unban" : "Ban"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminUsers;


