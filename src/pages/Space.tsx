import React, { useState, useEffect, useRef } from "react";
import { Folder, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import ChatInterface from "../components/chat/Chat";
import Note from "../components/Note";
import { useParams } from "react-router-dom";
import Sandbox from "../components/code/Sandbox";
import Brain from "../components/Brain";
import Integrations from "../components/Integrations";
import { useSupabaseUser } from "../contexts/UserContext";
import {
  getSpaceFiles,
  uploadAndProcessFile,
  processFile,
  deleteFileWithRetry,
} from "../services/fileUpload";
import { getSpace } from "../services/spaceService";
import { useMobile } from "../contexts/MobileContext";
import type { SpaceFile } from "../types/space";
import toast from "react-hot-toast";
import Sidebar from "../components/Sidebar";
import { useLayoutState } from "../hooks/useLayoutState";
import NoteModal from "../components/NoteModal";
import ResizablePanel from "../components/ResizablePanel";

// Extended file type with visibility state
interface ExtendedFile extends SpaceFile {
  visible: boolean;
  isProcessing?: boolean;
  isDeletingFile?: boolean;
}

const Space = () => {
  const { id: spaceId } = useParams<{ id: string }>();
  const isMobile = useMobile();

  // Use the useLayoutState hook to manage UI layout state in the URL
  const [layout, setLayout] = useLayoutState({
    sidebarOpen: !isMobile,
    filesExpanded: false,
    notesExpanded: true,
    selectedView: "chat",
    selectedNoteId: null,
  });

  // Destructure layout state for easy access
  const { sidebarOpen, selectedView, selectedNoteId } = layout;

  // Ensure selectedNoteId is always a string or null
  const safeSelectedNoteId: string | null = selectedNoteId || null;

  // State that doesn't need to be in the URL
  const [files, setFiles] = useState<ExtendedFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [spaceName, setSpaceName] = useState("Space");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [notes, setNotes] = useState<ExtendedFile[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [noteSearch, setNoteSearch] = useState("");
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const { supabaseUserId, getSupabaseClient, refreshSupabaseToken } =
    useSupabaseUser();

  // Computed state based on selectedView
  const showChat = selectedView === "chat";
  const showNote = selectedView === "notes";
  const showSandbox = selectedView === "code";
  const showBrain = selectedView === "brain";
  const showIntegrations = selectedView === "integrations";

  // Update state setters to work with the layout state
  const setSidebarOpen = (open: boolean) => setLayout({ sidebarOpen: open });
  // const setFilesExpanded = (expanded: boolean) => setLayout({ filesExpanded: expanded });
  // const setNotesExpanded = (expanded: boolean) => setLayout({ notesExpanded: expanded });
  const setShowChat = (show: boolean) =>
    show && setLayout({ selectedView: "chat", selectedNoteId: null });
  const setShowNote = (show: boolean) =>
    show && setLayout({ selectedView: "notes" });
  const setShowSandbox = (show: boolean) =>
    show && setLayout({ selectedView: "code", selectedNoteId: null });
  const setShowBrain = (show: boolean) =>
    show && setLayout({ selectedView: "brain", selectedNoteId: null });
  const setShowIntegrations = (show: boolean) =>
    show && setLayout({ selectedView: "integrations", selectedNoteId: null });
  // Create a new setter for selectedNoteId
  const setSelectedNote = (noteId: string | null) => {
    console.log("Setting selected note:", noteId);

    // Update the layout state in a single call
    setLayout({
      selectedView: "notes",
      selectedNoteId: noteId,
    });
  };

  // Function to open a specific note - simplified
  const openNote = (noteId: string) => {
    console.log("Opening note:", noteId);

    // Update layout in a single call
    setLayout({
      selectedView: "notes",
      selectedNoteId: noteId,
    });
  };

  // Function to show notes list without a selected note
  const showNotesList = () => {
    // Update the layout state to show notes view but clear the selected note
    setLayout({
      selectedView: "notes",
      selectedNoteId: null,
    });
  };

  // Ensure view mode matches URL state when a note is selected
  useEffect(() => {
    if (selectedNoteId && selectedView !== "notes") {
      setLayout({ selectedView: "notes" });
    }
  }, [selectedNoteId, selectedView]);

  // Fetch space details and files when component mounts
  useEffect(() => {
    console.log(
      "Space component mounted with spaceId:",
      spaceId,
      "and userId:",
      supabaseUserId,
    );
    if (spaceId && supabaseUserId) {
      fetchSpaceDetails();
      fetchFiles();
      fetchNotes();
    } else {
      console.log("Missing required parameters:", { spaceId, supabaseUserId });
      setIsLoadingFiles(false);
      setIsLoadingNotes(false);
    }
  }, [spaceId, supabaseUserId]);

  // Fetch space details
  const fetchSpaceDetails = async () => {
    if (!spaceId) return;

    try {
      console.log("Fetching space details for spaceId:", spaceId);
      const { success, data } = await getSpace(spaceId);
      console.log("Space details response:", { success, data });
      if (success && data) {
        setSpaceName(data.title);
      }
    } catch (error) {
      console.error("Error fetching space details:", error);
    }
  };

  // Fetch files for the current space
  const fetchFiles = async () => {
    if (!spaceId) return;

    setIsLoadingFiles(true);
    try {
      console.log("Fetching files for spaceId:", spaceId);
      const supabaseClient = await getSupabaseClient();
      const { success, data } = await getSpaceFiles(spaceId, supabaseClient);
      console.log("Files response:", { success, data });
      if (success && data) {
        // Convert to ExtendedFile with visibility property
        const extendedFiles = data.map((file) => ({
          ...file,
          visible: true, // Default all files to visible
        }));
        setFiles(extendedFiles);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Fetch notes for the current space
  const fetchNotes = async () => {
    if (!spaceId) return;

    setIsLoadingNotes(true);
    try {
      console.log("Fetching notes for spaceId:", spaceId);
      // Filter notes by is_note flag in the query
      const supabaseClient = await getSupabaseClient();
      const { success, data } = await getSpaceFiles(spaceId, supabaseClient);
      console.log("Notes response:", { success, data });
      if (success && data) {
        // Filter notes on the client side
        const notesOnly = data.filter((file) => file.is_note);
        // Convert to ExtendedFile with visibility property
        const extendedNotes = notesOnly.map((note) => ({
          ...note,
          visible: true, // Default all notes to visible
        }));
        setNotes(extendedNotes);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  // Toggle file visibility
  const toggleFileVisibility = (id: string) => {
    setFiles(
      files.map((file) =>
        file.id === id ? { ...file, visible: !file.visible } : file,
      ),
    );
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (
      !e.target.files ||
      !e.target.files.length ||
      !spaceId ||
      !supabaseUserId
    )
      return;

    const file = e.target.files[0];

    try {
      // Create a temporary ID to track the uploading state
      const tempId = `temp-${Date.now()}`;

      // Add to uploading set
      setUploadingFiles((prev) => new Set(prev).add(tempId));

      const result = await uploadAndProcessFile(
        file,
        spaceId,
        supabaseUserId,
        refreshSupabaseToken,
        getSupabaseClient,
        false, // isNote
      );

      // Remove from uploading set using the tempId from the result
      setUploadingFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });

      if (result.success && result.data) {
        // Add the new file to the files list
        setFiles((prev) => [
          {
            ...result.data,
            visible: true,
            isProcessing: Boolean(result.isProcessing),
          } as ExtendedFile,
          ...prev,
        ]);

        console.log("File uploaded successfully:", result.message);
      } else {
        console.error("File upload failed:", result.error);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (fileId: string) => {
    // Mark file as deleting
    setFiles((prev) =>
      prev.map((file) =>
        file.id === fileId ? { ...file, isDeletingFile: true } : file,
      ),
    );

    try {
      const result = await deleteFileWithRetry(
        fileId,
        refreshSupabaseToken,
        getSupabaseClient,
      );

      if (result.success) {
        // Remove file from list
        setFiles((prev) => prev.filter((file) => file.id !== fileId));
      } else {
        // Reset deleting state if failed
        setFiles((prev) =>
          prev.map((file) =>
            file.id === fileId ? { ...file, isDeletingFile: false } : file,
          ),
        );
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      // Reset deleting state if there was an error
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileId ? { ...file, isDeletingFile: false } : file,
        ),
      );
    }
  };

  // Create a new note - this now just opens the modal
  const createNewNote = () => {
    setIsNoteModalOpen(true);
  };

  // Actual function to create a note with metadata
  const handleCreateNoteWithMetadata = async (
    title: string,
    description: string,
    relatedFiles: string[],
    tags: string[],
    emoji: string,
  ) => {
    if (!spaceId || !supabaseUserId) {
      toast.error("Missing required information to create note");
      return;
    }

    // Prevent multiple simultaneous note creations
    if (isCreatingNote) {
      console.log(
        "Note creation already in progress, skipping duplicate request",
      );
      return;
    }

    // Set flag to indicate we're creating a note
    setIsCreatingNote(true);

    try {
      // Create a unique note name
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[T:.]/g, "-");
      const newNoteName = `Note_${timestamp}`;

      // Create a blank JSON structure for the note
      const initialContent = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Start writing here...",
              },
            ],
          },
        ],
      };

      // Create file
      const contentString = JSON.stringify(initialContent);
      const contentBlob = new Blob([contentString], {
        type: "application/json",
      });

      // Create a file object directly without using the constructor
      const fileName = `${newNoteName}.json`;
      const fileType = "application/json";
      const file = new Blob([contentString], { type: fileType }) as any;
      file.name = fileName;
      file.lastModified = new Date().getTime();

      // Prepare metadata
      const metadata = {
        title,
        description,
        tags,
        emoji,
        related_files: relatedFiles.join(", "),
        created: new Date().toISOString(),
      };

      // Get an authenticated Supabase client
      const authClient = await getSupabaseClient();

      // Format the storage path correctly for our bucket policies
      const filePath = `${supabaseUserId}/${spaceId}/${Date.now()}_${fileName}`;

      console.log("Uploading note to path:", filePath);

      // Upload the file to Supabase storage directly
      const { error: uploadError } = await authClient.storage
        .from("Vox")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      // Get the public URL for the file
      const { data: publicUrlData } = authClient.storage
        .from("Vox")
        .getPublicUrl(filePath);

      if (!publicUrlData) {
        throw new Error("Failed to get public URL for uploaded file");
      }

      console.log("File uploaded successfully, creating database record");

      // Create a record in the space_files table
      const fileData = {
        space_id: spaceId,
        user_id: supabaseUserId,
        file_name: fileName,
        file_path: filePath,
        file_type: fileType,
        file_size: contentBlob.size,
        is_note: true,
        metadata,
      };

      const { data: fileRecord, error: dbError } = await authClient
        .from("space_files")
        .insert([fileData])
        .select()
        .single();

      if (dbError) {
        console.error("Database insert error:", dbError);
        throw dbError;
      }

      if (fileRecord) {
        // Add the new note to the notes list
        const newNoteFile = fileRecord;
        setNotes((prev) => [
          {
            ...newNoteFile,
            visible: true,
            isProcessing: false,
          } as ExtendedFile,
          ...prev,
        ]);

        // Show success toast
        toast.success("New note created successfully");

        // Open the notes panel
        setShowNote(true);
        setShowChat(false);
        setShowSandbox(false);

        // Set selected note
        setSelectedNote(newNoteFile.id);

        // Process the file to ensure it's handled like other files
        try {
          await processFile(newNoteFile.id);
        } catch (err) {
          console.error("Error processing note:", err);
          toast.error("Error processing note");
        }

        console.log("Note created successfully");

        // Refresh the notes list to ensure UI is up to date
        fetchNotes();
      }
    } catch (error) {
      console.error("Error creating new note:", error);
      toast.error("Error creating new note");
    } finally {
      // Reset the flag when done
      setIsCreatingNote(false);
      // Close the menu
      // Close the modal
      setIsNoteModalOpen(false);
    }
  };

  // Handle note deletion
  const handleDeleteNote = async (noteId: string) => {
    // Mark note as deleting
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId ? { ...note, isDeletingFile: true } : note,
      ),
    );

    try {
      const result = await deleteFileWithRetry(
        noteId,
        refreshSupabaseToken,
        getSupabaseClient,
      );

      if (result.success) {
        // Remove note from list
        setNotes((prev) => prev.filter((note) => note.id !== noteId));
        toast.success("Note deleted successfully");

        // If the deleted note was selected, clear the selection
        if (selectedNoteId === noteId) {
          setSelectedNote(null);
        }
      } else {
        // Reset deleting state if failed
        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId ? { ...note, isDeletingFile: false } : note,
          ),
        );
        toast.error("Failed to delete note");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Error deleting note");
      // Reset deleting state
      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId ? { ...note, isDeletingFile: false } : note,
        ),
      );
    }
  };

  const handleNewFile = (type: string) => {
    console.log(`Creating new ${type} file`);
    if (type === "note") {
      createNewNote();
    } else if (type === "code") {
      // Handle code creation
      setShowSandbox(true);
      setShowNote(false);
      setShowChat(false);
    }
  };

  // Update CSS variable when sidebar width changes
  useEffect(() => {
    if (layout.panelSizes?.sidebar) {
      document.documentElement.style.setProperty(
        "--sidebar-width",
        `${layout.panelSizes.sidebar - 10}px`,
      );
    }
  }, [layout.panelSizes?.sidebar]);

  return (
    <div
      className="flex h-screen overflow-hidden bg-white dark:bg-gray-900"
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set dragging to false if we're leaving the container
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0 && fileInputRef.current) {
          fileInputRef.current.files = files;
          handleFileUpload({
            target: { files },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      }}
    >
      {/* Drag overlay - only shown when dragging */}
      {isDragging && (
        <div className="absolute inset-0 bg-gray-900/50 dark:bg-gray-800/70 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center">
            <Folder size={48} className="mx-auto mb-4 text-blue-500" />
            <h3 className="text-xl font-medium text-adaptive mb-2">
              Drop files to upload
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Files will be uploaded to this space
            </p>
          </div>
        </div>
      )}

      {/* Fixed Toggle Button */}
      <div className="absolute top-3 left-3 z-10">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-gray-600 hover:text-gray-800 transition-colors"
        >
          {sidebarOpen ? (
            <PanelLeftClose size={20} />
          ) : (
            <PanelLeftOpen size={20} />
          )}
        </button>
      </div>

      {/* Sidebar - only rendered when open */}
      {sidebarOpen && (
        <div className="flex-shrink-0 z-1">
          <Sidebar
            spaceName={spaceName}
            files={files}
            notes={notes}
            isLoadingFiles={isLoadingFiles}
            isLoadingNotes={isLoadingNotes}
            uploadingFiles={uploadingFiles}
            isCreatingNote={isCreatingNote}
            selectedNote={safeSelectedNoteId}
            noteSearch={noteSearch}
            setNoteSearch={setNoteSearch}
            setSelectedNote={setSelectedNote}
            toggleFileVisibility={toggleFileVisibility}
            handleDeleteFile={handleDeleteFile}
            handleDeleteNote={handleDeleteNote}
            createNewNote={createNewNote}
            handleNewFile={handleNewFile}
            setShowBrain={setShowBrain}
            setShowChat={setShowChat}
            setShowNote={setShowNote}
            setShowSandbox={setShowSandbox}
            setShowIntegrations={setShowIntegrations}
            fileInputRef={fileInputRef}
            handleFileUpload={handleFileUpload}
            openNote={openNote}
            showNotesList={showNotesList}
          />
        </div>
      )}

      {/* Main Content */}
      <div
        className={`flex-1 overflow-hidden transition-all duration-300 ease-in-out h-full`}
      >
        {showChat && !showNote && <ChatInterface sidebarOpen={sidebarOpen} />}
        {showNote && !showChat && (
          <ResizablePanel defaultRatio={0.7}>
            <div className="h-full py-2 overflow-auto">
              <Note
                noteId={safeSelectedNoteId}
                onNoteSelect={(id) => {
                  console.log("Note selection from Note component:", id);
                  setSelectedNote(id);
                }}
              />
            </div>
            <div className="h-full overflow-auto">
              <ChatInterface sidebarOpen={sidebarOpen} simplified={true} />
            </div>
          </ResizablePanel>
        )}
        {!showNote && !showChat && showSandbox && (
          <ResizablePanel defaultRatio={0.7}>
            <div className="h-full py-2 overflow-auto max-h-screen overflow-y-auto">
              <Sandbox />
            </div>
            <div className="h-full overflow-auto">
              <ChatInterface sidebarOpen={sidebarOpen} simplified={true} />
            </div>
          </ResizablePanel>
        )}
        {!showNote && !showChat && !showSandbox && !showIntegrations && showBrain && (
          <ResizablePanel defaultRatio={0.7}>
            <div className="h-full py-2 overflow-auto max-h-screen overflow-y-auto">
              <Brain spaceId={spaceId} />
            </div>
            <div className="h-full overflow-auto">
              <ChatInterface sidebarOpen={sidebarOpen} simplified={true} />
            </div>
          </ResizablePanel>
        )}
        {!showBrain && !showNote && !showChat && !showSandbox && showIntegrations && ( <Integrations /> )}
      </div>

      {/* Add NoteModal component */}
      <NoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onCreateNote={handleCreateNoteWithMetadata}
        isCreating={isCreatingNote}
        availableFiles={files}
      />
    </div>
  );
};

export default Space;
