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
    } catch (err) {
      toast.error("Failed to generate QR code");
    }
  };

  // Message that will be shared
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

      <DialogContent className="max-w-lg w-[95vw] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl font-semibold">
            <Share2 className="w-6 h-6 text-purple-600" />
            Share Wishlist
          </DialogTitle
