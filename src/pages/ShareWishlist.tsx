import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageCircle,
  Facebook,
  X,
  Mail,
  Copy,
  Check,
  QrCode,
  Share2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ShareWishlist = () => {
  const navigate = useNavigate();
  const { shareCode } = useParams<{ shareCode: string }>();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: wishlist } = useQuery({
    queryKey: ["shared-wishlist", shareCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("*")
        .eq("share_code", shareCode!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!shareCode,
  });

  const shareUrl = wishlist ? `${window.location.origin}/share/${shareCode}` : "";
  const shareText = wishlist ? `Hi, kindly buy me something on my wishlist\n\n${wishlist.title}\n\n${shareUrl}` : "";

  useEffect(() => {
    if (shareUrl) {
      generateQRCode();
    }
  }, [shareUrl]);

  const generateQRCode = async () => {
    if (!shareUrl) return;
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
    if (!qrCodeUrl || !wishlist) return;
    const a = document.createElement("a");
    a.href = qrCodeUrl;
    a.download = `${wishlist.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-wishlist-qr.png`;
    a.click();
    toast.success("QR code downloaded!");
  };

  if (!wishlist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center">Wishlist not found</p>
            <Button onClick={() => navigate("/")} className="w-full mt-4">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-primary/5">
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Button>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-3xl font-semibold">
              <Share2 className="w-8 h-8 text-purple-600" />
              Share Wishlist
            </CardTitle>
            <CardDescription className="text-lg">{wishlist.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Social Buttons */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Share on Social Media</h3>
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
                        "Hi, kindly buy me something on my wishlist\n\n" + wishlist.title
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
                      "My Wishlist: " + wishlist.title
                    )}&body=${encodeURIComponent(shareText)}`;
                  }}
                  className="h-14 bg-gray-700 hover:bg-gray-800 text-white font-medium text-base justify-start"
                >
                  <Mail className="w-6 h-6 mr-3" />
                  Email
                </Button>
              </div>
            </div>

            {/* Copy Link */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Copy Link</h3>
              <div className="flex gap-3">
                <div className="flex-1 truncate rounded-lg border bg-muted px-4 py-3 text-sm font-mono break-all">
                  {shareUrl}
                </div>
                <Button onClick={handleCopy} variant="outline" size="icon" className="h-12 w-12">
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
              <h3 className="text-lg font-semibold">QR Code – perfect for invitations</h3>
              <div className="flex flex-col items-center">
                {qrCodeUrl ? (
                  <>
                    <div className="rounded-2xl border-2 border-dashed border-purple-200 bg-white p-6 shadow-xl">
                      <img src={qrCodeUrl} alt="Wishlist QR Code" className="w-64 h-64" />
                    </div>
                    <Button onClick={handleDownloadQR} variant="outline" className="mt-6 w-full max-w-xs">
                      <QrCode className="w-5 h-5 mr-2" />
                      Download QR Code
                    </Button>
                  </>
                ) : (
                  <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-muted">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ShareWishlist;

