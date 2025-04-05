import React, { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { ClipboardIcon, CheckIcon, ChevronDown, BrainCircuit, Search, File, Code, Terminal, AlertCircle, RefreshCw, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { ChatMessage, ReasoningData } from "../../types/chat";
import { type Model, DEFAULT_MODEL, MODELS, MODEL_DISPLAY_NAMES } from "../../types/models";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import Tooltip from "../common/Tooltip";
import 'katex/dist/katex.min.css';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// TODO: migrate to use MarkdownRenderer component

// Define types for agent events
interface AgentEvent {
  type: string;
  event_type: string;
  decision?: string;
  file_id?: string;
  tool?: string;
  message?: string;
  data?: string;
  thinking?: string;
  parameters?: Record<string, any>;
}

// Define a custom interface for code component props
interface CodeComponentProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

// Custom hook for dark mode detection
function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial color scheme
    const checkColorScheme = () => {
      const isDark = 
        document.documentElement.classList.contains('force-dark') || 
        (document.documentElement.classList.contains('color-scheme-adaptive') && 
         window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDarkMode(isDark);
    };

    // Check on mount
    checkColorScheme();

    // Set up listeners for theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => checkColorScheme();
    mediaQuery.addEventListener('change', handleChange);

    // Observer for class changes on html element
    const observer = new MutationObserver(checkColorScheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      observer.disconnect();
    };
  }, []);

  return isDarkMode;
}

interface ChatViewProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  copiedText: string | null;
  handleCopyCode: (text: string) => void;
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  isStreamingState: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  autoResizeTextarea: () => void;
  selectedModel?: Model;
  setSelectedModel?: (model: Model) => void;
  onBackClick: () => void;
  sidebarOpen?: boolean;
  simplified?: boolean;
}

