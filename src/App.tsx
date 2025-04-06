import { lazy, Suspense } from 'react';
import {
  SignedIn,
  SignedOut,
} from "@clerk/clerk-react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import { Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Marketing Pages
import SignInUp from "./pages/auth/SignIn-Up";
import Header from "./components/common/Header";

// Contexts / Light Weight Files
import { UserProvider } from "./contexts/UserContext";
import { useTheme } from "./contexts/ThemeContext";
import TokenRefresher from "./components/common/TokenRefresher";
import LoadingSpinner from "./components/common/LoadingSpinner";

// Web App - Lazy loaded components
const Sandbox = lazy(() => import("./components/code/Sandbox"));
const SpaceUI = lazy(() => import("./pages/Space"));
const WorkspacesUI = lazy(() => import("./pages/Workspaces"));

export default function App() {
  // Get current theme from our context
  const { theme } = useTheme();
  
  // Determine toast styling based on theme
  const isDark = theme === "dark";
  
  return (
    <UserProvider>
      <SignedIn>
        <TokenRefresher />
      </SignedIn>
      
      <Router>
        <Toaster
          position="top-center"
          toastOptions={{
            // Styling for toast notifications based on current theme
            style: {
              background: isDark ? "#333333" : "#ffffff",
              color: isDark ? "#ffffff" : "#000000",
              border: isDark ? "1px solid #555555" : "1px solid #000000",
            },
            // Default toast durations
            duration: 3000,
            // Custom toast type styling
            success: {
              duration: 3000,
              style: {
                background: isDark ? "#1e3a2f" : "#edf7ed",
                border: isDark ? "1px solid #2e5a4e" : "1px solid #c3e6cb",
                color: isDark ? "#ffffff" : "#000000",
              },
            },
            error: {
              duration: 4000,
              style: {
                background: isDark ? "#3e2a2a" : "#f8d7da",
                border: isDark ? "1px solid #5e3a3a" : "1px solid #f5c6cb",
                color: isDark ? "#ffffff" : "#000000",
              },
            },
          }}
        />
        <Routes>
          <Route
            path="*"
            element={
              <>
                <Navigate to="/spaces" />
              </>
            }
          />

          <Route
            path="/sign-in"
            element={
              <>
                <SignedOut>
                  <SignInUp />
                </SignedOut>
                <SignedIn>
                  <Navigate to="/spaces" />
                </SignedIn>
              </>
            }
          />

          <Route
            path="/sign-up"
            element={
              <>
                <SignedOut>
                  <SignInUp />
                </SignedOut>
                <SignedIn>
                  <Navigate to="/spaces" />
                </SignedIn>
              </>
            }
          />

          {/* Web App - Wrap lazy-loaded components with Suspense */}
          <Route path="/spaces" element={
            <>
              <SignedIn>
                <Header />
                <Suspense fallback={<LoadingSpinner size="large" />}>
                  <WorkspacesUI />
                </Suspense>
              </SignedIn>
              <SignedOut>
                <Navigate to="/sign-in" />
              </SignedOut>
            </>
          } />
          <Route path="/spaces/:id" element={
            <>
              <SignedIn>
                <Suspense fallback={<LoadingSpinner size="large" />}>
                  <SpaceUI />
                </Suspense>
              </SignedIn>
              <SignedOut>
                <Navigate to="/sign-in" />
              </SignedOut>
            </>
          } />
          <Route path="/sandbox" element={
            <>
              <SignedIn>
                <Suspense fallback={<LoadingSpinner size="large" />}>
                  <Sandbox />
                </Suspense>
              </SignedIn>
              <SignedOut>
                <Navigate to="/sign-in" />
              </SignedOut>
            </>
          } />
          {/* End Web App */}
          
        </Routes>
      </Router>
    </UserProvider>
  );
}
