import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search } from "lucide-react";

const AdminUsers: React.FC = () => {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data as Array<{ id: string; full_name: string | null; avatar_url: string | null }>;
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
          <span className="text-xs text-muted-foreground">{filtered.length} result(s)</span>
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
                {/* Future: actions (ban/unban, reset, etc.) behind admin functions */}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminUsers;


