import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Loader2, Gift, ExternalLink, Info, Heart, CheckCircle2, Sparkles, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ClaimItemDialog } from "@/components/ClaimItemDialog";
import { getCurrencySymbol, isItemClaimed, getCompletedClaim, formatCurrency, formatDate } from "@/lib/utils";
import { ShareButtons } from "@/components/ShareButtons";
import { GuestBook } from "@/components/GuestBook";
import { CashFunds } from "@/components/CashFunds";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

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
        .select("*, claims(id, claimer_name, is_anonymous, payment_status)")
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

  // Calculate progress
  const totalItems = items?.length || 0;
  const claimedItems = items?.filter(item => isItemClaimed(item.claims)).length || 0;
  const progressPercentage = totalItems > 0 ? (claimedItems / totalItems) * 100 : 0;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <header className="border-b bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Sparkl Wishes</h1>
              </div>
              <div className="flex items-center gap-2">
                {wishlist && (
                  <ShareButtons
                    shareUrl={window.location.href}
                    title={wishlist.title}
                    description={wishlist.description || ""}
                  />
                )}
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => navigate("/")}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Create Yours
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Wishlist Header */}
        <Card className="shadow-lg mb-6 overflow-hidden border-0 bg-white">
          {wishlist.cover_image && (
            <div className="h-48 w-full overflow-hidden relative">
              <img
                src={wishlist.cover_image}
                alt={wishlist.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{wishlist.title}</h1>
                  <Badge
                    className={`${eventTypeColors[wishlist.event_type as keyof typeof eventTypeColors]} backdrop-blur-sm`}
                  >
                    {wishlist.event_type.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <CardHeader className="space-y-3 py-3 px-4">
            {!wishlist.cover_image && (
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{wishlist.title}</h1>
                <Badge className={eventTypeColors[wishlist.event_type as keyof typeof eventTypeColors]}>
                  {wishlist.event_type.replace("_", " ")}
                </Badge>
              </div>
            )}
            
            {wishlist.description && (
              <p className="text-sm text-muted-foreground">{wishlist.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {wishlist.profiles && (
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-500" />
                  <span>{wishlist.profiles.full_name}</span>
                </div>
              )}
              {wishlist.event_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span className="font-medium">{formatDate(wishlist.event_date, 'short')}</span>
                </div>
              )}
            </div>

            {/* Progress Indicator */}
            {totalItems > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">{claimedItems}/{totalItems} claimed</span>
                  <span className="text-muted-foreground">{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="h-1.5" />
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Wishlist Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Items ({items?.length || 0})</h2>
          </div>
          
          {itemsLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-3" />
              <p className="text-sm text-muted-foreground">Loading items...</p>
            </div>
          ) : items && items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const isClaimed = isItemClaimed(item.claims);
                const claimInfo = getCompletedClaim(item.claims);
                const priorityLabels: Record<string, { label: string; color: string }> = {
                  "3": { label: "High Priority", color: "bg-red-100 text-red-700 border-red-200" },
                  "2": { label: "Medium Priority", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
                  "1": { label: "Low Priority", color: "bg-blue-100 text-blue-700 border-blue-200" }
                };
                const priorityInfo = item.priority ? priorityLabels[item.priority.toString()] : null;
                
                return (
                  <Card key={item.id} className={`overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group ${isClaimed ? 'opacity-60' : 'bg-white'}`}>
                    {item.image_url && (
                      <div className="h-48 w-full overflow-hidden relative">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {isClaimed && (
                          <div className="absolute inset-0 bg-gradient-to-t from-green-900/90 to-green-600/50 flex flex-col items-center justify-center">
                            <CheckCircle2 className="w-12 h-12 text-white mb-2" />
                            <span className="text-white font-semibold text-sm">Claimed</span>
                          </div>
                        )}
                        {priorityInfo && !isClaimed && (
                          <div className="absolute top-2 right-2">
                            <Badge className={priorityInfo.color + " text-xs font-semibold shadow-lg"}>
                              {priorityInfo.label}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                    <CardHeader className="space-y-2 p-3">
                      <h3 className="font-semibold text-base leading-tight">{item.name}</h3>
                      
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between pt-1">
                        {item.price_max && (
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                              {formatCurrency(item.price_max, wishlist.currency, false)}
                            </span>
                          </div>
                        )}
                        
                        {item.external_link && (
                          <a
                            href={item.external_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Store
                          </a>
                        )}
                      </div>
                      
                      {isClaimed && claimInfo && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">
                            {claimInfo.is_anonymous 
                              ? "🎁 Claimed anonymously" 
                              : `🎁 ${claimInfo.claimer_name}`}
                          </p>
                        </div>
                      )}
                    </CardHeader>
                    
                    {!isClaimed && (
                      <CardContent className="p-3 pt-0">
                        <Button
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md"
                          size="sm"
                          onClick={() => handleClaimClick(item.id, item.name, item.price_max)}
                        >
                          <Gift className="w-4 h-4 mr-2" />
                          Claim Gift
                        </Button>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-16 border-dashed">
              <CardContent className="space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-gradient-hero flex items-center justify-center mb-4 shadow-glow">
                  <Gift className="w-10 h-10 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold">No Items Yet</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {wishlist.profiles?.full_name || 'The wishlist owner'} hasn't added any items to this wishlist yet. 
                    Check back soon!
                  </p>
                </div>
                <div className="pt-4">
                  <Button variant="outline" onClick={() => navigate("/")}>
                    Create Your Own Wishlist
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Cash Funds Section - Requires migration to be run first */}
        {/* {wishlist && (
          <div className="mt-8">
            <CashFunds
              wishlistId={wishlist.id}
              currency={wishlist.currency}
              isOwner={false}
            />
          </div>
        )} */}

        {/* Guest Book Section - Requires migration to be run first */}
        {/* {wishlist && (
          <div className="mt-8">
            <GuestBook
              wishlistId={wishlist.id}
              wishlistOwnerId={wishlist.user_id}
            />
          </div>
        )} */}
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
    </TooltipProvider>
  );
};

export default SharedWishlist;
