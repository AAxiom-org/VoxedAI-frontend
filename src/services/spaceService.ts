import { supabase } from "./supabase";
import type { Space } from "../types/space";
import type { ChatMessage, ChatSession } from "../types/chat";
import { addSpaceToWorkspace } from "./workspaceService";
import { streamChatWithGemini, type StreamChatOptions } from "./geminiService";

/**
 * Create a new space for a user
 */
export async function createSpace(
  userId: string,
  title: string,
  description?: string,
): Promise<{ success: boolean; data?: Space; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("spaces")
      .insert([
        {
          user_id: userId,
          title,
          description,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error creating space:", error);
    return { success: false, error };
  }
}

/**
 * Get all spaces for a user
 */
export async function getUserSpaces(
  userId: string,
): Promise<{ success: boolean; data?: Space[]; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("spaces")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching spaces:", error);
    return { success: false, error };
  }
}

/**
 * Get a specific space by ID
 */
export async function getSpace(
  spaceId: string,
): Promise<{ success: boolean; data?: Space; error?: any }> {
  try {
    console.log("getSpace: Fetching space with ID:", spaceId);
    const { data, error } = await supabase
      .from("spaces")
      .select("*")
      .eq("id", spaceId)
      .single();

    if (error) {
      console.error("getSpace: Supabase error:", error);
      throw error;
    }

    if (!data) {
      console.error("getSpace: No data returned for space ID:", spaceId);
      return { success: false, error: "Space not found" };
    }

    console.log("getSpace: Successfully fetched space:", data);
    return { success: true, data };
  } catch (error) {
    console.error("getSpace: Error fetching space:", error);
    return { success: false, error };
  }
}

/**
 * Create a new chat session in a space
 */
export async function createChatSession(
  spaceId: string,
  userId: string,
  title: string = "New Chat",
): Promise<{ success: boolean; data?: ChatSession; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert([
        {
          space_id: spaceId,
          user_id: userId,
          title,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error creating chat session:", error);
    return { success: false, error };
  }
}

/**
 * Get all chat sessions for a space
 */
export async function getSpaceChatSessions(
  spaceId: string,
): Promise<{ success: boolean; data?: ChatSession[]; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return { success: false, error };
  }
}

/**
 * Send a message in a chat session
 */
export async function sendChatMessage(
  chatSessionId: string,
  spaceId: string,
  userId: string,
  content: string,
  isUser: boolean = true,
): Promise<{ success: boolean; data?: ChatMessage; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .insert([
        {
          chat_session_id: chatSessionId,
          space_id: spaceId,
          user_id: userId,
          content,
          is_user: isUser,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false, error };
  }
}

/**
 * Get all messages for a chat session
 */
export async function getChatMessages(
  chatSessionId: string,
): Promise<{ success: boolean; data?: ChatMessage[]; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select(
        "id, chat_session_id, space_id, user_id, content, is_user, created_at, workflow, reasoning",
      )
      .eq("chat_session_id", chatSessionId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error fetching messages:", error);
    return { success: false, error };
  }
}

/**
 * Delete a chat session and move its messages to deleted_chat_messages table
 */
export async function deleteChatSession(
  chatSessionId: string,
): Promise<{ success: boolean; error?: any }> {
  try {
    // Start a transaction using supabase functions
    const { error: functionError } = await supabase.rpc("delete_chat_session", {
      session_id: chatSessionId,
    });

    if (functionError) {
      throw functionError;
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting chat session:", error);
    return { success: false, error };
  }
}

/**
 * Update a chat session's title
 */
export async function updateChatSessionTitle(
  chatSessionId: string,
  newTitle: string,
): Promise<{ success: boolean; data?: ChatSession; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("chat_sessions")
      .update({ title: newTitle })
      .eq("id", chatSessionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error updating chat session title:", error);
    return { success: false, error };
  }
}

/**
 * Create a new space for a user, optionally assigning it to a workspace
 */
export async function createSpaceWithWorkspace(
  userId: string,
  title: string,
  description?: string,
  workspaceId?: string,
): Promise<{ success: boolean; data?: Space; error?: any }> {
  try {
    // Create the space
    const spaceResult = await createSpace(userId, title, description);

    if (!spaceResult.success || !spaceResult.data) {
      return spaceResult;
    }

    // If a workspace was specified, add the space to it
    if (workspaceId) {
      const workspaceResult = await addSpaceToWorkspace(
        workspaceId,
        spaceResult.data.id,
      );

      if (!workspaceResult.success) {
        console.error(
          "Failed to add space to workspace:",
          workspaceResult.error,
        );
        // We don't fail the whole operation if workspace assignment fails
        // The space was still created
      }
    }

    return spaceResult;
  } catch (error) {
    console.error("Error creating space with workspace:", error);
    return { success: false, error };
  }
}

/**
 * Update an existing space
 */
export async function updateSpace(
  spaceId: string,
  updates: {
    title?: string;
    description?: string;
  },
): Promise<{ success: boolean; data?: Space; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("spaces")
      .update(updates)
      .eq("id", spaceId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error updating space:", error);
    return { success: false, error };
  }
}

/**
 * Update a space and its workspace assignment
 */
export async function updateSpaceWithWorkspace(
  spaceId: string,
  updates: {
    title?: string;
    description?: string;
  },
  workspaceId?: string,
): Promise<{ success: boolean; data?: Space; error?: any }> {
  try {
    // First update the space details
    const spaceResult = await updateSpace(spaceId, updates);

    if (!spaceResult.success || !spaceResult.data) {
      return spaceResult;
    }

    // Handle workspace assignment
    if (workspaceId) {
      // First remove from any existing workspaces
      await supabase.from("workspace_spaces").delete().eq("space_id", spaceId);

      // Then add to the new workspace
      const { error: workspaceError } = await supabase
        .from("workspace_spaces")
        .insert({
          workspace_id: workspaceId,
          space_id: spaceId,
        });

      if (workspaceError) {
        console.error("Failed to update space workspace:", workspaceError);
        // We don't fail the whole operation if workspace assignment fails
      }
    } else {
      // If no workspace specified, remove from all workspaces (make unorganized)
      await supabase.from("workspace_spaces").delete().eq("space_id", spaceId);
    }

    return spaceResult;
  } catch (error) {
    console.error("Error updating space with workspace:", error);
    return { success: false, error };
  }
}

/**
 * Parse streaming response to clean it from SSE format if necessary
 * @param streamData The streaming data to parse
 * @returns Cleaned text content
 */
export function parseStreamingResponse(streamData: string): string {
  // Helper function to remove common AI response prefixes
  function removeCommonPrefixes(text: string): string {
    // List of prefixes to check and remove
    const prefixesToRemove = [
      "Answer:",
      "Answer :",
      "AI:",
      "AI :",
      "Assistant:",
      "Assistant :",
    ];

    // Check for each prefix and remove if found
    for (const prefix of prefixesToRemove) {
      if (text.startsWith(prefix)) {
        return text.substring(prefix.length).trim();
      }
    }

    return text;
  }

  let extractedText = "";

  try {
    // Split the stream data into lines
    const lines = streamData.split("\n");

    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) continue;

      // Check if line is a data line
      if (line.startsWith("data:")) {
        try {
          // Extract the JSON part
          const jsonStr = line.substring(5).trim();
          const data = JSON.parse(jsonStr);

          // If it's a token, add it to the extracted text
          if (data.type === "token" && data.data) {
            extractedText += data.data;
          }
        } catch (e) {
          // If JSON parsing fails, just ignore this line
          console.warn("Failed to parse JSON in stream data line:", line);
        }
      } else {
        // If it's not in SSE format, it's likely already parsed content
        extractedText = streamData;
        break;
      }
    }

    // Determine which text to process (either parsed or original)
    let textToProcess = extractedText.trim() || streamData.trim();

    // Remove common prefixes
    return removeCommonPrefixes(textToProcess);
  } catch (error) {
    console.error("Error parsing streaming response:", error);

    // Even if parsing fails, try to remove common prefixes
    return removeCommonPrefixes(streamData.trim());
  }
}

/**
 * Sends a user message and streams an AI response
 * @param chatSessionId The chat session ID
 * @param spaceId The space ID
 * @param userId The user ID
 * @param messageText The message text to send
 * @param sandboxData Optional sandbox state data to include
 * @param onStreamContent Callback for streaming content updates
 * @param isNoteQuestion Whether the message is a note question
 * @param noteContent Optional note content for the message
 * @returns Complete operation result
 */
export async function sendAndStreamChatMessage(
  chatSessionId: string,
  spaceId: string,
  userId: string,
  messageText: string,
  onStreamContent: (content: string) => void,
  sandboxData?: {
    language: string;
    code: string;
    consoleOutput?: string;
  },
  isNoteQuestion: boolean = false,
  noteContent?: string,
  activeFileId?: string,
): Promise<{
  success: boolean;
  userMessageResult?: { success: boolean; data?: ChatMessage; error?: any };
  aiMessageResult?: { success: boolean; data?: ChatMessage; error?: any };
  error?: string;
}> {
  try {
    isNoteQuestion;
    noteContent;
    // Send user message to backend
    const userMessageResult = await sendChatMessage(
      chatSessionId,
      spaceId,
      userId,
      messageText,
      true,
    );

    if (!userMessageResult.success) {
      return {
        success: false,
        userMessageResult,
        error: "Failed to send message",
      };
    }

    // Create a simple message array with just the current message
    // This ensures only the exact query text is sent
    let queryText = messageText;
    let userOnlyMessage = [
      {
        role: "user" as "user",
        content: messageText,
      },
    ];

    // If sandbox data is provided, include it in the query
    if (sandboxData) {
      // Format the sandbox information in a clear, structured way
      queryText = `${messageText}\n\n--- SANDBOX INFORMATION ---\n`;

      // Add code with language
      queryText += `Code (${sandboxData.language}):\n\`\`\`${sandboxData.language}\n${sandboxData.code}\n\`\`\`\n\n`;

      // Add console output if available
      if (sandboxData.consoleOutput && sandboxData.consoleOutput.trim()) {
        queryText += `Console Output:\n\`\`\`\n${sandboxData.consoleOutput}\n\`\`\`\n\n`;
      }

      // Update the user message with the enhanced content
      userOnlyMessage[0].content = queryText;

      console.log("Including sandbox code and output in query");
    }

    // Stream the response
    let finalResponse = "";

    const streamChatOptions: StreamChatOptions = {
      history: userOnlyMessage,
      onStreamUpdate: (content) => {
        onStreamContent(content);
        finalResponse = content;
      },
      userId: userId,
      spaceId: spaceId,
      activeFileId: activeFileId,
      chatSessionId: chatSessionId,
    };

    await streamChatWithGemini(streamChatOptions);

    console.log("Streaming complete. Saving AI message to Supabase");

    // Ensure the final response doesn't contain SSE format before saving
    if (finalResponse.includes('data: {"type":')) {
      console.warn("Final response contains SSE format. This is unexpected.");

      // Attempt to clean it up
      try {
        // Call our parser to extract just the text
        const cleanResponse = parseStreamingResponse(finalResponse);
        finalResponse = cleanResponse || "Error processing response";
      } catch (parseError) {
        console.error("Failed to parse streaming response:", parseError);
        finalResponse = "Error processing response";
      }
    }

    // After streaming is complete, save the AI message to the database
    const aiMessageResult = await sendChatMessage(
      chatSessionId,
      spaceId,
      userId,
      finalResponse,
      false,
    );

    if (aiMessageResult.success) {
      console.log("AI message saved to Supabase successfully");
      return {
        success: true,
        userMessageResult,
        aiMessageResult,
      };
    } else {
      console.error(
        "Failed to save AI message to Supabase:",
        aiMessageResult.error,
      );
      return {
        success: false,
        userMessageResult,
        aiMessageResult,
        error: "Failed to save AI response",
      };
    }
  } catch (error) {
    console.error("Error sending and streaming message:", error);
    return {
      success: false,
      error: "Error processing message and response",
    };
  }
}

/**
 * Handles deleting a chat session and updating the current session if needed
 * @param sessionId The ID of the session to delete
 * @param allSessions All current chat sessions
 * @param currentSessionId The ID of the current active session, if any
 * @returns Result with updated sessions and new current session
 */
export async function handleSessionDeletion(
  sessionId: string,
  allSessions: ChatSession[],
  currentSessionId?: string,
): Promise<{
  success: boolean;
  sessions?: ChatSession[];
  newCurrentSession?: ChatSession | null;
  error?: any;
}> {
  try {
    const result = await deleteChatSession(sessionId);
    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to delete chat session",
      };
    }

    // Remove the deleted session from the list
    const remainingSessions = allSessions.filter(
      (session) => session.id !== sessionId,
    );

    // If the deleted session was the current one, set the first available session as current
    // or set to null if no sessions remain
    let newCurrentSession: ChatSession | null = null;
    if (currentSessionId === sessionId) {
      if (remainingSessions.length > 0) {
        newCurrentSession = remainingSessions[0];
      }
    }

    return {
      success: true,
      sessions: remainingSessions,
      newCurrentSession,
    };
  } catch (err) {
    console.error("Error in handleSessionDeletion:", err);
    return {
      success: false,
      error: "An error occurred while deleting the chat session",
    };
  }
}
