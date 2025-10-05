import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, Gift } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ClaimItemDialog } from "@/components/ClaimItemDialog";

const SharedWishlist = () => {
  const { shareCode } = useParams<{ shareCode: string }>();
  const navigate = useNavigate();
  const [claimDialogOpen, setClaimDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<{ id: string; name: string; price: number | null } | null>(null);

  const { data: wishlist, isLoading: wishlistLoading } = useQuery({
    queryKey: ["shared-wishlist", shareCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*, profiles(full_name)")
        .eq("share_code", shareCode!)
        .eq("is_public", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!shareCode,
  });

  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ["shared-wishlist-items", wishlist?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*, claims(id, claimer_name, is_anonymous)")
        .eq("wishlist_id", wishlist!.id)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!wishlist?.id,
  });

  const handleClaimClick = (itemId: string, itemName: string, price: number | null) => {
    setSelectedItem({ id: itemId, name: itemName, price });
    setClaimDialogOpen(true);
  };

  if (wishlistLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!wishlist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center py-12">
          <CardContent>
            <h2 className="text-2xl font-semibold mb-2">Wishlist Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This wishlist doesn't exist or is not public
            </p>
            <Button onClick={() => navigate("/")}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const eventTypeColors = {
    wedding: "bg-primary/10 text-primary border-primary/20",
    birthday: "bg-secondary/10 text-secondary border-secondary/20",
    anniversary: "bg-accent/10 text-accent border-accent/20",
    baby_shower: "bg-pink-100 text-pink-700 border-pink-200",
    graduation: "bg-blue-100 text-blue-700 border-blue-200",
    other: "bg-muted text-muted-foreground border-muted",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-primary">Wishlist</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Wishlist Header */}
        <Card className="shadow-elegant mb-8">
          {wishlist.cover_image && (
            <div className="aspect-[21/9] w-full overflow-hidden rounded-t-lg">
              <img
                src={wishlist.cover_image}
                alt={wishlist.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="text-4xl">{wishlist.title}</CardTitle>
                <Badge
                  className={`${
                    eventTypeColors[wishlist.event_type as keyof typeof eventTypeColors]
                  }`}
                >
                  {wishlist.event_type.replace("_", " ")}
                </Badge>
              </div>
              <CardDescription className="text-base">
                {wishlist.description || "No description"}
              </CardDescription>
              {wishlist.profiles && (
                <p className="text-sm text-muted-foreground">
                  Created by {wishlist.profiles.full_name}
                </p>
              )}
            </div>
            {wishlist.event_date && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground pt-4">
                <Calendar className="w-4 h-4" />
                {new Date(wishlist.event_date).toLocaleDateString()}
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Wishlist Items */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Items</h2>
          {itemsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : items && items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => {
                const claims = Array.isArray(item.claims) ? item.claims : item.claims ? [item.claims] : [];
                const isClaimed = claims.length > 0;
                const claimInfo = isClaimed ? claims[0] : null;
                
                return (
                  <Card key={item.id} className="shadow-card hover:shadow-elegant transition-all duration-300">
                    {item.image_url && (
                      <div className="aspect-square w-full overflow-hidden rounded-t-lg">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        {isClaimed && (
                          <Badge variant="secondary" className="shrink-0">
                            Claimed
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <CardDescription className="line-clamp-2">
                          {item.description}
                        </CardDescription>
                      )}
                      {isClaimed && claimInfo && !claimInfo.is_anonymous && (
                        <p className="text-sm text-muted-foreground">
                          Claimed by {claimInfo.claimer_name}
                        </p>
                      )}
                      {isClaimed && claimInfo?.is_anonymous && (
                        <p className="text-sm text-muted-foreground">
                          Claimed anonymously
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {!isClaimed && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleClaimClick(item.id, item.name, item.price_max)}
                          >
                            <Gift className="w-4 h-4 mr-2" />
                            Claim
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <div className="mx-auto w-16 h-16 rounded-full bg-gradient-hero flex items-center justify-center mb-4 shadow-glow">
                  <Gift className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No items yet</h3>
                <p className="text-muted-foreground">
                  The wishlist owner hasn't added any items yet
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {selectedItem && (
        <ClaimItemDialog
          open={claimDialogOpen}
          onOpenChange={setClaimDialogOpen}
          itemId={selectedItem.id}
          itemName={selectedItem.name}
          itemPrice={selectedItem.price}
          onClaimSuccess={refetchItems}
        />
      )}
    </div>
  );
};

export default SharedWishlist;
