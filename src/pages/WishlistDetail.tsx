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
        .select("*, claims(*)")
        .eq("wishlist_id", id!)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching items:", error);
        return [];
      }
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
      name: "", description: "", price_min: "", price_max: "", external_link: "", image_url: "", allow_group_gifting: false,
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

  if (wishlistLoading || itemsLoading) {
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
              <p className="text-xl mb-6">Wishlist not found</p>
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
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>

        {/* Header */}
        <Card className="mb-8 shadow-xl">
          {wishlist.cover_image && <img src={wishlist.cover_image} alt="" className="w-full h-64 object-cover rounded-t-xl" />}
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
              <div>
                <CardTitle className="text-3xl">{wishlist.title}</CardTitle>
                <Badge className="mt-3">{wishlist.event_type.replace("_", " ")}</Badge>
                <CardDescription className="mt-4 text-lg">{wishlist.description || "No description"}</CardDescription>
              </div>
              <div className="flex gap-3">
                <ShareButtons shareUrl={`${window.location.origin}/share/${wishlist.share_code}`} title={wishlist.title} />
                {isOwner && (
                  <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="lg"><Plus className="w-5 h-5 mr-2" /> Add Item</Button>
                    </DialogTrigger>

                    {/* FULL-WIDTH, VISIBLE ADD ITEM MODAL */}
                    <DialogContent className="w-[95vw] sm:max-w-2xl mx-auto p-2 sm:p-10 rounded-3xl max-h-[90vh] overflow-y-auto">
                      <Card className="shadow-elegant">
                        <CardHeader>
                          <CardTitle className="text-3xl">Add New Item</CardTitle>
                          <CardDescription className="text-lg">Tell your guests what you'd love</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={handleAddItem} className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-lg font-medium">Item Name *</Label>
                          <Input
                            value={itemFormData.name}
                            onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                            required
                            placeholder="e.g. AirPods Pro"
                            className="h-14 text-lg"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-lg font-medium">Description</Label>
                          <Textarea
                            rows={5}
                            value={itemFormData.description}
                            onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                            placeholder="Color, size, model..."
                            className="resize-none text-lg min-h-36"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-lg font-medium">Min Price</Label>
                            <PriceInput
                              value={itemFormData.price_min}
                              onChange={(v) => setItemFormData({ ...itemFormData, price_min: v })}
                              currencySymbol={getCurrencySymbol(wishlist.currency || "NGN")}
                              className="h-14 text-lg"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-lg font-medium">Max Price</Label>
                            <PriceInput
                              value={itemFormData.price_max}
                              onChange={(v) => setItemFormData({ ...itemFormData, price_max: v })}
                              currencySymbol={getCurrencySymbol(wishlist.currency || "NGN")}
                              className="h-14 text-lg"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-lg font-medium">Product Link</Label>
                          <Input
                            type="url"
                            value={itemFormData.external_link}
                            onChange={(e) => setItemFormData({ ...itemFormData, external_link: e.target.value })}
                            placeholder="https://amazon.com/..."
                            className="h-14 text-lg"
                          />
                        </div>

                        <div className="space-y-4">
                          <Label className="text-lg font-medium">Image (Optional)</Label>
                          {imagePreview ? (
                            <div className="relative rounded-2xl overflow-hidden border-4 border-dashed">
                              <img src={imagePreview} alt="preview" className="w-full aspect-video object-cover" />
                              <Button type="button" variant="destructive" size="icon" className="absolute top-4 right-4" onClick={handleRemoveImage}><X /></Button>
                            </div>
                          ) : (
                            <div className="border-4 border-dashed rounded-2xl p-10 text-center bg-muted/10">
                              <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                              <p className="text-lg text-muted-foreground mt-4">or paste image URL</p>
                              <Input
                                type="url"
                                value={itemFormData.image_url}
                                onChange={(e) => {
                                  const url = e.target.value;
                                  setItemFormData({ ...itemFormData, image_url: url });
                                  if (url) setImagePreview(url);
                                }}
                                className="h-14 mt-4"
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-5">
                          <Label className="text-xl font-semibold">Who can claim?</Label>
                          <RadioGroup
                            value={itemFormData.allow_group_gifting ? "group" : "single"}
                            onValueChange={(v) => setItemFormData({ ...itemFormData, allow_group_gifting: v === "group" })}
                          >
                            <div className="flex items-center space-x-5 border rounded-2xl p-6">
                              <RadioGroupItem value="single" id="single" />
                              <Label htmlFor="single" className="cursor-pointer text-lg font-medium">Single Person</Label>
                            </div>
                            <div className="flex items-center space-x-5 border rounded-2xl p-6">
                              <RadioGroupItem value="group" id="group" />
                              <Label htmlFor="group" className="cursor-pointer text-lg font-medium">Group Gifting</Label>
                            </div>
                          </RadioGroup>
                        </div>

                            <Button type="submit" size="lg" className="w-full h-16 text-xl font-bold">
                              Add Item
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    </DialogContent>
                  </Dialog>
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
                {isOwner && <Button onClick={() => setItemDialogOpen(true)}>Add First Item</Button>}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => {
                const claimed = isItemClaimed(item.claims, item);
                return (
                  <Card key={item.id} className="shadow-lg hover:shadow-xl transition-shadow">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-48 object-cover rounded-t-xl" />}
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
                          {getCurrencySymbol(wishlist.currency)}{item.price_min || 0} {item.price_max && `– ${item.price_max}`}
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

        {/* EDIT ITEM MODAL */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="w-[95vw] sm:max-w-2xl mx-auto p-2 sm:p-10 rounded-3xl max-h-[90vh] overflow-y-auto">
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="text-3xl">Edit Item</CardTitle>
                <CardDescription className="text-lg">Update your item details</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEditItem} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-lg font-medium">Item Name *</Label>
                <Input
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  required
                  placeholder="e.g. AirPods Pro"
                  className="h-14 text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-lg font-medium">Description</Label>
                <Textarea
                  rows={5}
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  placeholder="Color, size, model..."
                  className="resize-none text-lg min-h-36"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-lg font-medium">Min Price</Label>
                  <PriceInput
                    value={itemFormData.price_min}
                    onChange={(v) => setItemFormData({ ...itemFormData, price_min: v })}
                    currencySymbol={getCurrencySymbol(wishlist.currency || "NGN")}
                    className="h-14 text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-lg font-medium">Max Price</Label>
                  <PriceInput
                    value={itemFormData.price_max}
                    onChange={(v) => setItemFormData({ ...itemFormData, price_max: v })}
                    currencySymbol={getCurrencySymbol(wishlist.currency || "NGN")}
                    className="h-14 text-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-lg font-medium">Product Link</Label>
                <Input
                  type="url"
                  value={itemFormData.external_link}
                  onChange={(e) => setItemFormData({ ...itemFormData, external_link: e.target.value })}
                  placeholder="https://amazon.com/..."
                  className="h-14 text-lg"
                />
              </div>

              <div className="space-y-4">
                <Label className="text-lg font-medium">Image (Optional)</Label>
                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-4 border-dashed">
                    <img src={imagePreview} alt="preview" className="w-full aspect-video object-cover" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-4 right-4" onClick={handleRemoveImage}><X /></Button>
                  </div>
                ) : (
                  <div className="border-4 border-dashed rounded-2xl p-10 text-center bg-muted/10">
                    <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                    <p className="text-lg text-muted-foreground mt-4">or paste image URL</p>
                    <Input
                      type="url"
                      value={itemFormData.image_url}
                      onChange={(e) => {
                        const url = e.target.value;
                        setItemFormData({ ...itemFormData, image_url: url });
                        if (url) setImagePreview(url);
                      }}
                      className="h-14 mt-4"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <Label className="text-xl font-semibold">Who can claim?</Label>
                <RadioGroup
                  value={itemFormData.allow_group_gifting ? "group" : "single"}
                  onValueChange={(v) => setItemFormData({ ...itemFormData, allow_group_gifting: v === "group" })}
                >
                  <div className="flex items-center space-x-5 border rounded-2xl p-6">
                    <RadioGroupItem value="single" id="single-edit" />
                    <Label htmlFor="single-edit" className="cursor-pointer text-lg font-medium">Single Person</Label>
                  </div>
                  <div className="flex items-center space-x-5 border rounded-2xl p-6">
                    <RadioGroupItem value="group" id="group-edit" />
                    <Label htmlFor="group-edit" className="cursor-pointer text-lg font-medium">Group Gifting</Label>
                  </div>
                </RadioGroup>
              </div>

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => { setEditDialogOpen(false); resetFormData(); }} className="w-full h-14 text-lg">
                      Cancel
                    </Button>
                    <Button type="submit" className="w-full h-14 text-lg font-bold">
                      Update Item
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>

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
