import { supabase, createSupabaseClientWithToken } from "./supabase";

/**
 * Saves a user's toggled files to their profile in Supabase
 * @param userId The user's ID
 * @param toggledFiles Array of file IDs that are toggled/checked
 * @param token Optional Clerk JWT token for authenticated requests
 */
export async function saveToggledFiles(
  userId: string,
  toggledFiles: string[],
  token?: string,
): Promise<boolean> {
  try {
    // Only create new client if token is provided
    const client = token
      ? await createSupabaseClientWithToken(token)
      : supabase;

    const { error } = await client
      .from("users")
      .update({ toggled_files: toggledFiles })
      .eq("id", userId);

    if (error) {
      console.error("Error saving toggled files:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error in saveToggledFiles:", err);
    return false;
  }
}

/**
 * Gets a user's toggled files from their profile in Supabase
 * @param userId The user's ID
 * @param token Optional Clerk JWT token for authenticated requests
 * @returns Array of file IDs that are toggled/checked, or empty array if none found
 */
export async function getToggledFiles(
  userId: string,
  token?: string,
): Promise<string[]> {
  try {
    // Only create new client if token is provided
    const client = token
      ? await createSupabaseClientWithToken(token)
      : supabase;

    const { data, error } = await client
      .from("users")
      .select("toggled_files")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error getting toggled files:", error);
      return [];
    }

    return data?.toggled_files || [];
  } catch (err) {
    console.error("Error in getToggledFiles:", err);
    return [];
  }
}

// Cache for toggled files to avoid unnecessary API calls
let toggledFilesCache: { [userId: string]: string[] } = {};

/**
 * Updates the local cache of toggled files
 * @param userId The user's ID
 * @param toggledFiles Array of file IDs that are toggled/checked
 */
export function updateToggledFilesCache(
  userId: string,
  toggledFiles: string[],
) {
  toggledFilesCache[userId] = toggledFiles;
}

/**
 * Gets the toggled files from the local cache
 * @param userId The user's ID
 * @returns Array of file IDs that are toggled/checked, or empty array if none found
 */
export function getToggledFilesFromCache(userId: string): string[] {
  return toggledFilesCache[userId] || [];
}

/**
 * Gets the current toggled files for a user
 * This function first checks the cache, and if not found, fetches from the server
 * @param userId The user's ID
 * @param token Optional Clerk JWT token for authenticated requests
 * @returns Promise resolving to an array of file IDs that are toggled/checked
 */
export async function getCurrentToggledFiles(
  userId: string,
  token?: string,
): Promise<string[]> {
  // First check the cache
  const cachedFiles = toggledFilesCache[userId];
  if (cachedFiles) {
    return cachedFiles;
  }

  // If not in cache, fetch from server
  const serverFiles = await getToggledFiles(userId, token);

  // Update cache with server data
  updateToggledFilesCache(userId, serverFiles);

  return serverFiles;
}
