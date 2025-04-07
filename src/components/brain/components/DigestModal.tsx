import { ResearchDigest } from './types';
import MarkdownRenderer from '../../common/MarkdownRenderer';

interface DigestModalProps {
  selectedDigest: ResearchDigest;
  handleCloseDigestModal: () => void;
  getNoteTitle: (noteId: string) => string;
  handleOpenNote: (noteId: string) => void;
}

const DigestModal = ({
  selectedDigest,
  handleCloseDigestModal,
  getNoteTitle,
  handleOpenNote
}: DigestModalProps) => {
  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-gray-900/25">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <span className="text-2xl mr-2">📚</span>
            <h2 className="text-lg font-medium">{selectedDigest.title}</h2>
          </div>
          <button 
            onClick={handleCloseDigestModal}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Related notes section */}
        {selectedDigest.related_note_ids && selectedDigest.related_note_ids.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col">
              <h3 className="text-sm font-medium mb-2">Related Notes:</h3>
              <div className="flex flex-wrap gap-2">
                {selectedDigest.related_note_ids.map((noteId: string, idx: number) => (
                  <button
                    key={`${noteId}-${idx}`}
                    onClick={() => handleOpenNote(noteId)}
                    className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    {getNoteTitle(noteId)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="markdown-content">
            <MarkdownRenderer content={selectedDigest.content} />
          </div>
        </div>
        {selectedDigest.all_links && selectedDigest.all_links.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-medium mb-2">Sources and References:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedDigest.all_links.map((link: string, index: number) => (
                <a
                  key={index}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full truncate max-w-[250px]"
                >
                  {new URL(link).hostname}
                </a>
              ))}
            </div>
          </div>
        )}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 text-right">
          <span className="text-xs text-gray-500">
            Created: {new Date(selectedDigest.created_at).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DigestModal; 