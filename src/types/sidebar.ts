import React from "react";
import { z } from "zod";
import { ChatSessionSchema, type ChatSession } from "./chat";
import { SpaceFileSchema, type Workspace } from "./space";

// ExtendedSpaceFile schema with Zod
export const ExtendedSpaceFileSchema = SpaceFileSchema.extend({
  isProcessing: z.boolean().optional(),
  isDeletingFile: z.boolean().optional(),
});

// Type derived from the schema
export type ExtendedSpaceFile = z.infer<typeof ExtendedSpaceFileSchema>;

// SidebarProps schema with Zod
export const SidebarPropsSchema = z.object({
  // Core/Workspace navigation props
  userId: z.string(),
  isCollapsed: z.boolean(),
  onToggleCollapse: z.function().args().returns(z.void()),
  selectedWorkspaceId: z.string().nullable(),
  onSelectWorkspace: z.function().args(z.string().nullable()).returns(z.void()),
  onWorkspacesUpdated: z.function().args().returns(z.void()).optional(),

  // Notes panel toggle functionality
  toggleNotesPanel: z.function().args().returns(z.void()).optional(),
  isNotesPanelExpanded: z.boolean().optional(),

  // Sandbox toggle functionality
  toggleSandbox: z.function().args().returns(z.void()).optional(),
  isSandboxExpanded: z.boolean().optional(),

  // Note question mode
  isNoteQuestion: z.boolean().optional(),

  // Space-specific props (optional)
  mode: z.enum(["workspaces", "space"]).optional(),
  activeTab: z.enum(["files", "chats"]).optional(),
  setActiveTab: z
    .function()
    .args(z.enum(["files", "chats"]))
    .returns(z.void())
    .optional(),
  files: z.array(ExtendedSpaceFileSchema).optional(),
  chatSessions: z.array(ChatSessionSchema).optional(),
  isLoadingFiles: z.boolean().optional(),
  currentChatSession: ChatSessionSchema.nullable().optional(),
  handleCreateSession: z.function().args().returns(z.void()).optional(),
  handleDeleteFile: z.function().args(z.string()).returns(z.void()).optional(),
  handleEditChatTitle: z
    .function()
    .args(ChatSessionSchema)
    .returns(z.void())
    .optional(),
  confirmDeleteSession: z
    .function()
    .args(z.string())
    .returns(z.void())
    .optional(),
  setCurrentChatSession: z
    .function()
    .args(ChatSessionSchema)
    .returns(z.void())
    .optional(),
  handleFileUpload: z
    .function()
    .args(z.custom<React.ChangeEvent<HTMLInputElement>>())
    .returns(z.promise(z.void()))
    .optional(),
  spaceName: z.string().optional(),
  uploadingFiles: z.custom<Set<string>>().optional(),
});

// Type derived from the schema
export type SidebarProps = z.infer<typeof SidebarPropsSchema>;

// WorkspaceItemProps schema with Zod
export const WorkspaceItemPropsSchema = z.object({
  workspace: z.custom<Workspace>(),
  depth: z.number().optional(),
  isCollapsed: z.boolean(),
  isMobile: z.boolean(),
  isSelected: z.boolean(),
  expandedWorkspaces: z.custom<Set<string>>(),
  handleToggleWorkspace: z
    .function()
    .args(z.string(), z.custom<React.MouseEvent>())
    .returns(z.void()),
  handleSelectWorkspace: z
    .function()
    .args(z.string().nullable())
    .returns(z.void()),
  handleAddSubworkspace: z
    .function()
    .args(z.string(), z.custom<React.MouseEvent>())
    .returns(z.void()),
  handleDeleteClick: z
    .function()
    .args(z.string(), z.custom<React.MouseEvent>())
    .returns(z.promise(z.void())),
});

// Type derived from the schema
export type WorkspaceItemProps = z.infer<typeof WorkspaceItemPropsSchema>;

// FileListItemProps schema with Zod
export const FileListItemPropsSchema = z.object({
  file: ExtendedSpaceFileSchema,
  isMobile: z.boolean(),
  isChecked: z.boolean(),
  toggleFileChecked: z
    .function()
    .args(z.string(), z.custom<React.MouseEvent>())
    .returns(z.void()),
  handleDeleteFile: z.function().args(z.string()).returns(z.void()).optional(),
  getFileSize: z.function().args(z.number()).returns(z.string()),
});

// Type derived from the schema
export type FileListItemProps = z.infer<typeof FileListItemPropsSchema>;

// ChatSessionItemProps schema with Zod
export const ChatSessionItemPropsSchema = z.object({
  session: z.custom<ChatSession>(),
  isMobile: z.boolean(),
  isActive: z.boolean(),
  setCurrentChatSession: z
    .function()
    .args(z.custom<ChatSession>())
    .returns(z.void())
    .optional(),
  handleEditChatTitle: z
    .function()
    .args(z.custom<ChatSession>())
    .returns(z.void())
    .optional(),
  confirmDeleteSession: z
    .function()
    .args(z.string())
    .returns(z.void())
    .optional(),
});

// Type derived from the schema
export type ChatSessionItemProps = z.infer<typeof ChatSessionItemPropsSchema>;

// WorkspaceViewProps schema with Zod
export const WorkspaceViewPropsSchema = z.object({
  userId: z.string(),
  isMobile: z.boolean(),
  isCollapsed: z.boolean(),
  selectedWorkspaceId: z.string().nullable(),
  onSelectWorkspace: z.function().args(z.string().nullable()).returns(z.void()),
  onWorkspacesUpdated: z.function().args().returns(z.void()).optional(),
});

// Type derived from the schema
export type WorkspaceViewProps = z.infer<typeof WorkspaceViewPropsSchema>;

// SpaceViewProps schema with Zod
export const SpaceViewPropsSchema = z.object({
  userId: z.string(),
  isMobile: z.boolean(),
  isCollapsed: z.boolean(),
  spaceName: z.string(),
  activeTab: z.enum(["files", "chats"]),
  setActiveTab: z
    .function()
    .args(z.enum(["files", "chats"]))
    .returns(z.void())
    .optional(),
  files: z.array(ExtendedSpaceFileSchema),
  chatSessions: z.array(z.custom<ChatSession>()),
  isLoadingFiles: z.boolean(),
  currentChatSession: z.custom<ChatSession>().nullable(),
  handleCreateSession: z.function().args().returns(z.void()).optional(),
  handleDeleteFile: z.function().args(z.string()).returns(z.void()).optional(),
  handleEditChatTitle: z
    .function()
    .args(ChatSessionSchema)
    .returns(z.void())
    .optional(),
  confirmDeleteSession: z
    .function()
    .args(z.string())
    .returns(z.void())
    .optional(),
  setCurrentChatSession: z
    .function()
    .args(ChatSessionSchema)
    .returns(z.void())
    .optional(),
  handleFileUpload: z
    .function()
    .args(z.custom<React.ChangeEvent<HTMLInputElement>>())
    .returns(z.promise(z.void()))
    .optional(),
  uploadingFiles: z.custom<Set<string>>(),
  checkedFiles: z.custom<Set<string>>(),
  toggleFileChecked: z
    .function()
    .args(z.string(), z.custom<React.MouseEvent>())
    .returns(z.void()),
  isNoteQuestion: z.boolean().optional(),
});

// Type derived from the schema
export type SpaceViewProps = z.infer<typeof SpaceViewPropsSchema>;
