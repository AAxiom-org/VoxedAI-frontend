import React from "react";
import HierarchicalGraph from "./brain/Graph"
import BrainInterface from "./brain/BrainInterface"
import { useLayoutState } from "../hooks/useLayoutState";

interface BrainProps {
    spaceId: string | undefined;
}

export default function Brain({ spaceId }: BrainProps) {
    // Use layout state to persist the view in URL
    const [layout, setLayout] = useLayoutState();
    
    // Get current brain view from layout with default fallback to 'graph'
    const currentView = layout.brainView || 'main'; // Default to 'main' instead of 'graph'
    const selectedNodeId = layout.selectedNodeId;
    
    // Update brain view in layout state
    const setCurrentView = (view: 'main' | 'graph' | 'detailed', nodeId?: string) => {
        if (view === 'detailed' && nodeId) {
            setLayout({ 
                brainView: view,
                selectedNodeId: nodeId 
            });
        } else {
            setLayout({ 
                brainView: view,
                selectedNodeId: view === 'graph' ? null : layout.selectedNodeId
            });
        }
    };

    return (
        <div className="h-full w-full relative overflow-hidden">
            {/* Only show back button here if we're in graph view, not in detailed view */}
            {currentView === 'graph' && (
                <button 
                    onClick={() => setCurrentView('main')}
                    className="absolute top-4 left-4 text-gray-500 hover:text-gray-700 focus:outline-none z-10"
                >
                ← Back to Main View
                </button>
            )}
            
            <div className="h-full w-full">
                {currentView === 'main' ? (
                    <BrainInterface 
                        currentView={currentView} 
                        setCurrentView={setCurrentView}
                        spaceId={spaceId}
                    />
                ) : (
                    <HierarchicalGraph 
                        currentView={currentView === 'graph' ? 'graph' : 'detailed'} 
                        setCurrentView={setCurrentView}
                        selectedNodeId={selectedNodeId}
                        spaceId={spaceId}
                    />
                )}
            </div>
        </div>
    )
}