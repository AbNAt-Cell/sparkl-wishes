import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PriceInput } from "@/components/ui/price-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react";
import { getCurrencySymbol } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

const EditWishlistItem = () => {
  const navigate = useNavigate();
  const { id, itemId } = useParams<{ id: string; itemId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const { data: wishlist } = useQuery({
    queryKey: ["wishlist", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("wishlists").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: item, isLoading: itemLoading } = useQuery({
    queryKey: ["wishlist-item", itemId],
    queryFn: async () => {
      const { data, error } = await supabase.from("wishlist_items").select("*, claims(*)").eq("id", itemId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!itemId,
  });

  const isOwner = session?.user?.id === wishlist?.user_id;
  const isClaimed = item?.claims && Array.isArray(item.claims) && item.claims.length > 0 && 
    item.claims.some((c: any) => c.payment_status === "completed" || c.payment_status === "pending");

  useEffect(() => {
    if (item) {
      setItemFormData({
        name: item.name || "",
        description: item.description || "",
        price_min: item.price_min?.toString() || "",
        price_max: item.price_max?.toString() || "",
        external_link: item.external_link || "",
        image_url: item.image_url || "",
        allow_group_gifting: !!item.allow_group_gifting,
      });
      setImagePreview(item.image_url || null);
    }
  }, [item]);

  useEffect(() => {
    if (wishlist && !isOwner) {
      toast.error("You don't have permission to edit items in this wishlist");
      navigate(`/wishlist/${id}`);
    }
    if (item && isClaimed) {
      toast.error("Cannot edit claimed items");
      navigate(`/wishlist/${id}`);
    }
  }, [wishlist, isOwner, item, isClaimed, id, navigate]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("wishlist_items").update({
        name: itemFormData.name,
        description: itemFormData.description || null,
        price_min: itemFormData.price_min ? parseFloat(itemFormData.price_min) : null,
        price_max: itemFormData.price_max ? parseFloat(itemFormData.price_max) : null,
        external_link: itemFormData.external_link || null,
        image_url: itemFormData.image_url || null,
        allow_group_gifting: itemFormData.allow_group_gifting,
      }).eq("id", itemId);
      
      if (error) throw error;
      
      toast.success("Item updated!");
      navigate(`/wishlist/${id}`);
    } catch (error) {
      toast.error("Update failed");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <Navbar user={session?.user} />
      
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(`/wishlist/${id}`)} className="mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Wishlist
        </Button>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl">Edit Item</CardTitle>
            <CardDescription className="text-lg">Update your item details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    <Button type="button" variant="destructive" size="icon" className="absolute top-4 right-4" onClick={handleRemoveImage}>
                      <X />
                    </Button>
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

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(`/wishlist/${id}`)} className="flex-1 h-14 text-lg">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 h-14 text-lg font-bold" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                  Update Item
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EditWishlistItem;



