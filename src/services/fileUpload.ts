import type { SpaceFile } from "../types/space";

/**
 * Uploads a file to Supabase storage and adds a record to the space_files table
 * Then sends the file to the ingest API endpoint for processing
 * @param file The file to upload
 * @param spaceId The ID of the space to associate the file with
 * @param userId The ID of the user uploading the file
 * @param supabaseClient Authenticated Supabase client
 * @param retryCount Number of times to retry on auth errors
 */
export async function uploadFile(
  file: File,
  isNote: boolean = false,
  spaceId: string,
  userId: string,
  supabaseClient: any,
  retryCount: number = 0,
): Promise<{
  success: boolean;
  data?: SpaceFile;
  error?: any;
  isProcessing?: boolean;
  message?: string;
  fileType?: string;
  shouldRetryWithNewToken?: boolean;
}> {
  try {
    console.log("Starting file upload with user ID:", userId);

    // Format the storage path correctly for our bucket policies
    const filePath = `${userId}/${spaceId}/${Date.now()}_${file.name}`;

    console.log("Uploading to path:", filePath);

    // Upload the file to Supabase storage
    const { error: uploadError } = await supabaseClient.storage
      .from("Vox")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);

      // Handle JWT expired errors specifically
      if (
        (uploadError as any).statusCode === "403" &&
        uploadError.message === "jwt expired" &&
        retryCount < 2
      ) {
        console.log(`JWT expired during upload, attempt ${retryCount + 1}/3`);
        return {
          success: false,
          error: "Authentication token expired. Will retry with new token.",
          shouldRetryWithNewToken: true,
        };
      }

      // Return specific error for unsupported file type
      if (uploadError.message && uploadError.message.includes("content type")) {
        return {
          success: false,
          error: `Unsupported file type: ${file.type}`,
          fileType: file.type,
        };
      }
      throw uploadError;
    }

    // Get the public URL for the file
    const { data: publicUrlData } = supabaseClient.storage
      .from("Vox")
      .getPublicUrl(filePath);

    if (!publicUrlData) {
      throw new Error("Failed to get public URL for uploaded file");
    }

    console.log("File uploaded successfully, creating database record");

    // Create a record in the space_files table
    const fileData: Omit<SpaceFile, "id" | "created_at"> = {
      space_id: spaceId,
      user_id: userId, // Keep the original userId for database records
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      is_note: isNote,
    };

    const { data: fileRecord, error: dbError } = await supabaseClient
      .from("space_files")
      .insert([fileData])
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);

      // Handle JWT expired errors for database operations
      if (dbError.code === "PGRST301" && retryCount < 2) {
        console.log(
          `JWT expired during database insert, attempt ${retryCount + 1}/3`,
        );
        return {
          success: false,
          error: "Authentication token expired. Will retry with new token.",
          shouldRetryWithNewToken: true,
        };
      }

      throw dbError;
    }

    console.log("Database record created, sending to ingest API");

    // Return success immediately after database record is created
    // The isProcessing flag is set to true to indicate that processing is ongoing
    return {
      success: true,
      data: fileRecord,
      isProcessing: true,
      message: "File uploaded successfully. Processing has started.",
    };
  } catch (error) {
    console.error("Error uploading file:", error);

    // Check for authentication-related errors
    const errorStr = String(error);
    if (
      (errorStr.includes("401") ||
        errorStr.includes("403") ||
        errorStr.includes("jwt") ||
        errorStr.includes("unauthorized")) &&
      retryCount < 2
    ) {
      return {
        success: false,
        error: "Authentication error. Will retry with new token.",
        shouldRetryWithNewToken: true,
      };
    }

    return { success: false, error };
  }
}

/**
 * Fetches all files for a space
 * @param spaceId The ID of the space to fetch files for
 * @param supabaseClient Authenticated Supabase client
 */
export async function getSpaceFiles(
  spaceId: string,
  supabaseClient: any,
): Promise<{ success: boolean; data?: SpaceFile[]; error?: any }> {
  try {
    const { data, error } = await supabaseClient
      .from("space_files")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching space files:", error);
    return { success: false, error };
  }
}

