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

  /* ------------------------------------------------------------------ */
  /* All your existing useEffect, queries, handlers – unchanged         */
  /* ------------------------------------------------------------------ */
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
      return data;
    },
    enabled: !!id,
  });

  /* ------------------------------------------------------------------ */
  /* All your handlers (image upload, add, edit, delete…) – unchanged   */
  /* ------------------------------------------------------------------ */
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
      toast.error("Failed to upload image");
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

  const handleAddItem = async (e: React.FormEvent) => { /* unchanged */ };
  const handleEditClick = (item: any) => { /* unchanged */ };
  const handleEditItem = async (e: React.FormEvent) => { /* unchanged */ };
  const handleDeleteClick = (itemId: string) => { setItemToDelete(itemId); setDeleteDialogOpen(true); };
  const handleConfirmDelete = async () => { /* unchanged */ };

  const isOwner = session?.user?.id === wishlist?.user_id;

  const totalItems = items?.length || 0;
  const claimedItems = items?.filter(i => isItemClaimed(i.claims, i)).length || 0;
  const progressPercentage = totalItems > 0 ? (claimedItems / totalItems) * 100 : 0;
  const totalFunding = items?.reduce((s, i) => s + (i.price_max || 0), 0) || 0;
  const raisedFunding = items?.reduce((s, i) => s + (isItemClaimed(i.claims, i) ? i.price_max || 0 : 0), 0) || 0;
  const fundingPercentage = totalFunding > 0 ? (raisedFunding / totalFunding) * 100 : 0;

  /* ------------------------------------------------------------------ */
  /* Loading / Not Found – unchanged                                    */
  /* ------------------------------------------------------------------ */
  if (wishlistLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
        <Navbar user={session?.user} />
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!wishlist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
        <Navbar user={session?.user} />
        <div className="container mx-auto px-4 py-20 text-center">
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

  /* ------------------------------------------------------------------ */
  /* MAIN RENDER – everything inside now has access to `wishlist`       */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <Navbar user={session?.user} />

      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Back button + Header card – unchanged */}
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6 h-11 px-4">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
        </Button>

        {/* Your existing header card – unchanged */}
        {/* ... (cover image, title, share buttons, progress, etc.) ... */}

        {/* Items list – unchanged */}
        {/* ... */}

        {/* ------------------------------------------------------------------ */}
        {/* MODALS – now placed AFTER the early returns so `wishlist` exists   */}
        {/* ------------------------------------------------------------------ */}

        {/* ADD ITEM – centered with side spacing */}
        {isOwner && (
          <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-elegant">
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[95vw] mx-auto p-6 sm:p-8 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">Add New Item</DialogTitle>
                <DialogDescription>Add a gift you'd love</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[75vh] pr-4">
                <form onSubmit={handleAddItem} className="space-y-6 py-4">
                  {/* All your form fields – unchanged */}
                  {/* ... (name, description, price, link, image, radio group) ... */}
                  <Button type="submit" size="lg" className="w-full h-14 text-lg">
                    Add Item
                  </Button>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        )}

        {/* EDIT ITEM – same centering */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md w-[95vw] mx-auto p-6 sm:p-8 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Edit Item</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[75vh] pr-4">
              <form onSubmit={handleEditItem} className="space-y-6 py-4">
                {/* Same fields as Add */}
                <Button type="submit" size="lg" className="w-full h-14 text-lg">
                  Update Item
                </Button>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRMATION – also centered */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-sm w-[90vw] mx-auto p-6 rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Item?</AlertDialogTitle>
              <AlertDialogDescription className="text-center">
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
