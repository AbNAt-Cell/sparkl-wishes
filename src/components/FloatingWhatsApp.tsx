import React from "react";
import { useAppSettings } from "@/lib/settings";
import { MessageCircle } from "lucide-react";

const FloatingWhatsApp: React.FC = () => {
  const { data } = useAppSettings();

  if (!data?.whatsapp?.enabled || !data.whatsapp.whatsappLink) {
    return null;
  }

  return (
    <a
      href={data.whatsapp.whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 animate-in fade-in"
      title="Chat with us on WhatsApp"
    >
      <MessageCircle className="w-6 h-6" />
    </a>
  );
};

export default FloatingWhatsApp;
