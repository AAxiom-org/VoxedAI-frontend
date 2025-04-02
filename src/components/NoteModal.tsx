import React, { useState, useEffect } from 'react';
import { X, Loader, Plus, Hash } from 'lucide-react';
import type { SpaceFile } from '../types/space';
import EmojiPickerModal from './common/EmojiPicker';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNote: (title: string, description: string, relatedFiles: string[], tags: string[], emoji: string) => Promise<void>;
  isCreating: boolean;
  availableFiles: SpaceFile[];
}

const NoteModal = ({ 
  isOpen, 
  onClose, 
  onCreateNote, 
  isCreating,
  availableFiles
}: NoteModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [emoji, setEmoji] = useState('📝');
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setSelectedFiles([]);
      setTags([]);
      setCurrentTag('');
      setEmoji('📝');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    try {
      await onCreateNote(title, description, selectedFiles, tags, emoji);
    } catch (err) {
      setError('Failed to create note');
      console.error('Error in note creation:', err);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags(prev => [...prev, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-fadeIn">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-adaptive">Create New Note</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            disabled={isCreating}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5">
          {error && (
            <div className="mb-5 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-sm border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
          
          <div className="mb-5 flex items-center gap-4">
            <div>
              <label htmlFor="emoji" className="block text-sm font-medium text-adaptive mb-2">
                Icon
              </label>
              <EmojiPickerModal 
                onEmojiSelect={setEmoji} 
                selectedEmoji={emoji} 
              />
            </div>
            <div className="flex-1">
              <label htmlFor="title" className="block text-sm font-medium text-adaptive mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-adaptive shadow-sm"
                placeholder="Enter note title"
                disabled={isCreating}
                required
              />
            </div>
          </div>
          
          <div className="mb-5">
            <label htmlFor="description" className="block text-sm font-medium text-adaptive mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-adaptive shadow-sm"
              placeholder="Enter note description"
              rows={3}
              disabled={isCreating}
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-adaptive mb-2">
              Tags
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-adaptive shadow-sm"
                placeholder="Add a tag"
                disabled={isCreating}
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-r-md hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                disabled={isCreating || !currentTag.trim()}
              >
                <Plus size={16} />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map(tag => (
                  <div key={tag} className="flex items-center bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-100 px-3 py-1.5 rounded-full text-sm">
                    <Hash size={12} className="mr-1" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                      disabled={isCreating}
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {availableFiles.length > 0 && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-adaptive mb-2">
                Related Files
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-3 bg-gray-50 dark:bg-gray-800/50">
                {availableFiles.map(file => (
                  <div key={file.id} className="flex items-center py-1.5 px-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                    <input
                      type="checkbox"
                      id={`file-${file.id}`}
                      checked={selectedFiles.includes(file.id)}
                      onChange={() => toggleFileSelection(file.id)}
                      className="mr-2.5 h-4 w-4 accent-blue-500"
                      disabled={isCreating}
                    />
                    <label 
                      htmlFor={`file-${file.id}`}
                      className="text-sm text-adaptive cursor-pointer truncate flex-1"
                    >
                      {file.file_name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end mt-6 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 dark:bg-blue-600 rounded-md hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader size={16} className="animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Note'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteModal; 