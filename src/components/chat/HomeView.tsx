import React, { useState } from "react";
import { ChatSession } from "../../types/chat";
import { ChevronDown } from "lucide-react";
import {
  Model,
  DEFAULT_MODEL,
  MODELS,
  MODEL_DISPLAY_NAMES,
} from "../../types/models";
import Tooltip from "../common/Tooltip";

interface HomeViewProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  isStreaming: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  autoResizeTextarea: () => void;
  selectedModel?: Model;
  setSelectedModel?: (model: Model) => void;
  chatSessions: ChatSession[];
  onChatSessionClick: (session: ChatSession) => void;
  onViewAllClick: () => void;
}

const HomeView = ({
  inputMessage,
  setInputMessage,
  handleSendMessage,
  isStreaming,
  textareaRef,
  autoResizeTextarea,
  selectedModel = DEFAULT_MODEL,
  setSelectedModel,
  chatSessions,
  onChatSessionClick,
  onViewAllClick,
}: HomeViewProps) => {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  // Toggle the model dropdown
  const toggleModelDropdown = () => {
    if (!isStreaming) {
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

  return (
    <>
      {/* Initial view with centered chat bar */}
      <div className="flex flex-col items-center justify-center space-y-14 py-48">
        <div>
          <h1 className="text-4xl font-bold text-center">
            Start a new conversation
          </h1>
        </div>
        {/* Chat bar in the middle of the page */}
        <div className="w-full max-w-3xl px-4">
          <form onSubmit={handleSendMessage} className="relative">
            <div className="backdrop-blur-md rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 p-4 bg-transparent outline-none resize-none min-h-[56px] max-h-[25vh] overflow-y-auto"
                  disabled={isStreaming}
                  rows={1}
                  onInput={autoResizeTextarea}
                  onFocus={autoResizeTextarea}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (inputMessage.trim() && !isStreaming) {
                        handleSendMessage(e);
                      }
                    }
                  }}
                />
              </div>
              <div className="flex items-center mx-auto px-4 py-4 justify-between">
                <div className="space-x-2 flex items-center relative ml-1">
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
                        disabled={isStreaming}
                        className={`
                          flex h-8 items-center justify-between
                          rounded-full border p-1 px-3
                          text-[13px] font-medium
                          border-gray-200 dark:border-gray-700
                          transition-colors
                          ${isStreaming ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"}
                        `}
                        aria-expanded={isModelDropdownOpen}
                        aria-haspopup="true"
                      >
                        <span className="mr-1">
                          {MODEL_DISPLAY_NAMES[selectedModel]}
                        </span>
                        <ChevronDown
                          size={12}
                          className={`transition-transform ${isModelDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    </Tooltip>
                    {isModelDropdownOpen && (
                      <div className="absolute z-10 bottom-full mb-1 left-0 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 text-sm min-w-[120px]">
                        <ul
                          role="menu"
                          aria-orientation="vertical"
                          aria-labelledby="model-menu"
                        >
                          {Object.entries(MODELS).map(([key, value]) => (
                            <li key={key}>
                              <button
                                type="button"
                                className={`
                                  w-full text-left px-3 py-1.5
                                  ${value === selectedModel ? "bg-gray-50 dark:bg-gray-700" : ""} 
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
                <div className="flex-shrink-0 items-center justify-end relative z-10 mr-3">
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isStreaming}
                    className="p-2 bg-black text-white dark:bg-white dark:text-black rounded-full disabled:opacity-50 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-sm cursor-pointer"
                  >
                    {isStreaming ? (
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
      </div>

      {/* Previous conversations section */}
      <div className="w-full max-w-3xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-medium mb-4">Previous conversations</h2>
          {chatSessions.length > 3 && (
            <button
              onClick={onViewAllClick}
              className="text-gray-500 text-sm mb-4 underline cursor-pointer hover:text-gray-700"
            >
              View all
            </button>
          )}
        </div>
        <div className="space-y-4">
          {chatSessions.slice(0, 3).map((session) => (
            <div
              key={session.id}
              className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition"
              onClick={() => onChatSessionClick(session)}
            >
              <div className="flex justify-between mb-1">
                <h3 className="font-medium">{session.title}</h3>
                <span className="text-sm text-gray-500">
                  {new Date(session.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default HomeView;
