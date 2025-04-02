import React, { useState } from 'react';
import { Loader, Plus } from 'lucide-react';
import { SpaceFile } from '../../types/space';
import toast from 'react-hot-toast';
import { useUser } from '@clerk/clerk-react';

// Extended file type with visibility state
interface ExtendedFile extends SpaceFile {
  visible: boolean;
  isProcessing?: boolean;
  isDeletingFile?: boolean;
}

interface NoteListProps {
  notes: ExtendedFile[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNoteClick: (noteId: string) => void;
  onDeleteNote: (noteId: string, e: React.MouseEvent) => void;
  onCreateNote: () => void;
  isCreatingNote: boolean;
}

const NoteList = ({
  notes,
  isLoading,
  searchQuery,
  setSearchQuery,
  onNoteClick,
  onDeleteNote,
  onCreateNote,
  isCreatingNote
}: NoteListProps) => {
  const [hoveredNote, setHoveredNote] = useState<string | null>(null);
  const { user } = useUser();

  // Extract title from metadata or filename
  const getNoteTitleFromMetadata = (note: SpaceFile): string => {
    if (note.metadata && note.metadata.title) {
      return note.metadata.title;
    }
    return note.file_name.replace(/\.json$/, '').replace(/_/g, ' ').replace(/Note-/i, '');
  };

  // Get description from metadata
  const getNoteDescriptionFromMetadata = (note: SpaceFile): string => {
    if (note.metadata && note.metadata.description) {
      return note.metadata.description;
    }
    return '';
  };

  // Get tags from metadata
  const getNoteTagsFromMetadata = (note: SpaceFile): string[] => {
    if (note.metadata && note.metadata.tags && Array.isArray(note.metadata.tags)) {
      return note.metadata.tags;
    }
    return [];
  };

  // Get emoji from metadata
  const getNoteEmojiFromMetadata = (note: SpaceFile): string => {
    if (note.metadata && note.metadata.emoji) {
      return note.metadata.emoji;
    }
    return '📝';
  };

  // Filter notes based on search query
  const filteredNotes = notes.filter(note => {
    const title = getNoteTitleFromMetadata(note);
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col w-full h-full max-w-6xl mx-auto p-6 rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header with search and create button */}
      <div className="relative mb-8 flex items-center flex-shrink-0">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Search in space"
            className="w-full py-2 px-4 pl-10 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-adaptive"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>
        <button
          onClick={onCreateNote}
          disabled={isCreatingNote}
          className="ml-4 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreatingNote ? (
            <>
              <Loader size={16} className="animate-spin mr-2" />
              Creating...
            </>
          ) : (
            <>
              <Plus size={16} className="mr-1" />
              New Note
            </>
          )}
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader size={24} className="animate-spin text-gray-500" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          {searchQuery ? (
            <>
              <p className="text-gray-500 dark:text-gray-400 mb-2">No notes matching "{searchQuery}"</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="text-blue-500 hover:text-blue-600"
              >
                Clear search
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No notes created yet</p>
              <button
                onClick={onCreateNote}
                disabled={isCreatingNote}
                className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingNote ? (
                  <>
                    <Loader size={16} className="animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-2" />
                    Create Your First Note
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Notes List */
        <div className="space-y-10 overflow-y-auto flex-grow h-0 min-h-0">
          {filteredNotes.map(note => (
            <div 
              key={note.id}
              className={`rounded-lg mb-10 p-6 transition-colors duration-200 ${
                hoveredNote === note.id ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'
              } cursor-pointer`}
              onMouseEnter={() => setHoveredNote(note.id)}
              onMouseLeave={() => setHoveredNote(null)}
              onClick={() => {
                console.log('Note clicked in NoteList:', note.id);
                onNoteClick(note.id);
              }}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-medium mb-1 text-adaptive">{getNoteTitleFromMetadata(note)}</h2>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{getNoteDescriptionFromMetadata(note)}</p>
                </div>
                <div className="flex items-center">
                  <div className="mr-2 text-primary">
                    {user?.fullName}
                  </div>
                  <div className="text-xl">{getNoteEmojiFromMetadata(note)}</div>
                </div>
              </div>
              
              {/* Tags */}
              {getNoteTagsFromMetadata(note).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {getNoteTagsFromMetadata(note).map((tag, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm text-adaptive"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Actions - only visible on hover */}
              <div className={`flex mt-4 ${hoveredNote === note.id ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
                <input 
                  type="checkbox" 
                  className="h-5 w-5 rounded-sm border-2 border-gray-300 dark:border-gray-600 mr-3" 
                  onClick={(e) => e.stopPropagation()} // Prevent note click when checkbox is clicked
                />
                <div className="flex-grow"></div>
                <div className="flex space-x-4">
                  <button 
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent note click when button is clicked
                      // Edit functionality would go here
                      onNoteClick(note.id);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  {note.isDeletingFile ? (
                    <Loader size={14} className="animate-spin text-gray-500" />
                  ) : (
                    <button 
                      className="text-gray-500 hover:text-red-500"
                      onClick={(e) => onDeleteNote(note.id, e)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NoteList; 