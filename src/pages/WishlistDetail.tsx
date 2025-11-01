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
import { getCurrencySymbol, isItemClaimed, getCompletedClaim } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const WishlistDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [itemFormData, setItemFormData] = useState({
    name: "",
    description: "",
    price_min: "",
    price_max: "",
    external_link: "",
    image_url: "",
    category: "",
    priority: "0",
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
        .select("*, claims(id, claimer_name, is_anonymous, payment_status)")
        .eq("wishlist_id", id!)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault(); // Prevent form submission
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
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
      toast.error(errorMessage);
    } finally {
      setUploadingImage(false);
      // Clear the file input so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setItemFormData({ ...itemFormData, image_url: "" });
    setImagePreview(null);
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
      });

    if (error) {
      toast.error("Failed to add item: " + error.message);
    } else {
      toast.success("Item added successfully!");
      setItemDialogOpen(false);
      setItemFormData({
        name: "",
        description: "",
        price_min: "",
        price_max: "",
        external_link: "",
        image_url: "",
        category: "",
        priority: "0",
      });
      setImagePreview(null);
      refetchItems();
    }
  };

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}/share/${wishlist?.share_code}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard!");
  };

  const isOwner = session?.user?.id === wishlist?.user_id;

  if (wishlistLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
        <Navbar user={session?.user} />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!wishlist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
        <Navbar user={session?.user} />
        <div className="container mx-auto px-4 py-8">
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">Wishlist not found</p>
              <Button onClick={() => navigate("/dashboard")} className="mt-4">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
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
      <Navbar user={session?.user} />
      
      <main className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

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
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
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
              </div>
              <div className="flex gap-2">
                <Button onClick={handleShareLink} variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                {isOwner && (
                  <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="shadow-elegant">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh]">
                      <DialogHeader>
                        <DialogTitle>Add New Item</DialogTitle>
                        <DialogDescription>
                          Add a new item to your wishlist
                        </DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
                        <form onSubmit={handleAddItem} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="item_name">Item Name *</Label>
                          <Input
                            id="item_name"
                            value={itemFormData.name}
                            onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="item_description">Description</Label>
                          <Textarea
                            id="item_description"
                            value={itemFormData.description}
                            onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="price_min">Min Price</Label>
                            <Input
                              id="price_min"
                              type="number"
                              step="0.01"
                              value={itemFormData.price_min}
                              onChange={(e) => setItemFormData({ ...itemFormData, price_min: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="price_max">Max Price</Label>
                            <Input
                              id="price_max"
                              type="number"
                              step="0.01"
                              value={itemFormData.price_max}
                              onChange={(e) => setItemFormData({ ...itemFormData, price_max: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="external_link">Product Link</Label>
                          <Input
                            id="external_link"
                            type="url"
                            value={itemFormData.external_link}
                            onChange={(e) => setItemFormData({ ...itemFormData, external_link: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Item Image (Optional)</Label>
                          <div className="space-y-3">
                            {imagePreview || itemFormData.image_url ? (
                              <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                                <img
                                  src={imagePreview || itemFormData.image_url}
                                  alt="Item preview"
                                  className="w-full h-full object-cover"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-2 right-2"
                                  onClick={handleRemoveImage}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                  <Input
                                    id="image-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploadingImage}
                                    className="flex-1"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    disabled={uploadingImage}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      document.getElementById('image-upload')?.click();
                                    }}
                                  >
                                    {uploadingImage ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Upload className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                                <div className="text-xs text-muted-foreground text-center">or</div>
                                <Input
                                  id="image_url"
                                  type="url"
                                  placeholder="Paste image URL"
                                  value={itemFormData.image_url}
                                  onChange={(e) => {
                                    setItemFormData({ ...itemFormData, image_url: e.target.value });
                                    if (e.target.value) setImagePreview(e.target.value);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                          <Button type="submit" className="w-full shadow-elegant">
                            Add Item
                          </Button>
                        </form>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4">
              {wishlist.event_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(wishlist.event_date).toLocaleDateString()}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Share2 className="w-4 h-4" />
                Share Code: {wishlist.share_code}
              </div>
            </div>
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
                const isClaimed = isItemClaimed(item.claims);
                const completedClaim = getCompletedClaim(item.claims);
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
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          {isClaimed && (
                            <Badge variant="default" className="ml-2 bg-green-600">
                              Claimed
                            </Badge>
                          )}
                        </div>
                        {completedClaim && !completedClaim.is_anonymous && (
                          <p className="text-xs text-muted-foreground">
                            Claimed by: {completedClaim.claimer_name}
                          </p>
                        )}
                        {completedClaim && completedClaim.is_anonymous && (
                          <p className="text-xs text-muted-foreground">
                            Claimed anonymously
                          </p>
                        )}
                      </div>
                      {item.description && (
                        <CardDescription className="line-clamp-2">
                          {item.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(item.price_min || item.price_max) && (
                          <div className="text-sm">
                            <span className="font-semibold text-primary">
                              {item.price_min && item.price_max
                                ? `${getCurrencySymbol(wishlist.currency)}${item.price_min} - ${getCurrencySymbol(wishlist.currency)}${item.price_max}`
                                : item.price_min
                                ? `From ${getCurrencySymbol(wishlist.currency)}${item.price_min}`
                                : `Up to ${getCurrencySymbol(wishlist.currency)}${item.price_max}`}
                            </span>
                          </div>
                        )}
                        {item.external_link && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => window.open(item.external_link!, "_blank")}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Product
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
                <p className="text-muted-foreground mb-6">
                  {isOwner
                    ? "Start adding items to your wishlist"
                    : "The wishlist owner hasn't added any items yet"}
                </p>
                {isOwner && (
                  <Button onClick={() => setItemDialogOpen(true)} className="shadow-elegant">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Item
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default WishlistDetail;
