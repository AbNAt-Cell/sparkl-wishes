import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Calendar, Gift, Loader2, Trash2, Share2, Wallet, TrendingUp, HelpCircle, Eye, Copy, ExternalLink, BarChart3 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, getCurrencySymbol } from "@/lib/utils";
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

  // Calculate stats
  const totalWishlists = wishlists?.length || 0;
  const totalBalance = wallets?.[0]?.balance || 0;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <Navbar user={session.user} />
        
        <main className="container mx-auto px-4 lg:px-6 py-6">
          <div className="space-y-6">
            {/* Header Section with Stats */}
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">My Wishlists</h1>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="w-5 h-5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Create wishlists for special occasions and share them with friends and family. They can claim items and make payments directly!</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-base text-muted-foreground">Manage your celebration wishlists and track gifts</p>
                </div>
                <Button 
                  onClick={() => navigate("/create-wishlist")}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all text-base font-medium px-6"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Wishlist
                </Button>
              </div>

              {/* Quick Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-md bg-white">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Total Wishlists</p>
                        <p className="text-3xl font-bold text-gray-900">{totalWishlists}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <Gift className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {wallets && wallets.length > 0 && (
                  <Card 
                    className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50 cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate("/wallet")}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-muted-foreground">Wallet Balance</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm">Funds from claimed items. Click to withdraw!</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-3xl font-bold text-green-700">
                            {formatCurrency(totalBalance, wallets[0].currency)}
                          </p>
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Click to withdraw
                          </p>
                        </div>
                        <Wallet className="w-10 h-10 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-0 shadow-md bg-white">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Quick Actions</p>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" onClick={() => navigate("/profile")}>
                            <BarChart3 className="w-4 h-4 mr-1" />
                            Profile
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Wishlists Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-gray-900">Your Wishlists</h2>
                {wishlists && wishlists.length > 0 && (
                  <Badge variant="secondary" className="text-sm font-medium px-3 py-1">
                    {wishlists.length} wishlist{wishlists.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse h-48">
                    <CardHeader>
                      <div className="h-5 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
              ) : wishlists && wishlists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {wishlists.map((wishlist) => (
                  <Card
                    key={wishlist.id}
                    className="cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white group overflow-hidden"
                  >
                    {wishlist.cover_image && (
                      <div className="h-48 w-full overflow-hidden relative" onClick={() => navigate(`/wishlist/${wishlist.id}`)}>
                        <img
                          src={wishlist.cover_image}
                          alt={wishlist.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute top-3 right-3 flex gap-2">
                    <div onClick={(e) => e.stopPropagation()}>
                      <ShareButtons
                        shareUrl={`${window.location.origin}/share/${wishlist.share_code}`}
                        title={wishlist.title}
                        description={wishlist.description || ""}
                      />
                    </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDeleteClick(wishlist.id, e)}
                                className="h-8 w-8 bg-white/90 backdrop-blur-sm hover:bg-white text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete wishlist</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    )}
                    <CardHeader className="p-5 space-y-3" onClick={() => navigate(`/wishlist/${wishlist.id}`)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold leading-tight group-hover:text-purple-600 transition-colors mb-1">
                            {wishlist.title}
                          </CardTitle>
                          <Badge className={`text-xs font-medium ${eventTypeColors[wishlist.event_type as keyof typeof eventTypeColors]}`}>
                            {wishlist.event_type.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription className="text-sm line-clamp-2 leading-relaxed">
                        {wishlist.description || "No description provided"}
                      </CardDescription>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {wishlist.event_date && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4" />
                                  <span className="font-medium">{formatDate(wishlist.event_date, 'short')}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{formatDate(wishlist.event_date, 'long')}</p>
                                <p className="text-xs text-muted-foreground mt-1">{formatDate(wishlist.event_date, 'relative')}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/share/${wishlist.share_code}`);
                                }}
                                className="text-xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                View
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View public page</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-20 border-0 shadow-lg bg-white">
                <CardContent className="space-y-6">
                  <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                    <Gift className="w-12 h-12 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-900">Create Your First Wishlist</h3>
                    <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                      Start sharing your celebration wishes with friends and family. They can claim items and send payments directly to you!
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <Button 
                      onClick={() => navigate("/create-wishlist")}
                      size="lg"
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all text-base font-medium px-8"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create Your First Wishlist
                    </Button>
                  </div>
                  <div className="pt-4 border-t mt-8">
                    <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      Perfect for weddings, birthdays, baby showers, and more!
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
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
    </TooltipProvider>
  );
};

export default Dashboard;
