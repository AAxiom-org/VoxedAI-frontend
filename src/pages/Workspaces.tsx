import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Workspace as BaseWorkspace } from "../types/space";
import { useSupabaseUser } from "../contexts/UserContext";
import {
  getUserWorkspacesHierarchy,
  getUnorganizedSpaces,
  createWorkspace,
  deleteWorkspace,
  isParentWorkspace,
  getSpacesInWorkspace,
} from "../services/workspaceService";
import { createSpaceWithWorkspace } from "../services/spaceService";
import { useFilterState } from "../hooks";
import EmojiPickerModal from "../components/common/EmojiPicker";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

// Extend the Workspace type to include has_children
interface Workspace extends BaseWorkspace {
  has_children?: boolean;
}

interface SpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SpaceFormData) => Promise<void>;
  workspaces: Workspace[];
  initialData?: SpaceFormData;
  isEditing: boolean;
  selectedWorkspaceId: string | null;
}

interface SpaceFormData {
  title: string;
  description: string;
  workspaceId: string;
  emoji: string;
}

interface WorkspaceToDelete {
  id: string;
  isParent: boolean;
}

// Define interfaces for the SpaceGalleryUI component
interface SpaceItem {
  id: string;
  title: string;
  description?: string;
  emoji: string;
  created_at: string;
  workspaceId?: string;
}

