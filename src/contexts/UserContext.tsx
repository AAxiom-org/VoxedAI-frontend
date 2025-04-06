import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import {
  syncUserWithSupabase,
  createSupabaseClientWithToken,
} from "../services/supabase";

interface UserContextType {
  supabaseUserId: string | null;
  isLoading: boolean;
  error: Error | null;
  getSupabaseClient: () => Promise<any>;
  refreshSupabaseToken: () => Promise<any>;
}

const UserContext = createContext<UserContextType>({
  supabaseUserId: null,
  isLoading: true,
  error: null,
  getSupabaseClient: async () => null,
  refreshSupabaseToken: async () => null,
});

export const useSupabaseUser = () => useContext(UserContext);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const { user, isLoaded: isClerkLoaded } = useUser();
  const { getToken } = useAuth();
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Store the last token request time to throttle requests
  const [lastTokenRequestTime, setLastTokenRequestTime] = useState(0);
  // Cache for the Supabase client
  const [cachedClient, setCachedClient] = useState<any>(null);
  // Token expiration time - setting to a more conservative value
  const [tokenExpiresAt, setTokenExpiresAt] = useState(0);
  // Add a flag to track refresh in progress
  const [refreshInProgress, setRefreshInProgress] = useState(false);
  // Add a flag to track if the token has been validated
  const [tokenValidated, setTokenValidated] = useState(false);

  useEffect(() => {
    const syncUser = async () => {
      if (!isClerkLoaded || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Sync Clerk user with Supabase
        const userId = await syncUserWithSupabase(
          user.id,
          user.primaryEmailAddress?.emailAddress || "",
        );
        setSupabaseUserId(userId);
        console.log("Synced user with Supabase:", userId);
        setError(null);

        // Immediately get a fresh token after user is synced
        await refreshSupabaseToken();
      } catch (err) {
        console.error("Error syncing user with Supabase:", err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    syncUser();
  }, [user, isClerkLoaded]);

  // Force refresh the Supabase token
  const refreshSupabaseToken = useCallback(async () => {
    if (!user || refreshInProgress) return cachedClient;

    // Add a time-based throttle to prevent excessive refreshes
    // Only refresh if at least 30 seconds have passed since the last request
    const now = Date.now();
    if (now - lastTokenRequestTime < 30000) {
      console.log("Token refresh throttled - too many requests");
      return cachedClient;
    }

    try {
      setRefreshInProgress(true);
      // Get a fresh JWT token from Clerk
      const token = await getToken({ template: "supabase" });

      if (!token) {
        console.error("No token returned from Clerk during refresh");
        return null;
      }

      // Create a new Supabase client with the token
      const client = await createSupabaseClientWithToken(token);

      // Update cache and timestamps
      setCachedClient(client);
      setLastTokenRequestTime(Date.now());
      // Set token expiration (setting to 10 minutes - more conservative than the default)
      setTokenExpiresAt(Date.now() + 10 * 60 * 1000);
      setTokenValidated(true);

      console.log(
        "Successfully refreshed Supabase token with expiry in 10 minutes",
      );
      return client;
    } catch (err) {
      console.error("Error refreshing Supabase token:", err);
      setError(err as Error);
      return null;
    } finally {
      setRefreshInProgress(false);
    }
  }, [user, getToken, refreshInProgress, cachedClient, lastTokenRequestTime]);

  // Function to get a Supabase client with the user's token
  const getSupabaseClient = useCallback(async () => {
    if (!user) return null;

    const now = Date.now();

    // More conservative token refresh policy:
    // 1. If token is expired
    // 2. Or if token will expire in the next 2 minutes AND we haven't refreshed in the last 30 seconds
    // 3. Or if we don't have a cached client
    const tokenExpired = now > tokenExpiresAt;
    const tokenExpiringSoon = now > tokenExpiresAt - 2 * 60 * 1000;
    const recentlyRefreshed = now - lastTokenRequestTime < 30000;

    // Only consider validation status for the initial refresh
    const needsInitialValidation = !tokenValidated && !cachedClient;

    const needsRefresh =
      !cachedClient ||
      tokenExpired ||
      (tokenExpiringSoon && !recentlyRefreshed) ||
      needsInitialValidation;

    if (needsRefresh) {
      console.log("Token expired or expiring soon, refreshing...");
      return refreshSupabaseToken();
    }

    // Use cached client if it's still valid
    return cachedClient;
  }, [
    user,
    cachedClient,
    tokenExpiresAt,
    refreshSupabaseToken,
    tokenValidated,
    lastTokenRequestTime,
  ]);

  // Add an error handler effect that will refresh the token on 401/403 errors
  useEffect(() => {
    if (error) {
      const errorMessage = error.message?.toLowerCase() || "";
      const isAuthError =
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("forbidden") ||
        errorMessage.includes("jwt expired");

      if (isAuthError && user) {
        console.log("Auth error detected, refreshing token...");
        refreshSupabaseToken();
      }
    }
  }, [error, refreshSupabaseToken, user]);

  const value = {
    supabaseUserId,
    isLoading,
    error,
    getSupabaseClient,
    refreshSupabaseToken,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
