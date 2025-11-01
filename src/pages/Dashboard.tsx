import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Calendar, Gift, Loader2, Trash2, Share2, Wallet, TrendingUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrencySymbol } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Dashboard = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [wishlistToDelete, setWishlistToDelete] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: wishlists, isLoading } = useQuery({
    queryKey: ["wishlists", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*, profiles(full_name)")
        .eq("user_id", session!.user.id)  // CRITICAL: Filter by current user
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  // Fetch wallet balance
  const { data: wallets } = useQuery({
    queryKey: ["user-wallets", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_wallets")
        .select("*")
        .eq("user_id", session!.user!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const handleDeleteClick = (wishlistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlistToDelete(wishlistId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!wishlistToDelete) return;

    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("id", wishlistToDelete)
      .eq("user_id", session!.user.id); // Ensure user owns this wishlist

    if (error) {
      toast.error("Failed to delete wishlist: " + error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["wishlists", session?.user?.id] });
      toast.success("Wishlist deleted successfully");
    }

    setDeleteDialogOpen(false);
    setWishlistToDelete(null);
  };

  const eventTypeColors = {
    wedding: "bg-primary/10 text-primary border-primary/20",
    birthday: "bg-secondary/10 text-secondary border-secondary/20",
    anniversary: "bg-accent/10 text-accent border-accent/20",
    baby_shower: "bg-pink-100 text-pink-700 border-pink-200",
    graduation: "bg-blue-100 text-blue-700 border-blue-200",
    other: "bg-muted text-muted-foreground border-muted",
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <Navbar user={session.user} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2">My Wishlists</h1>
                <p className="text-muted-foreground">Create and manage your celebration wishlists</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {wallets && wallets.length > 0 && wallets[0].balance > 0 && (
                  <Card 
                    className="cursor-pointer hover:shadow-elegant transition-all shadow-card lg:w-64"
                    onClick={() => navigate("/wallet")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Wallet Balance</p>
                          <p className="text-2xl font-bold text-primary">
                            {getCurrencySymbol(wallets[0].currency)}{wallets[0].balance.toFixed(2)}
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center shadow-glow">
                          <Wallet className="w-6 h-6 text-primary-foreground" />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                        <TrendingUp className="w-3 h-3" />
                        <span>Click to withdraw</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Button 
                  onClick={() => navigate("/create-wishlist")}
                  size="lg"
                  className="shadow-elegant"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Wishlist
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : wishlists && wishlists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlists.map((wishlist) => (
                  <Card
                    key={wishlist.id}
                    className="cursor-pointer hover:shadow-elegant transition-all duration-300 shadow-card group"
                    onClick={() => navigate(`/wishlist/${wishlist.id}`)}
                  >
                    {wishlist.cover_image && (
                      <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                        <img
                          src={wishlist.cover_image}
                          alt={wishlist.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <CardTitle className="group-hover:text-primary transition-colors">
                            {wishlist.title}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${
                              eventTypeColors[wishlist.event_type as keyof typeof eventTypeColors]
                            }`}
                          >
                            {wishlist.event_type.replace("_", " ")}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDeleteClick(wishlist.id, e)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {wishlist.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {wishlist.event_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(wishlist.event_date).toLocaleDateString()}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Share2 className="w-4 h-4" />
                          {wishlist.share_code}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12 shadow-card">
                <CardContent>
                  <div className="mx-auto w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center mb-4 shadow-glow">
                    <Gift className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No wishlists yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create your first wishlist to start sharing your celebration with loved ones
                  </p>
                  <Button 
                    onClick={() => navigate("/create-wishlist")}
                    size="lg"
                    className="shadow-elegant"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your First Wishlist
                  </Button>
                </CardContent>
              </Card>
            )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wishlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this wishlist? This action cannot be undone. 
              All items and claims associated with this wishlist will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
