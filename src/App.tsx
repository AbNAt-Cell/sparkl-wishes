import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import AdminLayout from "./pages/admin/Layout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminWishlists from "./pages/admin/Wishlists";
import AdminItems from "./pages/admin/Items";
import AdminClaims from "./pages/admin/Claims";
import AdminWithdrawals from "./pages/admin/Withdrawals";
import AdminSettings from "./pages/admin/Settings";
import AdminGuard from "@/components/AdminGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          <Route path="/share/:shareCode" element={<SharedWishlist />} />
          <Route path="/featured" element={<FeaturedWishlists />} />
          <Route path="/wishlist/:id/item/new" element={<CreateWishlistItem />} />
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
            <Route path="withdrawals" element={<AdminWithdrawals />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
