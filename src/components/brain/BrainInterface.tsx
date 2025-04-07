import { useState, useEffect, useCallback } from "react";
import { useSupabaseUser } from "../../contexts/UserContext";
import HierarchicalGraph from "./Graph";
import BlockNoteEditor from "../note/NoteEditor";
import { useLayoutState } from "../../hooks/useLayoutState";
import { CalendarIcon, ClockIcon, TagIcon, TrendingUp, FileTextIcon, GitGraph, SettingsIcon, BrainCircuit, SearchIcon, RefreshCwIcon } from "lucide-react";

// Define interfaces for our data types
interface BrainNoteMetadata {
  tags?: string[];
  emoji?: string;
  title?: string;
  [key: string]: any;
}

interface BrainNote {
  id: string;
  space_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  is_note: boolean;
  is_brain_note: boolean;
  note_content: string;
  metadata?: BrainNoteMetadata;
  created_at?: string;
  updated_at?: string;
}

interface ResearchEntry {
  id: string;
  content?: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    label?: string;
    emoji?: string;
    tags?: string[];
    [key: string]: any;
  };
  related_data?: any;
  [key: string]: any;
}

interface BrainInterfaceProps {
  currentView: "main" | "graph";
  setCurrentView: (view: "main" | "graph" | "detailed") => void;
  spaceId?: string;
}