// Markdown code block component with copy button and syntax highlighting
const CodeBlock = ({
  children,
  className,
  onCopy,
  isCopied,
}: {
  children?: React.ReactNode;
  className?: string;
  onCopy: (text: string) => void;
  isCopied: boolean;
}) => {
  const language = className ? className.replace(/language-/, "") : "";
  const codeContent = typeof children === 'string' ? children : '';
  const isDarkMode = useDarkMode();

  return (
    <div className="relative group rounded-lg overflow-hidden">
      <SyntaxHighlighter
        style={isDarkMode ? oneDark : oneLight}
        language={language || 'text'}
        PreTag="div"
        className="!rounded-lg !m-0"
        customStyle={{
          borderRadius: '0.5rem',
          margin: 0,
        }}
      >
        {codeContent}
      </SyntaxHighlighter>
      <button
        onClick={() => onCopy(codeContent)}
        className="absolute top-2 right-2 bg-[color-mix(in_oklch,var(--color-primary,#6c47ff)_20%,transparent)] px-2 py-1 rounded text-sm hover:opacity-80 transition-opacity opacity-0 group-hover:opacity-100"
        aria-label="Copy code"
      >
        {isCopied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
};

// Icon mapping for different tool/event types
const getToolIcon = (eventType: string) => {
  switch (eventType) {
    case 'file_edit_start':
    case 'file_edit_complete':
    case 'file_lookup_start':
    case 'file_found':
      return <File className="h-4 w-4" />;
    case 'tool_execution_start':
    case 'tool_complete':
    case 'toolshed_start':
      return <Terminal className="h-4 w-4" />;
    case 'rag_complete':
      return <Search className="h-4 w-4" />;
    case 'decision':
      return <BrainCircuit className="h-4 w-4" />;
    case 'error':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Code className="h-4 w-4" />;
  }
};

// Status badge for different event types
const getStatusBadge = (eventType: string) => {
  if (eventType.includes('complete') || eventType.includes('found')) {
    return <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-0.5 rounded-full">Completed</span>;
  } else if (eventType.includes('start')) {
    return <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full">In Progress</span>;
  } else if (eventType === 'error') {
    return <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs px-2 py-0.5 rounded-full">Error</span>;
  } else {
    return <span className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">Info</span>;
  }
};

// Agent timeline component to display workflow
const AgentTimeline = ({ events = [] }: { events: AgentEvent[] }) => {
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [lastProcessedEvent, setLastProcessedEvent] = useState<string | null>(null);
  const [currentTransitionIndex, setCurrentTransitionIndex] = useState<number | null>(null);

  const toggleEvent = (index: number) => {
    setExpandedEvents(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Safety check to ensure events is an array
  const safeEvents = Array.isArray(events) ? events : [];
  
  // Check for the last event to determine if we're still processing actions
  useEffect(() => {
    if (safeEvents.length > 0) {
      const lastEvent = safeEvents[safeEvents.length - 1];
      setLastProcessedEvent(lastEvent.event_type);
      
      // Set the current transition to be the one before the last event
      if (safeEvents.length > 1) {
        setCurrentTransitionIndex(safeEvents.length - 2);
      } else {
        setCurrentTransitionIndex(null);
      }
    }
  }, [events]);

  // Define transition animations
  const transitionAnimations = `
    @keyframes pulse {
      0% { opacity: 0.7; }
      50% { opacity: 1; }
      100% { opacity: 0.7; }
    }
    .custom-pulse {
      animation: pulse 1.5s infinite ease-in-out;
    }
  `;
  
  // Get the appropriate transition message based on event types
  const getTransitionMessage = (currentEvent: AgentEvent, nextEvent: AgentEvent, index: number): JSX.Element | null => {
    if (!currentEvent || !nextEvent) return null;

    // Should only show a transition if this is the current transition point
    const isCurrentTransition = index === currentTransitionIndex;
    
    // Only show transitions that make sense
    let content: JSX.Element | null = null;

    // Decision to tool transition
    if (currentEvent.event_type === 'decision' && 
        currentEvent.decision === 'tool' && 
        (nextEvent.event_type === 'tool_execution_start' || 
         nextEvent.event_type === 'file_edit_start' || 
         nextEvent.event_type === 'file_lookup_start')) {
      content = (
        <div className={`ml-6 -mb-2 mt-1 text-xs text-purple-600 dark:text-purple-400 flex items-center ${isCurrentTransition ? 'custom-pulse' : ''}`}>
          <span className="mr-1">💡</span> Selecting the right tool...
        </div>
      );
    }
    
    // File interactions
    else if (currentEvent.event_type === 'file_edit_start' && nextEvent.event_type === 'file_edit_complete') {
      content = (
        <div className={`ml-6 -mb-2 mt-1 text-xs text-green-600 dark:text-green-400 flex items-center ${isCurrentTransition ? 'custom-pulse' : ''}`}>
          <span className="mr-1">✏️</span> Making changes to the file...
        </div>
      );
    }
    
    else if (currentEvent.event_type === 'file_lookup_start' && nextEvent.event_type === 'file_found') {
      content = (
        <div className={`ml-6 -mb-2 mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center ${isCurrentTransition ? 'custom-pulse' : ''}`}>
          <span className="mr-1">🔍</span> Searching for the right file...
        </div>
      );
    }
    
    // Tool execution
    else if (currentEvent.event_type === 'tool_execution_start' && nextEvent.event_type === 'tool_complete') {
      content = (
        <div className={`ml-6 -mb-2 mt-1 text-xs text-orange-600 dark:text-orange-400 flex items-center ${isCurrentTransition ? 'custom-pulse' : ''}`}>
          <span className="mr-1">⚙️</span> Running the tool...
        </div>
      );
    }
    
    // Decision to finish transition
    else if (currentEvent.event_type !== 'decision' && 
        nextEvent.event_type === 'decision' && 
        nextEvent.decision === 'finish') {
      content = (
        <div className={`ml-6 -mb-2 mt-1 text-xs text-gray-600 dark:text-gray-400 flex items-center ${isCurrentTransition ? 'custom-pulse' : ''}`}>
          <span className="mr-1">✅</span> Finalizing the answer...
        </div>
      );
    }
    
    // Only show the content if it's relevant to the current state
    return isCurrentTransition && content ? (
      <div className="transition-opacity duration-300">
        {content}
      </div>
    ) : null;
  };

  if (safeEvents.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      <style>{transitionAnimations}</style>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Agent Workflow</h4>
      <div className="relative border-l-2 border-gray-200 dark:border-gray-700 pl-4 space-y-4">
        {safeEvents.map((event, index) => (
          <React.Fragment key={index}>
            <div className="relative animate-fadeIn transition-all duration-200">
              {/* Timeline dot */}
              <div className="absolute -left-[21px] mt-1.5 h-4 w-4 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600">
                <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
              </div>
              
              {/* Event card */}
              <div className={`
                p-3 rounded-lg border border-gray-200 dark:border-gray-700
                hover:border-gray-300 dark:hover:border-gray-600 
                transition-all cursor-pointer
                ${expandedEvents[index] ? 'bg-gray-50 dark:bg-gray-800/60' : 'bg-white dark:bg-gray-900'}
              `}
              onClick={() => toggleEvent(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-[color-mix(in_oklch,var(--color-primary,#6c47ff)_10%,transparent)] dark:bg-[color-mix(in_oklch,var(--color-primary,#6c47ff)_20%,transparent)]">
                      {getToolIcon(event.event_type)}
                    </div>
                    <span className="font-medium text-sm">
                      {event.event_type === 'tool_selected' 
                        ? `Selected Tool: ${event.tool}` 
                        : event.event_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(event.event_type)}
                    <ChevronRight 
                      className={`h-4 w-4 text-gray-400 transition-transform ${expandedEvents[index] ? 'rotate-90' : ''}`} 
                    />
                  </div>
                </div>
                
                {expandedEvents[index] && (
                  <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2">
                    {/* Tool selection details with parameters and reasoning */}
                    {event.event_type === 'tool_selected' && (
                      <>
                        {event.parameters && Object.keys(event.parameters).length > 0 && (
                          <div className="mb-2">
                            <h5 className="font-medium text-gray-700 dark:text-gray-300">Parameters:</h5>
                            <div className="pl-3 mt-1 space-y-1">
                              {Object.entries(event.parameters).map(([key, value]) => (
                                <div key={key} className="font-mono text-xs">
                                  <span className="text-blue-600 dark:text-blue-400">{key}:</span> 
                                  <span className="text-gray-800 dark:text-gray-200"> {typeof value === 'string' ? value : JSON.stringify(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {event.thinking && (
                          <div className="mt-2">
                            <h5 className="font-medium text-gray-700 dark:text-gray-300">Reasoning:</h5>
                            <div className="pl-3 mt-1 whitespace-pre-wrap text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                              {event.thinking}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Regular event details */}
                    {event.data && <p>{event.data}</p>}
                    {event.message && <p>{event.message}</p>}
                    {event.decision && <p>Decision: {event.decision}</p>}
                    {event.file_id && <p>File ID: {event.file_id}</p>}
                    {(event.event_type !== 'tool_selected' && event.tool) && <p>Tool: {event.tool}</p>}
                    
                    {!event.data && !event.message && !event.decision && !event.file_id && 
                     !event.tool && !event.thinking && !event.parameters && (
                      <p>No additional details available</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Show transition message if appropriate */}
            {index < safeEvents.length - 1 && getTransitionMessage(event, safeEvents[index + 1], index)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const ChatView = ({
  messages,
  isStreaming,
  streamingContent,
  copiedText,
  handleCopyCode,
  inputMessage,
  setInputMessage,
  handleSendMessage,
  isStreamingState,
  textareaRef,
  autoResizeTextarea,
  selectedModel = DEFAULT_MODEL,
  setSelectedModel,
  onBackClick,
  sidebarOpen,
  simplified = false,
}: ChatViewProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [endSpacerHeight, setEndSpacerHeight] = useState(64);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  
  // Map to store reasoning data for each message
  const [reasoningData, setReasoningData] = useState<Map<string, ReasoningData>>(new Map());
  // Map to store agent events for each message
  const [messageWorkflows, setMessageWorkflows] = useState<Map<string, AgentEvent[]>> (new Map());
  // For streaming message reasoning
  const [streamingReasoning, setStreamingReasoning] = useState<string>("");
  const [showStreamingReasoning, setShowStreamingReasoning] = useState<boolean>(false);
  const [streamingAgentEvents, setStreamingAgentEvents] = useState<AgentEvent[]>([]);
  const [showAgentEvents, setShowAgentEvents] = useState<boolean>(false);
  // Currently selected message for displaying workflow
  const [activeWorkflowMessageId, setActiveWorkflowMessageId] = useState<string | null>(null);

  // CSS for the pulse animation
  const pulseAnimation = `
    @keyframes pulse {
      0% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.05); opacity: 1; }
      100% { transform: scale(1); opacity: 0.9; }
    }
    .pulse-animation {
      animation: pulse 2s infinite ease-in-out;
      animation-duration: 50s;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out forwards;
    }
  `;

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  // Check if user is currently scrolled to the bottom of the chat
  const checkIfUserAtBottom = () => {
    if (!messageContainerRef.current) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current;
    // Consider "at bottom" if within 100px of the bottom
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsUserAtBottom(isAtBottom);
    setShowScrollBottom(!isAtBottom);
    return isAtBottom;
  };

  // Calculate the appropriate spacing based on content
  const calculateSpacerHeight = () => {
    if (!messageContainerRef.current || !messagesEndRef.current) return;
    
    const containerHeight = messageContainerRef.current.clientHeight;
    const messagesEndHeight = messagesEndRef.current.clientHeight || 0;
    const scrollHeight = messageContainerRef.current.scrollHeight;
    const contentHeight = scrollHeight - messagesEndHeight;
    const chatInputHeight = simplified ? 64 : 42; // Increase height buffer for simplified mode
    const bufferSpace = simplified ? 32 : 24; // Increase buffer space for simplified mode
    
    // For small screens, keep it minimal
    const isMobileDevice = window.innerWidth < 768;
    
    // Calculate optimal height
    let newHeight;
    if (contentHeight > containerHeight) {
      // Content overflows, use minimal spacing
      newHeight = chatInputHeight + bufferSpace;
    } else {
      // Content fits, use larger spacing on desktop, smaller on mobile
      newHeight = isMobileDevice ? 64 : (simplified ? 120 : 96);
    }
    
    setEndSpacerHeight(newHeight);
  };

  // Initialize scroll position and setup observers when component mounts
  useEffect(() => {
    // Only auto-scroll on first load
    scrollToBottom('auto');
    calculateSpacerHeight();
    setIsUserAtBottom(true);
    setShowScrollBottom(false);
    
    // Set up resize observer to recalculate heights when window resizes
    const resizeObserver = new ResizeObserver(() => {
      calculateSpacerHeight();
      checkIfUserAtBottom();
    });
    
    // Add scroll event listener to update spacer height during scrolling
    const handleScroll = () => {
      calculateSpacerHeight();
      checkIfUserAtBottom();
    };
    
    if (messageContainerRef.current) {
      resizeObserver.observe(messageContainerRef.current);
      messageContainerRef.current.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    return () => {
      resizeObserver.disconnect();
      messageContainerRef.current?.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Extract reasoning content from message text
  const extractReasoning = (content: string): { text: string, reasoning: string | null } => {
    const reasoningRegex = /<!--reasoning:(.*?)-->/s;
    const match = content.match(reasoningRegex);
    
    if (match && match[1]) {
      // Found reasoning content
      console.log("Found reasoning content - length:", match[1].length);
      
      // Create the cleaned text by removing the reasoning comment
      const cleanedText = content.replace(reasoningRegex, '');
      console.log("Removed reasoning comment - text length before:", content.length, "after:", cleanedText.length);
      
      // Return the content without reasoning comment and the reasoning content
      return {
        text: cleanedText,
        reasoning: match[1].trim()
      };
    }
    
    return { text: content, reasoning: null };
  };
  
  // Extract agent events from message text
  const extractAgentEvents = (content: string): { text: string, events: AgentEvent[] | null } => {
    const eventsRegex = /<!--agent_events:(.*?)-->/s;
    const match = content.match(eventsRegex);
    
    if (match && match[1]) {
      try {
        // Found agent events
        console.log("Found agent events");
        
        // Parse the JSON array
        const events = JSON.parse(match[1]);
        
        // Create the cleaned text by removing the events comment
        const cleanedText = content.replace(eventsRegex, '');
        
        // Return the content without events comment and the parsed events
        return {
          text: cleanedText,
          events: Array.isArray(events) ? events : []
        };
      } catch (err) {
        console.error("Error parsing agent events:", err);
        return { text: content, events: null };
      }
    }
    
    return { text: content, events: null };
  };
  
  // Process streaming content and check for agent events and reasoning
  useEffect(() => {
    if (isStreaming && streamingContent) {
      // Extract both reasoning and agent events
      const { text: textWithoutReasoning, reasoning } = extractReasoning(streamingContent);
      const { text, events } = extractAgentEvents(textWithoutReasoning);
      
      // If reasoning exists in the streaming content
      if (reasoning) {
        setStreamingReasoning(reasoning);
      }
      
      // If agent events exist
      if (events && events.length > 0) {
        setStreamingAgentEvents(events);
        // Automatically show agent events when they're available
        setShowAgentEvents(true);
      }
      
      // Calculate spacer height and check scroll position
      calculateSpacerHeight();
      checkIfUserAtBottom();
    }
  }, [isStreaming, streamingContent]);
  
  // Handle streaming completion - add streaming reasoning and agent events to the messages
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage.is_user) {
        // When streaming completes, store reasoning for the message if available
        if (streamingReasoning) {
          console.log("Streaming completed - storing reasoning for message:", lastMessage.id.substring(0, 8));
          
          // Add the reasoning data to the map (overwrite if exists)
          setReasoningData(prev => {
            const newMap = new Map(prev);
            // Set reasoning to be hidden by default
            newMap.set(lastMessage.id, { 
              content: streamingReasoning, 
              visible: false 
            });
            return newMap;
          });
          
          // Clear streaming reasoning
          setStreamingReasoning("");
        }
        
        // Set the agent events for the message if available
        if (streamingAgentEvents.length > 0) {
          console.log("Streaming completed - storing agent events for message:", lastMessage.id.substring(0, 8));
          setMessageWorkflows(prev => {
            const newMap = new Map(prev);
            newMap.set(lastMessage.id, streamingAgentEvents);
            return newMap;
          });
          // Clear streaming agent events
          setStreamingAgentEvents([]);
        }
      }
    }
  }, [isStreaming, messages, streamingReasoning, streamingAgentEvents]);
  
  // Scroll to bottom when a new message is added (user submits a message)
  useEffect(() => {
    if (messages.length > lastMessageCount) {
      // Only scroll when user submits a message (not during streaming)
      if (!isStreaming) {
        scrollToBottom();
        setShowScrollBottom(false);
      }
      setLastMessageCount(messages.length);
      calculateSpacerHeight();
    }
  }, [messages.length, lastMessageCount, isStreaming]);
  
  // Just update the scroll indicator when streaming completes
  useEffect(() => {
    if (!isStreaming && lastMessageCount < messages.length) {
      checkIfUserAtBottom();
    }
  }, [isStreaming, messages.length, lastMessageCount]);
  
  // Update reasoning data for messages when they're added or changed
  useEffect(() => {
    // Create a local copy to track modified messages
    let hasModifiedMessages = false;
    
    // Process messages to extract reasoning
    messages.forEach(message => {
      if (!message.is_user) {
        // First check if the message has reasoning data directly from the database
        if (message.reasoning && typeof message.reasoning === 'object' && 'content' in message.reasoning) {
          // Set reasoning data from database field
          const reasoningContent = message.reasoning.content as string;
          if (reasoningContent) {
            setReasoningData(prev => {
              const newMap = new Map(prev);
              // If we already have reasoning data, preserve visibility state
              const existingData = prev.get(message.id);
              newMap.set(message.id, { 
                content: reasoningContent, 
                visible: existingData ? existingData.visible : false // Default to hidden for new items
              });
              return newMap;
            });
            console.log(`Set reasoning data from database for ${message.id.substring(0, 8)}`);
          }
        } 
        // Then check content for embedded reasoning (for backward compatibility)
        else {
          // Check if this message contains reasoning
          const { text, reasoning } = extractReasoning(message.content);
          
          if (reasoning) {
            // Store reasoning data for this message (or update if already exists)
            setReasoningData(prev => {
              const newMap = new Map(prev);
              // If we already have reasoning data, preserve visibility state
              const existingData = prev.get(message.id);
              newMap.set(message.id, { 
                content: reasoning, 
                visible: existingData ? existingData.visible : false // Default to hidden for new items
              });
              return newMap;
            });
            
            // Update the message content to remove the reasoning comment
            if (message.content !== text) {
              message.content = text;
              hasModifiedMessages = true;
              console.log(`Modified message ${message.id.substring(0, 8)} to remove reasoning comment`);
            }
          }
        }
      }
    });
    
    // Log summary
    if (hasModifiedMessages) {
      console.log("Completed processing messages - removed reasoning tags from content");
    }
  }, [messages]);
  
  // Update agent workflow data for messages when they're added or changed
  useEffect(() => {
    // Process messages to extract agent events
    messages.forEach(message => {
      if (!message.is_user) {
        // First check if the message has workflow data directly from the database
        if (message.workflow && Array.isArray(message.workflow) && message.workflow.length > 0) {
          // Ensure the workflow data conforms to AgentEvent type
          const typedWorkflow = message.workflow.map(event => {
            // Ensure each event has at least the required fields for AgentEvent
            return {
              type: event.type || "agent_event",
              event_type: event.event_type || "unknown",
              ...(event.decision && { decision: event.decision }),
              ...(event.file_id && { file_id: event.file_id }),
              ...(event.tool && { tool: event.tool }),
              ...(event.message && { message: event.message }),
              ...(event.data && { data: event.data })
            } as AgentEvent;
          });
          
          setMessageWorkflows(prev => {
            const newMap = new Map(prev);
            newMap.set(message.id, typedWorkflow);
            return newMap;
          });
          console.log(`Set workflow data from message object for ${message.id.substring(0, 8)}`);
        } 
        // Then check content for embedded agent events (for backward compatibility)
        else {
          // Check if this message contains agent events in content
          const { text, events } = extractAgentEvents(message.content);
          
          if (events && events.length > 0) {
            // Store agent events for this message
            setMessageWorkflows(prev => {
              const newMap = new Map(prev);
              newMap.set(message.id, events);
              return newMap;
            });
            
            // Update the message content to remove the events comment
            if (message.content !== text) {
              message.content = text;
              console.log(`Modified message ${message.id.substring(0, 8)} to remove agent events comment`);
            }
          }
        }
      }
    });
  }, [messages]);
  
  // Toggle reasoning visibility
  const toggleReasoning = (messageId: string) => {
    setReasoningData(prev => {
      const newMap = new Map(prev);
      const messageData = newMap.get(messageId);
      
      if (messageData) {
        newMap.set(messageId, { ...messageData, visible: !messageData.visible });
      }
      
      return newMap;
    });
  };
  
  // Toggle streaming reasoning visibility
  const toggleStreamingReasoning = () => {
    setShowStreamingReasoning(prev => !prev);
  };
  
  // Toggle agent events visibility for a specific message
  const toggleAgentEvents = (messageId?: string) => {
    // If messageId is provided, toggle for that specific message
    if (messageId) {
      if (activeWorkflowMessageId === messageId) {
        // Toggle off if already active
        setActiveWorkflowMessageId(null);
        setShowAgentEvents(false);
      } else {
        // Set new active message
        setActiveWorkflowMessageId(messageId);
        setShowAgentEvents(true);
      }
    } else {
      // Toggle streaming events visibility
      setShowAgentEvents(prev => !prev);
    }
  };
  
  // Initialize the streaming reasoning visibility state to be hidden by default
  useEffect(() => {
    setShowStreamingReasoning(false);
  }, []);
  
  // Toggle the model dropdown
  const toggleModelDropdown = () => {
    if (!isStreamingState) {
      setIsModelDropdownOpen(!isModelDropdownOpen);
    }
  };
  
  // Handle model selection
  const handleModelSelect = (model: Model) => {
    if (setSelectedModel) {
      setSelectedModel(model);
    }
    setIsModelDropdownOpen(false);
  };

  // Inside the ChatView component, add this helper function
  const getWorkflowEvents = (messageId: string): AgentEvent[] => {
    if (!messageId || !messageWorkflows.has(messageId)) {
      return [];
    }
    const events = messageWorkflows.get(messageId);
    return events || [];
  };

  // Helper function to check if we should hide the workflow
  // Returns true if first event has decision: "finish"
  const shouldHideWorkflow = (events: AgentEvent[]): boolean => {
    if (!events || events.length === 0) {
      return false;
    }
    
    // Check if the first event is a decision event with "finish"
    const firstEvent = events[0];
    return firstEvent.event_type === "decision" && 
           firstEvent.decision?.toLowerCase() === "finish";
  };

  return (
    <div className={`flex flex-col h-full ${simplified ? 'relative pb-4' : ''}`}>
      {/* Style tag for custom animations */}
      <style>{pulseAnimation}</style>
    
      {/* Back navigation */}
      <button 
        onClick={onBackClick}
        className="pl-4 pt-3 pb-0 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <path d="M15 18l-6-6 6-6" />
        </svg>
        <span className="underline">Back to all chats</span>
      </button>
      
      {/* Message display area */}
      <div 
        ref={messageContainerRef}
        className={`flex-1 overflow-y-auto ${simplified ? 'overflow-x-hidden' : ''} pt-4 px-4 ${simplified ? '' : 'pb-24'} relative scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent ${simplified ? 'max-h-[calc(100%-120px)]' : ''}`}
      >
        <div className="max-w-3xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-8 ${message.is_user ? "text-right" : "text-left"}`}
            >
              {message.is_user ? (
                <div className="inline-block bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-left">
                  <p>{message.content}</p>
                </div>
              ) : (
                <div className="prose prose-gray dark:prose-invert max-w-none">
                  <Markdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                    components={{
                      code: (props) => {
                        const { inline, className, children, ...rest } = props as CodeComponentProps;
                        const match = /language-(\w+)/.exec(className || '');
                        
                        if (!inline && match) {
                          return (
                            <CodeBlock
                              className={className}
                              onCopy={handleCopyCode}
                              isCopied={copiedText === (typeof children === 'string' ? children : '')}
                            >
                              {typeof children === 'string' ? children.replace(/\n$/, '') : children}
                            </CodeBlock>
                          );
                        }
                        
                        return (
                          <code 
                            className={`${inline ? 'bg-[color-mix(in_oklch,var(--color-primary,#6c47ff)_10%,transparent)] px-1.5 py-0.5 rounded' : ''} ${className || ''}`}
                            {...rest}
                          >
                            {children}
                          </code>
                        );
                      },
                      pre: ({ node, children, ...rest }) => (
                        <pre 
                          {...rest}
                          className="bg-background !p-0 !m-0 overflow-hidden"
                        >
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {message.content}
                  </Markdown>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleCopyCode(message.content)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm flex items-center"
                    >
                      {copiedText === message.content ? (
                        <>
                          <CheckIcon size={16} className="mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <ClipboardIcon size={16} className="mr-1" />
                          Copy
                        </>
                      )}
                    </button>
                    
                    {/* Reasoning toggle */}
                    {reasoningData.has(message.id) && (
                      <button
                        onClick={() => toggleReasoning(message.id)}
                        className={`text-sm flex items-center ml-4 ${
                          reasoningData.get(message.id)?.visible 
                            ? 'text-blue-500 dark:text-blue-400' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                      >
                        <BrainCircuit size={16} className="mr-1" />
                        {reasoningData.get(message.id)?.visible ? 'Hide reasoning' : 'Show reasoning'}
                      </button>
                    )}
                    
                    {/* Agent events toggle button - Show only if message has workflow data */}
                    {messageWorkflows.has(message.id) && 
                     messageWorkflows.get(message.id)!.length > 0 && 
                     !shouldHideWorkflow(getWorkflowEvents(message.id)) && (
                      <button
                        onClick={() => toggleAgentEvents(message.id)}
                        className={`text-sm flex items-center ml-4 ${
                          activeWorkflowMessageId === message.id && showAgentEvents
                            ? 'text-purple-500 dark:text-purple-400' 
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                        }`}
                      >
                        <RefreshCw size={16} className="mr-1" />
                        {activeWorkflowMessageId === message.id && showAgentEvents ? 'Hide workflow' : 'Show workflow'}
                      </button>
                    )}
                  </div>
                  
                  {/* Reasoning content display */}
                  {reasoningData.get(message.id)?.visible && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">AI Reasoning:</h4>
                      <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {reasoningData.get(message.id)?.content}
                      </div>
                    </div>
                  )}
                  
                  {/* Agent workflow timeline display */}
                  {activeWorkflowMessageId === message.id && 
                   showAgentEvents && 
                   getWorkflowEvents(message.id).length > 0 &&
                   !shouldHideWorkflow(getWorkflowEvents(message.id)) &&
                    <AgentTimeline events={getWorkflowEvents(message.id)} />
                  }
                </div>
              )}
            </div>
          ))}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <div className="mb-8 text-left">
              <div className="prose prose-gray dark:prose-invert max-w-none">
                <Markdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                  components={{
                    code: (props) => {
                      const { inline, className, children, ...rest } = props as CodeComponentProps;
                      const match = /language-(\w+)/.exec(className || '');
                      
                      if (!inline && match) {
                        return (
                          <CodeBlock
                            className={className}
                            onCopy={handleCopyCode}
                            isCopied={copiedText === (typeof children === 'string' ? children : '')}
                          >
                            {typeof children === 'string' ? children.replace(/\n$/, '') : children}
                          </CodeBlock>
                        );
                      }
                      
                      return (
                        <code 
                          className={`${inline ? 'bg-[color-mix(in_oklch,var(--color-primary,#6c47ff)_10%,transparent)] px-1.5 py-0.5 rounded' : ''} ${className || ''}`}
                          {...rest}
                        >
                          {children}
                        </code>
                      );
                    },
                    pre: ({ node, children, ...rest }) => (
                      <pre 
                        {...rest}
                        className="bg-background !p-0 !m-0 overflow-hidden"
                      >
                        {children}
                      </pre>
                    ),
                  }}
                >
                  {streamingContent}
                </Markdown>
                
                <div className="flex items-center gap-2 mt-2">
                  {/* Streaming reasoning toggle */}
                  {streamingReasoning && (
                    <button
                      onClick={() => toggleStreamingReasoning()}
                      className={`text-sm flex items-center ${
                        showStreamingReasoning 
                          ? 'text-blue-500 dark:text-blue-400' 
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      <BrainCircuit size={16} className="mr-1" />
                      {showStreamingReasoning ? 'Hide reasoning' : 'Show reasoning'}
                    </button>
                  )}
                  
                  {/* Streaming agent events toggle */}
                  {streamingAgentEvents.length > 0 && 
                   !shouldHideWorkflow(streamingAgentEvents) && (
                    <button
                      onClick={() => toggleAgentEvents()}
                      className={`text-sm flex items-center ml-4 ${
                        showAgentEvents 
                          ? 'text-purple-500 dark:text-purple-400' 
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      <RefreshCw size={16} className="mr-1" />
                      {showAgentEvents ? 'Hide workflow' : 'Show workflow'}
                    </button>
                  )}
                </div>
                
                {/* Streaming reasoning content display */}
                {streamingReasoning && showStreamingReasoning && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-md">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">AI Reasoning:</h4>
                    <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {streamingReasoning}
                    </div>
                  </div>
                )}
                
                {/* Streaming agent workflow timeline */}
                {showAgentEvents && 
                 streamingAgentEvents.length > 0 &&
                 !shouldHideWorkflow(streamingAgentEvents) &&
                  <AgentTimeline events={streamingAgentEvents} />
                }
              </div>
            </div>
          )}
          
          {/* This div serves as an anchor for scrolling to the bottom with dynamic height */}
          <div 
            ref={messagesEndRef} 
            style={{ height: `${endSpacerHeight}px` }}
            className="transition-height duration-300" 
          />
        </div>

        {/* Scroll to bottom button - only shows when not at bottom */}
        {showScrollBottom && (
          <button 
            onClick={() => scrollToBottom()}
            className={`${simplified ? 'absolute' : 'fixed'} bottom-24 right-4 md:right-8 z-10 p-3 bg-gray-800 dark:bg-gray-200 text-white dark:text-black rounded-full shadow-md hover:bg-gray-700 dark:hover:bg-gray-300 transition-all duration-200 flex items-center justify-center pulse-animation`}
            aria-label="Scroll to bottom"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        )}
      </div>

      {/* Chat input area */}
      <form
        onSubmit={handleSendMessage}
        className={`${simplified ? 'absolute' : 'fixed'} bottom-4 w-full px-4 transition-all duration-300 ${
          simplified 
            ? 'left-0 right-0 mx-auto'
            : (sidebarOpen 
              ? 'left-[var(--sidebar-width)] right-0 max-w-3xl mx-auto' 
              : 'left-0 right-0 max-w-3xl mx-auto')
        }`}
      >
        <div className="backdrop-blur-md rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-4 bg-transparent outline-none resize-none min-h-[56px] max-h-[25vh] overflow-y-auto"
              disabled={isStreamingState}
              rows={1}
              onInput={autoResizeTextarea}
              onFocus={autoResizeTextarea}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (inputMessage.trim() && !isStreamingState) {
                    handleSendMessage(e);
                  }
                }
              }}
            />
          </div>
          <div className="flex items-center px-4 py-2 justify-between">
            <div className="space-x-2 flex items-center">
              {/* Model selector dropdown - Sleek, minimal, opens upward */}
              <div className="relative">
                <Tooltip
                  content="Allows the model to reason about it's response"
                  title={
                    selectedModel === "deepseek/deepseek-r1:free"
                      ? "Model Selected: Reasoning"
                      : "Model Selected: Normal"
                  }
                >
                  <button
                    type="button"
                    onClick={toggleModelDropdown}
                    disabled={isStreamingState}
                    className={`
                      flex h-8 items-center justify-between
                      rounded-full border p-1 px-3
                      text-[13px] font-medium
                      border-gray-200 dark:border-gray-700
                      transition-colors
                      ${isStreamingState ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"}
                    `}
                    aria-expanded={isModelDropdownOpen}
                    aria-haspopup="true"
                  >
                    <span className="mr-1">{MODEL_DISPLAY_NAMES[selectedModel]}</span>
                    <ChevronDown size={12} className={`transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </Tooltip>
                
                {isModelDropdownOpen && (
                  <div className="absolute z-10 bottom-full mb-1 left-0 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 text-sm min-w-[120px]">
                    <ul role="menu" aria-orientation="vertical" aria-labelledby="model-menu">
                      {Object.entries(MODELS).map(([key, value]) => (
                        <li key={key}>
                          <button
                            type="button"
                            className={`
                              w-full text-left px-3 py-1.5
                              ${value === selectedModel ? 'bg-gray-50 dark:bg-gray-700' : ''} 
                              hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                            `}
                            onClick={() => handleModelSelect(value)}
                          >
                            {MODEL_DISPLAY_NAMES[value]}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 items-center justify-end">
              <button
                type="submit"
                disabled={!inputMessage.trim() || isStreamingState}
                className="p-2 bg-black text-white dark:bg-white dark:text-black rounded-full disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm cursor-pointer"
              >
                {isStreamingState ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-white dark:border-black"></div>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatView; 