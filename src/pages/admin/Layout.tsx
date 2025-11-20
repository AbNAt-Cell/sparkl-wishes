import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Shield, Users, LayoutDashboard, Settings, Gift, Package, HandHeart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <Navbar user={userId ? { id: userId } : null} />
      <main className="container mx-auto safe-container py-6 max-w-7xl">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">Admin</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-6 text-sm">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md border ${isActive ? "bg-primary text-primary-foreground" : "bg-card"}`
            }
          >
            <span className="inline-flex items-center gap-2"><LayoutDashboard className="w-4 h-4" /> Dashboard</span>
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md border ${isActive ? "bg-primary text-primary-foreground" : "bg-card"}`
            }
          >
            <span className="inline-flex items-center gap-2"><Users className="w-4 h-4" /> Users</span>
          </NavLink>
          <NavLink
            to="/admin/wishlists"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md border ${isActive ? "bg-primary text-primary-foreground" : "bg-card"}`
            }
          >
            <span className="inline-flex items-center gap-2"><Gift className="w-4 h-4" /> Wishlists</span>
          </NavLink>
          <NavLink
            to="/admin/items"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md border ${isActive ? "bg-primary text-primary-foreground" : "bg-card"}`
            }
          >
            <span className="inline-flex items-center gap-2"><Package className="w-4 h-4" /> Items</span>
          </NavLink>
          <NavLink
            to="/admin/claims"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md border ${isActive ? "bg-primary text-primary-foreground" : "bg-card"}`
            }
          >
            <span className="inline-flex items-center gap-2"><HandHeart className="w-4 h-4" /> Claims</span>
          </NavLink>
          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md border ${isActive ? "bg-primary text-primary-foreground" : "bg-card"}`
            }
          >
            <span className="inline-flex items-center gap-2"><Settings className="w-4 h-4" /> Settings</span>
          </NavLink>
        </div>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default AdminLayout;


