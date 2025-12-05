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

  // ... [all your existing useEffect, queries, handlers remain unchanged] ...

  const isOwner = session?.user?.id === wishlist?.user_id;

  // ... [all calculations remain the same] ...

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <Navbar user={session?.user} />

      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Your existing header and items grid - unchanged */}
        {/* ... */}

        {/* ADD ITEM MODAL - Perfectly centered on mobile */}
        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-elegant">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md mx-auto w-[95vw] sm:w-full p-6 sm:p-8 rounded-2xl shadow-2xl">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl">Add New Item</DialogTitle>
              <DialogDescription className="text-base">
                Tell your guests what you'd love to receive
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[75vh] pr-4">
              <form onSubmit={handleAddItem} className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="add-name">Item Name *</Label>
                  <Input
                    id="add-name"
                    value={itemFormData.name}
                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                    required
                    className="h-12 text-base"
                    placeholder="e.g. Wireless Headphones"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-desc">Description</Label>
                  <Textarea
                    id="add-desc"
                    rows={4}
                    value={itemFormData.description}
                    onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                    placeholder="Any color, size, or model preference?"
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-min">Min Price</Label>
                    <PriceInput
                      id="add-min"
                      value={itemFormData.price_min}
                      onChange={(v) => setItemFormData({ ...itemFormData, price_min: v })}
                      currencySymbol={getCurrencySymbol(wishlist?.currency || "NGN")}
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-max">Max Price</Label>
                    <PriceInput
                      id="add-max"
                      value={itemFormData.price_max}
                      onChange={(v) => setItemFormData({ ...itemFormData, price_max: v })}
                      currencySymbol={getCurrencySymbol(wishlist?.currency || "NGN")}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-link">Product Link</Label>
                  <Input
                    id="add-link"
                    type="url"
                    value={itemFormData.external_link}
                    onChange={(e) => setItemFormData({ ...itemFormData, external_link: e.target.value })}
                    placeholder="https://..."
                    className="h-12"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Item Image (Optional)</Label>
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border-2 border-dashed">
                      <img src={imagePreview} alt="Preview" className="w-full aspect-video object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-3 right-3 rounded-full h-9 w-9"
                        onClick={handleRemoveImage}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-xl p-6 text-center space-y-4">
                      <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                      <p className="text-sm text-muted-foreground">or paste image URL below</p>
                      <Input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={itemFormData.image_url}
                        onChange={(e) => {
                          const url = e.target.value;
                          setItemFormData({ ...itemFormData, image_url: url });
                          if (url) setImagePreview(url);
                        }}
                        className="h-12"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Who can claim this?</Label>
                  <RadioGroup
                    value={itemFormData.allow_group_gifting ? "group" : "single"}
                    onValueChange={(v) => setItemFormData({ ...itemFormData, allow_group_gifting: v === "group" })}
                  >
                    <div className="flex items-center space-x-3 rounded-lg border p-4">
                      <RadioGroupItem value="single" id="single-add" />
                      <Label htmlFor="single-add" className="cursor-pointer flex-1">
                        Single Person
                        <p className="text-sm text-muted-foreground font-normal">One person buys the full gift</p>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 rounded-lg border p-4">
                      <RadioGroupItem value="group" id="group-add" />
                      <Label htmlFor="group-add" className="cursor-pointer flex-1">
                        Group Gifting
                        <p className="text-sm text-muted-foreground font-normal">Friends chip in together</p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button type="submit" size="lg" className="w-full h-14 text-lg font-medium">
                  Add Item
                </Button>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* EDIT ITEM MODAL - Same perfect mobile centering */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md mx-auto w-[95vw] sm:w-full p-6 sm:p-8 rounded-2xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Edit Item</DialogTitle>
              <DialogDescription>Update your wishlist item</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[75vh] pr-4">
              <form onSubmit={handleEditItem} className="space-y-6 py-4">
                {/* Same fields as Add modal */}
                <Button type="submit" size="lg" className="w-full h-14 text-lg font-medium">
                  Update Item
                </Button>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRMATION - Also perfectly centered */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-sm mx-auto w-[90vw] p-6 rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Item?</AlertDialogTitle>
              <AlertDialogDescription className="text-base text-center">
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-3 mt-6">
              <AlertDialogCancel className="w-full h-12">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="w-full h-12 bg-destructive hover:bg-destructive/90">
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
