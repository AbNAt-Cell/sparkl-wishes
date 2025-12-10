// src/pages/CreateWishlist.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { ArrowLeft } from "lucide-react";

const CreateWishlist = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    event_type: "wedding" as const,
    event_date: "",
    currency: "USD" as const,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const ensureProfileExists = async (userId: string, user: Session["user"]) => {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!profile) {
      const { error } = await supabase.from("profiles").insert({
        id: userId,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        avatar_url: user.user_metadata?.avatar_url || null,
      });
      if (error) return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    const title = formData.title.trim();
    if (!title) {
      toast.error("Please enter a wishlist title");
      return;
    }

    setIsLoading(true);

    const profileOk = await ensureProfileExists(session.user.id, session.user);
    if (!profileOk) {
      toast.error("Profile setup failed. Try again.");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("wishlists")
      .insert({
        title,
        description: formData.description.trim() || null,
        event_type: formData.event_type,
        event_date: formData.event_date || null,
        currency: formData.currency,
        user_id: session.user.id,
      })
      .select()
      .single();

    setIsLoading(false);

    if (error) {
      toast.error("Failed to create wishlist: " + error.message);
    } else {
      toast.success("Wishlist created!");
      navigate(`/wishlist/${data.id}`);
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <Navbar user={session.user} />

      {/* Centered Card Container */}
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6 text-lg"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="shadow-2xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-pink-500/10 text-center py-10">
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-pink-600 bg-clip-text text-transparent">
              Create Your Wishlist
            </CardTitle>
            <CardDescription className="text-lg mt-3 max-w-2xl mx-auto">
              Share your dreams with loved ones — wedding, birthday, baby shower, and more
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Title */}
              <div className="space-y-3">
                <Label htmlFor="title" className="text-lg font-semibold">
                  Wishlist Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Our Wedding Registry 2025"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  maxLength={100}
                  className="h-14 text-lg"
                />
                <p className="text-sm text-muted-foreground text-right">
                  {formData.title.length}/100
                </p>
              </div>

              {/* Event Type */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">Event Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(v) => setFormData({ ...formData, event_type: v as any })}
                >
                  <SelectTrigger className="h-14 text-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="anniversary">Anniversary</SelectItem>
                    <SelectItem value="baby_shower">Baby Shower</SelectItem>
                    <SelectItem value="graduation">Graduation</SelectItem>
                    <SelectItem value="housewarming">Housewarming</SelectItem>
                    <SelectItem value="christmas">Christmas</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Event Date */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">Event Date (Optional)</Label>
                <Input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="h-14 text-lg"
                />
              </div>

              {/* Currency */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => setFormData({ ...formData, currency: v as any })}
                >
                  <SelectTrigger className="h-14 text-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                    <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <Label className="text-lg font-semibold">Description (Optional)</Label>
                <Textarea
                  placeholder="Share a little about your special occasion..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  className="resize-none text-lg"
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="flex-1 h-14 text-lg font-medium"
                  onClick={() => navigate("/dashboard")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isLoading || !formData.title.trim()}
                  className="flex-1 h-14 text-lg font-bold shadow-elegant"
                >
                  {isLoading ? "Creating..." : "Create Wishlist"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateWishlist;
