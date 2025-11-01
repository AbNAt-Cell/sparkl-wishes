import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  UserPlus,
  ListPlus,
  Share2,
  Gift,
  CreditCard,
  Wallet,
  Heart,
  MessageCircle,
  Users,
  DollarSign,
  CheckCircle,
  ArrowRight,
  QrCode,
  Mail,
  TrendingUp,
} from "lucide-react";

const HowItWorks = () => {
  const navigate = useNavigate();

  const registeredUserSteps = [
    {
      icon: UserPlus,
      title: "1. Sign Up Free",
      description: "Create your account in seconds using email. No credit card required.",
      features: ["Free forever", "Secure authentication", "Profile customization"],
    },
    {
      icon: ListPlus,
      title: "2. Create Your Wishlist",
      description: "Build your wishlist for any occasion - wedding, baby shower, birthday, and more.",
      features: [
        "Choose from 5 ready-made templates",
        "Add unlimited items with images",
        "Set price ranges and priorities",
        "Add external product links",
      ],
    },
    {
      icon: Share2,
      title: "3. Share Your Wishlist",
      description: "Share your wishlist with friends and family through multiple channels.",
      features: [
        "WhatsApp one-click share",
        "Facebook, Twitter, Email",
        "QR codes for invitations",
        "Copy direct link",
      ],
    },
    {
      icon: Gift,
      title: "4. Receive Gifts",
      description: "Watch as friends claim items and make payments directly.",
      features: [
        "Real-time notifications",
        "Track who claimed what",
        "See funding progress",
        "Read well-wishes from guests",
      ],
    },
    {
      icon: Wallet,
      title: "5. Manage Your Wallet",
      description: "All payments go to your secure wallet. Withdraw anytime to your bank account.",
      features: [
        "Instant payment crediting",
        "Transaction history",
        "Easy withdrawals via Paystack",
        "Multi-currency support",
      ],
    },
    {
      icon: Heart,
      title: "6. Say Thank You",
      description: "Send personalized thank you messages to your gift givers.",
      features: [
        "Custom thank you notes",
        "Message templates",
        "Track who you've thanked",
        "Build lasting connections",
      ],
    },
  ];

  const guestUserSteps = [
    {
      icon: Mail,
      title: "1. Receive Wishlist Link",
      description: "Get a link from the wishlist owner via WhatsApp, email, or social media.",
      features: ["No signup required", "Direct access to wishlist", "Mobile-friendly"],
    },
    {
      icon: Gift,
      title: "2. Browse Items",
      description: "View all wishlist items with images, descriptions, and prices.",
      features: [
        "See what's already claimed",
        "View funding progress",
        "Check priority items",
        "Read item descriptions",
      ],
    },
    {
      icon: Users,
      title: "3. Choose Gift Type",
      description: "Select how you want to contribute to the celebration.",
      features: [
        "Claim full item",
        "Partial contribution (group gift)",
        "Cash fund contribution",
        "Flexible amounts",
      ],
    },
    {
      icon: CreditCard,
      title: "4. Make Payment",
      description: "Securely pay through Paystack with multiple payment options.",
      features: [
        "Credit/debit cards",
        "Bank transfer",
        "Mobile money",
        "Secure encryption",
      ],
    },
    {
      icon: MessageCircle,
      title: "5. Leave a Message",
      description: "Optional: Leave congratulatory messages in the guest book.",
      features: [
        "Public or anonymous",
        "Share well-wishes",
        "Add personal touch",
        "No account needed",
      ],
    },
    {
      icon: CheckCircle,
      title: "6. Done!",
      description: "Your gift is recorded and the owner receives instant notification.",
      features: [
        "Instant confirmation",
        "Email receipt",
        "Funds credited immediately",
        "Owner gets thank you option",
      ],
    },
  ];

  const features = [
    {
      icon: Share2,
      title: "Viral Sharing",
      description: "Share to WhatsApp, Facebook, Twitter, or generate QR codes for invitations.",
      badge: "Popular",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Users,
      title: "Group Gifting",
      description: "Multiple people can contribute to expensive items. Perfect for big-ticket gifts!",
      badge: "Unique",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: DollarSign,
      title: "Cash Funds",
      description: "Create flexible cash funds for honeymoon, house down payment, or any goal.",
      badge: "Flexible",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Visual progress bars show funding status and claimed items in real-time.",
      badge: "Real-time",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: MessageCircle,
      title: "Guest Book",
      description: "Guests can leave congratulatory messages and well-wishes.",
      badge: "Social",
      color: "from-indigo-500 to-purple-500",
    },
    {
      icon: Heart,
      title: "Thank You Messages",
      description: "Send personalized thank you notes to each gift giver with templates.",
      badge: "Personal",
      color: "from-rose-500 to-pink-500",
    },
    {
      icon: Wallet,
      title: "Secure Wallet",
      description: "All payments go to your wallet. Withdraw anytime to your bank account.",
      badge: "Safe",
      color: "from-teal-500 to-cyan-500",
    },
    {
      icon: QrCode,
      title: "QR Codes",
      description: "Generate downloadable QR codes to print on your invitations.",
      badge: "Convenient",
      color: "from-amber-500 to-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Sparkl Wishes
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                onClick={() => navigate("/auth")}
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 px-4 py-1">
            Free Forever
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
            How Sparkl Wishes Works
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            The modern way to create wishlists, receive gifts, and celebrate life's special moments.
            <br />
            <strong className="text-purple-600">No fees for wishlist creators!</strong>
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
              onClick={() => navigate("/auth")}
            >
              Create Free Wishlist
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/")}>
              View Demo
            </Button>
          </div>
        </div>

        {/* Key Features */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">✨ Amazing Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 shadow-lg`}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{feature.title}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {feature.badge}
                      </Badge>
                    </div>
                    <CardDescription className="text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* For Wishlist Creators */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-purple-100 text-purple-700 border-purple-200">
              For Wishlist Creators
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Create & Share Your Wishlist</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Perfect for weddings, baby showers, birthdays, housewarmings, and more!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {registeredUserSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="border-0 shadow-lg bg-white hover:shadow-xl transition-all">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">{step.title}</CardTitle>
                    </div>
                    <CardDescription className="text-base leading-relaxed mb-4">
                      {step.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {step.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* For Gift Givers */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-pink-100 text-pink-700 border-pink-200">For Gift Givers</Badge>
            <h2 className="text-3xl font-bold mb-4">Give Gifts Effortlessly</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No account needed! Browse, choose, and pay securely in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guestUserSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="border-0 shadow-lg bg-white hover:shadow-xl transition-all">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center shadow-lg">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <CardTitle className="text-xl">{step.title}</CardTitle>
                    </div>
                    <CardDescription className="text-base leading-relaxed mb-4">
                      {step.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {step.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-3xl p-12 text-center text-white shadow-2xl">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands celebrating life's special moments with Sparkl Wishes.
            <br />
            <strong>100% free for wishlist creators!</strong>
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-purple-600 hover:bg-gray-100 shadow-lg"
              onClick={() => navigate("/auth")}
            >
              Create Your Free Wishlist
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/20"
              onClick={() => navigate("/")}
            >
              Explore Demo
            </Button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Is it really free?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes! Creating wishlists and receiving gifts is 100% free. We only charge a small processing
                  fee (3-5%) on payments, which is covered by the gift giver.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Do gift givers need an account?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No! Gift givers can browse wishlists, claim items, and make payments without creating an
                  account. It's completely guest-friendly.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">How do I receive my money?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  All payments go directly to your secure wallet. You can withdraw to your bank account anytime
                  through Paystack. Withdrawals are instant!
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Is payment secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Absolutely! We use Paystack, a leading payment processor with bank-level encryption. We never
                  store card details. All transactions are PCI-DSS compliant.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-md mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 Sparkl Wishes. Made with ❤️ for celebrations.</p>
            <div className="flex justify-center gap-4 mt-4">
              <button className="hover:text-purple-600" onClick={() => navigate("/")}>
                Home
              </button>
              <button className="hover:text-purple-600" onClick={() => navigate("/how-it-works")}>
                How It Works
              </button>
              <button className="hover:text-purple-600">Privacy</button>
              <button className="hover:text-purple-600">Terms</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HowItWorks;

