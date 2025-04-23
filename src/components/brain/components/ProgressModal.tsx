interface ProgressModalProps {
  isActive: boolean;
  title: string;
  progress: number;
  status: string;
  error: string | null;
}

const ProgressModal = ({
  isActive,
  title,
  progress,
  status,
  error,
}: ProgressModalProps) => {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-gray-900/25">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium mb-4">{title}</h3>

        <div className="mb-4">
          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-right text-xs mt-1 text-gray-500">{progress}%</p>
        </div>

        <p className="mb-2">{status}</p>

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  );
};

export default ProgressModal;
