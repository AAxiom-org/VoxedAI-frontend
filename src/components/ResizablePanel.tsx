import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMobile } from "../contexts/MobileContext";
import { useLayoutState } from "../hooks/useLayoutState";

interface ResizablePanelProps {
  children: [React.ReactNode, React.ReactNode]; // Left and right content
  defaultRatio?: number; // Default ratio of left panel (0-1), defaults to 0.7 (7/10)
  minLeftWidth?: number; // Minimum width of left panel in pixels
  minRightWidth?: number; // Minimum width of right panel in pixels
  collapsible?: boolean; // Whether the right panel can be collapsed
}

const ResizablePanel = ({
  children,
  defaultRatio = 0.7,
  minLeftWidth = 300,
  minRightWidth = 200,
  collapsible = true,
}: ResizablePanelProps) => {
  const [ratio, setRatio] = useState<number>(defaultRatio);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const isMobile = useMobile();
  const [layout, setLayout] = useLayoutState();
  const isCollapsed = layout.rightPanelCollapsed ?? false;
  const containerRef = useRef<HTMLDivElement>(null);
  const prevRatioBeforeCollapse = useRef<number>(defaultRatio);

  useEffect(() => {
    // Only set initial collapsed state on mobile if it's not already set in layout
    if (isMobile && layout.rightPanelCollapsed === undefined) {
      setLayout({ rightPanelCollapsed: true });
    }
  }, [isMobile, layout.rightPanelCollapsed, setLayout]);

  // Handle mouse down on separator
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Calculate new ratio based on mouse position - optimized for performance
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;

    // Calculate new ratio with constraints
    let newRatio = mouseX / containerWidth;

    // Apply constraints
    const minLeftRatio = minLeftWidth / containerWidth;
    const minRightRatio = minRightWidth / containerWidth;

    if (newRatio < minLeftRatio) newRatio = minLeftRatio;
    if (newRatio > 1 - minRightRatio) newRatio = 1 - minRightRatio;

    setRatio(newRatio);
  };

  // Reset resizing state on mouse up
  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Toggle collapse state
  const toggleCollapse = () => {
    if (isCollapsed) {
      setRatio(prevRatioBeforeCollapse.current);
      setLayout({ rightPanelCollapsed: false });
    } else {
      prevRatioBeforeCollapse.current = ratio;
      setLayout({ rightPanelCollapsed: true });
    }
  };

  // Add and remove event listeners with optimized cleanup
  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div
      ref={containerRef}
      className="flex w-full h-full relative overflow-hidden"
    >
      {/* Left panel */}
      <div
        className="flex-none overflow-auto"
        style={{
          width: isCollapsed ? "100%" : `${ratio * 100}%`,
          maxWidth: isCollapsed ? "100%" : "90%",
        }}
      >
        {children[0]}
      </div>

      {/* Resizable separator */}
      {!isCollapsed && (
        <div
          className="w-0.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-col-resize flex-none flex items-center justify-center relative group"
          onMouseDown={handleMouseDown}
        >
          <div className="w-[2px] h-16 bg-gray-400 dark:bg-gray-500 rounded-full group-hover:h-24 transition-all duration-200"></div>

          {/* Drag handle dots - keeping hover effect */}
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400 my-0.5"></div>
            <div className="w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400 my-0.5"></div>
            <div className="w-1 h-1 rounded-full bg-gray-500 dark:bg-gray-400 my-0.5"></div>
          </div>
        </div>
      )}

      {/* Right panel */}
      {!isCollapsed && (
        <div
          className="flex-none overflow-auto"
          style={{ width: `calc(${(1 - ratio) * 100}% - 0.5rem)` }}
        >
          {children[1]}
        </div>
      )}

      {/* Collapse/expand button */}
      {collapsible && (
        <button
          className={`fixed right-4 top-2 z-10 p-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 shadow-sm`}
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand chat panel" : "Collapse chat panel"}
        >
          {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      )}
    </div>
  );
};

export default ResizablePanel;
