interface BrainInterfaceProps {
    currentView: 'main' | 'graph';
    setCurrentView: (view: 'main' | 'graph' | 'detailed') => void;
}

const BrainInterface  = ({
    currentView,
    setCurrentView,
  }: BrainInterfaceProps) => {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden">
            {currentView === 'main' && (
                <div className="max-w-lg w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Brain View</h1>
                    <p className="mb-6 text-gray-600 dark:text-gray-300">
                        Explore your knowledge graph to visualize connections between your notes and concepts.
                    </p>
                    
                    <div className="flex flex-col space-y-4">
                        <button 
                            onClick={() => setCurrentView('graph')}
                            className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                        >
                            Open Knowledge Graph
                        </button>
                        
                        <div className="bg-blue-50 dark:bg-gray-700 p-4 rounded-lg">
                            <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-2">How it works</h3>
                            <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                <li>See connections between your notes and concepts</li>
                                <li>Click on nodes to explore related concepts</li>
                                <li>Dive deeper into detailed views of each topic</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default BrainInterface;