const BrainInterface = ({
  currentView,
  setCurrentView,
  spaceId,
}: BrainInterfaceProps) => {
  // State for the selected brain note
  const [brainNote, setBrainNote] = useState<BrainNote | null>(null);
  const [brainNoteId, setBrainNoteId] = useState<string | null>(null);
  const [brainNoteContent, setBrainNoteContent] = useState<string>("");
  const [recentEntries, setRecentEntries] = useState<ResearchEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [isCreatingBrainNote, setIsCreatingBrainNote] = useState<boolean>(false);
  const [statistics, setStatistics] = useState({
    totalEntries: 0,
    totalTags: 0,
    lastUpdated: '',
    entriesThisWeek: 0
  });
  const [layout, setLayout] = useLayoutState();
  const { getSupabaseClient, supabaseUserId } = useSupabaseUser();
  const [activeTab, setActiveTab] = useState<'brain' | 'digest'>('brain');
  
  // New state for graph generation
  const [isGeneratingGraph, setIsGeneratingGraph] = useState<boolean>(false);
  const [graphGenerationStatus, setGraphGenerationStatus] = useState<string>("");
  const [graphGenerationProgress, setGraphGenerationProgress] = useState<number>(0);
  const [graphGenerationError, setGraphGenerationError] = useState<string | null>(null);

  // Fetch brain note and recent entries when component mounts
  useEffect(() => {
    const fetchBrainData = async () => {
      if (!spaceId) return;

      // Prevent duplicate fetches
      if (isCreatingBrainNote) {
        console.log("Already creating a brain note, skipping fetch");
        return;
      }

      setIsLoading(true);

      try {
        const supabaseClient = await getSupabaseClient();

        // Fetch brain note
        const { data: brainNoteData, error: brainNoteError } =
          await supabaseClient
            .from("space_files")
            .select("*")
            .eq("space_id", spaceId)
            .eq("is_brain_note", true)
            .single();

        if (brainNoteError && brainNoteError.code !== "PGRST116") {
          console.error("Error fetching brain note:", brainNoteError);
        } else if (brainNoteData) {
          // Brain note exists, just set the state
          setBrainNote(brainNoteData);
          setBrainNoteId(brainNoteData.id);

          const { data: noteContentData, error: noteContentError } =
            await supabaseClient.storage
              .from("Vox")
              .download(brainNoteData.file_path);
          if (noteContentError) {
            console.error("Error fetching note content:", noteContentError);
            if (layout) setError("Error fetching note content");
          } else {
            const noteContent = await noteContentData?.text();
            setBrainNoteContent(noteContent || "");
          }
        } else {
          // Create a new brain note only if none exists
          await createNewBrainNote(supabaseClient, spaceId);
        }

        // Fetch recent entries from space_research
        const { data: recentEntriesData, error: recentEntriesError } =
          await supabaseClient
            .from("space_research")
            .select(
              "id, content, created_at, updated_at, metadata, related_data",
            )
            .eq("space_id", spaceId)
            .order("updated_at", { ascending: false })
            .limit(5);

        if (recentEntriesError) {
          console.error("Error fetching recent entries:", recentEntriesError);
        } else {
          setRecentEntries(recentEntriesData || []);
          
          // Calculate statistics
          const allEntries = await supabaseClient
            .from("space_research")
            .select("id, created_at, updated_at, metadata")
            .eq("space_id", spaceId);
            
          if (allEntries.data) {
            // Get unique tags
            const allTags = new Set();
            allEntries.data.forEach((entry: any) => {
              if (entry.metadata?.tags) {
                entry.metadata.tags.forEach((tag: string) => allTags.add(tag));
              }
            });
            
            // Get entries from this week
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const entriesThisWeek = allEntries.data.filter(
              (entry: any) => new Date(entry.created_at) > oneWeekAgo
            ).length;
            
            // Last updated
            const sortedByDate = [...allEntries.data].sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
            
            setStatistics({
              totalEntries: allEntries.data.length,
              totalTags: allTags.size,
              lastUpdated: sortedByDate[0]?.updated_at || '',
              entriesThisWeek
            });
          }
        }
      } catch (error) {
        console.error("Error in fetchBrainData:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrainData();
  }, [spaceId, getSupabaseClient, supabaseUserId, isCreatingBrainNote]);

  // Create a new brain note - completely rewritten to match index.tsx pattern
  const createNewBrainNote = async (supabaseClient: any, spaceId: string) => {
    if (!spaceId || !supabaseUserId) {
      console.error("Missing required information to create brain note");
      return;
    }

    // Set flag to prevent duplicate creation attempts
    setIsCreatingBrainNote(true);

    try {
      // Fixed metadata for brain notes
      const metadata = {
        tags: ["plan", "research"],
        emoji: "🧠",
        title: "Second Brain",
      };

      // Create a timestamp for the file name
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[T:.]/g, "-");
      const newNoteName = `BrainNote_${timestamp}`;
      const fileName = `${newNoteName}.json`;

      // Create initial blank content for the brain note (JSON format for BlockNote)
      const initialContent = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Second Brain" }],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Start organizing your thoughts here..." },
            ],
          },
        ],
      });

      // Create a blob from the content
      const contentBlob = new Blob([initialContent], {
        type: "application/json",
      });

      // Create file path for storage
      const filePath = `${supabaseUserId}/${spaceId}/${Date.now()}_${fileName}`;

      // Upload the file to storage first
      const { error: uploadError } = await supabaseClient.storage
        .from("Vox")
        .upload(filePath, contentBlob, {
          cacheControl: "3600",
          upsert: false, // Changed to false to prevent overwriting
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      // Now create the database record
      const fileData = {
        space_id: spaceId,
        user_id: supabaseUserId,
        file_name: fileName,
        file_path: filePath,
        file_type: "application/json",
        file_size: contentBlob.size,
        is_note: true,
        is_brain_note: true,
        note_content: initialContent,
        metadata,
      };

      const { data: newNote, error } = await supabaseClient
        .from("space_files")
        .insert([fileData])
        .select()
        .single();

      if (error) {
        console.error("Error creating brain note:", error);
        return;
      }

      if (newNote) {
        // Set the brain note state with the new note
        setBrainNote(newNote);
        setBrainNoteId(newNote.id);
        setBrainNoteContent(initialContent);
        console.log("Brain note created successfully");
      } else {
        console.error("Brain note creation failed: No file record returned");
      }
    } catch (error) {
      console.error("Error in createNewBrainNote:", error);
    } finally {
      // Always reset the flag when done
      setIsCreatingBrainNote(false);
    }
  };

  // Save brain note content - using the approach from NotesInterface
  const handleSaveBrainNote = useCallback(
    async (content: string) => {
      if (!brainNoteId || !brainNote?.file_path) return;
      if (isSavingNote) return;

      // Set saving state to avoid duplicate saves
      setIsSavingNote(true);

      try {
        // Update local state immediately to maintain editor state
        setBrainNoteContent(content);

        const supabaseClient = await getSupabaseClient();

        // Save to database
        const { error: dbError } = await supabaseClient
          .from("space_files")
          .update({ note_content: content })
          .eq("id", brainNoteId);

        if (dbError) {
          console.error("Error saving brain note to database:", dbError);
          return;
        }

        // Save to storage as well
        const contentBlob = new Blob([content], { type: "application/json" });
        const { error: storageError } = await supabaseClient.storage
          .from("Vox")
          .update(brainNote.file_path, contentBlob, {
            cacheControl: "3600",
            upsert: true,
          });

        if (storageError) {
          console.error("Error saving brain note to storage:", storageError);
        }
      } catch (error) {
        console.error("Error in handleSaveBrainNote:", error);
      } finally {
        // Add a small delay before setting isSavingNote to false to make the UI feedback more visible
        setTimeout(() => {
          setIsSavingNote(false);
        }, 500);
      }
    },
    [brainNoteId, brainNote, getSupabaseClient, isSavingNote],
  );

  // Clear brain note content
  const handleClearBrainNote = async () => {
    if (!brainNoteId || !brainNote?.file_path) return;

    try {
      // Create empty content in JSON format for BlockNote
      const emptyContent = JSON.stringify({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Second Brain" }],
          },
        ],
      });

      // Update local state first to maintain UI responsiveness
      setBrainNoteContent(emptyContent);

      const supabaseClient = await getSupabaseClient();

      // Update in database
      const { error: dbError } = await supabaseClient
        .from("space_files")
        .update({ note_content: emptyContent })
        .eq("id", brainNoteId);

      if (dbError) {
        console.error("Error clearing brain note in database:", dbError);
        return;
      }

      // Update in storage
      const contentBlob = new Blob([emptyContent], {
        type: "application/json",
      });
      const { error: storageError } = await supabaseClient.storage
        .from("Vox")
        .update(brainNote.file_path, contentBlob, {
          cacheControl: "3600",
          upsert: true,
        });

      if (storageError) {
        console.error("Error clearing brain note in storage:", storageError);
        return;
      }

      // Update brainNote in state
      setBrainNote((prevNote) => {
        if (!prevNote) return null;
        return {
          ...prevNote,
          note_content: emptyContent,
        };
      });
    } catch (error) {
      console.error("Error in handleClearBrainNote:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 30) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return formatDate(dateString);
    }
  };

  // Extract title from metadata or provide default
  const getEntryTitle = (entry: ResearchEntry) => {
    return entry.metadata?.label || "Untitled Entry";
  };

  // Function to handle graph generation
  const handleRebuildGraph = async () => {
    if (!spaceId || !supabaseUserId) {
      console.error("Missing required information to generate graph");
      setGraphGenerationError("Missing space ID or user ID");
      return;
    }

    try {
      setIsGeneratingGraph(true);
      setGraphGenerationStatus("Starting graph generation...");
      setGraphGenerationProgress(0);
      setGraphGenerationError(null);

      // Call the graph generation endpoint
      const response = await fetch("https://voxed.aidanandrews.org/api/v1/graph/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          space_id: spaceId,
          user_id: supabaseUserId,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      // Define progress stages
      const progressStages = {
        "Starting graph generation...": 5,
        "Fetching notes from space...": 10,
        "Found": 15, // Partial match for "Found X notes in space"
        "Analyzing notes and generating graph...": 30,
        "Storing graph in database...": 70,
        "Storing": 80, // Partial match for "Storing X research entries in database..."
        "Graph generation complete": 100
      };

      // Process streaming response
      let decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete events in buffer
        let lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep the last incomplete chunk in the buffer

        for (const line of lines) {
          if (line.trim() === "" || !line.startsWith("data: ")) continue;
          
          try {
            const eventData = JSON.parse(line.substring(6)); // Remove "data: " prefix
            
            if (eventData.type === "status") {
              setGraphGenerationStatus(eventData.message);
              
              // Update progress based on status message
              for (const [stage, progress] of Object.entries(progressStages)) {
                if (eventData.message.includes(stage)) {
                  setGraphGenerationProgress(progress as number);
                  break;
                }
              }
            } else if (eventData.type === "error") {
              setGraphGenerationError(eventData.message);
              setGraphGenerationStatus("Error generating graph");
            } else if (eventData.type === "done") {
              setGraphGenerationStatus("Graph generation complete");
              setGraphGenerationProgress(100);
              
              // Refresh the graph if we're on the graph view
              if (currentView === "graph") {
                window.location.reload();
              }
            }
          } catch (e) {
            console.error("Error parsing event data:", e);
          }
        }
      }
    } catch (e) {
      console.error("Error generating graph:", e);
      setGraphGenerationError(e instanceof Error ? e.message : "Unknown error");
      setGraphGenerationStatus("Error generating graph");
    } finally {
      // Keep progress and status visible unless there was an error
      if (graphGenerationError) {
        setTimeout(() => {
          setIsGeneratingGraph(false);
        }, 3000);
      } else {
        setTimeout(() => {
          setIsGeneratingGraph(false);
        }, 1000);
      }
    }
  };

  const handleOpenEditor = () => {
    setLayout({
      selectedView: "notes",
      selectedNoteId: brainNoteId,
    });
  };

  return (
    <div className="h-full w-full flex flex-col overflow-auto bg-background">
      {currentView === "main" && (
        <div className="h-full w-full flex flex-col">
          {/* Main Content */}
          <div className="flex-1 p-4 grid grid-cols-12 gap-4 h-full overflow-hidden">
            {/* Left Sidebar - with its own overflow */}
            <div className="col-span-12 lg:col-span-3 lg:border-r border-gray-200 dark:border-gray-700 pr-4 overflow-y-auto max-h-full">
              {/* Search Bar */}
              <div className="flex items-center space-x-3 pt-4 mb-6">
                  <div className="relative">
                    <SearchIcon className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-500" />
                    <input 
                      type="text" 
                      placeholder="Search..." 
                      className="pl-8 pr-4 py-2 rounded-md text-sm bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <button 
                    onClick={() => window.location.reload()}
                    className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    <RefreshCwIcon className="h-5 w-5" />
                  </button>
              </div>
              {/* Quick Stats */}
              <div className="mb-6">
                <h2 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Quick Stats</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-background rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900 p-1.5 rounded-md">
                        <FileTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="ml-2 sm:ml-3 min-w-0">
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Total Entries</p>
                        <p className="text-lg sm:text-xl font-semibold">{statistics.totalEntries}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-background rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 p-1.5 rounded-md">
                        <TagIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="ml-2 sm:ml-3 min-w-0">
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Total Tags</p>
                        <p className="text-lg sm:text-xl font-semibold">{statistics.totalTags}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-background rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 p-1.5 rounded-md">
                        <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-2 sm:ml-3 min-w-0">
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">This Week</p>
                        <p className="text-lg sm:text-xl font-semibold">{statistics.entriesThisWeek}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-background rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-amber-100 dark:bg-amber-900 p-1.5 rounded-md">
                        <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="ml-2 sm:ml-3 min-w-0">
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Last Update</p>
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {statistics.lastUpdated ? formatRelativeTime(statistics.lastUpdated) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Knowledge Graph Preview */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">Knowledge Graph</h2>
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

              {/* Quick Actions */}
              <div>
                <h2 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Quick Actions</h2>
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
                    className={`w-full flex items-center p-3 bg-background hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors ${isGeneratingGraph ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <GitGraph className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
                    <span>{isGeneratingGraph ? "Generating Graph..." : "Rebuild Graph"}</span>
                  </button>
                  <button className="w-full flex items-center p-3 bg-background hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                    <SettingsIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
                    <span>Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content Area - with its own overflow */}
            <div className="col-span-12 lg:col-span-9 flex flex-col h-full overflow-hidden">
              {/* Tabbed Interface */}
              <div className="bg-background rounded-lg flex flex-col h-full">
                <div className="bg-background">
                  <div className="flex">
                    <button 
                      className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'brain' 
                          ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                          : 'border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                      onClick={() => setActiveTab('brain')}
                    >
                      Second Brain Note
                    </button>
                    <button 
                      className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === 'digest' 
                          ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                          : 'border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                      onClick={() => setActiveTab('digest')}
                    >
                      Recent Research Digest
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  {/* Display graph generation status if active */}
                  {isGeneratingGraph && (
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-10 flex items-center justify-center">
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium mb-4">Generating Knowledge Graph</h3>
                        
                        <div className="mb-4">
                          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 ease-in-out"
                              style={{ width: `${graphGenerationProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-right text-xs mt-1 text-gray-500">{graphGenerationProgress}%</p>
                        </div>
                        
                        <p className="mb-2">{graphGenerationStatus}</p>
                        
                        {graphGenerationError && (
                          <p className="text-red-500 text-sm">{graphGenerationError}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Brain Note Card */}
                  {activeTab === 'brain' && (
                    <div className="h-full flex flex-col">
                      <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-background">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="text-2xl mr-2">🧠</span>
                            <h2 className="text-lg font-medium">Second Brain Note</h2>
                            <span
                              className={`ml-2 text-xs transition-opacity duration-300 ${isLoading ? "text-yellow-500" : error ? "text-red-500" : isSavingNote ? "text-yellow-500" : "text-green-500"}`}
                            >
                              {isLoading ? "loading..." : error ? "error saving" : isSavingNote ? "saving..." : "saved"}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={handleOpenEditor}
                              className="px-3 py-1.5 text-sm bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900 dark:hover:bg-indigo-800 text-indigo-600 dark:text-indigo-300 rounded-md transition-colors"
                            >
                              Open Editor
                            </button>
                            <button
                              onClick={handleClearBrainNote}
                              className="px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-300 rounded-md transition-colors"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="flex mt-2">
                          {brainNote?.metadata?.tags?.map(
                            (tag: string, index: number) => (
                              <span
                                key={index}
                                className="mr-2 px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full"
                              >
                                {tag}
                              </span>
                            ),
                          )}
                        </div>
                      </div>

                      <div className="flex-1 p-1 overflow-auto">
                        {isLoading ? (
                          <div className="flex-1 flex items-center justify-center h-full">
                            <div className="animate-pulse flex flex-col items-center">
                              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full mb-2"></div>
                              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                              <div className="text-sm text-gray-500">Loading brain note...</div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full overflow-auto">
                            {brainNoteId && (
                              <BlockNoteEditor
                                onClose={() => {}}
                                noteId={brainNoteId}
                                noteContent={brainNoteContent}
                                onSave={handleSaveBrainNote}
                                noteName="Second Brain"
                                isChild={true}
                                isLoading={isSavingNote}
                                setIsLoading={setIsSavingNote}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recent Digest */}
                  {activeTab === 'digest' && (
                    <div className="h-full flex flex-col">
                      <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-background">
                        <div className="flex justify-between items-center">
                          <h2 className="text-lg font-medium">Recent Research Digest</h2>
                          <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">
                            View All
                          </button>
                        </div>
                      </div>

                      <div className="p-4 flex-1 overflow-auto">
                        {isLoading ? (
                          <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="animate-pulse">
                                <div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                                <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
                              </div>
                            ))}
                          </div>
                        ) : recentEntries.length > 0 ? (
                          <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {recentEntries.map((entry) => (
                              <div
                                key={entry.id}
                                className="py-4 first:pt-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                              >
                                <div className="flex items-start justify-between mb-1">
                                  <h3 className="font-medium text-lg flex items-center">
                                    {entry.metadata?.emoji && (
                                      <span className="mr-2">{entry.metadata.emoji}</span>
                                    )}
                                    {getEntryTitle(entry)}
                                  </h3>
                                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                                    {formatRelativeTime(entry.updated_at)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                  {entry.content?.substring(0, 160) || "No content"}...
                                </p>
                                {entry.metadata?.tags && entry.metadata.tags.length > 0 && (
                                  <div className="flex flex-wrap mt-2">
                                    {entry.metadata.tags.slice(0, 3).map((tag: string, index: number) => (
                                      <span
                                        key={index}
                                        className="mr-2 mb-1 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                    {entry.metadata.tags.length > 3 && (
                                      <span className="text-xs text-gray-500 flex items-center">
                                        +{entry.metadata.tags.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center p-8 text-gray-500 bg-background rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                            <div className="text-center">
                              <p>No recent entries found.</p>
                              <p className="text-sm mt-2">
                                Start adding research notes to see them here.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === "graph" && (
        <div className="h-full overflow-hidden relative">
          <button
            onClick={() => setCurrentView("main")}
            className="absolute top-4 left-4 z-10 px-3 py-2 bg-background text-gray-800 dark:text-gray-200 rounded-md shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
          >
            <span>← Back to Dashboard</span>
          </button>
          <HierarchicalGraph
            currentView="graph"
            setCurrentView={setCurrentView}
            spaceId={spaceId}
          />
        </div>
      )}
    </div>
  );
}

export default BrainInterface;