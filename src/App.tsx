import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigationType, useLocation } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateWishlist from "./pages/CreateWishlist";
import Profile from "./pages/Profile";
import Wallet from "./pages/Wallet";
import HowItWorks from "./pages/HowItWorks";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import WishlistDetail from "./pages/WishlistDetail";
import SharedWishlist from "./pages/SharedWishlist";
import FeaturedWishlists from "./pages/FeaturedWishlists";
import NotFound from "./pages/NotFound";
import CreateWishlistItem from "./pages/CreateWishlistItem";
import EditWishlistItem from "./pages/EditWishlistItem";
import ClaimWishlistItem from "./pages/ClaimWishlistItem";
import ShareWishlist from "./pages/ShareWishlist";
import AdminLayout from "./pages/admin/Layout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminWishlists from "./pages/admin/Wishlists";
import AdminItems from "./pages/admin/Items";
import AdminClaims from "./pages/admin/Claims";
import AdminWallet from "./pages/admin/Wallet";
import AdminWithdrawals from "./pages/admin/Withdrawals";
import AdminSettings from "./pages/admin/Settings";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminGuard from "@/components/AdminGuard";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { useTrackSiteVisit } from "@/hooks/useAnalytics";

// Global Page Loader Component
const GlobalPageLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigationType = useNavigationType();
  const location = useLocation();

  useEffect(() => {
    // Show loader for programmatic navigation (PUSH, REPLACE)
    if (navigationType !== 'POP') {
      setIsLoading(true);

      // Hide loader after a short delay to simulate page loading
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800); // Adjust timing as needed

      return () => clearTimeout(timer);
    }
  }, [location.pathname, navigationType]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary/20 rounded-full animate-spin border-t-primary"></div>
          <div className="absolute inset-0 w-12 h-12 border-4 border-transparent rounded-full animate-ping border-t-primary/40"></div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  );
};

// App Content Component (needs to be inside Router for hooks)
const AppContent = () => (
  <>
    <GlobalPageLoader />
    <FloatingWhatsApp />
    <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-wishlist" element={<CreateWishlist />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/wishlist/:id" element={<WishlistDetail />} />
          <Route path="/wishlist/:id/item/new" element={<CreateWishlistItem />} />
          <Route path="/wishlist/:id/item/:itemId/edit" element={<EditWishlistItem />} />
          <Route path="/share/:shareCode" element={<SharedWishlist />} />
          <Route path="/claim/:itemId" element={<ClaimWishlistItem />} />
          <Route path="/claim/:itemId/:shareCode" element={<ClaimWishlistItem />} />
          <Route path="/share-wishlist/:shareCode" element={<ShareWishlist />} />
          <Route path="/featured" element={<FeaturedWishlists />} />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="wishlists" element={<AdminWishlists />} />
            <Route path="items" element={<AdminItems />} />
            <Route path="claims" element={<AdminClaims />} />
            <Route path="wallet" element={<AdminWallet />} />
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
  </>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
          return error.status >= 500 && failureCount < 2;
        }
        return failureCount < 2;
      },
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
