import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Share2, Plus, ExternalLink, Loader2, Gift, Edit, Trash2, Upload, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { getCurrencySymbol, isItemClaimed } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const WishlistDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const { data: wishlist, isLoading: wishlistLoading, error } = useQuery({
    queryKey: ["wishlist", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("wishlists").select("id, title, description, event_type, cover_image, share_code, currency, user_id, profiles(full_name)").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items = [], isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ["wishlist-items", id],
    queryFn: async () => {
      // Fetch items and claims in parallel for better performance
      const [itemsResult, claimsResult] = await Promise.all([
        supabase
          .from("wishlist_items")
          .select("id, name, description, price_min, price_max, external_link, image_url, allow_group_gifting, created_at")
          .eq("wishlist_id", id!)
          .order("created_at", { ascending: false }),
        supabase
          .from("claims")
          .select("id, wishlist_item_id, payment_status, contribution_amount, is_group_gift")
          .eq("wishlist_items.wishlist_id", id!)
      ]);

      if (itemsResult.error) {
        console.error("Error fetching items:", itemsResult.error);
        return [];
      }

      if (claimsResult.error) {
        console.error("Error fetching claims:", claimsResult.error);
        return itemsResult.data || [];
      }

      // Merge claims into items for easier consumption
      const itemsWithClaims = (itemsResult.data || []).map(item => ({
        ...item,
        claims: claimsResult.data?.filter(claim => claim.wishlist_item_id === item.id) || []
      }));

      return itemsWithClaims;
    },
    enabled: !!id,
  });

  const isOwner = session?.user?.id === wishlist?.user_id;



  const handleEditClick = (item: any) => {
    navigate(`/wishlist/${id}/item/${item.id}/edit`);
  };

  const handleDeleteClick = (itemId: string) => {
    setItemToDelete(itemId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const { error } = await supabase.from("wishlist_items").delete().eq("id", itemToDelete);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Item deleted!");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      refetchItems();
    }
  };



  // Show error state if query failed
  if (error) {
    console.log("WishlistDetail: Showing error state", error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
        <Navbar user={session?.user} />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <p className="text-center text-red-600 font-medium mb-4">Failed to load wishlist</p>
              <p className="text-center text-muted-foreground mb-6">
                The wishlist may not exist or you may not have permission to view it.
              </p>
              <Button onClick={() => navigate("/dashboard")} className="w-full">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show loading state while wishlist data is being fetched
  if (wishlistLoading || !wishlist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
        <Navbar user={session?.user} />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading wishlist...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <Navbar user={session?.user} />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>

        {/* Header */}
        <Card className="mb-8 shadow-xl">
          {wishlist.cover_image && <img src={wishlist.cover_image} alt="" className="w-full h-64 object-cover rounded-t-xl" loading="lazy" />}
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
              <div>
                <CardTitle className="text-3xl">{wishlist.title}</CardTitle>
                <Badge className="mt-3">{wishlist.event_type.replace("_", " ")}</Badge>
                <CardDescription className="mt-4 text-lg">{wishlist.description || "No description"}</CardDescription>
              </div>
              <div className="flex gap-3">
                {wishlist?.share_code && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-9 w-9 rounded-full shadow-md hover:shadow-lg transition-all hover:scale-110"
                    onClick={() => navigate(`/share-wishlist/${wishlist.share_code}`)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
                {isOwner && (
                  <Button size="lg" onClick={() => navigate(`/wishlist/${id}/item/new`)}>
                    <Plus className="w-5 h-5 mr-2" /> Add Item
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Items */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold">Items ({items.length})</h2>
          {items.length === 0 ? (
            <Card className="text-center py-20">
              <CardContent>
                <Gift className="w-24 h-24 mx-auto text-muted-foreground mb-6" />
                <h3 className="text-2xl font-semibold">No items yet</h3>
                {isOwner && <Button onClick={() => navigate(`/wishlist/${id}/item/new`)}>Add First Item</Button>}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => {
                const claimed = isItemClaimed(item.claims, item);
                return (
                  <Card key={item.id} className="shadow-lg hover:shadow-xl transition-shadow">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-48 object-cover rounded-t-xl" loading="lazy" />}
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{item.name}</CardTitle>
                        {claimed && <Badge className="bg-green-600">Claimed</Badge>}
                      </div>
                      {item.description && <CardDescription className="mt-2">{item.description}</CardDescription>}
                    </CardHeader>
                    <CardContent>
                      {(item.price_min || item.price_max) && (
                        <p className="font-bold text-primary text-lg">
                          {getCurrencySymbol(wishlist?.currency || "USD")}{item.price_min || 0} {item.price_max && `– ${item.price_max}`}
                        </p>
                      )}
                      {item.external_link && (
                        <Button variant="outline" className="w-full mt-3" onClick={() => window.open(item.external_link!, "_blank")}>
                          <ExternalLink className="w-4 h-4 mr-2" /> View Product
                        </Button>
                      )}
                      {isOwner && !claimed && (
                        <div className="flex gap-3 mt-4 pt-4 border-t">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditClick(item)}>
                            <Edit className="w-4 h-4 mr-2" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 text-red-600 border-red-600" onClick={() => handleDeleteClick(item.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>


        {/* DELETE MODAL - FULLY WORKING */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-sm w-[90vw] mx-auto p-8 rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl">Delete Item?</AlertDialogTitle>
              <AlertDialogDescription className="text-lg text-center">
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-4 mt-8">
              <AlertDialogCancel className="w-full h-14 text-lg">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="w-full h-14 text-lg bg-red-600 hover:bg-red-700">
                Delete Item
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default WishlistDetail;
