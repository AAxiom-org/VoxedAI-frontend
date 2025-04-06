import { UserButton } from "@clerk/clerk-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "@clerk/clerk-react";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { isSignedIn } = useAuth();
  return (
    <div className="fixed top-4 right-4 z-15 flex items-center gap-4">
      <button
        onClick={toggleTheme}
        className="text-[color-mix(in_oklch,currentColor_80%,var(--color-primary))] hover:text-[var(--color-primary)] transition-colors relative group cursor-pointer"
        title={`Current theme: ${theme}. Click to toggle.`}
        aria-label="Toggle color theme"
      >
        {theme === "light" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        )}
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-[var(--color-primary)] group-hover:w-full transition-all duration-300"></span>
      </button>
      {isSignedIn && <UserButton />}
    </div>
  );
}
