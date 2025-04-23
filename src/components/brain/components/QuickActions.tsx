import { BrainCircuit, TrendingUp, GitGraph, SettingsIcon } from "lucide-react";

interface QuickActionsProps {
  handleRebuildGraph: () => void;
  handleOpenEditor: () => void;
  isGeneratingGraph: boolean;
}

const QuickActions = ({
  handleRebuildGraph,
  handleOpenEditor,
  isGeneratingGraph,
}: QuickActionsProps) => {
  return (
    <div>
      <h2 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">
        Quick Actions
      </h2>
      <div className="space-y-2">
        <button className="w-full flex items-center p-3 bg-background hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <BrainCircuit className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
          <span>Start Agent Researching</span>
        </button>
        <button
          onClick={handleOpenEditor}
          className="w-full flex items-center p-3 bg-background hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors"
        >
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
          <span>View Agent Status</span>
        </button>
        <button
          onClick={handleRebuildGraph}
          disabled={isGeneratingGraph}
          className={`w-full flex items-center p-3 bg-background hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors ${isGeneratingGraph ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          <GitGraph className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
          <span>
            {isGeneratingGraph ? "Generating Graph..." : "Rebuild Graph"}
          </span>
        </button>
        <button className="w-full flex items-center p-3 bg-background hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
          <SettingsIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default QuickActions;
