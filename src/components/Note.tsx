import { useEffect } from 'react';
import NotesInterface from './note/index';
import { useLayoutState } from '../hooks/useLayoutState';

interface NoteProps {
  noteId?: string | null;
  onNoteSelect?: (noteId: string | null) => void;
}

const Note = ({ noteId, onNoteSelect }: NoteProps) => {
  const [layout, setLayout] = useLayoutState();
  
  // Sync the layout state with the noteId prop whenever it changes
  useEffect(() => {
    if (noteId !== layout.selectedNoteId) {
      console.log('Updating layout state from Note component:', { noteId });
      
      // Update the layout state in a single call
      setLayout({ 
        selectedView: 'notes',
        selectedNoteId: noteId 
      });
    }
  }, [noteId, layout.selectedNoteId, setLayout]);
  
  // Always use the correct note ID to display (prefer prop over layout state)
  const displayNoteId = noteId !== undefined ? noteId : layout.selectedNoteId;
  
  return (
    <NotesInterface 
      noteId={displayNoteId} 
      onNoteSelect={onNoteSelect} 
    />
  );
};

export default Note;