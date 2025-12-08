// src/components/ShareButtons.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Facebook,
  X,
  Mail,
  Copy,
  Check,
  QrCode,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

interface ShareButtonsProps {
  shareUrl: string;
  title: string;
  description?: string;
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({ shareUrl, title }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && !qrCodeUrl) generateQRCode();
  }, [open]);

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(shareUrl, {
        width: 512,
        margin: 3,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      setQrCodeUrl(url);
    } catch {
      toast.error("Failed to generate QR code");
    }
  };

  const shareText = `Hi, kindly buy me something on my wishlist\n\n${title}\n\n${shareUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    const a = document.createElement("a");
    a.href = qrCodeUrl;
    a.download = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-wishlist-qr.png`;
    a.click();
    toast.success("QR code downloaded!");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-full shadow-md hover:shadow-lg transition-all hover:scale-110"
          onClick={(e) => e.stopPropagation()}
        >
          <Share2 className="h-4 w-4" />
          <span className="sr-only">Share wishlist</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[92vw] max-w-lg mx-auto max-h-[92vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-center justify-center">
            <Share2 className="w-7 h-7 text-purple-600" />
            Share Wishlist
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-8 py-6">

          {/* Social Buttons – perfect 2×2 grid */}
          <div className="grid grid-cols-2 gap-4">
            <Button className="h-16 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold text-lg justify-start pl-6 rounded-2xl shadow-lg">
              <MessageCircle className="w-8 h-7 mr-4" />
              WhatsApp
            </Button>
            <Button className="h-16 bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold text-lg justify-start pl-6 rounded-2xl shadow-lg">
              <Facebook className="w-8 h-7 mr-4" />
              Facebook
            </Button>
            <Button className="h-16 bg-black hover:bg-gray-800 text-white font-semibold text-lg justify-start pl-6 rounded-2xl shadow-lg">
              <X className="w-8 h-7 mr-4" />
              X (Twitter)
            </Button>
            <Button className="h-16 bg-gray-700 hover:bg-gray-900 text-white font-semibold text-lg justify-start pl-6 rounded-2xl shadow-lg">
              <Mail className="w-6 h-7 mr-4" />
              Email
            </Button>
          </div>

          {/* Copy Link */}
          <div className="space-y-4">
            <p className="text-center text-muted-foreground font-medium">Or copy the link</p>
            <div className="flex gap-3 items-center">
              <div className="flex-1 min-w-0 bg-muted rounded-xl px-5 py-4 text-sm font-medium break-all border">
                {shareUrl}
              </div>
              <Button onClick={handleCopy} size="icon" variant="outline" className="h-14 w-14 rounded-xl">
                {copied ? <Check className="h-6 w-6 text-green-600" /> : <Copy className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-6">
            <p className="text-center text-muted-foreground font-medium">QR Code – perfect for invitations</p>
            <div className="flex justify-center">
              {qrCodeUrl ? (
                <div className="rounded-3xl bg-white p-8 shadow-2xl border-4 border-dashed border-purple-200">
                  <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                </div>
              ) : (
                <div className="w-64 h-64 bg-muted rounded-3xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-purple-600" />
                </div>
              )}
            </div>
            {qrCodeUrl && (
              <Button onClick={handleDownloadQR} variant="outline" className="w-full max-w-sm mx-auto h-12 rounded-xl text-base font-medium">
                <QrCode className="w-5 h-5 mr-2" />
                Download QR Code
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
