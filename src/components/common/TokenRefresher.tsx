import { useEffect, useRef } from "react";
import { useSupabaseUser } from "../../contexts/UserContext";

/**
 * TokenRefresher component
 *
 * This component handles automatic token refreshing to prevent JWT expiration issues.
 * It runs in the background and refreshes tokens based on a configured interval.
 */
const TokenRefresher = () => {
  const { refreshSupabaseToken } = useSupabaseUser();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial token refresh
    refreshSupabaseToken();

    // Set up refresh interval (every 8 minutes)
    // This is conservative to ensure the token never expires
    // The actual token expiration is set to 10 minutes in UserContext
    const refreshInterval = 8 * 60 * 1000; // 8 minutes

    refreshIntervalRef.current = setInterval(() => {
      console.log("Auto-refreshing Supabase token...");
      refreshSupabaseToken();
    }, refreshInterval);

    // Clean up interval on component unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [refreshSupabaseToken]);

  // This component doesn't render anything
  return null;
};

export default TokenRefresher;
