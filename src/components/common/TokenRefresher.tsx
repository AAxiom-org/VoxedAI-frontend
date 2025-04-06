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
  const networkRetryRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial token refresh
    refreshSupabaseToken();

    // Set up refresh interval (every 5 minutes)
    // This is more aggressive to ensure the token never expires in production
    // The actual token expiration is set to 8 minutes in UserContext
    const refreshInterval = 5 * 60 * 1000; // 5 minutes

    refreshIntervalRef.current = setInterval(() => {
      console.log("Auto-refreshing Supabase token...");
      refreshSupabaseToken();
    }, refreshInterval);

    // Set up network error listener to refresh token on 401/403 errors
    const handleNetworkError = (event: Event) => {
      const xhr = event.target as XMLHttpRequest;
      if (xhr && (xhr.status === 401 || xhr.status === 403)) {
        console.log(`Network ${xhr.status} detected, refreshing token...`);
        // Debounce token refresh on network errors
        if (networkRetryRef.current) {
          clearTimeout(networkRetryRef.current);
        }
        networkRetryRef.current = setTimeout(() => {
          refreshSupabaseToken();
        }, 1000); // 1 second debounce
      }
    };

    // Add event listener for network errors
    window.addEventListener('error', handleNetworkError, true);

    // Clean up interval and event listener on component unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (networkRetryRef.current) {
        clearTimeout(networkRetryRef.current);
      }
      window.removeEventListener('error', handleNetworkError, true);
    };
  }, [refreshSupabaseToken]);

  // This component doesn't render anything
  return null;
};

export default TokenRefresher;
