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
import { Badge } from "@/components/ui/badge";
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
  description,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  // Generate QR only when dialog opens
  useEffect(() => {
    if (open && !qrCodeUrl) {
      generateQRCode();
    }
  }, [open]);

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(shareUrl, {
        width: 512,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      setQrCodeUrl(url);
    } catch (err) {
      toast.error("Failed to generate QR code");
    }
  };

  const shareText = description
    ? `${title}\n\n${description}\n\n${shareUrl}`
    : `${title}\nCheck it out: ${shareUrl}`;

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
    a.download = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-qr.png`;
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

      <DialogContent className="max-w-md w-[95vw] rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Share2 className="w-5 h-5 text-purple-600" />
            Share "{title}"
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() =>
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(shareText)}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              className="h-12 bg-[#25D366] hover:bg-[#128C7E] text-white font-medium"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              WhatsApp
            </Button>

            <Button
              onClick={() =>
                window.open(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                  "_blank",
                  "width=600,height=400"
                )
              }
              className="h-12 bg-[#1877F2] hover:bg-[#166fe5] text-white font-medium"
            >
              <Facebook className="w-5 h-5 mr-2" />
              Facebook
            </Button>

            <Button
              onClick={() =>
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    title
                  )}&url=${encodeURIComponent(shareUrl)}`,
                  "_blank",
                  "width=600,height=400"
                )
              }
              className="h-12 bg-black hover:bg-gray-800 text-white font-medium"
            >
              <X className="w-5 h-5 mr-2" />
              X (Twitter)
            </Button>

            <Button
              onClick={() => {
                window.location.href = `mailto:?subject=${encodeURIComponent(
                  title
                )}&body=${encodeURIComponent(shareText)}`;
              }}
              className="h-12 bg-gray-700 hover:bg-gray-800 text-white font-medium"
            >
              <Mail className="w-5 h-5 mr-2" />
              Email
            </Button>
          </div>

          {/* Copy Link */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-center text-muted-foreground">
              Or copy link
            </p>
            <div className="flex gap-2">
              <div className="flex-1 truncate rounded-lg border bg-muted px-3 py-2.5 text-sm font-mono">
                {shareUrl}
              </div>
              <Button onClick={handleCopy} variant="outline" size="icon">
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-center text-muted-foreground">
              QR Code
            </p>
            <div className="flex flex-col items-center">
              {qrCodeUrl ? (
                <>
                  <div className="rounded-xl border bg-white p-4 shadow-inner">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                  <Button
                    onClick={handleDownloadQR}
                    variant="outline"
                    className="mt-4 w-full max-w-xs"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Download QR Code
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center max-w-xs">
                    Great for printing on invitations or thank-you cards!
                  </p>
                </>
              ) : (
                <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-muted">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
