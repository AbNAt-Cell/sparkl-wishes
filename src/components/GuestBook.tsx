import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send, Loader2, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";
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

interface GuestBookProps {
  wishlistId: string;
  wishlistOwnerId?: string;
  currentUserId?: string;
}

interface Comment {
  id: string;
  commenter_name: string;
  commenter_email?: string;
  comment_text: string;
  is_anonymous: boolean;
  created_at: string;
}

export const GuestBook: React.FC<GuestBookProps> = ({ wishlistId, wishlistOwnerId, currentUserId }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    comment: "",
    isAnonymous: false,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // Fetch comments
  const { data: comments, isLoading } = useQuery({
    queryKey: ["wishlist-comments", wishlistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist_comments")
        .select("*")
        .eq("wishlist_id", wishlistId)
        .is("item_id", null) // Only get general wishlist comments, not item-specific
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Comment[];
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("wishlist_comments")
        .insert({
          wishlist_id: wishlistId,
          commenter_name: data.name,
          commenter_email: data.email || null,
          comment_text: data.comment,
          is_anonymous: data.isAnonymous,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-comments", wishlistId] });
      toast.success("Comment added successfully!");
      setFormData({ name: "", email: "", comment: "", isAnonymous: false });
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to add comment: " + (error as Error).message);
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("wishlist_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-comments", wishlistId] });
      toast.success("Comment deleted successfully!");
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
    },
    onError: (error) => {
      toast.error("Failed to delete comment: " + (error as Error).message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.comment.trim()) {
      toast.error("Please fill in required fields");
      return;
    }
    addCommentMutation.mutate(formData);
  };

  const handleDeleteClick = (commentId: string) => {
    setCommentToDelete(commentId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (commentToDelete) {
      deleteCommentMutation.mutate(commentToDelete);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isOwner = currentUserId === wishlistOwnerId;

  return (
    <Card className="shadow-md border-0 bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <CardTitle className="text-xl">Guest Book</CardTitle>
          </div>
          <Button
            onClick={() => setIsOpen(!isOpen)}
            size="sm"
            variant={isOpen ? "outline" : "default"}
          >
            {isOpen ? "Cancel" : "Leave a Message"}
          </Button>
        </div>
        <CardDescription>
          {comments?.length || 0} {(comments?.length || 0) === 1 ? "message" : "messages"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        {isOpen && (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-purple-50/30 to-pink-50/30">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comment">Your Message *</Label>
                  <Textarea
                    id="comment"
                    value={formData.comment}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    required
                    placeholder="Leave a congratulatory message or well-wishes..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="anonymous"
                    checked={formData.isAnonymous}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isAnonymous: checked as boolean })
                    }
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="anonymous" className="cursor-pointer font-medium text-sm">
                      Post anonymously
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Your name won't be displayed (only visible to wishlist owner)
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={addCommentMutation.isPending}
                >
                  {addCommentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Post Message
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Comments List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : comments && comments.length > 0 ? (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {comments.map((comment) => (
                  <Card key={comment.id} className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600">
                          <AvatarFallback className="text-white font-semibold">
                            {comment.is_anonymous ? "?" : getInitials(comment.commenter_name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-sm">
                                {comment.is_anonymous ? "Anonymous" : comment.commenter_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(comment.created_at, 'long')}
                              </p>
                            </div>
                            {isOwner && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteClick(comment.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {comment.comment_text}
                          </p>
                          
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground hover:text-rose-600"
                            >
                              <Heart className="w-3 h-3 mr-1" />
                              Like
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
              <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground font-medium">No messages yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Be the first to leave a congratulatory message!
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
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
    </Card>
  );
};

