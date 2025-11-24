import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ShareButtonsProps {
  shareUrl: string;
  qrCodeUrl: string;
}

export default function ShareButtons({ shareUrl, qrCodeUrl }: ShareButtonsProps) {
  const [open, setOpen] = useState(false);

  const handleWhatsAppShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const handleFacebookShare = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  const handleTwitterShare = () => {
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
  };

  const handleEmailShare = () => {
    window.location.href = `mailto:?subject=Check this out&body=${encodeURIComponent(
      shareUrl
    )}`;
  };

  const handleDownloadQR = () => {
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = "qr-code.png";
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white w-full h-12">
          Share
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md w-[calc(100vw-2rem)] sm:w-full max-h-[90vh] overflow-y-auto p-6 rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-center">Share This Card</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">

          {/* QR Code */}
          <div className="flex justify-center">
            <img
              src={qrCodeUrl}
              alt="QR Code"
              className="w-40 h-40 rounded-lg border p-2 bg-white"
            />
          </div>

          {/* Download QR */}
          <Button
            onClick={handleDownloadQR}
            variant="outline"
            className="w-1/2 mx-auto h-11"
          >
            Download QR
          </Button>

          {/* Share Buttons */}
          <Button
            onClick={handleWhatsAppShare}
            className="bg-green-500 hover:bg-green-600 text-white h-11 w-1/2 mx-auto"
          >
            WhatsApp
          </Button>

          <Button
            onClick={handleFacebookShare}
            className="bg-blue-600 hover:bg-blue-700 text-white h-11 w-1/2 mx-auto"
          >
            Facebook
          </Button>

          <Button
            onClick={handleTwitterShare}
            className="bg-sky-500 hover:bg-sky-600 text-white h-11 w-1/2 mx-auto"
          >
            Twitter
          </Button>

          <Button
            onClick={handleEmailShare}
            className="bg-gray-600 hover:bg-gray-700 text-white h-11 w-1/2 mx-auto"
          >
            Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
