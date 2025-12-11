import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Gift, LogOut, User, Wallet, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  user?: { id: string } | null;
}

const Navbar = ({ user }: NavbarProps) => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        const role = session?.user?.app_metadata?.role;
        setIsAdmin(role === "admin");
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  return (
    <nav className="border-b border-border/50 bg-card/80 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto safe-container h-16 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center shadow-glow">
            <Gift className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="bg-gradient-hero bg-clip-text text-transparent">
            Sparkl Wishes
          </span>
        </button>

        <div className="flex items-center gap-2 sm:gap-4">
          {user && isAdmin && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/admin")}
              className="hidden md:flex items-center gap-2"
            >
              Admin
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/how-it-works")}
            className="hidden md:flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            How It Works
          </Button>
          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/wallet") }>
                  <Wallet className="w-4 h-4 mr-2" />
                  Wallet
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
