import { useState, useEffect, useCallback } from 'react';
import { useSupabaseUser } from '../../contexts/UserContext';
import HierarchicalGraph from './Graph';
import BlockNoteEditor from '../note/NoteEditor';
import { useLayoutState } from '../../hooks/useLayoutState';

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
    currentView: 'main' | 'graph';
    setCurrentView: (view: 'main' | 'graph' | 'detailed') => void;
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
    const [brainNoteContent, setBrainNoteContent] = useState<string>('');
    const [recentEntries, setRecentEntries] = useState<ResearchEntry[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
    const [isCreatingBrainNote, setIsCreatingBrainNote] = useState<boolean>(false);
    const [layout, setLayout] = useLayoutState();
    const { getSupabaseClient, supabaseUserId } = useSupabaseUser();
    
    // Fetch brain note and recent entries when component mounts
    useEffect(() => {
        const fetchBrainData = async () => {
            if (!spaceId) return;
            
            // Prevent duplicate fetches
            if (isCreatingBrainNote) {
                console.log('Already creating a brain note, skipping fetch');
                return;
            }
            
            setIsLoading(true);
            
            try {
                const supabaseClient = await getSupabaseClient();
                
                // Fetch brain note
                const { data: brainNoteData, error: brainNoteError } = await supabaseClient
                    .from('space_files')
                    .select('*')
                    .eq('space_id', spaceId)
                    .eq('is_brain_note', true)
                    .single();
                
                if (brainNoteError && brainNoteError.code !== 'PGRST116') {
                    console.error('Error fetching brain note:', brainNoteError);
                } else if (brainNoteData) {
                    // Brain note exists, just set the state
                    setBrainNote(brainNoteData);
                    setBrainNoteId(brainNoteData.id);

                    const { data: noteContentData, error: noteContentError } = await supabaseClient.storage
                        .from('Vox')
                        .download(brainNoteData.file_path);
                    if (noteContentError) {
                        console.error('Error fetching note content:', noteContentError);
                    } else {
                        const noteContent = await noteContentData?.text();
                        setBrainNoteContent(noteContent || '');
                    }
                } else {
                    // Create a new brain note only if none exists
                    await createNewBrainNote(supabaseClient, spaceId);
                }
                
                // Fetch recent entries from space_research
                const { data: recentEntriesData, error: recentEntriesError } = await supabaseClient
                    .from('space_research')
                    .select('id, content, created_at, updated_at, metadata, related_data')
                    .eq('space_id', spaceId)
                    .order('updated_at', { ascending: false })
                    .limit(5);
                
                if (recentEntriesError) {
                    console.error('Error fetching recent entries:', recentEntriesError);
                } else {
                    setRecentEntries(recentEntriesData || []);
                }
            } catch (error) {
                console.error('Error in fetchBrainData:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchBrainData();
    }, [spaceId, getSupabaseClient, supabaseUserId, isCreatingBrainNote]);
    
    // Create a new brain note - completely rewritten to match index.tsx pattern
    const createNewBrainNote = async (supabaseClient: any, spaceId: string) => {
        if (!spaceId || !supabaseUserId) {
            console.error('Missing required information to create brain note');
            return;
        }
        
        // Set flag to prevent duplicate creation attempts
        setIsCreatingBrainNote(true);
        
        try {
            // Fixed metadata for brain notes
            const metadata = {
                tags: ["plan", "research"],
                emoji: "🧠",
                title: "Second Brain"
            };
            
            // Create a timestamp for the file name
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:.]/g, "-");
            const newNoteName = `BrainNote_${timestamp}`;
            const fileName = `${newNoteName}.json`;
            
            // Create initial blank content for the brain note (JSON format for BlockNote)
            const initialContent = JSON.stringify({
                type: "doc",
                content: [
                    {
                        type: "heading",
                        attrs: { level: 1 },
                        content: [{ type: "text", text: "Second Brain" }]
                    },
                    {
                        type: "paragraph",
                        content: [{ type: "text", text: "Start organizing your thoughts here..." }]
                    }
                ]
            });
            
            // Create a blob from the content
            const contentBlob = new Blob([initialContent], { type: "application/json" });
            
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
                metadata
            };
            
            const { data: newNote, error } = await supabaseClient
                .from('space_files')
                .insert([fileData])
                .select()
                .single();
            
            if (error) {
                console.error('Error creating brain note:', error);
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
            console.error('Error in createNewBrainNote:', error);
        } finally {
            // Always reset the flag when done
            setIsCreatingBrainNote(false);
        }
    };
    
    // Save brain note content - using the approach from NotesInterface
    const handleSaveBrainNote = useCallback(async (content: string) => {
        if (!brainNoteId || !brainNote?.file_path) return;
        
        // Set saving state to avoid duplicate saves
        setIsSavingNote(true);
        
        try {
            // Update local state immediately to maintain editor state
            setBrainNoteContent(content);
            
            const supabaseClient = await getSupabaseClient();
            
            // Save to database
            const { error: dbError } = await supabaseClient
                .from('space_files')
                .update({ note_content: content })
                .eq('id', brainNoteId);
            
            if (dbError) {
                console.error('Error saving brain note to database:', dbError);
                return;
            }
            
            // Save to storage as well
            const contentBlob = new Blob([content], { type: 'application/json' });
            const { error: storageError } = await supabaseClient.storage
                .from('Vox')
                .update(brainNote.file_path, contentBlob, {
                    cacheControl: '3600',
                    upsert: true,
                });
            
            if (storageError) {
                console.error('Error saving brain note to storage:', storageError);
            }
        } catch (error) {
            console.error('Error in handleSaveBrainNote:', error);
        } finally {
            setIsSavingNote(false);
        }
    }, [brainNoteId, brainNote, getSupabaseClient]);
    
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
                        content: [{ type: "text", text: "Second Brain" }]
                    }
                ]
            });
            
            // Update local state first to maintain UI responsiveness
            setBrainNoteContent(emptyContent);
            
            const supabaseClient = await getSupabaseClient();
            
            // Update in database
            const { error: dbError } = await supabaseClient
                .from('space_files')
                .update({ note_content: emptyContent })
                .eq('id', brainNoteId);
            
            if (dbError) {
                console.error('Error clearing brain note in database:', dbError);
                return;
            }
            
            // Update in storage
            const contentBlob = new Blob([emptyContent], { type: 'application/json' });
            const { error: storageError } = await supabaseClient.storage
                .from('Vox')
                .update(brainNote.file_path, contentBlob, {
                    cacheControl: '3600',
                    upsert: true,
                });
            
            if (storageError) {
                console.error('Error clearing brain note in storage:', storageError);
                return;
            }
            
            // Update brainNote in state
            setBrainNote(prevNote => {
                if (!prevNote) return null;
                return {
                    ...prevNote,
                    note_content: emptyContent
                };
            });
        } catch (error) {
            console.error('Error in handleClearBrainNote:', error);
        }
    };
    
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    // Extract title from metadata or provide default
    const getEntryTitle = (entry: ResearchEntry) => {
        return entry.metadata?.label || 'Untitled Entry';
    };

    const handleOpenEditor = () => {
        setLayout({ 
            selectedView: 'notes',
            selectedNoteId: brainNoteId 
        });
    };
    
    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
            {currentView === 'main' && (
                <div className="h-full w-full flex flex-col lg:flex-row p-4 gap-4 overflow-hidden">
                    {/* Left Column - Brain Note */}
                    <div className="w-full lg:w-1/2 h-full flex flex-col gap-4 overflow-hidden">
                        {/* Brain Note Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col h-full overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold flex items-center">
                                    <span className="mr-2">🧠</span>
                                    Second Brain
                                </h2>
                                <div className="flex space-x-2">
                                    <button 
                                        onClick={handleOpenEditor}
                                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
                                    >
                                        Open Editor
                                    </button>
                                    <button 
                                        onClick={handleClearBrainNote}
                                        className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-200 rounded-md transition-colors"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex mb-2">
                                {brainNote?.metadata?.tags?.map((tag: string, index: number) => (
                                    <span 
                                        key={index} 
                                        className="mr-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            
                            {isLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="animate-pulse">Loading brain note...</div>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-auto">
                                    {brainNoteId && (
                                        <BlockNoteEditor
                                            onClose={() => {}}
                                            noteId={brainNoteId}
                                            noteContent={brainNoteContent}
                                            onSave={handleSaveBrainNote}
                                            noteName="Second Brain"
                                            isChild={true}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Right Column - Knowledge Graph & Recent Updates */}
                    <div className="w-full lg:w-1/2 h-full flex flex-col gap-4 overflow-hidden">
                        {/* Knowledge Graph Card */}
                        <div 
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md h-[300px] relative"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentView('graph');
                            }}
                        >
                            {/* Gray transparent overlay */}
                            <div className="absolute inset-0 rounded-lg flex items-start justify-start">
                                {/* Text in top left */}
                                <span className="p-4 text-black font-medium underline">→ Tap to view graph</span>
                            </div>
                            
                            <HierarchicalGraph 
                                currentView="graph"
                                setCurrentView={setCurrentView}
                                spaceId={spaceId}
                            />
                        </div>
                        
                        {/* Recent Updates Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex-1 overflow-hidden flex flex-col">
                            <h2 className="text-xl font-semibold mb-4">Recent Digest</h2>
                            
                            {isLoading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="animate-pulse">Loading recent entries...</div>
                                </div>
                            ) : recentEntries.length > 0 ? (
                                <div className="space-y-4 pr-1 overflow-y-auto flex-1">
                                    {recentEntries.map((entry) => (
                                        <div 
                                            key={entry.id}
                                            className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-medium text-lg flex items-center">
                                                    {entry.metadata?.emoji && (
                                                        <span className="mr-2">{entry.metadata.emoji}</span>
                                                    )}
                                                    {getEntryTitle(entry)}
                                                </h3>
                                                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                                                    {formatDate(entry.updated_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
                                                {entry.content?.substring(0, 160) || 'No content'}...
                                            </p>
                                            {entry.metadata?.tags && entry.metadata.tags.length > 0 && (
                                                <div className="flex flex-wrap mt-3">
                                                    {entry.metadata.tags.slice(0, 4).map((tag: string, index: number) => (
                                                        <span 
                                                            key={index} 
                                                            className="mr-2 mb-1 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                    {entry.metadata.tags.length > 4 && (
                                                        <span className="text-xs text-gray-500 flex items-center">
                                                            +{entry.metadata.tags.length - 4} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center justify-center p-8 text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                                    <div className="text-center">
                                        <p>No recent entries found.</p>
                                        <p className="text-sm mt-2">Start adding research notes to see them here.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {currentView === 'graph' && (
                <div className="h-full overflow-hidden">
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