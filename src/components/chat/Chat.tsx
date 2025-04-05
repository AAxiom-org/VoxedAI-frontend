import React, { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  streamChatWithGemini,
  formatMessagesForGemini,
  type StreamChatOptions,
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

  // Fetch messages for a chat session
  const fetchMessages = async (sessionId: string) => {
    if (!sessionId) return;
    
    // Skip fetching from database for temporary sessions
    if (sessionId.startsWith("temp-")) {
      console.log("Skipping database fetch for temporary session:", sessionId);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, chat_session_id, space_id, user_id, content, is_user, created_at, workflow, reasoning")
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
      // When in home view, always start a new chat
      if (!isInChat) {
        // Create a temporary session until backend creates one
        // We will update with the real session ID from the response
        const tempSession: ChatSession = {
          id: "temp-" + Date.now(),
          user_id: user.id,
          space_id: spaceId || "00000000-0000-0000-0000-000000000000",
          title: userMessage.substring(0, 30) + (userMessage.length > 30 ? "..." : ""),
          created_at: new Date().toISOString(),
        };
        
        // Update the UI to show the new session
        setChatState({ 
          currentSessionId: tempSession.id,
          selectedView: 'chat' 
        });
        
        // Create a temporary user message for the UI
        const tempUserMessage: ChatMessage = {
          id: "temp-msg-" + Date.now(),
          chat_session_id: tempSession.id,
          space_id: tempSession.space_id,
          user_id: user.id,
          content: userMessage,
          is_user: true,
          created_at: new Date().toISOString(),
        };
        
        // Update the messages state with the temporary message
        setMessages([tempUserMessage]);
        
        // Stream AI response (backend will create the real session and save both messages)
        await streamResponse(tempUserMessage, null);
      } 
      // In chat view with existing session
      else if (currentChatSession) {
        // Create a temporary user message for the UI
        const tempUserMessage: ChatMessage = {
          id: "temp-msg-" + Date.now(),
          chat_session_id: currentChatSession.id,
          space_id: currentChatSession.space_id,
          user_id: user.id,
          content: userMessage,
          is_user: true,
          created_at: new Date().toISOString(),
        };
        
        // Add to existing messages
        setMessages((prevMessages) => [...prevMessages, tempUserMessage]);
        
        // Stream AI response (backend will save both messages)
        await streamResponse(tempUserMessage, currentChatSession.id);
      }
    } catch (error) {
      console.error("Error handling message submission:", error);
    }
  };

  // Stream a response from the backend
  const streamResponse = async (userMessage: ChatMessage, sessionId: string | null) => {
    try {
      setIsStreaming(true);
      setStreamingContent("");
      console.log("Starting to stream response for message:", userMessage);

      // Format messages for the API
      const formattedMessages = formatMessagesForGemini([
        ...messages,
        userMessage,
      ]);
      console.log("Formatted messages for API:", formattedMessages);

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

      const streamChatOptions: StreamChatOptions = {
        history: formattedMessages,
        onStreamUpdate: (content) => {
          console.log("Stream update received:", content);
          setStreamingContent(content);
        },
        userId: user?.id || null,
        modelName: selectedModel,
        spaceId: spaceId,
        activeFileId: noteId,
        chatSessionId: sessionId,
      }

      // Stream the response
      await streamChatWithGemini(streamChatOptions);

      console.log("Stream completed");
      
      // Refresh chat sessions to get any new session created by the backend
      await fetchChatSessions();
      
      // If we were in a new chat, find and set the newly created session
      if (!sessionId || sessionId.startsWith("temp-")) {
        console.log("New chat - looking for the created session");
        // The backend should have created a new session and returned its ID
        // For now, we'll just get the most recent session
        const { data, error } = await supabase
          .from("chat_sessions")
          .select("*")
          .eq("user_id", user?.id)
          .eq("space_id", spaceId || "00000000-0000-0000-0000-000000000000")
          .order("created_at", { ascending: false })
          .limit(1);
          
        if (data && data.length > 0) {
          const newSession = data[0];
          console.log("Found new session:", newSession.id);
          
          // Store the old messages to preserve them during transition
          const oldMessages = [...messages];
          
          // Update the session ID in the URL
          setChatState({
            currentSessionId: newSession.id,
            selectedView: 'chat'
          });
          
          // Fetch messages for the new session, but only if we get results
          const { data: messageData } = await supabase
            .from("chat_messages")
            .select("id, chat_session_id, space_id, user_id, content, is_user, created_at, workflow, reasoning")
            .eq("chat_session_id", newSession.id)
            .order("created_at", { ascending: true });
            
          // Only update messages if we got data back, otherwise keep our UI state
          if (messageData && messageData.length > 0) {
            setMessages(messageData);
          }
        }
      }
      // Otherwise just refresh the messages for the current session
      else if (sessionId) {
        await fetchMessages(sessionId);
      }
    } catch (error) {
      console.error("Error streaming response:", error);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
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
      // Skip for temporary sessions to preserve UI state
      if (currentSessionId.startsWith("temp-")) {
        console.log("Preserving UI state for temporary session:", currentSessionId);
        return;
      }
      
      // Only clear messages if this isn't a pending session transition 
      // (because we've already set messages for the new session)
      if (pendingSessionRef.current !== currentSessionId) {
        setMessages([]);
        fetchMessages(currentSessionId);
      }
    }
  }, [currentSessionId]);

  // Add effect to ensure chat view state is consistent with session ID
  useEffect(() => {
    if (currentSessionId) {
      setIsInChat(true);
    }
  }, [currentSessionId]);

  // Add effect to make sure messages is set correctly when streaming stops
  useEffect(() => {
    if (!isStreaming && currentSessionId && messages.length === 0) {
      // Skip for temporary sessions
      if (!currentSessionId.startsWith("temp-")) {
        fetchMessages(currentSessionId);
      }
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
