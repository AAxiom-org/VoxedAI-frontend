import { useState, useEffect } from "react";
import { useSupabaseUser } from "../../contexts/UserContext";
import HierarchicalGraph from "./Graph";
import { useLayoutState } from "../../hooks/useLayoutState";
import { isUUID } from "./components/utils";
import {
  BrainNote,
  ResearchEntry,
  BrainStatistics,
  ResearchDigest,
} from "./components/types";

// Import components
import BrainNoteComponent from "./components/BrainNote";
import DigestList from "./components/DigestList";
import DigestModal from "./components/DigestModal";
import QuickStats from "./components/QuickStats";
import QuickActions from "./components/QuickActions";
import GraphPreview from "./components/GraphPreview";
import ProgressModal from "./components/ProgressModal";

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
  const [isCreatingBrainNote, setIsCreatingBrainNote] =
    useState<boolean>(false);
  const [statistics, setStatistics] = useState<BrainStatistics>({
    totalEntries: 0,
    totalTags: 0,
    lastUpdated: "",
    entriesThisWeek: 0,
  });
  const [layout, setLayout] = useLayoutState();
  const { getSupabaseClient, supabaseUserId } = useSupabaseUser();
  const [activeTab, setActiveTab] = useState<"brain" | "digest">("brain");

  // State for research digests
  const [researchDigests, setResearchDigests] = useState<ResearchDigest[]>([]);
  const [isGeneratingDigest, setIsGeneratingDigest] = useState<boolean>(false);
  const [digestGenerationStatus, setDigestGenerationStatus] =
    useState<string>("");
  const [digestGenerationProgress, setDigestGenerationProgress] =
    useState<number>(0);
  const [digestGenerationError, setDigestGenerationError] = useState<
    string | null
  >(null);
  const [selectedDigest, setSelectedDigest] = useState<ResearchDigest | null>(
    null,
  );
  const [isDigestModalOpen, setIsDigestModalOpen] = useState<boolean>(false);

  // State for graph generation
  const [isGeneratingGraph, setIsGeneratingGraph] = useState<boolean>(false);
  const [graphGenerationStatus, setGraphGenerationStatus] =
    useState<string>("");
  const [graphGenerationProgress, setGraphGenerationProgress] =
    useState<number>(0);
  const [graphGenerationError, setGraphGenerationError] = useState<
    string | null
  >(null);

  // Get note titles from note IDs - similar to what Graph.tsx does
  const [noteTitlesMap, setNoteTitlesMap] = useState<Record<string, string>>(
    {},
  );
  const [noteIdMap, setNoteIdMap] = useState<Record<string, string>>({});

  // Helper function to get note title from ID
  const getNoteTitle = (noteId: string): string => {
    // If the noteId is a filename rather than UUID, try to convert it first
    const actualId = isUUID(noteId) ? noteId : noteIdMap[noteId] || noteId;

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
      console.log(recentEntries);
    }
  };

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
              (entry: any) => new Date(entry.created_at) > oneWeekAgo,
            ).length;

            // Last updated
            const sortedByDate = [...allEntries.data].sort(
              (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime(),
            );

            setStatistics({
              totalEntries: allEntries.data.length,
              totalTags: allTags.size,
              lastUpdated: sortedByDate[0]?.updated_at || "",
              entriesThisWeek,
            });
          }
        }

        // Fetch research digests
        const { data: digestsData, error: digestsError } = await supabaseClient
          .from("space_digests")
          .select("*")
          .eq("space_id", spaceId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (digestsError) {
          console.error("Error fetching research digests:", digestsError);
        } else {
          setResearchDigests(digestsData || []);

          // Fetch all note files to build title and ID maps, if not already populated
          if (Object.keys(noteTitlesMap).length === 0) {
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

              allFiles.forEach((file: any) => {
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
            }
          }
        }
      } catch (error) {
        console.error("Error in fetchBrainData:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrainData();
  }, [spaceId, getSupabaseClient, supabaseUserId, isCreatingBrainNote, layout]);

  // Create a new brain note
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

  // Function to handle research digest generation
  const handleGenerateDigest = async () => {
    if (!spaceId || !supabaseUserId) {
      console.error("Missing required information to generate digest");
      setDigestGenerationError("Missing space ID or user ID");
      return;
    }

    // Switch to the digest tab to show the progress
    setActiveTab("digest");

    // Set up a refresh interval for real-time updates during generation
    const refreshInterval = setInterval(() => {
      refreshDigests();
    }, 5000); // Refresh every 5 seconds during generation

    try {
      setIsGeneratingDigest(true);
      setDigestGenerationStatus("Starting digest generation...");
      setDigestGenerationProgress(0);
      setDigestGenerationError(null);

      // Call the digest generation endpoint
      const response = await fetch(
        "https://voxed.aidanandrews.org/api/v1/research/digest",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            space_id: spaceId,
            user_id: supabaseUserId,
            stream: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      // Define progress stages
      const progressStages = {
        "Starting digest generation...": 5,
        "Fetching notes from space...": 10,
        Found: 15, // Partial match for "Found X notes in space"
        "Generating search queries": 20,
        Generated: 25, // Partial match for "Generated X search queries"
        "Performing web searches...": 30,
        "Searching query": 35, // Partial match for "Searching query X of Y"
        "Completed search": 60, // Partial match for "Completed search X of Y"
        "Generating research digest": 75,
        "Storing digest in database...": 90,
        "Digest generation complete": 100,
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
              setDigestGenerationStatus(eventData.message);

              // Update progress based on status message
              for (const [stage, progress] of Object.entries(progressStages)) {
                if (eventData.message.includes(stage)) {
                  setDigestGenerationProgress(progress as number);
                  break;
                }
              }
            } else if (eventData.type === "error") {
              setDigestGenerationError(eventData.message);
              setDigestGenerationStatus("Error generating digest");
            } else if (eventData.type === "done") {
              setDigestGenerationStatus("Digest generation complete");
              setDigestGenerationProgress(100);

              // Refresh digests from the database
              refreshDigests();

              // Set a timeout to change the state back after progress is complete
              setTimeout(() => {
                setIsGeneratingDigest(false);
              }, 1000);
            }
          } catch (e) {
            console.error("Error parsing event data:", e);
          }
        }
      }
    } catch (e) {
      console.error("Error generating digest:", e);
      setDigestGenerationError(
        e instanceof Error ? e.message : "Unknown error",
      );
      setDigestGenerationStatus("Error generating digest");

      // If there's an error, we'll wait a bit before stopping the spinner
      setTimeout(() => {
        setIsGeneratingDigest(false);
      }, 3000);
    } finally {
      // Clear the refresh interval
      clearInterval(refreshInterval);

      // No need to set isGeneratingDigest to false here as we handle it in the success/error cases
      // This prevents the spinner from stopping before the UI has a chance to show completion

      // One final refresh to make sure we have the latest data
      refreshDigests();
    }
  };

  // Function to refresh digests from the database
  const refreshDigests = async () => {
    if (!spaceId) return;

    try {
      const supabaseClient = await getSupabaseClient();

      // Fetch research digests
      const { data: digestsData, error: digestsError } = await supabaseClient
        .from("space_digests")
        .select("*")
        .eq("space_id", spaceId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (digestsError) {
        console.error("Error fetching research digests:", digestsError);
      } else {
        setResearchDigests(digestsData || []);
      }
    } catch (error) {
      console.error("Error in refreshDigests:", error);
    }
  };

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
      const response = await fetch(
        "https://voxed.aidanandrews.org/api/v1/graph/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            space_id: spaceId,
            user_id: supabaseUserId,
            stream: true,
          }),
        },
      );

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
        Found: 15, // Partial match for "Found X notes in space"
        "Analyzing notes and generating graph...": 30,
        "Storing graph in database...": 70,
        Storing: 80, // Partial match for "Storing X research entries in database..."
        "Graph generation complete": 100,
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

  const handleViewDigest = (digest: ResearchDigest) => {
    setSelectedDigest(digest);
    setIsDigestModalOpen(true);
  };

  const handleCloseDigestModal = () => {
    setSelectedDigest(null);
    setIsDigestModalOpen(false);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-auto bg-background">
      {currentView === "main" && (
        <div className="h-full w-full flex flex-col">
          {/* Main Content */}
          <div className="flex-1 p-4 grid grid-cols-12 gap-4 h-full overflow-hidden">
            {/* Left Sidebar - with its own overflow */}
            <div className="col-span-12 lg:col-span-3 lg:border-r border-gray-200 dark:border-gray-700 pr-4 overflow-y-auto max-h-full">
              {/* Quick Stats */}
              <QuickStats statistics={statistics} />

              {/* Knowledge Graph Preview */}
              <GraphPreview setCurrentView={setCurrentView} spaceId={spaceId} />

              {/* Quick Actions */}
              <QuickActions
                handleRebuildGraph={handleRebuildGraph}
                handleOpenEditor={handleOpenEditor}
                isGeneratingGraph={isGeneratingGraph}
              />
            </div>

            {/* Main Content Area - with its own overflow */}
            <div className="col-span-12 lg:col-span-9 flex flex-col h-full overflow-hidden">
              {/* Tabbed Interface */}
              <div className="bg-background rounded-lg flex flex-col h-full">
                <div className="bg-background">
                  <div className="flex">
                    <button
                      className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === "brain"
                          ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                          : "border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                      onClick={() => setActiveTab("brain")}
                    >
                      Second Brain Note
                    </button>
                    <button
                      className={`px-4 py-3 text-sm font-medium border-b-2 ${
                        activeTab === "digest"
                          ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                          : "border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                      onClick={() => setActiveTab("digest")}
                    >
                      Recent Research Digest
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  {/* Progress Modals */}
                  <ProgressModal
                    isActive={isGeneratingGraph}
                    title="Generating Knowledge Graph"
                    progress={graphGenerationProgress}
                    status={graphGenerationStatus}
                    error={graphGenerationError}
                  />

                  {/* Brain Note Card */}
                  {activeTab === "brain" && (
                    <BrainNoteComponent
                      brainNote={brainNote}
                      brainNoteId={brainNoteId}
                      brainNoteContent={brainNoteContent}
                      setBrainNoteContent={setBrainNoteContent}
                      setBrainNote={setBrainNote}
                      isLoading={isLoading}
                      error={error}
                      handleOpenEditor={handleOpenEditor}
                    />
                  )}

                  {/* Digest Modal */}
                  {isDigestModalOpen && selectedDigest && (
                    <DigestModal
                      selectedDigest={selectedDigest}
                      handleCloseDigestModal={handleCloseDigestModal}
                      getNoteTitle={getNoteTitle}
                      handleOpenNote={handleOpenNote}
                    />
                  )}

                  {/* Recent Digest */}
                  {activeTab === "digest" && (
                    <DigestList
                      researchDigests={researchDigests}
                      isLoading={isLoading}
                      handleGenerateDigest={handleGenerateDigest}
                      handleViewDigest={handleViewDigest}
                      noteTitlesMap={noteTitlesMap}
                      handleOpenNote={handleOpenNote}
                      isGeneratingDigest={isGeneratingDigest}
                      digestGenerationProgress={digestGenerationProgress}
                      digestGenerationStatus={digestGenerationStatus}
                      digestGenerationError={digestGenerationError}
                    />
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
};

export default BrainInterface;