/**
 * Deletes a file using the consolidated API endpoint
 * @param fileId The ID of the file to delete
 * @param retryCount Optional retry counter for handling auth issues
 */
export async function deleteFile(
  fileId: string,
  retryCount: number = 0,
): Promise<{
  success: boolean;
  error?: any;
  shouldRetryWithNewToken?: boolean;
  message?: string;
}> {
  try {
    console.log(
      `[DEBUG] Deleting file ${fileId} using consolidated API endpoint`,
    );

    const response = await fetch(
      `https://voxed.aidanandrews.org/api/v1/files/${fileId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        `[DEBUG] API deletion failed with status ${response.status}:`,
        errorData,
      );

      // Handle authentication errors
      if (
        (response.status === 401 || response.status === 403) &&
        retryCount < 2
      ) {
        return {
          success: false,
          error: "Authentication error. Will retry with new token.",
          shouldRetryWithNewToken: true,
        };
      }

      return {
        success: false,
        error:
          errorData.message || `API returned error status: ${response.status}`,
        message:
          errorData.message || `API returned error status: ${response.status}`,
      };
    }

    const result = await response.json();
    console.log("[DEBUG] File deletion API response:", result);

    return {
      success: true,
      message: result.message,
    };
  } catch (error) {
    console.error("[DEBUG] Error in deleteFile:", error);

    // Check for authentication-related errors
    const errorStr = String(error);
    if (
      (errorStr.includes("401") ||
        errorStr.includes("403") ||
        errorStr.includes("jwt") ||
        errorStr.includes("unauthorized")) &&
      retryCount < 2
    ) {
      return {
        success: false,
        error: "Authentication error. Will retry with new token.",
        shouldRetryWithNewToken: true,
      };
    }

    return { success: false, error };
  }
}

/**
 * Initiates processing of a file that has been uploaded to Supabase
 * @param fileId The ID of the file to process
 */
export async function processFile(
  fileId: string,
): Promise<{ success: boolean; message?: string; error?: any }> {
  try {
    const ingestResponse = await fetch(
      "https://voxed.aidanandrews.org/api/v1/files/ingest",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file_id: fileId,
        }),
      },
    );

    const ingestResult = await ingestResponse.json();
    console.log("Ingest API response:", ingestResult);

    if (!ingestResult.success) {
      console.warn(
        "File processing might not be complete:",
        ingestResult.message,
      );
      return {
        success: false,
        error: ingestResult.message || "File processing failed",
        message: "File was uploaded but processing failed",
      };
    }

    // Look for the successful processing log in the response
    if (
      ingestResult.logs &&
      ingestResult.logs.includes("processed successfully")
    ) {
      console.log("File processed successfully:", ingestResult.logs);
      return {
        success: true,
        message: "File processed successfully",
      };
    }

    console.log("File ingested successfully", ingestResult);
    return { success: true, message: "File processing has started" };
  } catch (error) {
    console.error("Error calling ingest API:", error);
    return {
      success: false,
      error: "File processing failed. Please try again later.",
    };
  }
}

/**
 * Uploads and processes a file with retry logic and state management
 * @param file The file to upload
 * @param spaceId The ID of the space
 * @param userId The ID of the user
 * @param refreshTokenFn Function to refresh auth token
 * @param getClientFn Function to get Supabase client
 * @param isNote Whether the file is a note (default: false)
 * @returns Result of the operation
 */
export async function uploadAndProcessFile(
  file: File,
  spaceId: string,
  userId: string,
  refreshTokenFn: () => Promise<void>,
  getClientFn: () => Promise<any>,
  isNote: boolean = false,
): Promise<{
  success: boolean;
  data?: SpaceFile;
  error?: any;
  tempId: string;
  isProcessing?: boolean;
  message?: string;
}> {
  // Create a temporary ID to track the uploading state
  const tempId = `temp-${Date.now()}`;

  // Function to handle file upload with retry logic
  const uploadWithRetry = async (retryCount = 0): Promise<any> => {
    try {
      // Get authenticated Supabase client - force refresh if retry
      const authClient = await (retryCount > 0
        ? refreshTokenFn().then(() => getClientFn())
        : getClientFn());

      if (!authClient) {
        console.error("Failed to get authenticated Supabase client");
        throw new Error(
          "Authentication error. Please try again or refresh the page.",
        );
      }

      // Upload to Supabase
      const result = await uploadFile(
        file,
        isNote,
        spaceId,
        userId,
        authClient,
        retryCount,
      );

      // If token expired and we should retry with a new token
      if (!result.success && result.shouldRetryWithNewToken && retryCount < 2) {
        console.log(
          `Retrying upload with refreshed token, attempt ${retryCount + 1}/3`,
        );
        // Force refresh the token and retry
        await refreshTokenFn();
        return uploadWithRetry(retryCount + 1);
      }

      return result;
    } catch (err) {
      console.error(`Error uploading file (attempt ${retryCount + 1}/3):`, err);

      // If we haven't retried too many times and this looks like an auth error, retry
      const errorMsg = String(err).toLowerCase();
      if (
        retryCount < 2 &&
        (errorMsg.includes("jwt") ||
          errorMsg.includes("unauthorized") ||
          errorMsg.includes("403") ||
          errorMsg.includes("401"))
      ) {
        console.log("Auth error detected, refreshing token and retrying...");
        await refreshTokenFn();
        return uploadWithRetry(retryCount + 1);
      }

      throw err;
    }
  };

  try {
    // Start upload with retry logic
    const result = await uploadWithRetry();

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to upload file",
        tempId,
        message: result.fileType
          ? `Unsupported file type: ${result.fileType}. Please try a different file.`
          : result.error || "Failed to upload file",
      };
    }

    // Add the file to the files list with processing status
    const newFile: SpaceFile & { isProcessing?: boolean } = {
      ...result.data,
      isProcessing: result.isProcessing || false,
    };

    // Return success
    return {
      success: true,
      data: newFile,
      tempId,
      isProcessing: true,
      message: result.message || "File uploaded, AI is now processing...",
    };
  } catch (err) {
    console.error("Error uploading file:", err);
    return {
      success: false,
      error: "An error occurred while uploading the file",
      tempId,
      message: "Error uploading file",
    };
  }
}

/**
 * Deletes a file with retry logic for token refreshing
 * @param fileId The ID of the file to delete
 * @param refreshTokenFn Function to refresh auth token
 * @param getClientFn Function to get authentication context (kept for backward compatibility)
 * @returns Result of the delete operation
 */
export async function deleteFileWithRetry(
  fileId: string,
  refreshTokenFn: () => Promise<void>,
  getClientFn: () => Promise<any>,
): Promise<{ success: boolean; error?: any }> {
  getClientFn;
  // Function to handle file deletion with retry logic
  const deleteWithRetryInternal = async (retryCount = 0): Promise<any> => {
    try {
      // If retrying, refresh the token first
      if (retryCount > 0) {
        await refreshTokenFn();
      }

      console.log("Calling deleteFile service function");
      const result = await deleteFile(fileId, retryCount);
      console.log("deleteFile result:", result);

      // If token expired and we should retry with a new token
      if (!result.success && result.shouldRetryWithNewToken && retryCount < 2) {
        console.log(
          `Retrying deletion with refreshed token, attempt ${retryCount + 1}/3`,
        );
        // Force refresh the token and retry
        await refreshTokenFn();
        return deleteWithRetryInternal(retryCount + 1);
      }

      return result;
    } catch (err) {
      console.error(`Error deleting file (attempt ${retryCount + 1}/3):`, err);

      // If we haven't retried too many times and this looks like an auth error, retry
      const errorMsg = String(err).toLowerCase();
      if (
        retryCount < 2 &&
        (errorMsg.includes("jwt") ||
          errorMsg.includes("unauthorized") ||
          errorMsg.includes("403") ||
          errorMsg.includes("401"))
      ) {
        console.log("Auth error detected, refreshing token and retrying...");
        await refreshTokenFn();
        return deleteWithRetryInternal(retryCount + 1);
      }

      throw err;
    }
  };

  try {
    // Start deletion with retry logic
    return await deleteWithRetryInternal();
  } catch (err) {
    console.error("Error in deleteFileWithRetry:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error deleting file",
    };
  }
}
