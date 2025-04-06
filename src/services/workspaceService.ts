import { supabase } from "./supabase";
import type { Workspace, Space, WorkspaceSpace } from "./supabase";

/**
 * Create a new workspace for a user
 */
export async function createWorkspace(
  userId: string,
  title: string,
  description?: string,
  parentWorkspaceId?: string,
): Promise<{ success: boolean; data?: Workspace; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("workspaces")
      .insert([
        {
          user_id: userId,
          title,
          description,
          parent_workspace_id: parentWorkspaceId || null,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error creating workspace:", error);
    return { success: false, error };
  }
}

/**
 * Get all root workspaces for a user (workspaces with no parent)
 */
export async function getUserRootWorkspaces(
  userId: string,
): Promise<{ success: boolean; data?: Workspace[]; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", userId)
      .is("parent_workspace_id", null)
      .order("title", { ascending: true });

    if (error) {
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching root workspaces:", error);
    return { success: false, error };
  }
}

/**
 * Get all child workspaces for a parent workspace
 */
export async function getChildWorkspaces(
  parentWorkspaceId: string,
): Promise<{ success: boolean; data?: Workspace[]; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("parent_workspace_id", parentWorkspaceId)
      .order("title", { ascending: true });

    if (error) {
      throw error;
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Error fetching child workspaces:", error);
    return { success: false, error };
  }
}

/**
 * Get all workspaces and their nested children for a user
 * This recursively builds the workspace hierarchy
 */
export async function getUserWorkspacesHierarchy(
  userId: string,
): Promise<{ success: boolean; data?: Workspace[]; error?: any }> {
  try {
    // First get all user's workspaces
    const { data: allWorkspaces, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", userId)
      .order("title", { ascending: true });

    if (error) {
      throw error;
    }

    if (!allWorkspaces || allWorkspaces.length === 0) {
      return { success: true, data: [] };
    }

    // Build the workspace tree
    const workspaceMap = new Map<string, Workspace>();
    const rootWorkspaces: Workspace[] = [];

    // First pass: create a map of all workspaces
    allWorkspaces.forEach((workspace) => {
      workspaceMap.set(workspace.id, {
        ...workspace,
        children: [],
        spaces: [],
      });
    });

    // Second pass: build the hierarchy
    allWorkspaces.forEach((workspace) => {
      const workspaceWithChildren = workspaceMap.get(workspace.id)!;

      if (workspace.parent_workspace_id === null) {
        // This is a root workspace
        rootWorkspaces.push(workspaceWithChildren);
      } else {
        // This is a child workspace
        const parentWorkspace = workspaceMap.get(workspace.parent_workspace_id);
        if (parentWorkspace) {
          if (!parentWorkspace.children) {
            parentWorkspace.children = [];
          }
          parentWorkspace.children.push(workspaceWithChildren);
        }
      }
    });

    return { success: true, data: rootWorkspaces };
  } catch (error) {
    console.error("Error fetching workspace hierarchy:", error);
    return { success: false, error };
  }
}

/**
 * Get spaces in a specific workspace
 */
export async function getSpacesInWorkspace(
  workspaceId: string,
): Promise<{ success: boolean; data?: Space[]; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("workspace_spaces")
      .select("space_id, spaces:space_id(*)")
      .eq("workspace_id", workspaceId);

    if (error) {
      throw error;
    }

    // Extract the space data from the join result
    // The spaces property is actually a single object, not an array
    const spaces = data.map((item) => item.spaces) as unknown as Space[];

    return { success: true, data: spaces };
  } catch (error) {
    console.error("Error fetching spaces in workspace:", error);
    return { success: false, error };
  }
}

/**
 * Add a space to a workspace
 */
export async function addSpaceToWorkspace(
  workspaceId: string,
  spaceId: string,
): Promise<{ success: boolean; data?: WorkspaceSpace; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("workspace_spaces")
      .insert([
        {
          workspace_id: workspaceId,
          space_id: spaceId,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error adding space to workspace:", error);
    return { success: false, error };
  }
}

/**
 * Remove a space from a workspace
 */
export async function removeSpaceFromWorkspace(
  workspaceId: string,
  spaceId: string,
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from("workspace_spaces")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("space_id", spaceId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Error removing space from workspace:", error);
    return { success: false, error };
  }
}

/**
 * Update a workspace's details
 */
export async function updateWorkspace(
  workspaceId: string,
  updates: {
    title?: string;
    description?: string;
    parent_workspace_id?: string | null;
  },
): Promise<{ success: boolean; data?: Workspace; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("workspaces")
      .update(updates)
      .eq("id", workspaceId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error updating workspace:", error);
    return { success: false, error };
  }
}

/**
 * Delete a workspace
 * Note: This will cascade delete all child workspaces and workspace-space relationships
 * due to the foreign key constraints in the database
 */
export async function deleteWorkspace(
  workspaceId: string,
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspaceId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return { success: false, error };
  }
}

/**
 * Get all workspaces a space belongs to
 */
export async function getSpaceWorkspaces(
  spaceId: string,
): Promise<{ success: boolean; data?: Workspace[]; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("workspace_spaces")
      .select("workspace_id, workspaces:workspace_id(*)")
      .eq("space_id", spaceId);

    if (error) {
      throw error;
    }

    // Extract the workspace data from the join result
    // The workspaces property is actually a single object, not an array
    const workspaces = data.map(
      (item) => item.workspaces,
    ) as unknown as Workspace[];

    return { success: true, data: workspaces };
  } catch (error) {
    console.error("Error fetching space workspaces:", error);
    return { success: false, error };
  }
}

/**
 * Get all spaces for a user that are not in any workspace (unorganized)
 */
export async function getUnorganizedSpaces(
  userId: string,
): Promise<{ success: boolean; data?: Space[]; error?: any }> {
  try {
    // Get all spaces for the user
    const { data: allSpaces, error: spacesError } = await supabase
      .from("spaces")
      .select("*")
      .eq("user_id", userId);

    if (spacesError) {
      throw spacesError;
    }

    if (!allSpaces || allSpaces.length === 0) {
      return { success: true, data: [] };
    }

    // Get all spaces that are in workspaces
    const { data: organizedSpaces, error: organizedError } = await supabase
      .from("workspace_spaces")
      .select("space_id")
      .in(
        "space_id",
        allSpaces.map((n) => n.id),
      );

    if (organizedError) {
      throw organizedError;
    }

    // Create a set of organized space IDs for quick lookup
    const organizedIds = new Set(organizedSpaces?.map((n) => n.space_id) || []);

    // Filter for spaces that are not in the organized set
    const unorganizedSpaces = allSpaces.filter(
      (space) => !organizedIds.has(space.id),
    );

    return { success: true, data: unorganizedSpaces };
  } catch (error) {
    console.error("Error fetching unorganized spaces:", error);
    return { success: false, error };
  }
}

/**
 * Get spaces in a specific workspace and all its nested subworkspaces
 */
export async function getSpacesInWorkspaceRecursive(
  workspaceId: string,
): Promise<{ success: boolean; data?: Space[]; error?: any }> {
  try {
    // First, get the workspace hierarchy to find all nested workspace IDs
    const { data: allWorkspaces, error: workspacesError } = await supabase
      .from("workspaces")
      .select("*");

    if (workspacesError) {
      throw workspacesError;
    }

    // Build a map of parent to children
    const workspaceMap = new Map<string, string[]>();
    allWorkspaces?.forEach((workspace) => {
      if (workspace.parent_workspace_id) {
        if (!workspaceMap.has(workspace.parent_workspace_id)) {
          workspaceMap.set(workspace.parent_workspace_id, []);
        }
        workspaceMap.get(workspace.parent_workspace_id)?.push(workspace.id);
      }
    });

    // Recursively collect all subworkspace IDs
    const collectSubworkspaceIds = (parentId: string): string[] => {
      const result: string[] = [parentId];
      const children = workspaceMap.get(parentId) || [];

      children.forEach((childId) => {
        result.push(...collectSubworkspaceIds(childId));
      });

      return result;
    };

    // Get all workspace IDs including the parent and all nested children
    const allWorkspaceIds = collectSubworkspaceIds(workspaceId);

    // Get spaces from all these workspaces
    const { data, error } = await supabase
      .from("workspace_spaces")
      .select("space_id, spaces:space_id(*)")
      .in("workspace_id", allWorkspaceIds);

    if (error) {
      throw error;
    }

    // Extract the space data from the join result and remove duplicates
    const spaceMap = new Map<string, Space>();
    data.forEach((item) => {
      // The spaces property is actually a single object, not an array
      const space = item.spaces as unknown as Space;
      if (space && !spaceMap.has(space.id)) {
        spaceMap.set(space.id, space);
      }
    });

    return { success: true, data: Array.from(spaceMap.values()) };
  } catch (error) {
    console.error("Error fetching spaces in workspace recursively:", error);
    return { success: false, error };
  }
}

/**
 * Check if a workspace is a parent workspace
 */
export async function isParentWorkspace(workspaceId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("workspaces")
      .select("has_children")
      .eq("id", workspaceId)
      .single();
    return !!data?.has_children;
  } catch {
    return false;
  }
}
