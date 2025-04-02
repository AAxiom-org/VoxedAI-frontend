import { useState } from "react";
import HierarchicalGraph from "./brain/Graph"

export default function Brain() {
    // The view state is now controlled by Brain component
    // 'main' - the starting view
    // 'graph' - the main graph view
    // 'detailed' - the detailed view of a specific node
    const [currentView, setCurrentView] = useState('graph');

    return (
        <div className="h-full w-full flex items-center justify-center relative overflow-hidden">
            {/* Show back button to main view only when in graph view */}
            {currentView === 'main' && (
                <button 
                    onClick={() => setCurrentView('graph')}
                    className="absolute top-4 left-4 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                ← Back to Graph View
                </button>
            )}
            
            {/* Only show back button here if we're in graph view, not in detailed view */}
            {currentView === 'graph' && (
                <button 
                    onClick={() => setCurrentView('main')}
                    className="absolute top-4 left-4 text-gray-500 hover:text-gray-700 focus:outline-none z-10"
                >
                ← Back to Main View
                </button>
            )}
            
            <div className="h-full w-full flex justify-center items-center">
                {currentView === 'main' ? (
                    <div>Main View Content</div>
                ) : (
                    <HierarchicalGraph 
                        currentView={currentView === 'graph' ? 'graph' : 'detailed'} 
                        setCurrentView={(view) => setCurrentView(view)}
                    />
                )}
            </div>
        </div>
    )
}