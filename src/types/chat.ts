import { z } from "zod";
import React from "react";
// ChatMessage schema with Zod
export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  chat_session_id: z.string().uuid(),
  space_id: z.string().uuid(),
  user_id: z.string(),
  content: z.string(),
  is_user: z.boolean(),
  created_at: z.string().datetime(),
  workflow: z.array(z.any()).optional(),
  reasoning: z.record(z.string(), z.any()).optional(),
});

// Type derived from the schema
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Reasoning data interface for handling LLM reasoning tokens
export interface ReasoningData {
  content: string;
  visible: boolean;
}

// ChatSession schema with Zod
export const ChatSessionSchema = z.object({
  id: z.string().uuid(),
  space_id: z.string().uuid(),
  user_id: z.string(),
  title: z.string(),
  created_at: z.string().datetime(),
});

export interface ChatBarProps {
  handleSendMessage: (e: React.FormEvent) => void;
  inputMessage: string;
  setInputMessage: (message: string) => void;
  isStreaming: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  autoResizeTextarea: () => void;
  isCodingQuestion: boolean;
  setIsCodingQuestion: (value: boolean) => void;
  isNoteQuestion: boolean;
  setIsNoteQuestion: (value: boolean) => void;
}

export interface ChatInterfaceProps {
  currentChatSession: ChatSession | null;
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  isStreaming: boolean;
  streamingContent: string;
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  handleCreateSession: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  isCodingQuestion: boolean;
  setIsCodingQuestion: (value: boolean) => void;
  isNoteQuestion: boolean;
  setIsNoteQuestion: (value: boolean) => void;
}

// Type derived from the schema
export type ChatSession = z.infer<typeof ChatSessionSchema>;
