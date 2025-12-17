import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DateRange = "today" | "week" | "month" | "all";

const AdminAnalytics: React.FC = () => {
  const [itemsDateRange, setItemsDateRange] = useState<DateRange>("week");
  const [visitsDateRange, setVisitsDateRange] = useState<DateRange>("week");

  const getDateFilter = (range: DateRange) => {
    const now = new Date();
    let fromDate: Date;

    switch (range) {
      case "today":
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        fromDate = new Date(0);
        break;
    }

    return fromDate.toISOString();
  };

  // Fetch item views analytics
  const { data: itemViewsData, isLoading: itemViewsLoading } = useQuery({
    queryKey: ["item-views-analytics", itemsDateRange],
    queryFn: async () => {
      const fromDate = getDateFilter(itemsDateRange);

      const { data, error } = await supabase
        .from("item_views")
        .select(
          `
          id,
          item_id,
          created_at,
          wishlist_items!inner (
            id,
            name,
            wishlist_id,
            wishlists!inner (
              id,
              title
            )
          )
        `
        )
        .gte("created_at", fromDate)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by item
      const grouped = new Map<string, any>();
      (data || []).forEach((view: any) => {
        const itemId = view.item_id;
        if (!grouped.has(itemId)) {
          grouped.set(itemId, {
            item_id: itemId,
            item_name: view.wishlist_items.name,
            wishlist_id: view.wishlist_items.wishlist_id,
            wishlist_name: view.wishlist_items.wishlists.title,
            view_count: 0,
            unique_viewers: new Set(),
          });
        }
        const item = grouped.get(itemId);
        item.view_count += 1;
        item.unique_viewers.add(view.viewer_session_id);
      });

      return Array.from(grouped.values())
        .map((item: any) => ({
          ...item,
          unique_viewers: item.unique_viewers.size,
        }))
        .sort((a: any, b: any) => b.view_count - a.view_count);
    },
  });

  // Fetch total views count
  const { data: totalViewsData, isLoading: totalViewsLoading } = useQuery({
    queryKey: ["total-item-views", itemsDateRange],
    queryFn: async () => {
      const fromDate = getDateFilter(itemsDateRange);

      const { count, error } = await supabase
        .from("item_views")
        .select("*", { count: "exact", head: true })
        .gte("created_at", fromDate);

      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch site visits analytics
  const { data: siteVisitsData, isLoading: siteVisitsLoading } = useQuery({
    queryKey: ["site-visits-analytics", visitsDateRange],
    queryFn: async () => {
      const fromDate = getDateFilter(visitsDateRange);

      const { data, error } = await supabase
        .from("site_visits")
        .select("*")
        .gte("created_at", fromDate)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by page path
      const grouped = new Map<string, any>();
      (data || []).forEach((visit: any) => {
        const path = visit.page_path;
        if (!grouped.has(path)) {
          grouped.set(path, {
            page_path: path,
            visit_count: 0,
            unique_visitors: new Set(),
          });
        }
        const page = grouped.get(path);
        page.visit_count += 1;
        page.unique_visitors.add(visit.visitor_session_id);
      });

      return Array.from(grouped.values())
        .map((item: any) => ({
          ...item,
          unique_visitors: item.unique_visitors.size,
        }))
        .sort((a: any, b: any) => b.visit_count - a.visit_count);
    },
  });

  // Fetch total visits count
  const { data: totalVisitsData, isLoading: totalVisitsLoading } = useQuery({
    queryKey: ["total-site-visits", visitsDateRange],
    queryFn: async () => {
      const fromDate = getDateFilter(visitsDateRange);

      const { count, error } = await supabase
        .from("site_visits")
        .select("*", { count: "exact", head: true })
        .gte("created_at", fromDate);

      if (error) throw error;
      return count || 0;
    },
  });

  // Get unique visitors
  const { data: uniqueVisitors, isLoading: uniqueVisitorsLoading } = useQuery({
    queryKey: ["unique-visitors", visitsDateRange],
    queryFn: async () => {
      const fromDate = getDateFilter(visitsDateRange);

      const { data, error } = await supabase
        .from("site_visits")
        .select("visitor_session_id")
        .gte("created_at", fromDate);

      if (error) throw error;

      const unique = new Set(
        (data || []).map((v: any) => v.visitor_session_id)
      );
      return unique.size;
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track item views and site visits
        </p>
      </div>

      {/* Site Visits Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Site Visits</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalVisitsLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                totalVisitsData || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {visitsDateRange === "all"
                ? "All time"
                : `Last ${visitsDateRange === "today" ? "day" : visitsDateRange}`}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {uniqueVisitorsLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                uniqueVisitors || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {visitsDateRange === "all"
                ? "All time"
                : `Last ${visitsDateRange === "today" ? "day" : visitsDateRange}`}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Item Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalViewsLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                totalViewsData || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {itemsDateRange === "all"
                ? "All time"
                : `Last ${itemsDateRange === "today" ? "day" : itemsDateRange}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Item Views by Item */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Item Views</CardTitle>
            <Select value={itemsDateRange} onValueChange={(value: any) => setItemsDateRange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {itemViewsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (itemViewsData || []).length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No item views in this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Wishlist</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Unique Viewers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(itemViewsData || []).map((item: any) => (
                    <TableRow key={item.item_id}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>{item.wishlist_name}</TableCell>
                      <TableCell className="text-right">{item.view_count}</TableCell>
                      <TableCell className="text-right">{item.unique_viewers}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Site Visits by Page */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Page Visits</CardTitle>
            <Select value={visitsDateRange} onValueChange={(value: any) => setVisitsDateRange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {siteVisitsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (siteVisitsData || []).length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No page visits in this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page Path</TableHead>
                    <TableHead className="text-right">Visits</TableHead>
                    <TableHead className="text-right">Unique Visitors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(siteVisitsData || []).map((page: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium font-mono text-sm">
                        {page.page_path}
                      </TableCell>
                      <TableCell className="text-right">{page.visit_count}</TableCell>
                      <TableCell className="text-right">{page.unique_visitors}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
