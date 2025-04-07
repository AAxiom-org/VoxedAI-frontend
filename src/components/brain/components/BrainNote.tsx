import { useState, useCallback } from "react";
import BlockNoteEditor from "../../note/NoteEditor";
import { BrainNote } from "./types";
import { useSupabaseUser } from "../../../contexts/UserContext";

interface BrainNoteProps {
  brainNote: BrainNote | null;
  brainNoteId: string | null;
  brainNoteContent: string;
  setBrainNoteContent: (content: string) => void;
  setBrainNote: (note: BrainNote | null) => void;
  isLoading: boolean;
  error: string | null;
  handleOpenEditor: () => void;
}

const BrainNoteComponent = ({
  brainNote,
  brainNoteId,
  brainNoteContent,
  setBrainNoteContent,
  setBrainNote,
  isLoading,
  error,
  handleOpenEditor,
}: BrainNoteProps) => {
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const { getSupabaseClient } = useSupabaseUser();

  // Save brain note content
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
    [brainNoteId, brainNote, getSupabaseClient, isSavingNote, setBrainNoteContent],
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
      setBrainNote({
        ...brainNote!,
        note_content: emptyContent
      });
    } catch (error) {
      console.error("Error in handleClearBrainNote:", error);
    }
  };

  return (
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
  );
};

export default BrainNoteComponent; 