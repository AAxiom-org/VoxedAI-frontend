import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  className?: string;
}

const LoadingSpinner = ({ className = "" }: LoadingSpinnerProps) => {
  return (
    <div
      className={`fixed inset-0 flex items-center justify-center ${className}`}
    >
      <div className="mx-auto text-center">
        <div className="flex justify-center mb-4">
          <DotLottieReact
            className="w-20 md:w-20 lg:w-30"
            src="https://lottie.host/0cdcd6d7-9466-4a00-bfdb-55d6aa7ec2d9/zpxi4nliNO.lottie"
            loop
            autoplay
          />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          Loading...
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          If loading takes too long, please refresh the page or return home.
        </p>
        <div className="flex justify-center space-x-4">
          <button
            className="text-xs text-primary hover:text-primary-dark transition-colors"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
          <button
            className="text-xs text-primary hover:text-primary-dark transition-colors"
            onClick={() => (window.location.href = "/")}
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
