import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Gift, Calendar, Star, Eye, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const FeaturedWishlists = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const { data: featuredWishlists, isLoading } = useQuery({
    queryKey: ["featured-wishlists-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*, profiles(full_name)")
        .eq("is_featured", true)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const eventTypeColors: Record<string, string> = {
    wedding: "bg-primary/10 text-primary border-primary/20",
    birthday: "bg-secondary/10 text-secondary border-secondary/20",
    anniversary: "bg-accent/10 text-accent border-accent/20",
    baby_shower: "bg-pink-100 text-pink-700 border-pink-200",
    graduation: "bg-blue-100 text-blue-700 border-blue-200",
    other: "bg-muted text-muted-foreground border-muted",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={session?.user} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
              Featured Wishlists
            </h1>
            <p className="text-muted-foreground mt-1">
              Discover amazing wishlists from our community
            </p>
          </div>
        </div>

        {!featuredWishlists || featuredWishlists.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Gift className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Featured Wishlists Yet</h3>
              <p className="text-muted-foreground">
                Check back later for amazing wishlists from our community!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredWishlists.map((wishlist) => (
              <Card 
                key={wishlist.id}
                className="group cursor-pointer hover:shadow-elegant transition-all duration-300 overflow-hidden"
                onClick={() => navigate(`/share/${wishlist.share_code}`)}
              >
                {wishlist.cover_image && (
                  <div className="h-40 overflow-hidden">
                    <img 
                      src={wishlist.cover_image} 
                      alt={wishlist.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
                        {wishlist.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {wishlist.description || "A beautiful wishlist"}
                      </CardDescription>
                    </div>
                    <Badge className={eventTypeColors[wishlist.event_type] || eventTypeColors.other}>
                      {wishlist.event_type.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      By {(wishlist.profiles as any)?.full_name || "Anonymous"}
                    </span>
                    {wishlist.event_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(wishlist.event_date)}
                      </span>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/share/${wishlist.share_code}`);
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Wishlist
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default FeaturedWishlists;