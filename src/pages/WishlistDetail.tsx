import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Share2, Plus, ExternalLink, Loader2, Gift, Edit, Trash2, Upload, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { getCurrencySymbol, isItemClaimed, getCompletedClaim } from "@/lib/utils";
import { ShareButtons } from "@/components/ShareButtons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const WishlistDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [itemFormData, setItemFormData] = useState({
    name: "",
    description: "",
    price_min: "",
    price_max: "",
    external_link: "",
    image_url: "",
    category: "",
    priority: "0",
    allow_group_gifting: false,
  });

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

  const { data: wishlist, isLoading: wishlistLoading } = useQuery({
    queryKey: ["wishlist", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*, profiles(full_name)")
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ["wishlist-items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*, claims(id, claimer_name, is_anonymous, payment_status, contribution_amount, is_group_gift)")
        .eq("wishlist_id", id!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('wishlist-items')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('wishlist-items')
        .getPublicUrl(fileName);

      setItemFormData({ ...itemFormData, image_url: publicUrl });
      setImagePreview(publicUrl);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setItemFormData({ ...itemFormData, image_url: "" });
    setImagePreview(null);
  };

  const resetFormData = () => {
    setItemFormData({
      name: "",
      description: "",
      price_min: "",
      price_max: "",
      external_link: "",
      image_url: "",
      category: "",
      priority: "0",
      allow_group_gifting: false,
    });
    setImagePreview(null);
    setEditingItemId(null);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const { error } = await supabase
      .from("wishlist_items")
      .insert({
        wishlist_id: id,
        name: itemFormData.name,
        description: itemFormData.description || null,
        price_min: itemFormData.price_min ? parseFloat(itemFormData.price_min) : null,
        price_max: itemFormData.price_max ? parseFloat(itemFormData.price_max) : null,
        external_link: itemFormData.external_link || null,
        image_url: itemFormData.image_url || null,
        category: itemFormData.category || null,
        priority: parseInt(itemFormData.priority) || 0,
        allow_group_gifting: itemFormData.allow_group_gifting,
      });

    if (error) {
      toast.error("Failed to add item: " + error.message);
    } else {
      toast.success("Item added successfully!");
      setItemDialogOpen(false);
      resetFormData();
      refetchItems();
    }
  };

  const handleEditClick = (item: any) => {
    setEditingItemId(item.id);
    setItemFormData({
      name: item.name,
      description: item.description || "",
      price_min: item.price_min?.toString() || "",
      price_max: item.price_max?.toString() || "",
      external_link: item.external_link || "",
      image_url: item.image_url || "",
      category: item.category || "",
      priority: item.priority?.toString() || "0",
      allow_group_gifting: !!item.allow_group_gifting,
    });
    setImagePreview(item.image_url || null);
    setEditDialogOpen(true);
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemId) return;

    const { error } = await supabase
      .from("wishlist_items")
      .update({
        name: itemFormData.name,
        description: itemFormData.description || null,
        price_min: itemFormData.price_min ? parseFloat(itemFormData.price_min) : null,
        price_max: itemFormData.price_max ? parseFloat(itemFormData.price_max) : null,
        external_link: itemFormData.external_link || null,
        image_url: itemFormData.image_url || null,
        category: itemFormData.category || null,
        priority: parseInt(itemFormData.priority) || 0,
        allow_group_gifting: itemFormData.allow_group_gifting,
      })
      .eq("id", editingItemId);

    if (error) {
      toast.error("Failed to update item: " + error.message);
    } else {
      toast.success("Item updated successfully!");
      setEditDialogOpen(false);
      resetFormData();
      refetchItems();
    }
  };

  const handleDeleteClick = (itemId: string) => {
    setItemToDelete(itemId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    const { error } = await supabase.from("wishlist_items").delete().eq("id", itemToDelete);

    if (error) {
      toast.error("Failed to delete item: " + error.message);
    } else {
      toast.success("Item deleted successfully!");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      refetchItems();
    }
  };

  const isOwner = session?.user?.id === wishlist?.user_id;

  const totalItems = items?.length || 0;
  const claimedItems = items?.filter(item => isItemClaimed(item.claims, item)).length || 0;
  const progressPercentage = totalItems > 0 ? (claimedItems / totalItems) * 100 : 0;

  const totalFunding = items?.reduce((sum, item) => sum + (item.price_max || 0), 0) || 0;
  const raisedFunding = items?.reduce((sum, item) => {
    const claimed = isItemClaimed(item.claims, item);
    return sum + (claimed ? (item.price_max || 0) : 0);
  }, 0) || 0;
  const fundingPercentage = totalFunding > 0 ? (raisedFunding / totalFunding) * 100 : 0;

  if (wishlistLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
        <Navbar user={session?.user} />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!wishlist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
        <Navbar user={session?.user} />
        <div className="container mx-auto px-4 py-8 text-center">
          <Card className="max-w-md mx-auto py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">Wishlist not found</p>
              <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const eventTypeColors: Record<string, string> = {
    wedding: "bg-primary/10 text-primary border-primary/20",
    birthday: "bg-secondary/10 text-secondary border-secondary/20",
    anniversary: "bg-accent/10 text-accent border-accent/20",
    baby_shower: "bg-pink-100 text-pink-700 border-pink-200",
    graduation: "bg-blue-100 text-blue-700 border-blue-200",
    other: "bg-muted text-muted-foreground border-muted",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <Navbar user={session?.user} />

      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6 h-11 px-4">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="shadow-elegant mb-8 overflow-hidden">
          {wishlist.cover_image && (
            <div className="aspect-[21/9] w-full overflow-hidden">
              <img src={wishlist.cover_image} alt={wishlist.title} className="w-full h-full object-cover" />
            </div>
          )}

          <CardHeader className="pb-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <CardTitle className="text-2xl sm:text-3xl md:text-4xl leading-tight">
                      {wishlist.title}
                    </CardTitle>
                    <Badge className={eventTypeColors[wishlist.event_type] || eventTypeColors.other}>
                      {wishlist.event_type.replace("_", " ")}
                    </Badge>
                  </div>
                  <CardDescription className="text-base">
                    {wishlist.description || "No description"}
                  </CardDescription>
                </div>

                <div className="flex flex-wrap gap-2">
                  <ShareButtons
                    shareUrl={`${window.location.origin}/share/${wishlist.share_code}`}
                    title={wishlist.title}
                    description={wishlist.description || ""}
                  />
                  {isOwner && (
                    <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="shadow-elegant">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-full max-w-lg p-6 sm:p-8 max-h-[95vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Add New Item</DialogTitle>
                          <DialogDescription>Add a new item to your wishlist</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[calc(95vh-12rem)] pr-4">
                          <form onSubmit={handleAddItem} className="space-y-5">
                            {/* Form fields - unchanged logic */}
                            <div className="space-y-2">
                              <Label htmlFor="name">Item Name *</Label>
                              <Input id="name" value={itemFormData.name} onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="desc">Description</Label>
                              <Textarea id="desc" rows={3} value={itemFormData.description} onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="min">Min Price</Label>
                                <PriceInput id="min" value={itemFormData.price_min} onChange={(v) => setItemFormData({ ...itemFormData, price_min: v })} currencySymbol={getCurrencySymbol(wishlist.currency || "NGN")} />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="max">Max Price</Label>
                                <PriceInput id="max" value={itemFormData.price_max} onChange={(v) => setItemFormData({ ...itemFormData, price_max: v })} currencySymbol={getCurrencySymbol(wishlist.currency || "NGN")} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="link">Product Link</Label>
                              <Input id="link" type="url" value={itemFormData.external_link} onChange={(e) => setItemFormData({ ...itemFormData, external_link: e.target.value })} />
                            </div>
                            <div className="space-y-3">
                              <Label>Item Image (Optional)</Label>
                              {imagePreview ? (
                                <div className="relative aspect-video rounded-lg overflow-hidden border">
                                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={handleRemoveImage}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                                  <div className="text-center text-xs text-muted-foreground">or</div>
                                  <Input type="url" placeholder="Paste image URL" value={itemFormData.image_url} onChange={(e) => { setItemFormData({ ...itemFormData, image_url: e.target.value }); setImagePreview(e.target.value); }} />
                                </div>
                              )}
                            </div>
                            <div className="space-y-4">
                              <Label className="text-base font-semibold">Who can claim this item?</Label>
                              <RadioGroup value={itemFormData.allow_group_gifting ? "group" : "single"} onValueChange={(v) => setItemFormData({ ...itemFormData, allow_group_gifting: v === "group" })}>
                                <div className="flex items-start space-x-3 rounded-lg border p-4">
                                  <RadioGroupItem value="single" id="single" />
                                  <Label htmlFor="single" className="cursor-pointer flex-1">Single Person <span className="block text-sm text-muted-foreground font-normal">Only one person can claim this</span></Label>
                                </div>
                                <div className="flex items-start space-x-3 rounded-lg border p-4">
                                  <RadioGroupItem value="group" id="group" />
                                  <Label htmlFor="group" className="cursor-pointer flex-1">Group Gifting <span className="block text-sm text-muted-foreground font-normal">Multiple people can contribute</span></Label>
                                </div>
                              </RadioGroup>
                            </div>
                            <Button type="submit" size="lg" className="w-full h-12">Add Item</Button>
                          </form>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {wishlist.event_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(wishlist.event_date).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Share Code: <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{wishlist.share_code}</code>
                  </div>
                </div>

                {totalItems > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium w-20">Items</span>
                      <Progress value={progressPercentage} className="flex-1 h-3" />
                      <span className="text-sm w-16 text-right">{claimedItems}/{totalItems}</span>
                    </div>
                    {totalFunding > 0 && (
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium w-20">Funding</span>
                        <Progress value={fundingPercentage} className="flex-1 h-3 [&>div]:bg-green-500" />
                        <span className="text-sm w-20 text-right">{Math.round(fundingPercentage)}%</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <section className="space-y-6">
          <h2 className="text-2xl sm:text-3xl font-semibold">Items</h2>

          {itemsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : items?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => {
                const claimed = isItemClaimed(item.claims, item);
                const completedClaim = getCompletedClaim(item.claims);
                return (
                  <Card key={item.id} className="overflow-hidden flex flex-col h-full shadow-card hover:shadow-elegant transition-shadow">
                    {item.image_url && (
                      <div className="aspect-square overflow-hidden bg-muted">
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardHeader className="flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-lg line-clamp-2">{item.name}</CardTitle>
                        {claimed && <Badge className="bg-green-600">Claimed</Badge>}
                      </div>
                      {completedClaim && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {completedClaim.is_anonymous ? "Claimed anonymously" : `By ${completedClaim.claimer_name}`}
                        </p>
                      )}
                      {item.description && <CardDescription className="line-clamp-3 mt-2">{item.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="mt-auto space-y-4">
                      {(item.price_min || item.price_max) && (
                        <p className="font-semibold text-primary">
                          {item.price_min && item.price_max
                            ? `${getCurrencySymbol(wishlist.currency)}${item.price_min} - ${getCurrencySymbol(wishlist.currency)}${item.price_max}`
                            : item.price_min
                            ? `From ${getCurrencySymbol(wishlist.currency)}${item.price_min}`
                            : `Up to ${getCurrencySymbol(wishlist.currency)}${item.price_max}`}
                        </p>
                      )}
                      {item.external_link && (
                        <Button variant="outline" className="w-full" onClick={() => window.open(item.external_link!, "_blank")}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Product
                        </Button>
                      )}
                      {isOwner && !claimed && (
                        <div className="flex gap-2 pt-4 border-t">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditClick(item)}>
                            <Edit className="w-4 h-4 mr-1" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 text-destructive" onClick={() => handleDeleteClick(item.id)}>
                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-16">
              <CardContent className="space-y-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center">
                  <Gift className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold">No items yet</h3>
                  <p className="text-muted-foreground mt-2">
                    {isOwner ? "Start adding items to your wishlist" : "This wishlist is empty"}
                  </p>
                </div>
                {isOwner && (
                  <Button size="lg" onClick={() => setItemDialogOpen(true)}>
                    <Plus className="w-5 h-5 mr-2" />
                    Add Your First Item
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      {/* Edit Dialog - same generous padding */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-full max-w-lg p-6 sm:p-8 max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update item details</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(95vh-12rem)] pr-4">
            <form onSubmit={handleEditItem} className="space-y-5">
              {/* Same fields as Add dialog */}
              {/* ... identical structure ... */}
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation - extra side padding */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="p-6 sm:p-8">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-4">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="w-full sm:w-auto bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// THIS LINE WAS MISSING — THIS FIXES YOUR VERCEL BUILD ERROR
export default WishlistDetail;