// SpaceModal component
const SpaceModal = ({
  isOpen,
  onClose,
  onSubmit,
  workspaces,
  initialData,
  isEditing,
  selectedWorkspaceId,
}: SpaceModalProps) => {
  const MAX_TITLE_LENGTH = 30;
  const MAX_DESCRIPTION_LENGTH = 300;
  const { supabaseUserId } = useSupabaseUser();

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [workspaceId, setWorkspaceId] = useState(
    initialData?.workspaceId || selectedWorkspaceId || "unorganized",
  );
  const [emoji, setEmoji] = useState(initialData?.emoji || "📝");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New workspace creation state
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWorkspaceTitle, setNewWorkspaceTitle] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");
  const [newWorkspaceParent, setNewWorkspaceParent] = useState<string | null>(
    null,
  );
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Space title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        workspaceId: workspaceId === "create_new" ? "unorganized" : workspaceId,
        emoji,
      });

      // Reset form
      if (!isEditing) {
        setTitle("");
        setDescription("");
        setWorkspaceId("unorganized");
        setEmoji("📝");
      }
      setError(null);
    } catch (err) {
      console.error("Error submitting space:", err);
      setError("An error occurred while saving the space");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recursive function to build workspace options
  const renderWorkspaceOptions = (
    workspaces: Workspace[],
    depth = 0,
  ): JSX.Element[] => {
    const options: JSX.Element[] = [];

    workspaces.forEach((workspace) => {
      // Add the current workspace with proper indentation
      options.push(
        <option key={workspace.id} value={workspace.id}>
          {"\u00A0".repeat(depth * 4)}
          {depth > 0 ? "↳ " : ""}
          {workspace.title}
        </option>,
      );

      // Add children if any
      if (workspace.children && workspace.children.length > 0) {
        options.push(...renderWorkspaceOptions(workspace.children, depth + 1));
      }
    });

    return options;
  };

  const handleWorkspaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setWorkspaceId(value);

    if (value === "create_new") {
      setShowWorkspaceModal(true);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newWorkspaceTitle.trim()) {
      setWorkspaceError("Workspace title is required");
      return;
    }

    if (!supabaseUserId) {
      setWorkspaceError("User authentication error");
      return;
    }

    setIsCreatingWorkspace(true);
    try {
      const result = await createWorkspace(
        supabaseUserId,
        newWorkspaceTitle.trim(),
        newWorkspaceDescription.trim() || undefined,
        newWorkspaceParent || undefined,
      );

      if (result.success && result.data) {
        // Close the modal and select the new workspace
        setWorkspaceId(result.data.id);
        setShowWorkspaceModal(false);
        setNewWorkspaceTitle("");
        setNewWorkspaceDescription("");
        setNewWorkspaceParent(null);
        setWorkspaceError(null);
      } else {
        setWorkspaceError("Failed to create workspace");
      }
    } catch (err) {
      console.error("Error creating workspace:", err);
      setWorkspaceError("An error occurred while creating the workspace");
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const closeWorkspaceModal = () => {
    setShowWorkspaceModal(false);
    setWorkspaceId(workspaceId === "create_new" ? "unorganized" : workspaceId);
    setNewWorkspaceTitle("");
    setNewWorkspaceDescription("");
    setNewWorkspaceParent(null);
    setWorkspaceError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bg-overlay inset-0 flex items-center justify-center z-50 p-4 bg-white">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-adaptive mb-6">
            {isEditing ? "Edit Space" : "Create New Space"}
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6 flex items-start gap-4">
              <EmojiPickerModal
                onEmojiSelect={setEmoji}
                selectedEmoji={emoji}
              />

              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="title" className="text-muted">
                      Space name
                    </label>
                    <span className="text-sm text-muted">
                      {title.length}/{MAX_TITLE_LENGTH}
                    </span>
                  </div>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) =>
                      setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))
                    }
                    className="w-full px-4 py-3 border border-adaptive rounded-lg bg-input text-adaptive focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter space name"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="description" className="text-muted">
                      Space description
                    </label>
                    <span className="text-sm text-muted">
                      {description.length}/{MAX_DESCRIPTION_LENGTH}
                    </span>
                  </div>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) =>
                      setDescription(
                        e.target.value.slice(0, MAX_DESCRIPTION_LENGTH),
                      )
                    }
                    className="w-full px-4 py-3 border border-adaptive rounded-lg bg-input text-adaptive focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                    placeholder="Enter space description"
                  />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="workspace" className="block text-muted mb-2">
                Workspace
              </label>
              <select
                id="workspace"
                value={workspaceId}
                onChange={handleWorkspaceChange}
                className="w-full px-4 py-3 border border-adaptive rounded-lg bg-input text-adaptive focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="unorganized">Unorganized</option>
                {renderWorkspaceOptions(workspaces)}
                <option
                  value="create_new"
                  className="font-medium text-blue-600 dark:text-blue-400"
                >
                  + Create New Workspace
                </option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-muted hover:text-adaptive transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                disabled={!title.trim() || isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                    ? "Save Changes"
                    : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* New Workspace Modal */}
      {showWorkspaceModal && (
        <div className="fixed bg-overlay inset-0 flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-adaptive mb-6">
                Create New Workspace
              </h2>

              {workspaceError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {workspaceError}
                </div>
              )}

              <form onSubmit={handleCreateWorkspace}>
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="workspaceTitle" className="text-muted">
                      Workspace name
                    </label>
                    <span className="text-sm text-muted">
                      {newWorkspaceTitle.length}/{MAX_TITLE_LENGTH}
                    </span>
                  </div>
                  <input
                    type="text"
                    id="workspaceTitle"
                    value={newWorkspaceTitle}
                    onChange={(e) =>
                      setNewWorkspaceTitle(
                        e.target.value.slice(0, MAX_TITLE_LENGTH),
                      )
                    }
                    className="w-full px-4 py-3 border border-adaptive rounded-lg bg-input text-adaptive focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter workspace name"
                    required
                    autoFocus
                  />
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <label
                      htmlFor="workspaceDescription"
                      className="text-muted"
                    >
                      Workspace description
                    </label>
                    <span className="text-sm text-muted">
                      {newWorkspaceDescription.length}/{MAX_DESCRIPTION_LENGTH}
                    </span>
                  </div>
                  <textarea
                    id="workspaceDescription"
                    value={newWorkspaceDescription}
                    onChange={(e) =>
                      setNewWorkspaceDescription(
                        e.target.value.slice(0, MAX_DESCRIPTION_LENGTH),
                      )
                    }
                    className="w-full px-4 py-3 border border-adaptive rounded-lg bg-input text-adaptive focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                    placeholder="Enter workspace description"
                  />
                </div>

                <div className="mb-6">
                  <label
                    htmlFor="parentWorkspace"
                    className="block text-muted mb-2"
                  >
                    Parent Workspace (Optional)
                  </label>
                  <select
                    id="parentWorkspace"
                    value={newWorkspaceParent || ""}
                    onChange={(e) =>
                      setNewWorkspaceParent(e.target.value || null)
                    }
                    className="w-full px-4 py-3 border border-adaptive rounded-lg bg-input text-adaptive focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">None (Root Workspace)</option>
                    {renderWorkspaceOptions(workspaces)}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 mt-8">
                  <button
                    type="button"
                    onClick={closeWorkspaceModal}
                    className="px-6 py-3 text-muted hover:text-adaptive transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    disabled={!newWorkspaceTitle.trim() || isCreatingWorkspace}
                  >
                    {isCreatingWorkspace ? "Creating..." : "Create Workspace"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Space Gallery component
const SpaceGalleryUI: React.FC = () => {
  // Use the useFilterState hook to manage filter state in the URL
  const [filters, setFilters] = useFilterState({
    workspaceId: null,
    includeNested: false,
  });

  // Destructure filter state for easy access
  const {
    workspaceId: selectedWorkspaceId,
    includeNested: includeNestedSpaces,
  } = filters;

  // Local state not needed in URL
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSpace, setEditingSpace] = useState<SpaceItem | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);
  const [workspaceToDelete, setWorkspaceToDelete] =
    useState<WorkspaceToDelete | null>(null);
  const { supabaseUserId } = useSupabaseUser();
  const navigate = useNavigate();

  // Update state setters to work with the filter state
  const setSelectedWorkspaceId = (id: string | null) =>
    setFilters({ workspaceId: id });
  const setIncludeNestedSpaces = (include: boolean) =>
    setFilters({ includeNested: include });

  // Load workspaces and spaces when component mounts
  useEffect(() => {
    if (supabaseUserId) {
      loadWorkspacesAndSpaces();
    }
  }, [supabaseUserId]);

  // Load workspaces and spaces when selected workspace changes or includeNestedSpaces changes
  useEffect(() => {
    if (supabaseUserId) {
      loadWorkspacesAndSpaces();
    }
  }, [selectedWorkspaceId, includeNestedSpaces, supabaseUserId]);

  const loadWorkspacesAndSpaces = async () => {
    if (!supabaseUserId) return;

    setIsLoading(true);
    try {
      // Load workspace hierarchy
      const workspacesResult = await getUserWorkspacesHierarchy(supabaseUserId);
      if (workspacesResult.success && workspacesResult.data) {
        setWorkspaces(workspacesResult.data);
      }

      // Load spaces based on selected workspace
      if (selectedWorkspaceId === "unorganized") {
        // Get unorganized spaces
        const unorganizedResult = await getUnorganizedSpaces(supabaseUserId);
        if (unorganizedResult.success && unorganizedResult.data) {
          setSpaces(
            unorganizedResult.data.map((space) => ({
              id: space.id,
              title: space.title,
              description: space.description,
              emoji: space.emoji || "📝",
              created_at: space.created_at,
              workspaceId: "unorganized",
            })),
          );
        }
      } else if (selectedWorkspaceId) {
        if (includeNestedSpaces) {
          // Get spaces for the selected workspace and all its nested workspaces
          const allSpaces: SpaceItem[] = [];

          // Function to recursively get all child workspaces
          const getAllChildWorkspaces = (workspaceId: string): Workspace[] => {
            const result: Workspace[] = [];

            // Find the workspace in the hierarchy
            const findWorkspace = (
              workspaces: Workspace[],
            ): Workspace | null => {
              for (const workspace of workspaces) {
                if (workspace.id === workspaceId) {
                  return workspace;
                }
                if (workspace.children && workspace.children.length > 0) {
                  const childResult = findWorkspace(workspace.children);
                  if (childResult) return childResult;
                }
              }
              return null;
            };

            const workspace = findWorkspace(workspaces);
            if (
              workspace &&
              workspace.children &&
              workspace.children.length > 0
            ) {
              // Add all children recursively
              const addChildren = (children: Workspace[]) => {
                for (const child of children) {
                  result.push(child);
                  if (child.children && child.children.length > 0) {
                    addChildren(child.children);
                  }
                }
              };

              addChildren(workspace.children);
            }

            return result;
          };

          // Get spaces for the selected workspace
          const spacesInWorkspace =
            await getSpacesInWorkspace(selectedWorkspaceId);
          if (spacesInWorkspace.success && spacesInWorkspace.data) {
            allSpaces.push(
              ...spacesInWorkspace.data.map((space) => ({
                id: space.id,
                title: space.title,
                description: space.description,
                emoji: space.emoji || "📝",
                created_at: space.created_at,
                workspaceId: selectedWorkspaceId,
              })),
            );
          }

          // Get all child workspaces
          const childWorkspaces = getAllChildWorkspaces(selectedWorkspaceId);

          // Get spaces for each child workspace
          for (const childWorkspace of childWorkspaces) {
            const childSpaces = await getSpacesInWorkspace(childWorkspace.id);
            if (childSpaces.success && childSpaces.data) {
              allSpaces.push(
                ...childSpaces.data.map((space) => ({
                  id: space.id,
                  title: space.title,
                  description: space.description,
                  emoji: space.emoji || "📝",
                  created_at: space.created_at,
                  workspaceId: childWorkspace.id,
                })),
              );
            }
          }

          setSpaces(allSpaces);
        } else {
          // Get spaces only for the selected workspace
          const spacesInWorkspace =
            await getSpacesInWorkspace(selectedWorkspaceId);
          if (spacesInWorkspace.success && spacesInWorkspace.data) {
            setSpaces(
              spacesInWorkspace.data.map((space) => ({
                id: space.id,
                title: space.title,
                description: space.description,
                emoji: space.emoji || "📝",
                created_at: space.created_at,
                workspaceId: selectedWorkspaceId,
              })),
            );
          }
        }
      } else {
        // Get all spaces for the user (when "All" is selected)
        // This would require a new function to get all spaces for a user
        // For now, we'll combine unorganized spaces with spaces from all workspaces
        const allSpaces: SpaceItem[] = [];

        // Get unorganized spaces
        const unorganizedResult = await getUnorganizedSpaces(supabaseUserId);
        if (unorganizedResult.success && unorganizedResult.data) {
          allSpaces.push(
            ...unorganizedResult.data.map((space) => ({
              id: space.id,
              title: space.title,
              description: space.description,
              emoji: space.emoji || "📝",
              created_at: space.created_at,
              workspaceId: "unorganized",
            })),
          );
        }

        // Get spaces from all workspaces
        // We need to recursively go through all workspaces and their children
        const getAllSpacesFromWorkspaces = async (workspaces: Workspace[]) => {
          for (const workspace of workspaces) {
            // Get spaces for this workspace
            const spacesResult = await getSpacesInWorkspace(workspace.id);
            if (spacesResult.success && spacesResult.data) {
              allSpaces.push(
                ...spacesResult.data.map((space) => ({
                  id: space.id,
                  title: space.title,
                  description: space.description,
                  emoji: space.emoji || "📝",
                  created_at: space.created_at,
                  workspaceId: workspace.id,
                })),
              );
            }

            // Recursively get spaces from children
            if (workspace.children && workspace.children.length > 0) {
              await getAllSpacesFromWorkspaces(workspace.children);
            }
          }
        };

        // Start the recursive process with top-level workspaces
        if (workspacesResult.success && workspacesResult.data) {
          await getAllSpacesFromWorkspaces(workspacesResult.data);
        }

        setSpaces(allSpaces);
      }
    } catch (err) {
      console.error("Error loading workspaces and spaces:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle workspace deletion
  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!supabaseUserId) return;

    try {
      // Check if this is a parent workspace
      const isParent = await isParentWorkspace(workspaceId);

      // Set the workspace to delete with its parent status
      setWorkspaceToDelete({ id: workspaceId, isParent });
    } catch (err) {
      console.error("Error checking workspace:", err);
    }
  };

  // Confirm workspace deletion
  const confirmDeleteWorkspace = async () => {
    if (!workspaceToDelete || !supabaseUserId) return;

    try {
      const result = await deleteWorkspace(workspaceToDelete.id);

      if (result.success) {
        // If the deleted workspace was selected, reset selection
        if (selectedWorkspaceId === workspaceToDelete.id) {
          setSelectedWorkspaceId(null);
        }

        // Refresh workspace list
        loadWorkspacesAndSpaces();

        // Reset state
        setWorkspaceToDelete(null);
      } else {
        console.error("Failed to delete workspace:", result.error);
      }
    } catch (err) {
      console.error("Error deleting workspace:", err);
    }
  };

  // Cancel workspace deletion
  const cancelDeleteWorkspace = () => {
    setWorkspaceToDelete(null);
  };

  const isMobile = false;

  const handleSelectWorkspace = (workspaceId: string | null) => {
    setSelectedWorkspaceId(workspaceId);
    setOpenDropdowns({});
  };

  const toggleDropdown = (workspaceId: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [workspaceId]: !prev[workspaceId],
    }));
  };

  // Check if the selected workspace has children
  const selectedWorkspaceHasChildren = (): boolean => {
    if (!selectedWorkspaceId || selectedWorkspaceId === "unorganized")
      return false;

    // Find the selected workspace in the hierarchy
    const findWorkspace = (workspaces: Workspace[]): Workspace | null => {
      for (const workspace of workspaces) {
        if (workspace.id === selectedWorkspaceId) {
          return workspace;
        }
        if (workspace.children && workspace.children.length > 0) {
          const childResult = findWorkspace(workspace.children);
          if (childResult) return childResult;
        }
      }
      return null;
    };

    const workspace = findWorkspace(workspaces);
    if (!workspace) return false;

    // Check if the workspace has children
    if (workspace.children && workspace.children.length > 0) {
      return true;
    }

    // Check the has_children flag if available
    return !!workspace.has_children;
  };

  // Only show nested toggle for workspaces that have children
  const showNestedToggle =
    selectedWorkspaceId !== null &&
    selectedWorkspaceId !== "unorganized" &&
    selectedWorkspaceHasChildren();

  const openCreateModal = () => {
    setIsEditing(false);
    setEditingSpace(null);
    setShowModal(true);
  };

  const openEditModal = (space: SpaceItem) => {
    setIsEditing(true);
    setEditingSpace(space);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setEditingSpace(null);
  };

  const handleSubmit = async (spaceData: SpaceFormData) => {
    if (!supabaseUserId) return;

    try {
      // Use the workspace-aware space creation with the selected workspace
      const workspaceId =
        spaceData.workspaceId !== "unorganized"
          ? spaceData.workspaceId
          : undefined;

      const result = await createSpaceWithWorkspace(
        supabaseUserId,
        spaceData.title,
        spaceData.description || undefined,
        workspaceId,
      );

      if (result.success && result.data) {
        // Refresh the spaces list
        loadWorkspacesAndSpaces();

        // Close the modal
        closeModal();

        // Navigate to the new space
        navigate(`/spaces/${result.data.id}`);
      } else {
        console.error("Failed to create space:", result.error);
      }
    } catch (err) {
      console.error("Error creating space:", err);
    }
  };

  // Get workspace name for a space
  const getWorkspaceName = (workspaceId: string | undefined): string => {
    if (!workspaceId || workspaceId === "unorganized") return "Unorganized";

    // Find the workspace name recursively
    const findWorkspaceName = (workspaces: Workspace[]): string | null => {
      for (const workspace of workspaces) {
        if (workspace.id === workspaceId) {
          return workspace.title;
        }
        if (workspace.children && workspace.children.length > 0) {
          const childResult = findWorkspaceName(workspace.children);
          if (childResult) return childResult;
        }
      }
      return null;
    };

    return findWorkspaceName(workspaces) || "Unknown Workspace";
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold mb-4 text-adaptive">Space Gallery</h1>
        <p className="text-xl opacity-70 text-adaptive">
          Create and organize your spaces.
        </p>
      </div>

      {/* Workspace selector - horizontal row */}
      <div className="mb-8 flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
          {/* All and Unorganized options */}
          <button
            onClick={() => handleSelectWorkspace(null)}
            className={`px-4 py-2 text-adaptive hover:opacity-80 transition-opacity ${selectedWorkspaceId === null ? "font-medium underline" : ""}`}
          >
            All
          </button>
          <button
            onClick={() => handleSelectWorkspace("unorganized")}
            className={`px-4 py-2 text-adaptive hover:opacity-80 transition-opacity ${selectedWorkspaceId === "unorganized" ? "font-medium underline" : ""}`}
          >
            Unorganized
          </button>

          {/* Top level workspaces */}
          {workspaces.map((workspace) => {
            const hasChildren =
              workspace.children && workspace.children.length > 0;
            const isSelected = selectedWorkspaceId === workspace.id;
            const isOpen = openDropdowns[workspace.id] || false;

            return (
              <div key={workspace.id} className="relative">
                <div className="flex items-center group">
                  <button
                    onClick={() => handleSelectWorkspace(workspace.id)}
                    className={`px-4 py-2 text-adaptive hover:opacity-80 transition-opacity ${isSelected ? "font-medium underline" : ""}`}
                  >
                    {workspace.title}
                  </button>

                  {hasChildren && (
                    <button
                      onClick={() => toggleDropdown(workspace.id)}
                      className="ml-1 p-1"
                      aria-label={`Toggle ${workspace.title} sub-workspaces`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 transition-transform text-adaptive ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  )}

                  {/* Delete workspace button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWorkspace(workspace.id);
                    }}
                    className="ml-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Delete ${workspace.title} workspace`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-red-500 hover:text-red-700"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                {/* Dropdown for children */}
                {hasChildren && isOpen && (
                  <div className="absolute z-10 mt-1 w-48 rounded-md shadow-lg bg-card ring-1 ring-black ring-opacity-5 py-1">
                    {workspace.children?.map((child) => {
                      const childHasChildren =
                        child.children && child.children.length > 0;
                      const childIsSelected = selectedWorkspaceId === child.id;
                      const childIsOpen = openDropdowns[child.id] || false;

                      return (
                        <div key={child.id} className="relative">
                          <div className="flex items-center w-full group">
                            <button
                              onClick={() => handleSelectWorkspace(child.id)}
                              className={`flex-grow text-left px-4 py-2 text-sm ${childIsSelected ? "font-medium underline" : ""} text-adaptive hover:bg-hover`}
                            >
                              {child.title}
                            </button>

                            {childHasChildren && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDropdown(child.id);
                                }}
                                className="px-2"
                                aria-label={`Toggle ${child.title} sub-workspaces`}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className={`h-3 w-3 transition-transform text-adaptive ${childIsOpen ? "rotate-180" : ""}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                            )}

                            {/* Delete workspace button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWorkspace(child.id);
                              }}
                              className="px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label={`Delete ${child.title} workspace`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3 text-red-500 hover:text-red-700"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>

                          {/* Nested dropdown for grandchildren */}
                          {childHasChildren && childIsOpen && (
                            <div className="pl-4">
                              {child.children?.map((grandchild: Workspace) => (
                                <button
                                  key={grandchild.id}
                                  onClick={() =>
                                    handleSelectWorkspace(grandchild.id)
                                  }
                                  className={`block w-full text-left px-4 py-2 text-sm ${selectedWorkspaceId === grandchild.id ? "font-medium underline" : ""} text-adaptive hover:bg-hover`}
                                >
                                  {grandchild.title}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Toggle for including nested spaces - only show in workspace view */}
      {showNestedToggle && (
        <div className="flex justify-center mb-8">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={includeNestedSpaces}
              onChange={() => setIncludeNestedSpaces(!includeNestedSpaces)}
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-black dark:peer-checked:bg-white"></div>
            <span className="ms-3 text-sm font-medium text-adaptive">
              Include nested spaces
            </span>
          </label>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center space-y-2 justify-center py-12">
          <DotLottieReact
            className="w-10 md:w-10 lg:w-20"
            src="https://lottie.host/0cdcd6d7-9466-4a00-bfdb-55d6aa7ec2d9/zpxi4nliNO.lottie"
            loop
            autoplay
          />
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Loading Spaces...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Space creation card */}
          {spaces.length !== 0 && (
            <div
              onClick={openCreateModal}
              className="rounded-md card p-6 cursor-pointer hover:shadow-md transition-shadow duration-200 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 min-h-[200px]"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 mb-4">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">New Space</h3>
              <p className="text-sm opacity-70 text-center">
                Create a new space to organize your work
              </p>
            </div>
          )}

          {/* Space cards */}
          {spaces.map((space) => (
            <div
              key={space.id}
              className="rounded-md card p-6 cursor-pointer hover:shadow-md transition-shadow duration-200 relative group"
              onClick={() => {
                navigate(`/spaces/${space.id}`);
              }}
            >
              <div className="block">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 mr-3">
                    <span className="text-xl">{space.emoji || "📝"}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-adaptive">
                      {space.title}
                    </h3>
                    <div className="text-xs text-muted">
                      Created {new Date(space.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                {space.description && (
                  <p className="text-sm opacity-70 text-adaptive">
                    {space.description}
                  </p>
                )}

                {/* Display workspace name at the bottom of the card */}
                <div className="mt-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="text-xs text-muted flex items-center">
                    <svg
                      className="w-3 h-3 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                    Workspace path: {getWorkspaceName(space.workspaceId)}
                  </div>
                </div>
              </div>

              {/* Edit button - appears on hover (desktop), always on mobile */}
              {isMobile ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openEditModal(space);
                  }}
                  className="absolute top-3 right-3 p-2 bg-hover dark:bg-gray-700 rounded-full group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Edit space"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-600 dark:text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openEditModal(space);
                  }}
                  className="absolute top-3 right-3 p-2 bg-hover dark:bg-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  aria-label="Edit space"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-600 dark:text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && spaces.length === 0 && (
        <div className="text-center py-12">
          <div
            className="rounded-md card p-6 cursor-pointer hover:shadow-md transition-shadow duration-200 max-w-sm mx-auto flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
            onClick={openCreateModal}
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 mb-4">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">
              Create Your First Space
            </h3>
            <p className="text-sm opacity-70 text-center">
              Get started by creating a new space
            </p>
          </div>
        </div>
      )}

      {/* Space Modal - for both creating and editing */}
      <SpaceModal
        isOpen={showModal}
        onClose={closeModal}
        onSubmit={handleSubmit}
        workspaces={workspaces}
        initialData={
          editingSpace
            ? {
                title: editingSpace.title,
                description: editingSpace.description || "",
                workspaceId: editingSpace.workspaceId || "unorganized",
                emoji: editingSpace.emoji || "📝",
              }
            : undefined
        }
        isEditing={isEditing}
        selectedWorkspaceId={selectedWorkspaceId || null}
      />

      {/* Delete workspace confirmation modal */}
      {workspaceToDelete && (
        <div className="fixed bg-overlay inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <h3 className="text-2xl font-bold text-adaptive mb-6">
                Confirm Deletion
              </h3>
              <p className="text-muted mb-6">
                {workspaceToDelete.isParent
                  ? "This workspace contains subworkspaces and/or spaces. Deleting it will also delete all its contents. Are you sure you want to continue?"
                  : "Are you sure you want to delete this workspace?"}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDeleteWorkspace}
                  className="px-6 py-3 text-muted hover:text-adaptive transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteWorkspace}
                  className="px-6 py-3 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceGalleryUI;
