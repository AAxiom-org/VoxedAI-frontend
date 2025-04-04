// API endpoint
const API_URL = "https://voxed.aidanandrews.org/api/v1/agent/run";

// Import types from types directory
import { type Message, type MessageRole } from "../types/gemini";
import { MODELS, DEFAULT_MODEL, type Model } from "../types/models";
import { getToggledFiles } from "./userService";

/**
 * Streams a chat response from the Gemini model
 * @param history Array of previous messages
 * @param onStreamUpdate Callback for streaming updates
 * @param userId User ID for tracking
 * @param isCodingQuestion Whether this is a coding-related question
 * @param isNoteQuestion Whether this is a note-related question
 * @param noteToggledFiles Optional array of note file IDs to use when isNoteQuestion is true
 * @param noteContent Optional note content to include when a note is open
 * @param modelName Optional model name to use (defaults to NORMAL model)
 * @param spaceId Optional space ID for the current workspace
 * @param activeFileId Optional ID of the currently active file (e.g., open note)
 * @param chatSessionId Optional ID of the current chat session
 */
export async function streamChatWithGemini(
  history: Message[],
  onStreamUpdate: (content: string) => void,
  userId: string | null,
  isCodingQuestion: boolean = false,
  isNoteQuestion: boolean = false,
  noteToggledFiles?: string[],
  noteContent?: string,
  modelName: Model = DEFAULT_MODEL,
  spaceId?: string,
  activeFileId?: string | null,
  chatSessionId?: string | null,
): Promise<void> {
  try {
    console.log("Starting chat with history length:", history.length);
    console.log("Using model:", modelName);
    console.log("Using chat session ID:", chatSessionId || "none");

    // Validate history array
    if (!history || history.length === 0) {
      throw new Error("Chat history is empty. Cannot send message.");
    }

    // Get the last user message
    const lastMessage = history[history.length - 1];
    if (!lastMessage || !lastMessage.content) {
      throw new Error("Last message is missing or has no content.");
    }

    // Check if the message content is already in SSE format
    // This would indicate we're trying to send a previously streamed response as a message
    if (lastMessage.content.includes('data: {"type":')) {
      console.error(
        "Message appears to be in SSE format. This is likely an error.",
      );
      throw new Error(
        "Invalid message format. Cannot send an SSE response as a message.",
      );
    }

    // Extract the exact user query text
    const exactUserQuery = lastMessage.content;
    console.log("Exact user query:", exactUserQuery);

    // Prepare the base query request
    let queryRequest = {
      query: exactUserQuery,
      top_k: 5,
      model_name: modelName, // Use the provided model name
      stream: true,
      user_id: userId,
      space_id: spaceId,
      active_file_id: activeFileId || null,
      chat_session_id: chatSessionId || null, // Include chat session ID
      save_to_db: true // Tell backend to save messages to DB
    };

    console.log("Sending query request:", queryRequest);

    // Make the API request with fetch to support streaming
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(queryRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    // Check if the response is a stream
    if (!response.body) {
      throw new Error("Response body is not available");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let streamedContent = "";
    let actualResponse = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        streamedContent += chunk;
        
        // Debug raw chunk
        console.log("Raw chunk received:", chunk);

        // Parse SSE format to extract actual response content
        const updatedContent = parseStreamingResponse(streamedContent);

        // Send the parsed content to the UI
        actualResponse = updatedContent;
        onStreamUpdate(actualResponse);
      }

      // Final decode to catch any remaining bytes
      const finalChunk = decoder.decode();
      if (finalChunk) {
        streamedContent += finalChunk;
        const finalContent = parseStreamingResponse(streamedContent);
        actualResponse = finalContent;
        onStreamUpdate(actualResponse);
      }

      console.log("Stream completed successfully");
      console.log("Final content:", actualResponse);
    } catch (streamError) {
      console.error("Error during stream processing:", streamError);
      // If we have a partial response, still return it
      if (actualResponse) {
        onStreamUpdate(actualResponse);
      } else {
        throw streamError;
      }
    }
  } catch (error) {
    console.error("Error streaming chat:", error);
    throw error;
  }
}

/**
 * Parses the streaming response to extract actual text content
 * @param streamData Raw streaming data in SSE format
 * @returns Extracted text content
 */
function parseStreamingResponse(streamData: string): string {
  let extractedText = "";
  let reasoningText = "";
  let agentEvents: any[] = [];

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

          // Log all parsed data for debugging
          console.log("Parsed SSE data:", data);

          // If it's a regular token, add it to the extracted text
          if (data.type === "token" && data.content) {
            extractedText += data.content;
          }
          
          // If it's a reasoning token, add it to the reasoning text
          else if (data.type === "reasoning" && data.content) {
            reasoningText += data.content;
            
            // Store reasoning text as a data attribute that can be accessed by the ChatView component
            // This will be preserved in the final output
            if (reasoningText.trim()) {
              // Update extracted text to include the reasoning as a data attribute
              let textWithoutReasoning = extractedText.replace(/<!--reasoning:.*?-->/s, "");
              extractedText = textWithoutReasoning + "<!--reasoning:" + reasoningText.trim() + "-->";
            }
          }
          
          // Handle agent events
          else if (data.type === "agent_event") {
            console.log("Agent Event from SSE:", data);
            // Store the agent event for returning to the UI
            agentEvents.push(data);
            
            // Update extracted text to include the agent events as a data attribute
            // This will be preserved in the final output
            let textWithoutEvents = extractedText.replace(/<!--agent_events:.*?-->/s, "");
            extractedText = textWithoutEvents + "<!--agent_events:" + JSON.stringify(agentEvents) + "-->";
          }
        } catch (error) {
          // If JSON parsing fails, log the error and line for debugging
          console.warn("Failed to parse JSON in stream data line:", line, error);
        }
      }
    }

    return extractedText;
  } catch (error) {
    console.error("Error parsing streaming response:", error);
    return extractedText || streamData; // Return what we have if parsing fails
  }
}

/**
 * Formats chat messages for API
 * @param messages Array of chat messages from the database
 * @returns Formatted history for API
 */
export function formatMessagesForGemini(
  messages: { is_user: boolean; content: string }[],
): Message[] {
  if (!messages || messages.length === 0) {
    return [];
  }

  return messages.map((message) => ({
    role: message.is_user ? ("user" as MessageRole) : ("model" as MessageRole),
    content: message.content || "",
  }));
}
