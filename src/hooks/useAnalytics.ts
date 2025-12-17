import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Get or create a session ID for tracking
const getOrCreateSessionId = (): string => {
  const key = "analytics_session_id";
  let sessionId = localStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, sessionId);
  }
  
  return sessionId;
};

export const useTrackItemView = (itemId: string | undefined) => {
  useEffect(() => {
    if (!itemId) return;

    const trackView = async () => {
      const sessionId = getOrCreateSessionId();
      
      try {
        await supabase.from("item_views").insert({
          item_id: itemId,
          viewer_session_id: sessionId,
        });
      } catch (error) {
        console.log("Failed to track item view:", error);
        // Silently fail - don't disrupt user experience
      }
    };

    // Debounce tracking to avoid duplicate entries
    const timer = setTimeout(trackView, 500);
    return () => clearTimeout(timer);
  }, [itemId]);
};

export const useTrackSiteVisit = (pagePath: string) => {
  useEffect(() => {
    const trackVisit = async () => {
      const sessionId = getOrCreateSessionId();
      
      try {
        await supabase.from("site_visits").insert({
          visitor_session_id: sessionId,
          page_path: pagePath,
        });
      } catch (error) {
        console.log("Failed to track site visit:", error);
        // Silently fail - don't disrupt user experience
      }
    };

    // Debounce tracking to avoid duplicate entries
    const timer = setTimeout(trackVisit, 500);
    return () => clearTimeout(timer);
  }, [pagePath]);
};

export { getOrCreateSessionId };
