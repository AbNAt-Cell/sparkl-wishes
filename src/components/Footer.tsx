import React from "react";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="border-t bg-white/80 backdrop-blur-md mt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-sm text-muted-foreground">
          <p className="mb-4">© 2025 Sparkl Wishes. Made with ❤️ for celebrations.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              className="hover:text-purple-600 transition-colors" 
              onClick={() => navigate("/")}
            >
              Home
            </button>
            <button 
              className="hover:text-purple-600 transition-colors" 
              onClick={() => navigate("/how-it-works")}
            >
              How It Works
            </button>
            <button 
              className="hover:text-purple-600 transition-colors" 
              onClick={() => navigate("/privacy")}
            >
              Privacy Policy
            </button>
            <button 
              className="hover:text-purple-600 transition-colors" 
              onClick={() => navigate("/terms")}
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

