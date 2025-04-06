import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSupabaseUser } from '../contexts/UserContext';

interface NoteState {
  isNoteOpen: boolean;
  noteId: string | null;
  noteContent: string | null;
  fetchNoteContent: () => Promise<string | null>;
}

/**
 * Hook for managing the state of the currently open note
 * Only fetches note content when explicitly requested to avoid infinite loops
 */
export function useNoteState(): NoteState {
  // Use search params to check if a note is open
  const [searchParams] = useSearchParams();
  const { getSupabaseClient } = useSupabaseUser();
  
  // State for note content
  const [noteContent, setNoteContent] = useState<string | null>(null);
  
  // Check if a note is open by looking at URL parameters
  // First check for direct noteId parameter
  let noteId = searchParams.get('noteId');
  
  // If not found, check in the layout parameter which contains selectedNoteId
  if (!noteId) {
    const layoutParam = searchParams.get('layout');
    if (layoutParam) {
      try {
        const layout = JSON.parse(layoutParam);
        if (layout.selectedNoteId) {
          noteId = layout.selectedNoteId;
        }
      } catch (error) {
        console.error('Error parsing layout parameter:', error);
      }
    }
  }
  
  const isNoteOpen = !!noteId;
  
  // Function to fetch note content - only called when explicitly requested
  const fetchNoteContent = useCallback(async (): Promise<string | null> => {
    if (!isNoteOpen || !noteId) {
      return null;
    }
    
    try {
      console.log('Fetching note content for ID:', noteId);
      const supabaseClient = await getSupabaseClient();

      const { data, error } = await supabaseClient
        .from('space_files')
        .select('note_content')
        .eq('id', noteId)
        .single();
      if (error) {
        console.error('Error fetching note:', error);
        return null;
      }
      console.log('Retrieved note content:', data);

      if (!data) {
        console.error('Note content not found');
        return null;
      }
      
      // Read the blob data as text
      const content = data.note_content;
      
      // Cache the content in state for potential reuse
      setNoteContent(content);
      console.log('Note content cached in state:', content);
      return content;
    } catch (error) {
      console.error('Error fetching note content:', error);
      return null;
    }
  }, [isNoteOpen, noteId, getSupabaseClient]);
  
  return {
    isNoteOpen,
    noteId,
    noteContent,
    fetchNoteContent,
  };
} 