import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Calendar, Gift, Loader2, Trash2, Share2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet } from "@/components/Wallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  const handleDeleteWishlist = async (wishlistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this wishlist? This action cannot be undone.")) {
      return;
    }

    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("id", wishlistId);

    if (error) {
      toast.error("Failed to delete wishlist");
    } else {
      queryClient.invalidateQueries({ queryKey: ["wishlists", session?.user?.id] });
      toast.success("Wishlist deleted successfully");
    }
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
        <Tabs defaultValue="wishlists" className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-8">
            <TabsTrigger value="wishlists">My Wishlists</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
          </TabsList>
          
          <TabsContent value="wishlists" className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">My Wishlists</h1>
                <p className="text-muted-foreground">Create and manage your celebration wishlists</p>
              </div>
              <Button 
                onClick={() => navigate("/create-wishlist")}
                size="lg"
                className="shadow-elegant"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Wishlist
              </Button>
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
                            onClick={(e) => handleDeleteWishlist(wishlist.id, e)}
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
          </TabsContent>
          
          <TabsContent value="wallet">
            <Wallet userId={session.user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
