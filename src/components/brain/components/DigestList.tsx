import { RefreshCwIcon } from 'lucide-react';
import { ResearchDigest } from './types';
import { formatRelativeTime } from './utils';

interface DigestListProps {
  researchDigests: ResearchDigest[];
  isLoading: boolean;
  handleGenerateDigest: () => void;
  handleViewDigest: (digest: ResearchDigest) => void;
  noteTitlesMap: Record<string, string>;
  handleOpenNote: (noteId: string) => void;
  isGeneratingDigest: boolean;
  digestGenerationProgress: number;
  digestGenerationStatus: string;
  digestGenerationError: string | null;
}

const DigestList = ({
  researchDigests,
  isLoading,
  handleGenerateDigest,
  handleViewDigest,
  noteTitlesMap,
  handleOpenNote,
  isGeneratingDigest,
  digestGenerationProgress,
  digestGenerationStatus,
  digestGenerationError
}: DigestListProps) => {
  const handleClick = () => {
    if (!isGeneratingDigest) {
      handleGenerateDigest();
    }
  };

  // Helper function to get note title from ID
  const getNoteTitle = (noteId: string): string => {
    if (noteTitlesMap[noteId]) {
      return noteTitlesMap[noteId];
    }
    
    // Fallback to a generic title
    return "Note";
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-background">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium">Research Digests</h2>
            <RefreshCwIcon 
              className={`h-5 w-5 cursor-pointer ${isGeneratingDigest ? 'animate-spin text-indigo-500' : 'text-primary'}`}
              onClick={handleClick}
            />
          </div>
          <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">
            View All
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-auto">
        {/* Inline Progress Tracker */}
        {isGeneratingDigest && (
          <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-indigo-100 dark:border-indigo-900 shadow-sm">
            <h3 className="text-md font-medium mb-3 flex items-center">
              <span className="mr-2">📚</span>
              Generating Research Digest
            </h3>
            
            <div className="mb-3">
              <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 ease-in-out"
                  style={{ width: `${digestGenerationProgress}%` }}
                ></div>
              </div>
              <p className="text-right text-xs mt-1 text-gray-500">{digestGenerationProgress}%</p>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{digestGenerationStatus}</p>
            
            {digestGenerationError && (
              <p className="text-sm text-red-500">{digestGenerationError}</p>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : researchDigests.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {researchDigests.map((digest) => (
              <div
                key={digest.id}
                className="py-4 first:pt-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                onClick={() => handleViewDigest(digest)}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-medium text-lg flex items-center">
                    <span className="mr-2">📚</span>
                    {digest.title}
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                    {formatRelativeTime(digest.created_at)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
                  <div dangerouslySetInnerHTML={{ __html: digest.content.substring(0, 200).replace(/#{1,6}\s[^\n]+/g, '').replace(/\n/g, '<br>') }} />
                  <p className="mt-1">...</p>
                </div>
                
                {/* Show related notes if any */}
                {digest.related_note_ids && digest.related_note_ids.length > 0 && (
                  <div className="flex flex-wrap mt-2">
                    <span className="text-xs text-gray-500 mr-1">Related Notes:</span>
                    {digest.related_note_ids.slice(0, 2).map((noteId: string, idx: number) => (
                      <span
                        key={`${noteId}-${idx}`}
                        className="mr-2 mb-1 px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full truncate max-w-[150px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNote(noteId);
                        }}
                      >
                        {getNoteTitle(noteId)}
                      </span>
                    ))}
                    {digest.related_note_ids.length > 2 && (
                      <span className="text-xs text-gray-500 flex items-center">
                        +{digest.related_note_ids.length - 2} more
                      </span>
                    )}
                  </div>
                )}
                
                {digest.all_links && digest.all_links.length > 0 && (
                  <div className="flex flex-wrap mt-2">
                    <span className="text-xs text-gray-500 mr-1">Sources:</span>
                    {digest.all_links.slice(0, 2).map((link: string, index: number) => (
                      <a
                        key={index}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mr-2 mb-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full truncate max-w-[150px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {new URL(link).hostname}
                      </a>
                    ))}
                    {digest.all_links.length > 2 && (
                      <span className="text-xs text-gray-500 flex items-center">
                        +{digest.all_links.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center p-8 text-gray-500 bg-background rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
            <div className="text-center">
              <p>No research digests found.</p>
              <p className="text-sm mt-2">
                Click the refresh icon to generate new research digests.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DigestList; 