import { useState, useRef, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import MarkdownRenderer from "../common/MarkdownRenderer";
import { useSupabaseUser } from "../../contexts/UserContext";
import { useLayoutState } from "../../hooks/useLayoutState";
import { XCircle } from "lucide-react";

// Define TypeScript interfaces
interface GraphNode {
  id: string;
  group: number;
  label: string;
  size?: number;
  type?: "circle" | "text";
  color?: string;
  __bckgDimensions?: number[];
  x?: number;
  y?: number;
  noteId?: string; // This is the string ID that matches metadata.id in space_research
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface DetailedGraphs {
  [key: string]: GraphData;
}

interface HierarchicalGraphProps {
  currentView: "graph" | "detailed" | "preview";
  setCurrentView: (
    view: "main" | "graph" | "detailed",
    nodeId?: string,
  ) => void;
  selectedNodeId?: string | null;
  spaceId?: string | undefined;
}

interface NoteMetadata {
  id?: string;
  title?: string;
  description?: string;
  emoji?: string;
  tags?: string[];
  created?: string;
  [key: string]: any;
}

interface ResearchEntry {
  id: string; // UUID primary key
  content: string;
  metadata: NoteMetadata;
  related_note_ids?: string[]; // Array of UUIDs to actual notes in space_files or filenames
}

interface SpaceFile {
  id: string;
  file_name: string;
  file_path: string;
  metadata?: NoteMetadata;
  is_note: boolean;
}

const HierarchicalGraph = ({
  currentView,
  setCurrentView,
  selectedNodeId,
  spaceId,
}: HierarchicalGraphProps) => {
  // Get Supabase client from UserContext
  const { getSupabaseClient } = useSupabaseUser();
  // Use layout state to manage note selection
  const [layout, setLayout] = useLayoutState();

  // State to track whether we're in the main view or a node's detailed view
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [showMarkdown, setShowMarkdown] = useState<boolean>(false);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const fgRef = useRef<any>(null);

  // Add refs and size tracking for dynamic container dimensions
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

  // New states for Supabase data
  const [researchEntries, setResearchEntries] = useState<ResearchEntry[]>([]);
  const [relatedNoteIds, setRelatedNoteIds] = useState<string[]>([]);
  const [noteTitlesMap, setNoteTitlesMap] = useState<Record<string, string>>({});
  const [noteIdMap, setNoteIdMap] = useState<Record<string, string>>({});
  const [mainGraphData, setMainGraphData] = useState<GraphData | null>(null);
  const [detailedGraphs, setDetailedGraphs] = useState<DetailedGraphs>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Helper function to check if a string is a valid UUID
  const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Track container size with a resize observer
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    // Initial size
    setContainerDimensions({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Fetch graph data and research entries from Supabase
  const fetchGraphData = async () => {
    if (!spaceId) return;

    try {
      setIsLoading(true);

      const supabaseClient = await getSupabaseClient();
      if (!supabaseClient) {
        throw new Error("Failed to get Supabase client");
      }

      // Fetch graph structure from graphs table
      const { data: graphsData, error: graphsError } = await supabaseClient
        .from("graphs")
        .select("data")
        .eq("space_id", spaceId)
        .single();

      if (graphsError) {
        throw new Error(`Error fetching graph data: ${graphsError.message}`);
        console.log(layout);
      }

      if (graphsData && graphsData.data) {
        // Extract mainGraph and detailedGraphs from the data
        const { mainGraph, detailedGraphs: detailedGraphsData } =
          graphsData.data;
        setMainGraphData(mainGraph as GraphData);
        setDetailedGraphs(detailedGraphsData as DetailedGraphs);
      }

      // Fetch all research entries from space_research table
      const { data: researchData, error: researchError } = await supabaseClient
        .from("space_research")
        .select("id, content, metadata, related_note_ids")
        .eq("space_id", spaceId);

      if (researchError) {
        throw new Error(`Error fetching research data: ${researchError.message}`);
      }

      if (researchData) {
        // Store all research entries
        setResearchEntries(researchData as ResearchEntry[]);
        
        // Create mapping from note ID in metadata to content and related note IDs
        const entriesById = new Map<string, ResearchEntry>();
        
        researchData.forEach((entry: ResearchEntry) => {
          // Store by metadata.id for easy lookup by graph node noteId
          if (entry.metadata && entry.metadata.id) {
            entriesById.set(entry.metadata.id, entry);
          }
        });
        
        // If we have a selected node, find its related notes
        if (selectedNodeId && selectedNode) {
          const nodeId = selectedNode.noteId;
          if (nodeId) {
            const entry = entriesById.get(nodeId);
            if (entry && entry.related_note_ids) {
              setRelatedNoteIds(entry.related_note_ids);
            } else {
              setRelatedNoteIds([]);
            }
          }
        }
        
        // Fetch all files first to create necessary mappings
        const { data: allFiles, error: filesError } = await supabaseClient
          .from("space_files")
          .select("id, file_name, file_path, metadata, is_note")
          .eq("space_id", spaceId)
          .eq("is_note", true);
          
        if (filesError) {
          console.error("Error fetching note files:", filesError);
        } else if (allFiles) {
          // Create mappings for note titles and file_name to id
          const noteTitles: Record<string, string> = {};
          const idMap: Record<string, string> = {};
          
          allFiles.forEach((file: SpaceFile) => {
            // Store id by file_name for lookup
            idMap[file.file_name] = file.id;
            
            // Get title from metadata or file_name
            if (file.metadata && file.metadata.title) {
              noteTitles[file.id] = file.metadata.title;
            } else {
              // Format file name as title
              const name = file.file_name
                .replace(/\.json$/, "")
                .replace(/_/g, " ")
                .replace(/Note-/i, "");
              noteTitles[file.id] = name;
            }
          });
          
          setNoteTitlesMap(noteTitles);
          setNoteIdMap(idMap);
          
          // Now process all related_note_ids
          const validatedRelatedNotes = new Map<string, string[]>();
          
          researchData.forEach((entry: ResearchEntry) => {
            if (entry.related_note_ids && entry.related_note_ids.length > 0) {
              // Convert any filename references to actual UUIDs
              const validatedIds = entry.related_note_ids.map(noteRef => {
                // If it's already a UUID, use it directly
                if (isUUID(noteRef)) {
                  return noteRef;
                }
                // If it's a filename, try to get the UUID from our map
                else if (idMap[noteRef]) {
                  return idMap[noteRef];
                }
                // Otherwise, it's invalid - return empty string to filter out later
                return "";
              }).filter(id => id !== ""); // Remove any invalid/unmapped IDs
              
              // Store the validated IDs
              if (entry.metadata && entry.metadata.id) {
                validatedRelatedNotes.set(entry.metadata.id, validatedIds);
              }
            }
          });
          
          // Update any research entries we've found related notes for
          if (selectedNode && selectedNode.noteId && validatedRelatedNotes.has(selectedNode.noteId)) {
            setRelatedNoteIds(validatedRelatedNotes.get(selectedNode.noteId) || []);
          }
        }
      }

      setError(null);
    } catch (err) {
      console.error("Error loading graph data:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when spaceId changes or component mounts
  useEffect(() => {
    fetchGraphData();
  }, [spaceId]);

  // Initialize graph on first render
  const initializedRef = useRef(false);

  // Initial setup - only runs once
  useEffect(() => {
    // Only proceed if we have loaded the data from Supabase
    if (isLoading || !mainGraphData) return;

    // Set initial graph data based on current view
    if (
      currentView === "detailed" &&
      selectedNode &&
      detailedGraphs[selectedNode.id]
    ) {
      // If we're already in detailed view (e.g., after a reload), show detailed graph
      setGraphData(detailedGraphs[selectedNode.id]);
    } else {
      // Otherwise show main graph
      setGraphData(mainGraphData);
    }

    // Mark as initialized
    initializedRef.current = true;
  }, [currentView, selectedNode, detailedGraphs, mainGraphData, isLoading]);

  // Handle view changes - only runs after initialization
  useEffect(() => {
    // Skip on first render since initialization handles that
    if (!initializedRef.current || !mainGraphData) return;

    // When view changes, update the graph
    if (currentView === "graph") {
      // Reset selected node when returning to main graph
      setSelectedNode(null);
      setGraphData(mainGraphData);
    } else if (currentView === "detailed" && selectedNode) {
      // Show detailed view of the selected node
      const nodeId = selectedNode.id;
      if (detailedGraphs[nodeId]) {
        setGraphData(detailedGraphs[nodeId]);
      }
    }
  }, [currentView, selectedNode, detailedGraphs, mainGraphData]);

  // Find node by ID on first render if selectedNodeId is provided
  useEffect(() => {
    // Only proceed if we have loaded the data from Supabase
    if (isLoading || !mainGraphData) return;

    // If we have a selectedNodeId but no selectedNode yet, find it from the main graph
    if (selectedNodeId && !selectedNode && mainGraphData) {
      const node = mainGraphData.nodes.find((n) => n.id === selectedNodeId);
      if (node) {
        setSelectedNode(node);
      }
    }
  }, [selectedNodeId, selectedNode, mainGraphData, isLoading]);

  // Load related notes when selectedNode changes
  useEffect(() => {
    if (!selectedNode || isLoading || !researchEntries.length) return;
    
    // When a node is selected, find its research entry and related note IDs
    const nodeId = selectedNode.noteId;
    if (nodeId) {
      // Find research entry by matching the metadata.id with the node's noteId
      const entry = researchEntries.find(
        entry => entry.metadata && entry.metadata.id === nodeId
      );
      
      if (entry) {
        // Set content for the markdown display
        setMarkdownContent(entry.content);
        
        // Set related note IDs for the links, converting filenames to UUIDs where needed
        const validatedIds = entry.related_note_ids 
          ? entry.related_note_ids.map(noteRef => {
              if (isUUID(noteRef)) {
                return noteRef;
              } else if (noteIdMap[noteRef]) {
                return noteIdMap[noteRef];
              }
              return "";
            }).filter(id => id !== "") // Remove any invalid/unmapped IDs
          : [];
          
        setRelatedNoteIds(validatedIds);
      } else {
        setRelatedNoteIds([]);
      }
    }
  }, [selectedNode, isLoading, researchEntries, noteIdMap]);

  // Effect to handle graph data changes and apply zoom
  useEffect(() => {
    // When the graph data changes or is initially set
    if (fgRef.current && graphData) {
      // Customize the forces for better spacing with larger nodes
      fgRef.current.d3Force("charge").strength(-500); // Stronger repulsion between nodes

      // Dynamically adjust link distance based on connected node label lengths
      graphData.links.forEach((link) => {
        const sourceNode =
          typeof link.source === "string"
            ? graphData.nodes.find((n) => n.id === link.source)
            : (link.source as GraphNode);

        const targetNode =
          typeof link.target === "string"
            ? graphData.nodes.find((n) => n.id === link.target)
            : (link.target as GraphNode);

        if (sourceNode && targetNode) {
          const avgLabelLength =
            (sourceNode.label.length + targetNode.label.length) / 2;
          // Base distance + additional distance based on label length
          const distance = 150 + Math.min(avgLabelLength * 5, 150);

          // Set custom distance for this link
          // Note: This requires modifying the link object
          (link as any).distance = distance;
        }
      });

      // Override the default link force with a custom one that respects individual link distances
      fgRef.current
        .d3Force("link")
        .distance((link: any) => link.distance || 240);
      // Increase centering force to pull components together
      fgRef.current.d3Force("center").strength(0.75); 

      // Reheat simulation to apply new forces
      fgRef.current.d3ReheatSimulation();
    }
  }, [graphData]);

  // Handle node click
  const handleNodeClick = (node: GraphNode) => {
    if (currentView === "graph" && detailedGraphs[node.id]) {
      // First-level navigation: from main graph to detailed graph
      setSelectedNode(node);
      setCurrentView("detailed", node.id);
    } else if (currentView === "detailed" && node.noteId) {
      // Second-level navigation: from detailed graph to markdown content
      // Find research entry by matching the metadata.id with the node's noteId
      const entry = researchEntries.find(
        entry => entry.metadata && entry.metadata.id === node.noteId
      );
      
      if (entry) {
        setMarkdownContent(entry.content);
        
        // Process related note IDs, converting filenames to UUIDs where needed
        const validatedIds = entry.related_note_ids 
          ? entry.related_note_ids.map(noteRef => {
              if (isUUID(noteRef)) {
                return noteRef;
              } else if (noteIdMap[noteRef]) {
                return noteIdMap[noteRef];
              }
              return "";
            }).filter(id => id !== "")
          : [];
          
        setRelatedNoteIds(validatedIds);
        setShowMarkdown(true);
      }
    }
  };

  // Handle back button click
  const handleBackClick = () => {
    // Reset all states when going back to main graph
    setCurrentView("graph");
    setSelectedNode(null);
    setShowMarkdown(false);
    setMarkdownContent("");
    setGraphData(mainGraphData);
  };

  // Add close markdown handler
  const handleCloseMarkdown = () => {
    // Just close the markdown overlay, keeping the detailed view
    setShowMarkdown(false);
    setMarkdownContent("");
  };

  // Handle opening a note
  const handleOpenNote = (noteId: string) => {
    // Make sure we're using a valid UUID
    if (!isUUID(noteId) && noteIdMap[noteId]) {
      noteId = noteIdMap[noteId];
    }
    
    // Only proceed if we have a valid UUID
    if (isUUID(noteId)) {
      // Update layout state to open the note
      setLayout({
        selectedView: "notes",
        selectedNoteId: noteId,
      });
    } else {
      console.error("Cannot open note: Invalid note ID", noteId);
    }
  };

  // Render function for nodes
  const renderNode = (node: GraphNode, ctx: CanvasRenderingContext2D) => {
    const label = node.label || node.id;
    const fontSize = 14; // Fixed font size
    ctx.font = `${fontSize}px sans-serif`;

    // Calculate line breaking for long text
    const maxLineWidth = 200; // Maximum width for a line of text
    let lines: string[] = [];

    // Split label into lines if it's too long
    if (ctx.measureText(label).width > maxLineWidth) {
      let currentLine = "";
      const words = label.split(" ");

      for (const word of words) {
        const testLine = currentLine + (currentLine ? " " : "") + word;
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth > maxLineWidth && currentLine !== "") {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    } else {
      lines = [label];
    }

    // Calculate total text height
    const lineHeight = fontSize * 1.2;
    const textHeight = lines.length * lineHeight;

    // Find the widest line
    const textWidth = Math.max(
      ...lines.map((line) => ctx.measureText(line).width),
    );

    if (node.type === "text") {
      // Text nodes with background
      const padding = fontSize * 0.8;
      const bckgDimensions = [textWidth + padding * 2, textHeight + padding];

      // Make text nodes appear clickable with a blue tint for notes
      const isClickable = !!node.noteId;
      const bgColor = isClickable
        ? "rgba(232, 240, 255, 0.95)"
        : "rgba(252, 252, 255, 0.9)";
      const borderColor = isClickable ? "#4361EE" : "#e0e0e0";

      // Background rectangle with border
      ctx.fillStyle = bgColor;
      ctx.fillRect(
        node.x! - bckgDimensions[0] / 2,
        node.y! - bckgDimensions[1] / 2,
        bckgDimensions[0],
        bckgDimensions[1],
      );

      // Add border to indicate clickability
      if (isClickable) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
          node.x! - bckgDimensions[0] / 2,
          node.y! - bckgDimensions[1] / 2,
          bckgDimensions[0],
          bckgDimensions[1],
        );
      }

      // Text itself
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isClickable ? "#1a365d" : "#333333";

      // Draw each line of text
      lines.forEach((line, i) => {
        const yPos = node.y! - textHeight / 2 + i * lineHeight + lineHeight / 2;
        ctx.fillText(line, node.x!, yPos);
      });

      // Add a small info icon for clickable notes
      if (isClickable) {
        const iconSize = fontSize * 0.8;
        const iconX = node.x! + bckgDimensions[0] / 2 - iconSize;
        const iconY = node.y! - bckgDimensions[1] / 2 + iconSize;

        // Draw info circle
        ctx.beginPath();
        ctx.arc(iconX, iconY, iconSize / 2, 0, 2 * Math.PI, false);
        ctx.fillStyle = "#4361EE";
        ctx.fill();

        // Draw 'i' letter
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${iconSize * 0.8}px sans-serif`;
        ctx.fillText("i", iconX, iconY + iconSize * 0.1);
      }

      // Store dimensions for pointer area
      node.__bckgDimensions = bckgDimensions;
    } else {
      // Regular circle nodes
      // Calculate node size based on text width to ensure it fits
      const nodeSize = Math.max(
        textWidth / 1.5,
        textHeight / 1.5,
        node.size || 10,
      );

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, nodeSize, 0, 2 * Math.PI, false);
      ctx.fillStyle = node.color || "#4361EE"; // Use modern default color
      ctx.fill();

      // Node border
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Add label inside the circle
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff"; // White text for better contrast

      // Draw each line of text
      lines.forEach((line, i) => {
        const yOffset = (i - (lines.length - 1) / 2) * lineHeight;
        ctx.fillText(line, node.x!, node.y! + yOffset);
      });

      // Store node size for pointer area
      node.__bckgDimensions = [nodeSize * 2, nodeSize * 2];
    }
  };

  // Handle pointer area for interactive nodes
  const handlePointerArea = (
    node: GraphNode,
    color: string,
    ctx: CanvasRenderingContext2D,
  ) => {
    ctx.fillStyle = color;
    if (node.type === "text") {
      const bckgDimensions = node.__bckgDimensions;
      if (bckgDimensions) {
        ctx.fillRect(
          node.x! - bckgDimensions[0] / 2,
          node.y! - bckgDimensions[1] / 2,
          bckgDimensions[0],
          bckgDimensions[1],
        );
      }
    } else {
      // For circle nodes, use the stored dimensions
      const dimensions = node.__bckgDimensions;
      if (dimensions) {
        const radius = dimensions[0] / 2;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI, false);
        ctx.fill();
      }
    }
  };

  // Helper function to get note title from metadata
  const getNoteTitle = (noteId: string): string => {
    // If the noteId is a filename rather than UUID, try to convert it first
    const actualId = isUUID(noteId) ? noteId : (noteIdMap[noteId] || noteId);
    
    // Look up the title in our map
    if (noteTitlesMap[actualId]) {
      return noteTitlesMap[actualId];
    }
    
    // For filenames that didn't get mapped, try to extract a readable name
    if (!isUUID(noteId)) {
      return noteId
        .replace(/\.json$/, "")
        .replace(/_/g, " ")
        .replace(/Note-/i, "");
    }
    
    // Fallback to a generic title
    return "Note";
  };

  // Show loading state
  if (isLoading) {
    return (
      <div
        className="relative h-full w-full flex items-center justify-center"
        ref={containerRef}
      >
        <div className="text-gray-600">Loading graph data...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div
        className="relative h-full w-full flex items-center justify-center"
        ref={containerRef}
      >
        <div className="text-red-500">
          <p>Error loading graph data:</p>
          <p>{error.message}</p>
          <button
            onClick={fetchGraphData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" ref={containerRef}>
      {currentView === "detailed" && (
        <button
          onClick={handleBackClick}
          className="absolute top-4 left-4 px-4 py-2 z-10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          ← Back to Topics
        </button>
      )}

      {graphData &&
        containerDimensions.width > 0 &&
        containerDimensions.height > 0 && (
          <ForceGraph2D
            ref={fgRef}
            graphData={graphData}
            nodeAutoColorBy="group"
            linkWidth={2}
            linkColor={() => "#999"}
            nodePointerAreaPaint={handlePointerArea}
            nodeCanvasObject={renderNode}
            onNodeClick={handleNodeClick}
            cooldownTicks={100}
            d3AlphaDecay={0.01}
            d3VelocityDecay={0.3}
            nodeRelSize={6}
            width={containerDimensions.width}
            height={containerDimensions.height}
            // Add onEngineStop callback to handle zoom after simulation stabilizes
            onEngineStop={() => {
              if (fgRef.current) {
                // Calculate appropriate padding based on the current view
                let padding: number;
                if (currentView === 'graph') {
                  padding = 150; // Padding for main graph view
                } else if (currentView === 'detailed') {
                  padding = 250; // More padding for detailed view (less zoom)
                } else { // Covers 'preview'
                  padding = 40;  // Keep tighter zoom for preview
                }
                fgRef.current.zoomToFit(400, padding);
              }
            }}
          />
        )}

      {/* Note links panel - replaces markdown with clickable links */}
      {showMarkdown && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-20">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 bg-gray-50 p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Related Notes</h3>
              <button
                onClick={handleCloseMarkdown}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Close"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Related notes links at the top */}
            <div className="pt-16 px-6 pb-2 bg-gray-50 border-b">
              <div className="flex flex-wrap gap-2 my-2">
                {relatedNoteIds && relatedNoteIds.length > 0 ? (
                  relatedNoteIds.map((noteId) => (
                    <button
                      key={noteId}
                      onClick={() => handleOpenNote(noteId)}
                      className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors text-sm"
                    >
                      {getNoteTitle(noteId)}
                    </button>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No related notes found</p>
                )}
              </div>
            </div>

            {/* Scrollable markdown content */}
            <div className="flex-1 overflow-auto p-6">
              <MarkdownRenderer content={markdownContent} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HierarchicalGraph;
