import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Block, BlockNoteEditor as BlockNoteEditorCore, PartialBlock } from "@blocknote/core";
import { BlockNoteView } from '@blocknote/mantine';
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useTheme } from '../../contexts/ThemeContext';
import { useSupabaseUser } from '../../contexts/UserContext';
import ReactDiffViewer from 'react-diff-viewer';

// Define proper types for the BlockNoteEditor props
interface BlockNoteEditorProps {
  onClose: () => void;
  noteId: string;
  noteContent: string;
  onSave: (content: string) => void;
  noteName: string;
}

// Error boundary component to catch errors in BlockNoteView
class EditorErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    onError: (error: Error, info: React.ErrorInfo) => void;
  },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode;
    onError: (error: Error, info: React.ErrorInfo) => void;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 text-red-800 rounded-md">
          <h3 className="text-lg font-medium mb-2">
            Something went wrong with the note editor
          </h3>
          <p className="mb-4">
            We've encountered an error displaying the editor. Please try the
            following:
          </p>
          <ul className="list-disc ml-5 mb-4">
            <li>Refresh the page</li>
            <li>Try creating a new note</li>
            <li>Check your internet connection</li>
          </ul>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-hover transition-all duration-200"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Add a helper function for safely parsing content
const safelyParseContent = (jsonString: string) => {
  try {
    if (!jsonString || jsonString.trim() === '') {
      return null;
    }
    
    const parsed = JSON.parse(jsonString);
    
    // Check if the content is in the expected format
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Validate that the array contains valid blocks
      if (parsed[0].type && parsed[0].id) {
        return parsed;
      }
    } else if (parsed && parsed.content && Array.isArray(parsed.content) && parsed.content.length > 0) {
      // Validate that the content array contains valid blocks
      if (parsed.content[0].type && parsed.content[0].id) {
        return parsed.content;
      }
    }
    
    return null;
  } catch (e) {
    console.error('Error parsing content:', e);
    return null;
  }
};

