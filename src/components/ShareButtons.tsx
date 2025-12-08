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

export const ShareButtons: React.FC<ShareButtonsProps> = ({
  shareUrl,
  title,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && !qrCodeUrl) {
      generateQRCode();
    }
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

      {/* Optimized: Tighter mobile width, strict max bounds, and responsive QR */}
      <DialogContent className="max-w-lg w-[90vw] max-w-[90vw] max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl font-semibold">
            <Share2 className="w-6 h-6 text-purple-600" />
            Share Wishlist
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-7 py-4">
          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() =>
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(shareText)}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              className="h-14 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium text-base justify-start"
            >
              <MessageCircle className="w-6 h-6 mr-3" />
              WhatsApp
            </Button>

            <Button
              onClick={() =>
                window.open(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                  "_blank"
                )
              }
              className="h-14 bg-[#1877F2] hover:bg-[#166fe5] text-white font-medium text-base justify-start"
            >
              <Facebook className="w-6 h-6 mr-3" />
              Facebook
            </Button>

            <Button
              onClick={() =>
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    "Hi, kindly buy me something on my wishlist\n\n" + title
                  )}&url=${encodeURIComponent(shareUrl)}`,
                  "_blank"
                )
              }
              className="h-14 bg-black hover:bg-gray-800 text-white font-medium text-base justify-start"
            >
              <X className="w-6 h-6 mr-3" />
              X (Twitter)
            </Button>

            <Button
              onClick={() => {
                window.location.href = `mailto:?subject=${encodeURIComponent(
                  "My Wishlist: " + title
                )}&body=${encodeURIComponent(shareText)}`;
              }}
              className="h-14 bg-gray-700 hover:bg-gray-800 text-white font-medium text-base justify-start"
            >
              <Mail className="w-6 h-6 mr-3" />
              Email
            </Button>
          </div>

          {/* Copy Link */}
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-muted-foreground">
              Or copy the link
            </p>
            <div className="flex gap-3">
              <div className="flex-1 min-w-0 truncate rounded-lg border bg-muted px-4 py-3 text-sm font-mono break-all">
                {shareUrl}
              </div>
              <Button onClick={handleCopy} variant="outline" size="icon" className="h-12 w-12 flex-shrink-0">
                {copied ? (
                  <Check className="h-5 w-5 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-5">
            <p className="text-center text-sm font-medium text-muted-foreground">
              QR Code – perfect for invitations
            </p>
            <div className="flex flex-col items-center">
              {qrCodeUrl ? (
                <>
                  <div className="rounded-2xl border-2 border-dashed border-purple-200 bg-white p-6 shadow-xl">
                    <img 
                      src={qrCodeUrl} 
                      alt="Wishlist QR Code" 
                      className="w-full max-w-64 h-auto max-h-[70vh] object-contain" 
                    />
                  </div>
                  <Button onClick={handleDownloadQR} variant="outline" className="mt-6 w-full max-w-xs">
                    <QrCode className="w-5 h-5 mr-2" />
                    Download QR Code
                  </Button>
                </>
              ) : (
                <div className="flex h-64 w-64 max-w-full items-center justify-center rounded-2xl bg-muted">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
