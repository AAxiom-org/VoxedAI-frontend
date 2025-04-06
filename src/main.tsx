import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ClerkProvider } from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ClerkProvider
        domain=".voxed.ai"
        publishableKey={PUBLISHABLE_KEY}
        routerPush={(to) => (window.location.href = to)}
        routerReplace={(to) => window.location.replace(to)}
        isSatellite={true}
        signInUrl="http://voxed.ai/sign-in"
        signInFallbackRedirectUrl="https://app.voxed.ai/"
        signInForceRedirectUrl="https://app.voxed.ai/"
        appearance={{
          baseTheme: window.matchMedia("(prefers-color-scheme: dark)").matches
            ? dark
            : undefined,
          variables: {
            colorPrimary: "#E84A27",
            colorTextOnPrimaryBackground: "#FFFFFF",
          },
        }}
      >
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </ClerkProvider>
    </QueryClientProvider>
  </StrictMode>,
);