// Import the BlockNote component that will be displayed when a note is clicked
const BlockNoteEditor = ({ onClose, noteId, noteContent, onSave, noteName }: BlockNoteEditorProps) => {
  const { theme } = useTheme();
  const [content, setContent] = useState<string>(noteContent);
  const [isLoading, setIsLoading] = useState<boolean>(!noteContent);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showSaved, setShowSaved] = useState<boolean>(false);
  const editorRef = useRef<BlockNoteEditorCore | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { getSupabaseClient } = useSupabaseUser();
  
  // Add state for virtual note functionality
  const [virtualNoteContent, setVirtualNoteContent] = useState<string | null>(null);
  const [showDiffView, setShowDiffView] = useState<boolean>(false);
  const [checkingVirtualNote, setCheckingVirtualNote] = useState<boolean>(false);
  // Add state for view mode toggle
  const [viewMode, setViewMode] = useState<'diff' | 'side-by-side'>('diff');
  
  // Virtual note editor ref for side-by-side view
  const virtualEditorRef = useRef<BlockNoteEditorCore | null>(null);
  
  // Extract path components from noteId
  const getVirtualNotePath = useCallback(async (noteId: string) => {
    // The noteId should be the full path including user ID, folder ID, and note filename
    const supabaseClient = await getSupabaseClient();
    const { data: noteData, error: noteError } = await supabaseClient
      .from('space_files')
      .select('*')
      .eq('id', noteId)
      .single();
      
    if (noteError) {
      console.error("Error fetching note data:", noteError);
      return null;
    }
      
    if (noteData) {
      // Construct the virtual note path with the 'virtual/' prefix
      return `virtual/${noteData.file_path}`;
    }
    return null;
  }, []);
  
  // Function to check for virtual note existence and fetch its content
  const checkForVirtualNote = useCallback(async () => {
    try {
      setCheckingVirtualNote(true);
      const virtualPath = await getVirtualNotePath(noteId);      
      if (!virtualPath) {
        setVirtualNoteContent(null);
        setCheckingVirtualNote(false);
        return;
      }
      
      const supabaseClient = await getSupabaseClient();
      
      // First check if the file exists before attempting to download
      const { data: fileExists, error: checkError } = await supabaseClient
        .storage
        .from('Vox')
        .list(virtualPath.split('/').slice(0, -1).join('/'));
        
      // If we can't check or the file doesn't exist, quietly exit
      if (checkError || !fileExists || !fileExists.find((file: { name: string }) => 
        file.name === virtualPath.split('/').pop())) {
        setVirtualNoteContent(null);
        setCheckingVirtualNote(false);
        return;
      }
      
      // Now try to fetch the virtual note from the Vox bucket
      const { data: virtualNoteData, error: virtualNoteError } = await supabaseClient
        .storage
        .from('Vox')
        .download(virtualPath);
      
      if (virtualNoteError) {
        setVirtualNoteContent(null);
        setCheckingVirtualNote(false);
        return;
      }
      
      // If virtual note exists, read its content
      if (virtualNoteData) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const content = e.target.result as string;
            setVirtualNoteContent(content);
            setShowDiffView(true);
          }
        };
        reader.readAsText(virtualNoteData);
      }
    } catch (error) {
      console.error("Error checking for virtual note:", error);
      setVirtualNoteContent(null);
    } finally {
      setCheckingVirtualNote(false);
    }
  }, [noteId, getVirtualNotePath, getSupabaseClient]);
  
  // Check for virtual note on component mount and when noteId changes
  useEffect(() => {
    checkForVirtualNote();
    
    // Set up polling interval to regularly check for virtual notes
    const intervalId = setInterval(checkForVirtualNote, 1000); // Check every 10 seconds
    
    return () => {
      clearInterval(intervalId);
    };
  }, [noteId, checkForVirtualNote]);
  
  // Function to handle accepting changes from virtual note
  const handleAcceptChanges = useCallback(async () => {
    try {
      if (!virtualNoteContent) return;
      
      // Accept the virtual note content
      setContent(virtualNoteContent);
      onSave(virtualNoteContent);
      
      // Delete the virtual note from storage
      const virtualPath = await getVirtualNotePath(noteId);
      if (virtualPath) {
        const supabaseClient = await getSupabaseClient();
        await supabaseClient
          .storage
          .from('Vox')
          .remove([virtualPath]);
      }
      
      // Return to normal editor view
      setShowDiffView(false);
      setVirtualNoteContent(null);
      
      // Reset editor with new content
      if (editorRef.current) {
        try {
          const parsedContent = JSON.parse(virtualNoteContent);
          editorRef.current.replaceBlocks(editorRef.current.document, parsedContent);
        } catch (e) {
          console.error("Error parsing virtual note content:", e);
        }
      }
    } catch (error) {
      console.error("Error accepting virtual note changes:", error);
      setError("Failed to accept changes");
    }
  }, [virtualNoteContent, noteId, onSave, getVirtualNotePath, getSupabaseClient]);
  
  // Function to handle declining changes from virtual note
  const handleDeclineChanges = useCallback(async () => {
    try {
      // Delete the virtual note without applying changes
      const virtualPath = getVirtualNotePath(noteId);
      if (virtualPath) {
        const supabaseClient = await getSupabaseClient();
        await supabaseClient
          .storage
          .from('Vox')
          .remove([virtualPath]);
      }
      
      // Return to normal editor view
      setShowDiffView(false);
      setVirtualNoteContent(null);
    } catch (error) {
      console.error("Error declining virtual note changes:", error);
      setError("Failed to decline changes");
    }
  }, [noteId, getVirtualNotePath, getSupabaseClient]);
  
  // Function to toggle between diff view and side-by-side view
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'diff' ? 'side-by-side' : 'diff');
  }, []);
  
  // When noteContent changes (after loading), update the editor content
  useEffect(() => {
    if (noteContent) {
      setContent(noteContent);
      setIsLoading(false);
    }
  }, [noteContent]);
  
  // Create a valid empty document structure
  const createEmptyDocument = useCallback(() => {
    try {
      // Create a temporary editor to get a valid empty document structure
      const tempEditor = BlockNoteEditorCore.create();
      return tempEditor.document;
    } catch (error) {
      console.error("Error creating empty document:", error);
      // Return a minimal valid structure if editor creation fails
      return [{ 
        id: "1", 
        type: "paragraph", 
        content: [{ 
          type: "text", 
          text: "", 
          styles: {} 
        }] 
      }];
    }
  }, []);
  
  // Parse the content safely
  const initialContent = React.useMemo(() => {
    if (!noteContent || noteContent.trim() === '') {
      return createEmptyDocument();
    }
    
    const parsedContent = safelyParseContent(noteContent);
    return parsedContent || createEmptyDocument();
  }, [noteContent, createEmptyDocument]);
  
  // Create a memoized BlockNoteEditor
  const editor = React.useMemo(() => {
    try {
      // Ensure initialContent is valid before creating the editor
      if (!Array.isArray(initialContent) || initialContent.length === 0) {
        throw new Error("Invalid initialContent format");
      }
      
      // Create editor with system theme compatible settings
      const newEditor = BlockNoteEditorCore.create({
        initialContent,
      });
      editorRef.current = newEditor;
      return newEditor;
    } catch (error) {
      console.error("Error creating BlockNoteEditor:", error);
      // Create empty editor as fallback with a valid empty document
      try {
        const fallbackEditor = BlockNoteEditorCore.create({
          initialContent: [{ 
            id: "1", 
            type: "paragraph", 
            content: [{ 
              type: "text", 
              text: "", 
              styles: {} 
            }] 
          }]
        });
        editorRef.current = fallbackEditor;
        return fallbackEditor;
      } catch (fallbackError) {
        console.error("Critical error creating fallback editor:", fallbackError);
        // Return null to trigger error boundary
        return null;
      }
    }
  }, [initialContent]);
  
  // Safe function to get editor document
  const getEditorDocument = useCallback(() => {
    try {
      if (editorRef.current) {
        return editorRef.current.document;
      }
      return null;
    } catch (error) {
      console.error("Error accessing editor document:", error);
      return null;
    }
  }, []);
  
  // Safe onChange handler
  const handleEditorChange = useCallback(async () => {
    try {
      setIsLoading(true);
      const document = getEditorDocument();
      // Properly await the markdown conversion
      const markdown = await editorRef.current?.blocksToMarkdownLossy();
      if (markdown) {
        const supabaseClient = await getSupabaseClient();
        const { data, error } = await supabaseClient
          .from('space_files')
          .update({ note_content: markdown })
          .eq('id', noteId)
          .select();
        
        if (error) {
          console.error("Error updating note content:", error);
          throw error;
        }
      }
      if (document) {
        const content = JSON.stringify(document);
        onSave(content);
        setTimeout(() => setIsLoading(false), 500);
      }
    } catch (error) {
      console.error("Error in editor onChange handler:", error);
      setError("Failed to save changes");
      setIsLoading(false);
    }
  }, [onSave, getEditorDocument]);
  
  // Handle editor errors
  const handleEditorError = useCallback(
    (error: Error, info: React.ErrorInfo) => {
      console.error("Editor error:", error, info);
      setError(error.message);
      // Attempt to recreate the editor
      try {
        const tempEditor = BlockNoteEditorCore.create({
          initialContent: [{ 
            id: "1", 
            type: "paragraph", 
            content: [{ 
              type: "text", 
              text: "", 
              styles: {} 
            }] 
          }]
        });
        editorRef.current = tempEditor;
      } catch (e) {
        console.error("Failed to recreate editor:", e);
      }
    },
    []
  );
  
  // Create a memoized virtual BlockNoteEditor for side-by-side view
  const virtualEditor = React.useMemo(() => {
    if (!virtualNoteContent) return null;
    
    try {
      // Parse virtual note content safely
      const parsedVirtualContent = safelyParseContent(virtualNoteContent);
      
      // If parsing failed, return null
      if (!parsedVirtualContent) {
        console.error('Failed to parse virtual note content.');
        return null;
      }
      
      // Create editor with virtual note content
      const newVirtualEditor = BlockNoteEditorCore.create({
        initialContent: parsedVirtualContent,
      });
      virtualEditorRef.current = newVirtualEditor;
      return newVirtualEditor;
    } catch (error) {
      console.error("Error creating virtual BlockNoteEditor:", error);
      return null;
    }
  }, [virtualNoteContent]);
  
  // If editor creation failed completely, show a fallback UI
  if (!editor) {
    return (
      <div className="w-full h-full">
        <div className="flex justify-between items-center mb-4 p-2 border-b">
          <h2 className="text-xl font-medium">{noteName}</h2>
          <button 
            onClick={onClose}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-sm"
          >
            Close
          </button>
        </div>
        <div className="p-4 bg-red-50 text-red-800 rounded-md">
          <h3 className="text-lg font-medium mb-2">
            Unable to load note editor
          </h3>
          <p className="mb-4">
            We couldn't initialize the note editor. Please try refreshing the page.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-hover transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Render diff view or side-by-side view if virtual note exists
  if (showDiffView && virtualNoteContent) {
    // Format JSON for better readability in diff view
    const formatJsonForDiff = (jsonString: string) => {
      try {
        return JSON.stringify(JSON.parse(jsonString), null, 2);
      } catch (e) {
        return jsonString;
      }
    };
    
    return (
      <div className="w-full max-h-screen flex flex-col relative overflow-hidden">
        <div className="p-2 flex items-center justify-between z-10 border-b">
          <div className="flex items-center">
            <h2 className="text-xl font-medium">{noteName}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleViewMode}
              className={`
                px-3 py-1 rounded-md text-sm transition-all duration-200 flex items-center
                ${viewMode === 'diff' 
                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' 
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'}
              `}
            >
              {viewMode === 'diff' 
                ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    Side-by-Side View
                  </>
                )
                : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Diff View
                  </>
                )
              }
            </button>
            <button 
              onClick={handleAcceptChanges}
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm transition-all duration-200 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Accept Changes
            </button>
            <button 
              onClick={handleDeclineChanges}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm transition-all duration-200 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Decline Changes
            </button>
            <button 
              onClick={onClose}
              className="px-3 py-1 bg-card hover:bg-hover rounded-md text-sm transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto w-full p-4">
          
          {viewMode === 'diff' ? (
            // Original diff view
            <div className="h-full w-full overflow-auto bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
              <ReactDiffViewer
                oldValue={formatJsonForDiff(content)}
                newValue={formatJsonForDiff(virtualNoteContent)}
                splitView={true}
                leftTitle="Original Note"
                rightTitle="AI Suggested Changes"
                useDarkTheme={theme === 'dark'}
              />
            </div>
          ) : (
            // Side-by-side view with read-only editors
            <div className="h-full w-full overflow-y-auto overflow-x-hidden flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0">
              <div className="flex-1 flex flex-col min-w-0">
                <div className="mb-2 px-2 py-1 font-medium text-adaptive bg-gray-100 dark:bg-gray-800 rounded-t-md border-t border-l border-r border-gray-200 dark:border-gray-700 text-sm flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Original Note
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-gray-900 rounded-b-md border border-gray-200 dark:border-gray-700">
                  {editor && (
                    <EditorErrorBoundary onError={handleEditorError}>
                      <BlockNoteView 
                        editor={editor} 
                        theme={theme === 'dark' ? 'dark' : 'light'}
                        editable={false}
                        sideMenu={false}
                        slashMenu={false}
                      />
                    </EditorErrorBoundary>
                  )}
                </div>
              </div>
              
              <div className="flex-1 flex flex-col min-w-0">
                <div className="mb-2 px-2 py-1 font-medium text-adaptive bg-blue-100 dark:bg-blue-900 rounded-t-md border-t border-l border-r border-blue-200 dark:border-blue-800 text-sm flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Suggested Changes
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-gray-900 rounded-b-md border border-blue-200 dark:border-blue-800">
                  {virtualEditor && (
                    <EditorErrorBoundary onError={handleEditorError}>
                      <BlockNoteView 
                        editor={virtualEditor} 
                        theme={theme === 'dark' ? 'dark' : 'light'}
                        editable={false}
                        sideMenu={false}
                        slashMenu={false}
                      />
                    </EditorErrorBoundary>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Renders the editor instance using a React component.
  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden">
      <div className="p-2 flex items-center z-10 border-b">
        <div className="relative w-full">
          <div className="space-x-2 cursor-pointer flex items-center w-full px-2 py-1 text-sm font-medium text-left text-adaptive transition-all duration-200">
            <span className="truncate flex items-center">
              {noteName}
              <span
                className={`ml-2 text-xs transition-opacity duration-300 ${isLoading ? "text-yellow-500" : error ? "text-red-500" : "text-green-500"}`}
              >
                {isLoading ? "loading..." : error ? "error loading" : "loaded"}
              </span>
            </span>
            <button 
              onClick={onClose}
              className="px-3 py-1 bg-card hover:bg-hover rounded-md text-sm transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto w-full">
        {error && (
          <div className="p-2 mb-2 text-sm bg-red-100 text-red-800 rounded">
            Error loading: {error}
            <button
              className="ml-2 underline px-1 py-0.5 rounded transition-all duration-200"
              onClick={() => {
                setError(null);
                if (editorRef.current) {
                  const document = getEditorDocument();
                  if (document) {
                    const content = JSON.stringify(document);
                    onSave(content);
                  }
                }
              }}
            >
              Retry
            </button>
          </div>
        )}
        
        <EditorErrorBoundary onError={handleEditorError}>
          <div className="h-full w-full overflow-auto">
            <BlockNoteView 
              editor={editor} 
              onChange={handleEditorChange}
              theme={theme === 'dark' ? 'dark' : 'light'}
              style={{
                paddingBottom: '100px'
              }}
            />
          </div>
        </EditorErrorBoundary>
      </div>
    </div>
  );
};

export default BlockNoteEditor; 