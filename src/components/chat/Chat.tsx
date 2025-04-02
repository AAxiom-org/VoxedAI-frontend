import ReaPt, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  streamChatWithGemini,
  formatMessagesForGemini,
} from "../../services/geminiService";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../../services/supabase";
import { type ChatMessage, type ChatSession } from "../../types/chat";
import { type Model, DEFAULT_MODEL } from "../../types/models";
import { useChatState } from "../../hooks";
import HomeView from "./HomeView";
import ChatView from "./ChatView";
import ChatGrid from "./ChatGrid";
import { useNoteState } from "../../hooks/useNoteState";

interface ChatInterfaceProps {
  sidebarOpen?: boolean;
  simplified?: boolean;
}

const ChatInterface = ({ sidebarOpen, simplified = false }: ChatInterfaceProps) => {
  // This component uses URL state management for persistent state
  // We store currentSessionId, view mode, and chat settings in the URL
  // This allows for sharing links and preserving state on refresh
  const { user } = useUser();
  const { id: spaceId } = useParams<{ id: string }>();
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  // Add a ref to track session transition state
  const pendingSessionRef = useRef<string | null>(null);
  
  // Use chatState hook to persist state in URL
  const [chatState, setChatState] = useChatState({
    currentSessionId: null,
    selectedView: 'initial',
    selectedModel: DEFAULT_MODEL,
  });
  
  // Add the note state hook to check if a note is open
  const { isNoteOpen, noteId, noteContent, fetchNoteContent } = useNoteState();
  
  // Destructure values from chatState for easier access
  const { currentSessionId, selectedView, selectedModel } = chatState;
  
  // Computed values based on chatState
  const isInChat = selectedView === 'chat';
  const isInGrid = selectedView === 'grid';
  const currentChatSession = chatSessions.find(session => session.id === currentSessionId) || null;
  
  // Setter functions to update individual states
  const setSelectedModel = (model: Model) => setChatState({ selectedModel: model });
  const setCurrentChatSession = (session: ChatSession | null) => setChatState({ 
    currentSessionId: session?.id || null,
    selectedView: session ? 'chat' : 'initial'
  });
  const setIsInChat = (value: boolean) => setChatState({ 
    selectedView: value ? 'chat' : 'initial' 
  });
  const setIsInGrid = (value: boolean) => setChatState({
    selectedView: value ? 'grid' : 'initial'
  });

  // Fetch chat sessions when component mounts
  useEffect(() => {
    if (user?.id) {
      fetchChatSessions();
    }
  }, [user?.id]);

  // Fetch chat sessions from Supabase
  const fetchChatSessions = async () => {
    try {
      let query = supabase
        .from("chat_sessions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      
      // If we have a space ID, filter by it
      if (spaceId) {
        query = query.eq("space_id", spaceId);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error("Error fetching chat sessions:", error);
        return;
      }

      setChatSessions(data || []);
      
      // If there's a pending session transition, don't override it
      if (pendingSessionRef.current) {
        console.log("Skipping session reset due to pending transition", pendingSessionRef.current);
        return;
      }
      
      // If we have a currentSessionId in URL, load its messages
      if (currentSessionId) {
        const sessionExists = data?.some(session => session.id === currentSessionId);
        if (sessionExists) {
          await fetchMessages(currentSessionId);
        } else {
          // Reset state if the session doesn't exist
          setChatState({ currentSessionId: null, selectedView: 'initial' });
        }
      }
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
    }
  };

  // Create a new chat session
  const createChatSession = async (initialMessage?: string) => {
    if (!user?.id) {
      console.error("Cannot create chat session: User ID is missing");
      return null;
    }

    try {
      // Use the first few words of the message as the chat title if provided
      const title = initialMessage 
        ? initialMessage.substring(0, 30) + (initialMessage.length > 30 ? "..." : "") 
        : "New Chat";

      const { data, error } = await supabase
        .from("chat_sessions")
        .insert([
          {
            user_id: user.id,
            space_id: spaceId || "00000000-0000-0000-0000-000000000000", // Use current space or default
            title: title,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Error creating chat session:", error);
        return null;
      }

      if (!data) {
        console.error("No data returned when creating chat session");
        return null;
      }

      setChatSessions((prevSessions) => [data, ...prevSessions]);
      return data;
    } catch (error) {
      console.error("Error creating chat session:", error);
      return null;
    }
  };

  // Fetch messages for a chat session
  const fetchMessages = async (sessionId: string) => {
    if (!sessionId) return;
    
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, chat_session_id, notebook_id, user_id, content, is_user, created_at, workflow")
        .eq("chat_session_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    }
  };

  // Save a message to the database
  const saveMessage = async (content: string, isUser: boolean, session?: ChatSession | null, workflow?: any[]) => {
    // Use provided session or fallback to currentChatSession
    const chatSession = session || currentChatSession;
    
    if (!chatSession) {
      console.error("Cannot save message: No active chat session");
      return false;
    }
    
    if (!user?.id) {
      console.error("Cannot save message: User ID is missing");
      return false;
    }

    try {
      const { error } = await supabase.from("chat_messages").insert([
        {
          chat_session_id: chatSession.id,
          notebook_id: chatSession.space_id,
          user_id: user.id,
          content,
          is_user: isUser,
          workflow: workflow || null, // Store agent workflow events if available
        },
      ]);

      if (error) {
        console.error("Error saving message:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error saving message:", error);
      return false;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isStreaming) return;

    // Make sure we have a user
    if (!user?.id) {
      console.error("Cannot send message: User is not authenticated");
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage("");

    try {
      // When in home view, always create a new chat session
      if (!isInChat) {
        // Create a new chat session first
        const newSession = await createChatSession(userMessage);
        if (!newSession) {
          console.error("Failed to create new chat session");
          return;
        }
        
        // Set the pending session ref to prevent overriding during fetch
        pendingSessionRef.current = newSession.id;
        
        // Important: Update current session and ensure we're in chat view
        setChatState({ 
          currentSessionId: newSession.id,
          selectedView: 'chat' 
        });
        
        // Set messages to only contain this new message
        const userMessageObj: ChatMessage = {
          id: crypto.randomUUID(),
          chat_session_id: newSession.id,
          notebook_id: newSession.space_id,
          user_id: user.id,
          content: userMessage,
          is_user: true,
          created_at: new Date().toISOString(),
        };
        
        // Clear any existing messages and set only this one
        setMessages([userMessageObj]);
        
        // Save message to database using the new session
        const messageSaved = await saveMessage(userMessage, true, newSession);
        if (!messageSaved) {
          console.error("Failed to save user message to database");
        }
        
        // Stream AI response with this message
        await streamResponse(userMessageObj);
      } 
      // In chat view with existing session
      else if (currentChatSession) {
        // Ensure we have the latest session data from our array
        const latestSession = chatSessions.find(s => s.id === currentChatSession.id) || currentChatSession;
        
        const userMessageObj: ChatMessage = {
          id: crypto.randomUUID(),
          chat_session_id: latestSession.id,
          notebook_id: latestSession.space_id,
          user_id: user.id,
          content: userMessage,
          is_user: true,
          created_at: new Date().toISOString(),
        };
        
        // Add to existing messages
        setMessages((prevMessages) => [...prevMessages, userMessageObj]);
        
        // Save message to database
        const messageSaved = await saveMessage(userMessage, true, latestSession);
        if (!messageSaved) {
          console.error("Failed to save user message to database");
        }
        
        // Stream AI response
        await streamResponse(userMessageObj);
      } 
      // No current session but in chat view (fallback)
      else {
        console.error("In chat view but no current session, creating new one");
        
        // Create a new chat session
        const newSession = await createChatSession(userMessage);
        if (!newSession) {
          console.error("Failed to create new chat session");
          return;
        }
        
        // Set the pending session ref to prevent overriding during fetch
        pendingSessionRef.current = newSession.id;
        
        // Update current session with explicit view setting
        setChatState({ 
          currentSessionId: newSession.id,
          selectedView: 'chat' 
        });
        
        // Add user message to messages array
        const userMessageObj: ChatMessage = {
          id: crypto.randomUUID(),
          chat_session_id: newSession.id,
          notebook_id: newSession.space_id,
          user_id: user.id,
          content: userMessage,
          is_user: true,
          created_at: new Date().toISOString(),
        };
        
        // Set messages with just this message
        setMessages([userMessageObj]);
        
        // Save message to database using the new session
        const messageSaved = await saveMessage(userMessage, true, newSession);
        if (!messageSaved) {
          console.error("Failed to save user message to database");
        }
        
        // Stream AI response
        await streamResponse(userMessageObj);
      }
    } catch (error) {
      console.error("Error handling message submission:", error);
    }
  };

  // Stream a response from the Gemini API
  const streamResponse = async (userMessage: ChatMessage) => {
    try {
      setIsStreaming(true);
      setStreamingContent("");
      console.log("Starting to stream response for message:", userMessage);

      // Ensure the correct session is active during streaming
      pendingSessionRef.current = userMessage.chat_session_id;

      // Format messages for Gemini API
      const formattedMessages = formatMessagesForGemini([
        ...messages,
        userMessage,
      ]);
      console.log("Formatted messages for Gemini:", formattedMessages);

      // Check if a note is open and fetch its content if needed
      let noteContent: string | null = null;
      console.log("isNoteOpen", isNoteOpen);
      if (isNoteOpen) {
        console.log("Note is open, fetching note content...");
        try {
          noteContent = await fetchNoteContent();
          if (noteContent) {
            console.log(`Successfully fetched note content (${noteContent.length} characters)`);
          } else {
            console.warn("No note content could be fetched");
          }
        } catch (error) {
          console.error("Error fetching note content:", error);
        }
      }
      // Track final content in a local variable
      let finalContent = "";
      // Track agent events in a local variable
      let agentEvents: any[] = [];

      // Stream the response
      await streamChatWithGemini(
        formattedMessages,
        (content) => {
          console.log("Stream update received:", content);
          finalContent = content; // Update the local variable
          setStreamingContent(content);
          
          // Extract any agent events from the content
          const agentEventsMatch = content.match(/<!--agent_events:(.*?)-->/s);
          if (agentEventsMatch && agentEventsMatch[1]) {
            try {
              agentEvents = JSON.parse(agentEventsMatch[1]);
              console.log("Extracted agent events:", agentEvents);
            } catch (err) {
              console.error("Error parsing agent events:", err);
            }
          }
        },
        user?.id || null,
        undefined, // isCodingQuestion
        undefined, // isNoteQuestion
        undefined, // noteToggledFiles
        noteContent || undefined,
        selectedModel, // Pass the selected model
        spaceId, // Pass the space ID
        noteId, // Pass the note ID as active file ID if a note is open
      );

      console.log("Stream completed, final content:", finalContent);

      // Save the response to the database
      if (finalContent.trim()) {
        console.log("Saving AI response to database");
        
        // Clean the final content by removing agent events tags
        const cleanContent = finalContent.replace(/<!--agent_events:(.*?)-->/s, '');
        
        // Create a session object from the user message if needed
        const messageSession = {
          id: userMessage.chat_session_id,
          space_id: userMessage.notebook_id,
          user_id: userMessage.user_id,
          title: "",  // Not needed for saving
          created_at: ""  // Not needed for saving
        };
        
        // Save the clean content and the workflow events to the database
        await saveMessage(cleanContent, false, messageSession, agentEvents);

        // Add AI response to messages array, but keep the tags for immediate display
        const aiResponse: ChatMessage = {
          id: crypto.randomUUID(),
          chat_session_id: userMessage.chat_session_id,
          notebook_id: userMessage.notebook_id,
          user_id: user?.id || "",
          content: finalContent,
          is_user: false,
          created_at: new Date().toISOString(),
          workflow: agentEvents // Add workflow data to the message object
        };

        console.log("Adding AI response to messages array:", aiResponse);
        setMessages((prevMessages) => [...prevMessages, aiResponse]);
        console.log("New messages state after adding AI response:", [...messages, aiResponse]);
        
        // Make sure chat view is still active
        setIsInChat(true);
      } else {
        console.warn("Stream content is empty, not saving response");
      }
    } catch (error) {
      console.error("Error streaming response:", error);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      
      // Make sure the current session is still preserved
      if (userMessage.chat_session_id !== currentSessionId) {
        console.log("Ensuring correct session after streaming:", userMessage.chat_session_id);
        setChatState({ 
          currentSessionId: userMessage.chat_session_id,
          selectedView: 'chat' 
        });
      }
      
      console.log("Stream process finished, streaming state reset");
    }
  };

  // Handle session click from home view
  const handleChatSessionClick = (session: ChatSession) => {
    // Set the pending session ref to prevent overriding during fetch
    pendingSessionRef.current = session.id;
    
    setCurrentChatSession(session);
    fetchMessages(session.id);
  };

  // Handle back click from chat view
  const handleBackClick = () => {
    setChatState({ 
      selectedView: 'initial',
      currentSessionId: null 
    });
  };

  // Handle view all click from home view
  const handleViewAllClick = () => {
    setChatState({ selectedView: 'grid' });
  };

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Add effect to handle changes in currentSessionId
  useEffect(() => {
    if (currentSessionId) {
      // Only clear messages if this isn't a pending session transition 
      // (because we've already set messages for the new session)
      if (pendingSessionRef.current !== currentSessionId) {
        setMessages([]);
        fetchMessages(currentSessionId);
      }
    }
  }, [currentSessionId]);

  // Add debug logging for the messages array in a useEffect
  useEffect(() => {
    console.log("Messages state updated:", messages);
  }, [messages]);

  // Add debug logging for streaming content
  useEffect(() => {
    if (streamingContent) {
      console.log("Streaming content updated:", streamingContent);
    }
  }, [streamingContent]);

  // Add effect to ensure chat view state is consistent with session ID
  useEffect(() => {
    if (currentSessionId) {
      setIsInChat(true);
    }
  }, [currentSessionId]);

  // Add effect to make sure messages is set correctly when streaming stops
  useEffect(() => {
    if (!isStreaming && currentSessionId && messages.length === 0) {
      fetchMessages(currentSessionId);
    }
  }, [isStreaming, currentSessionId, messages.length]);

  // Clear pending session ref when transition completes
  useEffect(() => {
    if (currentSessionId && pendingSessionRef.current === currentSessionId) {
      // The session transition has completed successfully
      const timerId = setTimeout(() => {
        pendingSessionRef.current = null;
        console.log("Cleared pending session transition", currentSessionId);
      }, 1000); // Wait for other effects to complete
      
      return () => clearTimeout(timerId);
    }
  }, [currentSessionId]);

  return (
    <div className={`flex flex-col ${simplified ? 'h-full' : 'h-screen'} w-full ${simplified ? 'relative' : ''}`}>
      {!isInChat && !isInGrid ? (
        <HomeView
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          handleSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          textareaRef={textareaRef}
          autoResizeTextarea={autoResizeTextarea}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          chatSessions={chatSessions}
          onChatSessionClick={handleChatSessionClick}
          onViewAllClick={handleViewAllClick}
        />
      ) : isInGrid ? (
        <ChatGrid
          chatSessions={chatSessions}
          onChatSessionClick={handleChatSessionClick}
          onBackClick={handleBackClick}
        />
      ) : (
        <ChatView
          messages={messages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          copiedText={copiedText}
          handleCopyCode={handleCopyCode}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          handleSendMessage={handleSendMessage}
          isStreamingState={isStreaming}
          textareaRef={textareaRef}
          autoResizeTextarea={autoResizeTextarea}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          onBackClick={handleBackClick}
          sidebarOpen={sidebarOpen}
          simplified={simplified}
        />
      )}
    </div>
  );
};

export default ChatInterface;
