import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Share2, MessageCircle, Facebook, Twitter, QrCode, Mail, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

interface ShareButtonsProps {
  shareUrl: string;
  title: string;
  description?: string;
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({ shareUrl, title, description }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(shareUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      toast.error("Failed to generate QR code");
    }
  };

  const handleDialogOpen = (open: boolean) => {
    setDialogOpen(open);
    if (open && !qrCodeUrl) {
      generateQRCode();
    }
  };

  const shareText = description 
    ? `${title}\n\n${description}\n\n${shareUrl}`
    : `Check out my wishlist: ${title}\n\n${shareUrl}`;

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
    toast.success("Opening WhatsApp...");
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    toast.success("Opening Facebook...");
  };

  const handleTwitterShare = () => {
    const text = `Check out my wishlist: ${title}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    toast.success("Opening Twitter...");
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out my wishlist: ${title}`);
    const body = encodeURIComponent(shareText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast.success("Opening email client...");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '-')}-qr-code.png`;
    link.href = qrCodeUrl;
    link.click();
    toast.success("QR code downloaded!");
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Your Wishlist
          </DialogTitle>
          <DialogDescription>
            Share your wishlist with friends and family
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Social Share Buttons */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Share via</h4>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleWhatsAppShare}
                className="bg-green-500 hover:bg-green-600 text-white"
                size="lg"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                WhatsApp
              </Button>
              <Button
                onClick={handleFacebookShare}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Facebook className="w-5 h-5 mr-2" />
                Facebook
              </Button>
              <Button
                onClick={handleTwitterShare}
                className="bg-sky-500 hover:bg-sky-600 text-white"
                size="lg"
              >
                <Twitter className="w-5 h-5 mr-2" />
                Twitter
              </Button>
              <Button
                onClick={handleEmailShare}
                className="bg-gray-600 hover:bg-gray-700 text-white"
                size="lg"
              >
                <Mail className="w-5 h-5 mr-2" />
                Email
              </Button>
            </div>
          </div>

          {/* Copy Link */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Or copy link</h4>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-muted rounded-md text-sm truncate border">
                {shareUrl}
              </div>
              <Button onClick={handleCopyLink} variant="outline" size="icon">
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">QR Code</h4>
            {qrCodeUrl ? (
              <div className="space-y-3">
                <div className="flex justify-center p-4 bg-white border rounded-lg">
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                </div>
                <Button onClick={handleDownloadQR} variant="outline" className="w-full">
                  <QrCode className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Print this QR code on invitations for easy access!
                </p>
              </div>
            ) : (
              <div className="flex justify-center p-8 bg-muted rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

