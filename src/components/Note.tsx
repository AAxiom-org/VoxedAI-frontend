import React, { useEffect } from 'react';
import NotesInterface from './note/index';
import { useLayoutState } from '../hooks/useLayoutState';

interface NoteProps {
  noteId?: string | null;
  onNoteSelect?: (noteId: string | null) => void;
}

const Note: React.FC<NoteProps> = ({ noteId, onNoteSelect }) => {
  const [layout, setLayout] = useLayoutState();
  
  // Add debug logging
  useEffect(() => {
    console.log('📝 Note component props:', { noteId, layoutNoteId: layout.selectedNoteId });
  }, [noteId, layout.selectedNoteId]);
  
  // Sync the layout state with the noteId prop whenever it changes
  useEffect(() => {
    if (noteId !== layout.selectedNoteId) {
      console.log('🔄 Updating layout state from Note component:', { 
        noteId, 
        currentLayoutNoteId: layout.selectedNoteId 
      });
      
      // First ensure we're in notes view if there's a noteId
      if (noteId) {
        setLayout({ selectedView: 'notes' });
      }
      
      // Then update the selectedNoteId in a separate call to avoid race conditions
      setTimeout(() => {
        console.log('🔗 Setting selectedNoteId in layout from Note component:', noteId);
        setLayout({ selectedNoteId: noteId });
      }, 0);
    }
  }, [noteId, layout.selectedNoteId, setLayout]);
  
  // Always use the correct note ID to display (prefer prop over layout state)
  const displayNoteId = noteId !== undefined ? noteId : layout.selectedNoteId;
  console.log('📄 Note component rendering with noteId:', displayNoteId);
  
  return (
    <NotesInterface 
      noteId={displayNoteId} 
      onNoteSelect={onNoteSelect} 
    />
  );
};

export default Note;