interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  className?: string;
}

const LoadingSpinner = ({
  size = "medium",
  className = "",
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    small: "h-4 w-4 border-2",
    medium: "h-8 w-8 border-2",
    large: "h-12 w-12 border-2",
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center ${className}`}
    >
      <div className="mx-auto text-center">
        <div className="flex justify-center mb-4">
          <div
            className={`animate-spin rounded-full ${sizeClasses[size]} border-t-primary border-r-gray-200 border-b-gray-200 border-l-gray-200 dark:border-t-primary dark:border-r-gray-700 dark:border-b-gray-700 dark:border-l-gray-700`}
          ></div>
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
