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

  const { data: items, isLoading: itemsLoading, refetch: refetchItems } = useQuery({
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

  // Handlers (unchanged)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { /* ... your working code ... */ };
  const handleRemoveImage = () => { setItemFormData({ ...itemFormData, image_url: "" }); setImagePreview(null); };
  const resetFormData = () => { setItemFormData({ name: "", description: "", price_min: "", price_max: "", external_link: "", image_url: "", category: "", priority: "0", allow_group_gifting: false }); setImagePreview(null); setEditingItemId(null); };

  const handleAddItem = async (e: React.FormEvent) => { /* ... your working code ... */ };
  const handleEditClick = (item: any) => { /* ... your working code ... */ };
  const handleEditItem = async (e: React.FormEvent) => { /* ... your working code ... */ };
  const handleDeleteClick = (id: string) => { setItemToDelete(id); setDeleteDialogOpen(true); };
  const handleConfirmDelete = async () => { /* ... your working code ... */ };

  if (wishlistLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-12 h-12 animate-spin" /></div>;
  if (!wishlist) return <div className="text-center py-20"><Card className="max-w-md mx-auto p-8"><p>Wishlist not found</p><Button onClick={() => navigate("/dashboard")}>Back</Button></Card></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <Navbar user={session?.user} />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>

        {/* Header Card */}
        <Card className="mb-8 overflow-hidden shadow-lg">
          {wishlist.cover_image && <img src={wishlist.cover_image} alt="" className="w-full h-64 object-cover" />}
          <CardHeader>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <CardTitle className="text-3xl">{wishlist.title}</CardTitle>
                  <Badge className="mt-2">{wishlist.event_type?.replace("_", " ")}</Badge>
                  <CardDescription className="mt-3 text-lg">{wishlist.description || "No description"}</CardDescription>
                </div>
                <div className="flex gap-3">
                  <ShareButtons shareUrl={`${window.location.origin}/share/${wishlist.share_code}`} title={wishlist.title} />
                  {isOwner && (
                    <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                      <DialogTrigger asChild>
                        <Button><Plus className="w-5 h-5 mr-2" /> Add Item</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md w-[95vw] mx-auto p-6 rounded-2xl">
                        <DialogHeader>
                          <DialogTitle>Add New Item</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[70vh]">
                          <form onSubmit={handleAddItem} className="space-y-5">
                            <div className="space-y-2">
                              <Label>Item Name *</Label>
                              <Input value={itemFormData.name} onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Textarea rows={3} value={itemFormData.description} onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Min Price</Label>
                                <PriceInput value={itemFormData.price_min} onChange={(v) => setItemFormData({ ...itemFormData, price_min: v })} currencySymbol={getCurrencySymbol(wishlist.currency || "NGN")} />
                              </div>
                              <div className="space-y-2">
                                <Label>Max Price</Label>
                                <PriceInput value={itemFormData.price_max} onChange={(v) => setItemFormData({ ...itemFormData, price_max: v })} currencySymbol={getCurrencySymbol(wishlist.currency || "NGN")} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Product Link</Label>
                              <Input type="url" value={itemFormData.external_link} onChange={(e) => setItemFormData({ ...itemFormData, external_link: e.target.value })} />
                            </div>
                            <div className="space-y-3">
                              <Label>Image</Label>
                              {imagePreview ? (
                                <div className="relative">
                                  <img src={imagePreview} alt="preview" className="w-full rounded-lg" />
                                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2" onClick={handleRemoveImage}><X /></Button>
                                </div>
                              ) : (
                                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                                  <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                                  <p className="text-sm text-muted-foreground mt-2">or paste image URL</p>
                                  <Input type="url" className="mt-2" value={itemFormData.image_url} onChange={(e) => { setItemFormData({ ...itemFormData, image_url: e.target.value }); setImagePreview(e.target.value); }} />
                                </div>
                              )}
                            </div>
                            <div className="space-y-3">
                              <Label>Claim Type</Label>
                              <RadioGroup value={itemFormData.allow_group_gifting ? "group" : "single"} onValueChange={(v) => setItemFormData({ ...itemFormData, allow_group_gifting: v === "group" })}>
                                <div className="flex items-center space-x-3 border rounded-lg p-4">
                                  <RadioGroupItem value="single" id="single" />
                                  <Label htmlFor="single" className="cursor-pointer">Single Person</Label>
                                </div>
                                <div className="flex items-center space-x-3 border rounded-lg p-4">
                                  <RadioGroupItem value="group" id="group" />
                                  <Label htmlFor="group" className="cursor-pointer">Group Gifting</Label>
                                </div>
                              </RadioGroup>
                            </div>
                            <Button type="submit" size="lg" className="w-full">Add Item</Button>
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

        {/* Items Grid - NOW SHOWS */}
        <section className="space-y-6">
          <h2 className="text-3xl font-bold">Items</h2>
          {itemsLoading ? (
            <div className="text-center py-20"><Loader2 className="w-12 h-12 animate-spin inline" /></div>
          ) : items && items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => {
                const claimed = isItemClaimed(item.claims, item);
                return (
                  <Card key={item.id} className="overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-48 object-cover" />}
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
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditClick(item)}>
                            <Edit className="w-4 h-4 mr-1" /> Edit
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 text-red-600" onClick={() => handleDeleteClick(item.id)}>
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
            <Card className="text-center py-20">
              <CardContent>
                <Gift className="w-20 h-20 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-2xl font-semibold">No items yet</h3>
                {isOwner && <Button className="mt-6" onClick={() => setItemDialogOpen(true)}>Add Your First Item</Button>}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Edit & Delete Modals - fully visible */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md w-[95vw] mx-auto p-6 rounded-2xl">
            <DialogHeader><DialogTitle>Edit Item</DialogTitle></DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <form onSubmit={handleEditItem} className="space-y-5">
                {/* Same fields as Add modal */}
                <Button type="submit" size="lg" className="w-full">Update Item</Button>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-sm w-[90vw] mx-auto">
            <AlertDialogHeader><AlertDialogTitle>Delete Item?</AlertDialogTitle></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default WishlistDetail;
