import { useState, useEffect } from "react";
import { ChatSession } from "../../types/chat";
import { supabase } from "../../services/supabase";
import { useUser } from "@clerk/clerk-react";
import { SearchIcon, X } from "lucide-react";

interface ChatSessionWithLastMessage extends ChatSession {
  lastMessage?: string;
}

interface ChatGridProps {
  chatSessions: ChatSession[];
  onChatSessionClick: (session: ChatSession) => void;
  onBackClick: () => void;
}

const ChatGrid = ({
  chatSessions,
  onChatSessionClick,
  onBackClick,
}: ChatGridProps) => {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionsWithMessages, setSessionsWithMessages] = useState<ChatSessionWithLastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the last message for each chat session using a more efficient approach
  useEffect(() => {
    const fetchLastMessages = async () => {
        if (!user?.id || chatSessions.length === 0) {
        setIsLoading(false);
        return;
        }

        setIsLoading(true);
      
        try {
            const sessionPromises = chatSessions.map(async (session) => {
            const { data: msgData, error: msgError } = await supabase
                .from("chat_messages")
                .select("*")
                .eq("chat_session_id", session.id)
                .order("created_at", { ascending: false })
                .limit(1);

            if (msgError) {
                console.error("Error fetching last message:", msgError);
                return {
                ...session,
                lastMessage: undefined,
                };
            }

            return {
                ...session,
                lastMessage: msgData && msgData.length > 0 ? msgData[0].content : undefined,
            };
            });

            const sessionsWithLastMessages = await Promise.all(sessionPromises);
            setSessionsWithMessages(sessionsWithLastMessages);
            setIsLoading(false);
            return;
        } catch (error) {
        console.error("Error fetching messages:", error);
        
        // Fallback to empty messages
        const sessionsWithNoMessages = chatSessions.map(session => ({
          ...session,
          lastMessage: undefined
        }));
        setSessionsWithMessages(sessionsWithNoMessages);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLastMessages();
  }, [chatSessions, user?.id]);

  // Filter sessions based on search query
  const filteredSessions = sessionsWithMessages.filter((session) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      session.title.toLowerCase().includes(searchLower) ||
      (session.lastMessage && session.lastMessage.toLowerCase().includes(searchLower))
    );
  });

  // Helper function to truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  };

  return (
    <div className="flex flex-col h-full w-full max-w-6xl mx-auto px-4 py-6">
      {/* Header with back button and search */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBackClick}
          className="flex items-center text-gray-700 hover:text-gray-900 mr-auto"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back
        </button>
                
        <div className="flex-1 max-w-md ml-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <div className="absolute right-3 top-2.5 text-gray-400">
              {searchQuery ? (
                <X 
                  className="h-5 w-5 cursor-pointer" 
                  onClick={() => setSearchQuery("")}
                />
              ) : (
                <SearchIcon className="h-5 w-5" />
              )}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600"></div>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <p className="text-xl mb-2">No conversations found</p>
          <p className="text-sm">
            {searchQuery
              ? "Try a different search term"
              : "Start a new conversation"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onChatSessionClick(session)}
              className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition flex flex-col h-36"
            >
              <div className="flex justify-between mb-2 items-start">
                <h3 className="font-medium text-lg line-clamp-1" title={session.title}>
                  {truncateText(session.title, 40)}
                </h3>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {new Date(session.created_at).toLocaleDateString()}
                </span>
              </div>
              
              {session.lastMessage ? (
                <p className="text-gray-600 text-sm line-clamp-3 flex-1 overflow-hidden">
                  {truncateText(session.lastMessage, 120)}
                </p>
              ) : (
                <p className="text-gray-400 italic text-sm">No messages</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatGrid; 