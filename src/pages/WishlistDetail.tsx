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
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const { data: wishlist, isLoading: wishlistLoading } = useQuery({
    queryKey: ["wishlist", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("wishlists").select("*, profiles(full_name)").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: items = [], isLoading: itemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ["wishlist-items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*, claims(id, claimer_name, is_anonymous, payment_status, contribution_amount, is_group_gift)")
        .eq("wishlist_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const isOwner = session?.user?.id === wishlist?.user_id;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;
    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("wishlist-items").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("wishlist-items").getPublicUrl(fileName);
      setItemFormData({ ...itemFormData, image_url: publicUrl });
      setImagePreview(publicUrl);
      toast.success("Image uploaded!");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    setItemFormData({ ...itemFormData, image_url: "" });
    setImagePreview(null);
  };

  const resetFormData = () => {
    setItemFormData({
      name: "", description: "", price_min: "", price_max: "", external_link: "", image_url: "", category: "", priority: "0", allow_group_gifting: false,
    });
    setImagePreview(null);
    setEditingItemId(null);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("wishlist_items").insert({
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
    if (error) toast.error("Failed to add item");
    else {
      toast.success("Item added!");
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
    const { error } = await supabase.from("wishlist_items").update({
      name: itemFormData.name,
      description: itemFormData.description || null,
      price_min: itemFormData.price_min ? parseFloat(itemFormData.price_min) : null,
      price_max: itemFormData.price_max ? parseFloat(itemFormData.price_max) : null,
      external_link: itemFormData.external_link || null,
      image_url: itemFormData.image_url || null,
      category: itemFormData.category || null,
      priority: parseInt(itemFormData.priority) || 0,
      allow_group_gifting: itemFormData.allow_group_gifting,
    }).eq("id", editingItemId);
    if (error) toast.error("Update failed");
    else {
      toast.success("Item updated!");
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
    if (error) toast.error("Delete failed");
    else {
      toast.success("Item deleted!");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      refetchItems();
    }
  };

  if (wishlistLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5 flex items-center justify-center">
        <Navbar user={session?.user} />
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!wishlist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
        <Navbar user={session?.user} />
        <div className="container mx-auto px-6 py-20 text-center">
          <Card className="max-w-md mx-auto p-8">
            <CardContent>
              <p className="text-muted-foreground mb-6">Wishlist not found</p>
              <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <Navbar user={session?.user} />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6 h-11">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
        </Button>

        {/* Header Card */}
        <Card className="mb-8 overflow-visible shadow-xl">
          {wishlist.cover_image && (
            <div className="w-full overflow-visible">
              <img src={wishlist.cover_image} alt={wishlist.title} className="w-full h-64 object-cover rounded-t-xl" />
            </div>
          )}
          <CardHeader className="pb-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                <div>
                  <CardTitle className="text-3xl md:text-4xl font-bold">{wishlist.title}</CardTitle>
                  <Badge className="mt-3 text-lg px-4 py-1">
                    {wishlist.event_type.replace("_", " ")}
                  </Badge>
                  <CardDescription className="mt-4 text-lg">{wishlist.description || "No description"}</CardDescription>
                </div>

                <div className="flex flex-wrap gap-3">
                  <ShareButtons shareUrl={`${window.location.origin}/share/${wishlist.share_code}`} title={wishlist.title} />
                  {isOwner && (
                    <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="lg" className="shadow-lg">
                          <Plus className="w-5 h-5 mr-2" /> Add Item
                        </Button>
                      </DialogTrigger>

                      {/* PERFECT MODAL - NO OVERFLOW HIDDEN */}
                      <DialogContent className="max-w-md w-[95vw] mx-auto p-6 sm:p-8 rounded-2xl bg-background shadow-2xl overflow-visible">
                        <DialogHeader className="mb-6 text-left">
                          <DialogTitle className="text-2xl font-bold">Add New Item</DialogTitle>
                          <DialogDescription className="text-base text-muted-foreground">
                            Add a gift you'd love to receive
                          </DialogDescription>
                        </DialogHeader>

                        <ScrollArea className="max-h-[70vh] pr-4">
                          <form onSubmit={handleAddItem} className="space-y-7">
                            <div className="max-w-md mx-auto space-y-6">

                              <div className="space-y-2">
                                <Label className="text-base font-medium">Item Name *</Label>
                                <Input
                                  value={itemFormData.name}
                                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                                  required
                                  placeholder="e.g. AirPods Pro"
                                  className="h-12 text-base w-full"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-base font-medium">Description</Label>
                                <Textarea
                                  rows={4}
                                  value={itemFormData.description}
                                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                                  placeholder="Color, size, model, or why you love it..."
                                  className="resize-none min-h-32 w-full text-base"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-base font-medium">Min Price</Label>
                                  <PriceInput
                                    value={itemFormData.price_min}
                                    onChange={(v) => setItemFormData({ ...itemFormData, price_min: v })}
                                    currencySymbol={getCurrencySymbol(wishlist.currency || "NGN")}
                                    className="h-12 w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-base font-medium">Max Price</Label>
                                  <PriceInput
                                    value={itemFormData.price_max}
                                    onChange={(v) => setItemFormData({ ...itemFormData, price_max: v })}
                                    currencySymbol={getCurrencySymbol(wishlist.currency || "NGN")}
                                    className="h-12 w-full"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-base font-medium">Product Link</Label>
                                <Input
                                  type="url"
                                  value={itemFormData.external_link}
                                  onChange={(e) => setItemFormData({ ...itemFormData, external_link: e.target.value })}
                                  placeholder="https://amazon.com/..."
                                  className="h-12 w-full"
                                />
                              </div>

                              <div className="space-y-3">
                                <Label className="text-base font-medium">Item Image (Optional)</Label>
                                {imagePreview ? (
                                  <div className="relative rounded-xl overflow-visible border-2 border-dashed border-primary/20">
                                    <img src={imagePreview} alt="Preview" className="w-full aspect-video object-cover rounded-xl" />
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="icon"
                                      className="absolute top-3 right-3 rounded-full h-10 w-10 shadow-lg"
                                      onClick={handleRemoveImage}
                                    >
                                      <X className="w-5 h-5" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="rounded-xl border-2 border-dashed border-muted-foreground/30 p-8 text-center bg-muted/10 space-y-4">
                                    <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="mx-auto max-w-xs" />
                                    <p className="text-sm text-muted-foreground">or paste image URL</p>
                                    <Input
                                      type="url"
                                      placeholder="https://example.com/image.jpg"
                                      value={itemFormData.image_url}
                                      onChange={(e) => {
                                        const url = e.target.value;
                                        setItemFormData({ ...itemFormData, image_url: url });
                                        if (url) setImagePreview(url);
                                      }}
                                      className="h-12 w-full"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="space-y-4">
                                <Label className="text-base font-semibold">Who can claim this item?</Label>
                                <RadioGroup
                                  value={itemFormData.allow_group_gifting ? "group" : "single"}
                                  onValueChange={(v) => setItemFormData({ ...itemFormData, allow_group_gifting: v === "group" })}
                                  className="space-y-3"
                                >
                                  <div className="flex items-center space-x-4 rounded-xl border bg-card p-5 hover:bg-accent/50 transition-colors">
                                    <RadioGroupItem value="single" id="single" />
                                    <Label htmlFor="single" className="cursor-pointer flex-1 text-base font-medium">
                                      Single Person
                                      <p className="text-sm text-muted-foreground font-normal">One guest buys the full gift</p>
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-4 rounded-xl border bg-card p-5 hover:bg-accent/50 transition-colors">
                                    <RadioGroupItem value="group" id="group" />
                                    <Label htmlFor="group" className="cursor-pointer flex-1 text-base font-medium">
                                      Group Gifting
                                      <p className="text-sm text-muted-foreground font-normal">Friends contribute together</p>
                                    </Label>
                                  </div>
                                </RadioGroup>
                              </div>

                              <Button type="submit" size="lg" className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl">
                                Add Item
                              </Button>
                            </div>
                          </form>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Items Grid */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold">Items</h2>
          {itemsLoading ? (
            <div className="text-center py-20">
              <Loader2 className="w-12 h-12 animate-spin" />
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => {
                const claimed = isItemClaimed(item.claims, item);
                return (
                  <Card key={item.id} className="overflow-visible shadow-lg hover:shadow-xl transition-shadow">
                    {item.image_url && (
                      <div className="overflow-visible">
                        <img src={item.image_url} alt={item.name} className="w-full h-48 object-cover rounded-t-xl" />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex justify-between items-start gap-3">
                        <CardTitle className="text-xl line-clamp-2">{item.name}</CardTitle>
                        {claimed && <Badge className="bg-green-600 text-white">Claimed</Badge>}
                      </div>
                      {item.description && <CardDescription className="mt-2 line-clamp-3">{item.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(item.price_min || item.price_max) && (
                        <p className="font-bold text-primary text-lg">
                          {getCurrencySymbol(wishlist.currency)}{item.price_min || "0"}
                          {item.price_max && ` – ${item.price_max}`}
                        </p>
                      )}
                      {item.external_link && (
                        <Button variant="outline" className="w-full" onClick={() => window.open(item.external_link!, "_blank")}>
                          <ExternalLink className="w-4 h-4 mr-2" /> View Product
                        </Button>
                      )}
                      {isOwner && !claimed && (
                        <div className="flex gap-3 pt-4 border-t">
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
          ) : (
            <Card className="text-center py-20">
              <CardContent className="space-y-6">
                <Gift className="w-24 h-24 mx-auto text-muted-foreground" />
                <h3 className="text-2xl font-semibold">No items yet</h3>
                <p className="text-muted-foreground">Start adding gifts to your wishlist</p>
                {isOwner && (
                  <Button size="lg" onClick={() => setItemDialogOpen(true)}>
                    <Plus className="w-5 h-5 mr-2" /> Add Your First Item
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Edit Modal - Same Style, No Hidden Overflow */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md w-[95vw] mx-auto p-6 sm:p-8 rounded-2xl bg-background shadow-2xl overflow-visible">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-bold">Edit Item</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <form onSubmit={handleEditItem} className="space-y-7">
                <div className="max-w-md mx-auto space-y-6">
                  {/* Same fields as Add modal */}
                  <Button type="submit" size="lg" className="w-full h-14 text-lg font-semibold shadow-lg">
                    Update Item
                  </Button>
                </div>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-sm w-[90vw] mx-auto p-6 rounded-2xl overflow-visible">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Item?</AlertDialogTitle>
              <AlertDialogDescription className="text-center text-base">
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-4 mt-6">
              <AlertDialogCancel className="w-full h-12">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="w-full h-12 bg-red-600 hover:bg-red-700">
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
