import { Waitlist } from "@clerk/clerk-react";
import { useTheme } from "../../contexts/ThemeContext";

export default function WaitlistPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const waitlistProps = {
    appearance: {
      elements: {
        footer: {
          display: "none",
        },
        formButtonPrimary: {
          backgroundImage: "linear-gradient(to right, #38bdf8, #818cf8)",
          "&:hover": {
            backgroundImage: "linear-gradient(to right, #0ea5e9, #6366f1)",
          },
        },
        // card: {
        //   border: "1px solid",
        //   borderColor: isDarkMode ? "rgba(203, 213, 225, 0.1)" : "rgba(51, 65, 85, 0.1)",
        //   borderRadius: "0.75rem",
        //   boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        //   color: isDarkMode ? "#f8fafc" : "#0f172a",
        // },
        formFieldLabel: {
          color: isDarkMode ? "#cbd5e1" : "#334155",
        },
        formFieldInput: {
          border: "1px solid",
          color: isDarkMode ? "#f8fafc" : "#0f172a",
        },
      },
    },
  };
  return (
    <div className="flex flex-col justify-center items-center h-screen space-y-2">
      <Waitlist
        {...waitlistProps}
        signInUrl={"/sign-in"}
        afterJoinWaitlistUrl={"/"}
      />
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <a href="/sign-in" className="text-primary hover:underline">
          Sign In
        </a>
      </p>
    </div>
  );
}
