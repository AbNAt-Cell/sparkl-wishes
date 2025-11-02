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
import { GuestBook } from "@/components/GuestBook";
import { CashFunds } from "@/components/CashFunds";
import { ThankYouDialog } from "@/components/ThankYouDialog";
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
      console.log("Fetching items for wishlist:", id);
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("*, claims(id, claimer_name, is_anonymous, payment_status)")
        .eq("wishlist_id", id!)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching wishlist items:", error);
        throw error;
      }
      console.log("Fetched items:", data);
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

  const handleEditClick = (item: {
    id: string;
    name: string;
    description: string | null;
    price_min: number | null;
    price_max: number | null;
    external_link: string | null;
    image_url: string | null;
    category: string | null;
    priority: number;
    allow_group_gifting?: boolean;
  }) => {
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
      allow_group_gifting: item.allow_group_gifting || false,
    });
    setImagePreview(item.image_url);
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

    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("id", itemToDelete);

    if (error) {
      toast.error("Failed to delete item: " + error.message);
    } else {
      toast.success("Item deleted successfully!");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      refetchItems();
    }
  };

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}/share/${wishlist?.share_code}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard!");
  };

  const isOwner = session?.user?.id === wishlist?.user_id;

  // Calculate progress
  const totalItems = items?.length || 0;
  const claimedItems = items?.filter(item => isItemClaimed(item.claims)).length || 0;
  const progressPercentage = totalItems > 0 ? (claimedItems / totalItems) * 100 : 0;
  
  // Calculate total funding
  const totalFunding = items?.reduce((sum, item) => {
    return sum + (item.price_max || 0);
  }, 0) || 0;
  
  const raisedFunding = items?.reduce((sum, item) => {
    const isClaimed = isItemClaimed(item.claims);
    return sum + (isClaimed ? (item.price_max || 0) : 0);
  }, 0) || 0;
  
  const fundingPercentage = totalFunding > 0 ? (raisedFunding / totalFunding) * 100 : 0;

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
                <ShareButtons
                  shareUrl={`${window.location.origin}/share/${wishlist.share_code}`}
                  title={wishlist.title}
                  description={wishlist.description || ""}
                />
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

                        {/* Claim Type Selection */}
                        <div className="space-y-3 pt-2">
                          <Label className="text-base font-semibold">Who can claim this item?</Label>
                          <RadioGroup
                            value={itemFormData.allow_group_gifting ? "group" : "single"}
                            onValueChange={(value) => 
                              setItemFormData({ ...itemFormData, allow_group_gifting: value === "group" })
                            }
                            className="space-y-3"
                          >
                            <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                              <RadioGroupItem value="single" id="single-claim" className="mt-1" />
                              <div className="flex-1">
                                <Label htmlFor="single-claim" className="font-medium cursor-pointer">
                                  Single Person
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Only one person can claim and pay for this entire item
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                              <RadioGroupItem value="group" id="group-claim" className="mt-1" />
                              <div className="flex-1">
                                <Label htmlFor="group-claim" className="font-medium cursor-pointer">
                                  Group Gifting
                                </Label>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Multiple people can contribute towards this item
                                </p>
                              </div>
                            </div>
                          </RadioGroup>
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
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
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

              {/* Progress Indicators */}
              {totalItems > 0 && (
                <div className="space-y-4">
                  {/* Items Claimed Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Items Claimed</span>
                      <span className="text-muted-foreground">{claimedItems}/{totalItems} ({Math.round(progressPercentage)}%)</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>

                  {/* Funding Progress */}
                  {totalFunding > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Total Raised</span>
                        <span className="text-muted-foreground">
                          {getCurrencySymbol(wishlist.currency)}{raisedFunding.toFixed(0)} / {getCurrencySymbol(wishlist.currency)}{totalFunding.toFixed(0)} ({Math.round(fundingPercentage)}%)
                        </span>
                      </div>
                      <Progress value={fundingPercentage} className="h-2 [&>div]:bg-green-500" />
                    </div>
                  )}
                </div>
              )}
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
                        {completedClaim && (
                          <div className="space-y-2">
                            {!completedClaim.is_anonymous ? (
                              <p className="text-xs text-muted-foreground">
                                Claimed by: {completedClaim.claimer_name}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Claimed anonymously
                              </p>
                            )}
                            
                            {/* Thank You Button (owner only) - Requires migration to be run first */}
                            {/* {isOwner && (
                              <ThankYouDialog
                                claimId={completedClaim.id}
                                claimerName={completedClaim.is_anonymous ? "Anonymous Giver" : completedClaim.claimer_name}
                                itemName={item.name}
                                existingMessage={completedClaim.thank_you_message}
                              />
                            )} */}
                          </div>
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
                        {/* Edit and Delete buttons for owner (only if not claimed) */}
                        {isOwner && !isClaimed && (
                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleEditClick(item)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(item.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </Button>
                          </div>
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

        {/* Cash Funds Section - Requires migration to be run first */}
        {/* {wishlist && (
          <div className="mt-8">
            <CashFunds
              wishlistId={wishlist.id}
              currency={wishlist.currency}
              isOwner={isOwner}
            />
          </div>
        )} */}

        {/* Guest Book Section - Requires migration to be run first */}
        {/* {wishlist && (
          <div className="mt-8">
            <GuestBook
              wishlistId={wishlist.id}
              wishlistOwnerId={wishlist.user_id}
              currentUserId={session?.user?.id}
            />
          </div>
        )} */}
      </main>

      {/* Edit Item Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update the details of your wishlist item
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
            <form onSubmit={handleEditItem} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit_item_name">Item Name *</Label>
                <Input
                  id="edit_item_name"
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_item_description">Description</Label>
                <Textarea
                  id="edit_item_description"
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_price_min">Min Price</Label>
                  <Input
                    id="edit_price_min"
                    type="number"
                    step="0.01"
                    value={itemFormData.price_min}
                    onChange={(e) => setItemFormData({ ...itemFormData, price_min: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_price_max">Max Price</Label>
                  <Input
                    id="edit_price_max"
                    type="number"
                    step="0.01"
                    value={itemFormData.price_max}
                    onChange={(e) => setItemFormData({ ...itemFormData, price_max: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_external_link">Product Link</Label>
                <Input
                  id="edit_external_link"
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
                          id="edit-image-upload"
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
                            document.getElementById('edit-image-upload')?.click();
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
                        id="edit_image_url"
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
              <div className="space-y-2">
                <Label htmlFor="edit_priority">Priority (0-3)</Label>
                <Input
                  id="edit_priority"
                  type="number"
                  min="0"
                  max="3"
                  value={itemFormData.priority}
                  onChange={(e) => setItemFormData({ ...itemFormData, priority: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Higher priority items appear first (3 = highest, 0 = lowest)
                </p>
              </div>

              {/* Claim Type Selection */}
              <div className="space-y-3 pt-2">
                <Label className="text-base font-semibold">Who can claim this item?</Label>
                <RadioGroup
                  value={itemFormData.allow_group_gifting ? "group" : "single"}
                  onValueChange={(value) => 
                    setItemFormData({ ...itemFormData, allow_group_gifting: value === "group" })
                  }
                  className="space-y-3"
                >
                  <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="single" id="edit-single-claim" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="edit-single-claim" className="font-medium cursor-pointer">
                        Single Person
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Only one person can claim and pay for this entire item
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value="group" id="edit-group-claim" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="edit-group-claim" className="font-medium cursor-pointer">
                        Group Gifting
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Multiple people can contribute towards this item
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full shadow-elegant">
                Update Item
              </Button>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WishlistDetail;
