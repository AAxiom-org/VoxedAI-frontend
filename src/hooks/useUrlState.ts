import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type UrlStateOptions<T> = {
  key: string;
  defaultValue: T;
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
};

/**
 * A hook for managing complex UI state in the URL search parameters.
 * Uses React Router's useSearchParams along with TanStack Query for caching.
 * 
 * @param options Configuration options for the URL state
 * @returns A tuple containing the current state value and a setter function
 */
export function useUrlState<T>({
  key,
  defaultValue,
  serializer = JSON.stringify,
  deserializer = JSON.parse,
}: UrlStateOptions<T>): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const queryKey = ['urlState', key];

  // Get the current value from URL or use default
  const getValue = (): T => {
    const param = searchParams.get(key);
    if (param) {
      try {
        return deserializer(param);
      } catch (error) {
        console.error(`Failed to deserialize URL param ${key}:`, error);
        return defaultValue;
      }
    }
    return defaultValue;
  };

  // Use React Query to cache the value
  const { data = defaultValue } = useQuery({
    queryKey,
    queryFn: getValue,
    // Disable automatic refetching
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Update the URL and the cache
  const setValue = (value: T) => {
    try {
      const serialized = serializer(value);
      console.log(`🔗 Updating URL state for key "${key}":`, value);
      
      // Update search params
      const newSearchParams = new URLSearchParams(searchParams);
      
      // Always update the parameter even if it matches the default value
      // This ensures the URL is always updated when setState is called
      if (value === null || value === undefined) {
        newSearchParams.delete(key);
      } else {
        newSearchParams.set(key, serialized);
      }
      
      // Update the URL without causing a navigation event
      setSearchParams(newSearchParams, { replace: true });
      
      // Force an update to the query cache
      queryClient.setQueryData(queryKey, value);
      console.log(`✅ URL state updated for "${key}"`);
    } catch (error) {
      console.error(`❌ Failed to serialize value for URL param ${key}:`, error);
      // If serialization fails, at least update the query cache
      queryClient.setQueryData(queryKey, value);
    }
  };

  return [data, setValue];
} 