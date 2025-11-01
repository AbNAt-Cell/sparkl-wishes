import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tantml:react-query";

interface ThankYouDialogProps {
  claimId: string;
  claimerName: string;
  itemName: string;
  existingMessage?: string;
}

export const ThankYouDialog: React.FC<ThankYouDialogProps> = ({
  claimId,
  claimerName,
  itemName,
  existingMessage,
}) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(existingMessage || "");

  const sendThankYouMutation = useMutation({
    mutationFn: async (thankYouMessage: string) => {
      const { error } = await supabase
        .from("claims")
        .update({
          thank_you_message: thankYouMessage,
          thank_you_sent_at: new Date().toISOString(),
        })
        .eq("id", claimId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist-items"] });
      toast.success("Thank you message sent!");
      setOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to send thank you: " + (error as Error).message);
    },
  });

  const handleSend = () => {
    if (!message.trim()) {
      toast.error("Please write a message");
      return;
    }
    sendThankYouMutation.mutate(message);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={existingMessage ? "outline" : "default"}
          size="sm"
          className={existingMessage ? "" : "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"}
        >
          <Heart className="w-4 h-4 mr-2" />
          {existingMessage ? "View Thank You" : "Say Thank You"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            Thank You Message
          </DialogTitle>
          <DialogDescription>
            Send a personal thank you to {claimerName} for "{itemName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>{claimerName}</strong> {existingMessage ? "received your message" : "will receive this message"}:
            </p>
            <div className="p-3 bg-white rounded border">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Dear [Name], thank you so much for the wonderful gift! It means the world to us..."
                rows={6}
                className="resize-none border-0 focus-visible:ring-0 p-0"
                disabled={!!existingMessage}
              />
            </div>
          </div>

          {!existingMessage && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Suggested templates:</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage(`Dear ${claimerName},\n\nThank you so much for the ${itemName}! Your generosity means the world to us. We're so grateful to have you celebrate with us.\n\nWith love and appreciation`)}
                >
                  Formal
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage(`Hey ${claimerName}! 🎉\n\nOMG thank you for the ${itemName}! You're the best! Can't wait to use it. Thanks for being part of our special day!\n\nLove you! ❤️`)}
                >
                  Casual
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage(`${claimerName},\n\nYour gift of the ${itemName} is perfect! We're so touched by your thoughtfulness. Thank you for making our celebration extra special.\n\nWarmly`)}
                >
                  Short
                </Button>
              </div>
            </div>
          )}

          {!existingMessage ? (
            <Button
              onClick={handleSend}
              disabled={sendThankYouMutation.isPending || !message.trim()}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600"
            >
              {sendThankYouMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Thank You
                </>
              )}
            </Button>
          ) : (
            <div className="text-center py-3 px-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700">
                ✓ Thank you message sent successfully!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

