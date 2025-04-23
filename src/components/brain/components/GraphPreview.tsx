import HierarchicalGraph from "../Graph";

interface GraphPreviewProps {
  setCurrentView: (view: "main" | "graph" | "detailed") => void;
  spaceId?: string;
}

const GraphPreview = ({ setCurrentView, spaceId }: GraphPreviewProps) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
          Knowledge Graph
        </h2>
        <button
          onClick={() => setCurrentView("graph")}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
        >
          Full View
        </button>
      </div>
      <div
        className="bg-background rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm h-52 overflow-hidden relative cursor-pointer"
        onClick={() => setCurrentView("graph")}
      >
        <HierarchicalGraph
          currentView="preview"
          setCurrentView={setCurrentView}
          spaceId={spaceId}
        />
      </div>
    </div>
  );
};

export default GraphPreview;
