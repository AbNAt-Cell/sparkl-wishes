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

  // ... all your existing useEffect, queries, handlers (unchanged) ...

  if (wishlistLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="w-12 h-12 animate-spin" /></div>;
  if (!wishlist) return <div className="text-center py-20"><p>Wishlist not found</p><Button onClick={() => navigate("/dashboard")}>Back</Button></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <Navbar user={session?.user} />
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Your header and items grid – unchanged */}
        {/* ... */}

        {/* ADD ITEM MODAL – FULL WIDTH FIELDS, LONGER MODAL */}
        {isOwner && (
          <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg">
                <Plus className="w-5 h-5 mr-2" /> Add Item
              </Button>
            </DialogTrigger>

            <DialogContent className="w-[95vw] max-w-2xl mx-auto p-6 sm:p-10 rounded-3xl bg-background shadow-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="mb-8 text-left">
                <DialogTitle className="text-3xl font-bold">Add New Item</DialogTitle>
                <DialogDescription className="text-lg text-muted-foreground">
                  Tell your guests what you'd love to receive
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleAddItem} className="space-y-8">
                {/* FULL WIDTH — NO INNER PADDING */}
                <div className="space-y-2">
                  <Label className="text-lg font-medium">Item Name *</Label>
                  <Input
                    value={itemFormData.name}
                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                    required
                    placeholder="e.g. Wireless Headphones"
                    className="h-14 text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-lg font-medium">Description</Label>
                  <Textarea
                    rows={5}
                    value={itemFormData.description}
                    onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                    placeholder="Any color, size, model, or why you love it..."
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
                  <Label className="text-lg font-medium">Item Image (Optional)</Label>
                  {imagePreview ? (
                    <div className="relative rounded-2xl overflow-hidden border-4 border-dashed border-primary/20">
                      <img src={imagePreview} alt="Preview" className="w-full aspect-video object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-4 right-4 rounded-full h-12 w-12 shadow-2xl"
                        onClick={handleRemoveImage}
                      >
                        <X className="w-6 h-6" />
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border-4 border-dashed border-muted-foreground/30 p-10 text-center bg-muted/10 space-y-6">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="mx-auto max-w-md cursor-pointer file:mr-6 file:py-4 file:px-8 file:rounded-full file:border-0 file:bg-primary file:text-primary-foreground text-lg"
                      />
                      <p className="text-lg text-muted-foreground">or paste image URL</p>
                      <Input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={itemFormData.image_url}
                        onChange={(e) => {
                          const url = e.target.value;
                          setItemFormData({ ...itemFormData, image_url: url });
                          if (url) setImagePreview(url);
                        }}
                        className="h-14 text-lg"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <Label className="text-xl font-semibold">Who can claim this item?</Label>
                  <RadioGroup
                    value={itemFormData.allow_group_gifting ? "group" : "single"}
                    onValueChange={(v) => setItemFormData({ ...itemFormData, allow_group_gifting: v === "group" })}
                    className="space-y-4"
                  >
                    <div className="flex items-center space-x-5 rounded-2xl border bg-card p-6 hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="single" id="single" className="w-6 h-6" />
                      <Label htmlFor="single" className="cursor-pointer flex-1 text-lg font-medium">
                        Single Person
                        <p className="text-base text-muted-foreground font-normal mt-1">One guest buys the full gift</p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-5 rounded-2xl border bg-card p-6 hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value="group" id="group" className="w-6 h-6" />
                      <Label htmlFor="group" className="cursor-pointer flex-1 text-lg font-medium">
                        Group Gifting
                        <p className="text-base text-muted-foreground font-normal mt-1">Friends contribute together</p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button type="submit" size="lg" className="w-full h-16 text-xl font-bold shadow-2xl hover:shadow-3xl transition-all">
                  Add Item
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* EDIT MODAL – SAME FULL-WIDTH STYLE */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl mx-auto p-6 sm:p-10 rounded-3xl bg-background shadow-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-3xl font-bold">Edit Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditItem} className="space-y-8">
              {/* Same full-width fields as above */}
              <Button type="submit" size="lg" className="w-full h-16 text-xl font-bold shadow-2xl">
                Update Item
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
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
