// src/pages/CreateWishlistItem.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PriceInput } from "@/components/ui/price-input";
import { toast } from "sonner";
import { ArrowLeft, Upload, X } from "lucide-react";
import { getCurrencySymbol } from "@/lib/utils";

const CreateWishlistItem = () => {
  const { id: wishlistId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");

  const [formData, setFormData] = useState({
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

    // Fetch wishlist currency
    if (wishlistId) {
      supabase
        .from("wishlists")
        .select("currency")
        .eq("id", wishlistId)
        .single()
        .then(({ data }) => {
          if (data?.currency) setCurrency(data.currency);
        });
    }
  }, [wishlistId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.user) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from("wishlist-items").upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("wishlist-items").getPublicUrl(fileName);
      setFormData({ ...formData, image_url: publicUrl });
      setImagePreview(publicUrl);
      toast.success("Image uploaded!");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishlistId) return;

    const { error } = await supabase.from("wishlist_items").insert({
      wishlist_id: wishlistId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      price_min: formData.price_min ? parseFloat(formData.price_min) : null,
      price_max: formData.price_max ? parseFloat(formData.price_max) : null,
      external_link: formData.external_link || null,
      image_url: formData.image_url || null,
      allow_group_gifting: formData.allow_group_gifting,
    });

    if (error) {
      toast.error("Failed to add item");
    } else {
      toast.success("Item added successfully!");
      navigate(`/wishlist/${wishlistId}`);
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <Navbar user={session.user} />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Wishlist
        </Button>

        <Card className="shadow-elegant">
          <CardHeader className="text-center pb-10">
            <CardTitle className="text-4xl font-bold">Add New Item</CardTitle>
            <CardDescription className="text-lg mt-3">
              Tell your guests what you'd love to receive
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Item Name */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">Item Name *</Label>
                <Input
                  required
                  placeholder="e.g. AirPods Pro, KitchenAid Mixer..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-14 text-lg"
                />
              </div>

              {/* Description */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">Description</Label>
                <Textarea
                  rows={5}
                  placeholder="Color, size, model, brand, any details your guests should know..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="resize-none text-lg min-h-32"
                />
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-lg font-semibold">Minimum Price</Label>
                  <PriceInput
                    value={formData.price_min}
                    onChange={(v) => setFormData({ ...formData, price_min: v })}
                    currencySymbol={getCurrencySymbol(currency)}
                    className="h-14 text-lg"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-lg font-semibold">Maximum Price</Label>
                  <PriceInput
                    value={formData.price_max}
                    onChange={(v) => setFormData({ ...formData, price_max: v })}
                    currencySymbol={getCurrencySymbol(currency)}
                    className="h-14 text-lg"
                  />
                </div>
              </div>

              {/* External Link */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">Product Link (Optional)</Label>
                <Input
                  type="url"
                  placeholder="https://amazon.com/..."
                  value={formData.external_link}
                  onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                  className="h-14 text-lg"
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Image (Optional)</Label>
                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-4 border-dashed">
                    <img src={imagePreview} alt="Preview" className="w-full aspect-video object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-4 right-4"
                      onClick={() => {
                        setImagePreview(null);
                        setFormData({ ...formData, image_url: "" });
                      }}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-4 border-dashed rounded-2xl p-12 text-center bg-muted/10">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="mx-auto"
                    />
                    <p className="text-muted-foreground mt-4">or paste image URL below</p>
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={formData.image_url}
                      onChange={(e) => {
                        const url = e.target.value;
                        setFormData({ ...formData, image_url: url });
                        if (url) setImagePreview(url);
                      }}
                      className="mt-4 h-14"
                    />
                  </div>
                )}
              </div>

              {/* Group Gifting */}
              <div className="space-y-6">
                <Label className="text-xl font-bold">Who can contribute?</Label>
                <RadioGroup
                  value={formData.allow_group_gifting ? "group" : "single"}
                  onValueChange={(v) => setFormData({ ...formData, allow_group_gifting: v === "group" })}
                >
                  <div className="flex items-center space-x-4 border rounded-2xl p-6 hover:bg-muted/5 transition">
                    <RadioGroupItem value="single" id="single" />
                    <Label htmlFor="single" className="cursor-pointer text-lg font-medium flex-1">
                      Single Person Only
                    </Label>
                  </div>
                  <div className="flex items-center space-x-4 border rounded-2xl p-6 hover:bg-muted/5 transition">
                    <RadioGroupItem value="group" id="group" />
                    <Label htmlFor="group" className="cursor-pointer text-lg font-medium flex-1">
                      Group Gifting Allowed
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1 h-14 text-lg"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="lg" className="flex-1 h-14 text-lg font-bold shadow-elegant">
                  Add Item to Wishlist
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateWishlistItem;
