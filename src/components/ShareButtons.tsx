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
        color: { dark: "#000000", light: "#FFFFFF" },
      });
      setQrCodeUrl(url);
    } catch (error) {
      toast.error("Failed to generate QR code");
    }
  };

  const handleDialogOpen = (open: boolean) => {
    setDialogOpen(open);
    if (open && !qrCodeUrl) generateQRCode();
  };

  const shareText = description
    ? `${title}\n\n${description}\n\n${shareUrl}`
    : `Check out my wishlist: ${title}\n\n${shareUrl}`;

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
    toast.success("Opening WhatsApp...");
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "width=600,height=400");
    toast.success("Opening Facebook...");
  };

  const handleTwitterShare = () => {
    const text = `Check out my wishlist: ${title}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(
      shareUrl
    )}`;
    window.open(url, "_blank", "width=600,height=400");
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

    const link = document.createElement("a");
    link.download = `${title.replace(/\s+/g, "-")}-qr-code.png`;
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
