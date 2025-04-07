import { FileTextIcon, TagIcon, CalendarIcon, ClockIcon } from 'lucide-react';
import { BrainStatistics } from './types';
import { formatRelativeTime } from './utils';

interface QuickStatsProps {
  statistics: BrainStatistics;
}

const QuickStats = ({ statistics }: QuickStatsProps) => {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Quick Stats</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-background rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-indigo-100 dark:bg-indigo-900 p-1.5 rounded-md">
              <FileTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-2 sm:ml-3 min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Total Entries</p>
              <p className="text-lg sm:text-xl font-semibold">{statistics.totalEntries}</p>
            </div>
          </div>
        </div>
        <div className="bg-background rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 dark:bg-green-900 p-1.5 rounded-md">
              <TagIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-2 sm:ml-3 min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Total Tags</p>
              <p className="text-lg sm:text-xl font-semibold">{statistics.totalTags}</p>
            </div>
          </div>
        </div>
        <div className="bg-background rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 p-1.5 rounded-md">
              <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-2 sm:ml-3 min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">This Week</p>
              <p className="text-lg sm:text-xl font-semibold">{statistics.entriesThisWeek}</p>
            </div>
          </div>
        </div>
        <div className="bg-background rounded-lg p-2.5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-amber-100 dark:bg-amber-900 p-1.5 rounded-md">
              <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="ml-2 sm:ml-3 min-w-0">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Last Update</p>
              <p className="text-xs sm:text-sm font-medium truncate">
                {statistics.lastUpdated ? formatRelativeTime(statistics.lastUpdated) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStats; 