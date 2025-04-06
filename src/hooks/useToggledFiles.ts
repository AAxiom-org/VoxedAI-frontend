import { useState, useEffect, useCallback } from "react";
import {
  getToggledFiles,
  saveToggledFiles,
  updateToggledFilesCache,
} from "../services/userService";

/**
 * Custom hook for managing toggled files
 * Provides a simple interface for getting and updating toggled files
 * Maintains a 1:1 relationship with the server data
 *
 * @param userId The user's ID
 * @returns An object with the toggled files set and functions to manipulate it
 */
export function useToggledFiles(userId: string | null) {
  const [toggledFiles, setToggledFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load toggled files from server on mount
  useEffect(() => {
    const loadToggledFiles = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        // Get toggled files from server
        const files = await getToggledFiles(userId);

        // Filter out invalid UUIDs
        const validFiles = files.filter((id) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id,
          ),
        );

        // Update state and cache
        setToggledFiles(new Set(validFiles));
        updateToggledFilesCache(userId, validFiles);
        setIsLoading(false);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to load toggled files"),
        );
        setIsLoading(false);
      }
    };

    loadToggledFiles();
  }, [userId]);

  // Toggle a file
  const toggleFile = useCallback(
    async (fileId: string) => {
      if (!userId) return;

      setToggledFiles((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(fileId)) {
          newSet.delete(fileId);
        } else {
          newSet.add(fileId);
        }

        // Update cache and server
        const filesArray = Array.from(newSet);
        updateToggledFilesCache(userId, filesArray);
        saveToggledFiles(userId, filesArray).catch((err) => {
          console.error("Failed to save toggled files:", err);
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to save toggled files"),
          );
        });

        return newSet;
      });
    },
    [userId],
  );

  // Set multiple files at once
  const setFiles = useCallback(
    async (fileIds: string[]) => {
      if (!userId) return;

      // Filter out invalid UUIDs
      const validFiles = fileIds.filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        ),
      );

      // Update state, cache, and server
      setToggledFiles(new Set(validFiles));
      updateToggledFilesCache(userId, validFiles);
      saveToggledFiles(userId, validFiles).catch((err) => {
        console.error("Failed to save toggled files:", err);
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to save toggled files"),
        );
      });
    },
    [userId],
  );

  // Validate toggled files against available files
  const validateFiles = useCallback(
    (availableFileIds: string[]) => {
      if (!userId) return;

      const fileIdSet = new Set(availableFileIds);

      setToggledFiles((prev) => {
        const validFiles = new Set<string>();

        // Keep only files that exist in availableFileIds
        prev.forEach((fileId) => {
          if (fileIdSet.has(fileId)) {
            validFiles.add(fileId);
          }
        });

        // If we removed any files, update cache and server
        if (validFiles.size !== prev.size) {
          const filesArray = Array.from(validFiles);
          updateToggledFilesCache(userId, filesArray);
          saveToggledFiles(userId, filesArray).catch((err) => {
            console.error("Failed to save toggled files:", err);
            setError(
              err instanceof Error
                ? err
                : new Error("Failed to save toggled files"),
            );
          });
        }

        return validFiles;
      });
    },
    [userId],
  );

  return {
    toggledFiles,
    isLoading,
    error,
    toggleFile,
    setFiles,
    validateFiles,
    // Helper method to check if a file is toggled
    isFileToggled: useCallback(
      (fileId: string) => toggledFiles.has(fileId),
      [toggledFiles],
    ),
  };
}
