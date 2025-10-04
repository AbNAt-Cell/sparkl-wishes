import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Gift, Heart, Share2, Sparkles, Check } from "lucide-react";
import heroImage from "@/assets/hero-celebration.jpg";

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const features = [
    {
      icon: Gift,
      title: "Beautiful Wishlists",
      description: "Create stunning wishlists for any celebration with an intuitive interface"
    },
    {
      icon: Share2,
      title: "Easy Sharing",
      description: "Share your wishlist with friends and family via a simple link"
    },
    {
      icon: Heart,
      title: "Claim Items",
      description: "Guests can claim items to avoid duplicate gifts"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={session?.user} />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
                <Sparkles className="w-4 h-4" />
                Make every celebration memorable
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Create Beautiful{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  Wishlists
                </span>{" "}
                for Life's Celebrations
              </h1>
              
              <p className="text-xl text-muted-foreground">
                Share your special moments with loved ones. Create wishlists for weddings, 
                birthdays, anniversaries, and more. Let your guests celebrate with the 
                perfect gifts.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate(session ? "/dashboard" : "/auth")}
                  className="shadow-elegant text-lg px-8"
                >
                  {session ? "Go to Dashboard" : "Get Started Free"}
                </Button>
                {!session && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/auth")}
                    className="text-lg px-8"
                  >
                    Sign In
                  </Button>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-hero rounded-3xl blur-3xl opacity-20" />
              <img
                src={heroImage}
                alt="Celebration wishlist platform"
                className="relative rounded-3xl shadow-glow w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-xl text-muted-foreground">
              Powerful features to make your wishlist experience delightful
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="p-8 rounded-2xl bg-card shadow-card hover:shadow-elegant transition-all duration-300 group"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-hero flex items-center justify-center mb-6 shadow-glow group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5" />
        <div className="container mx-auto px-4 text-center relative">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold">
              Ready to Create Your Wishlist?
            </h2>
            <p className="text-xl text-muted-foreground">
              Join thousands celebrating life's special moments with Sparkl Wishes
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="shadow-elegant text-lg px-8"
            >
              Start Creating for Free
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Sparkl Wishes. Made with love for your celebrations.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
