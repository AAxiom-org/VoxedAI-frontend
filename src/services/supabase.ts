import { createClient } from "@supabase/supabase-js";
import type { Workspace, Space, WorkspaceSpace } from "../types/space";
import type { ChatSession } from "../types/chat";

// Export the types so they can be imported from this file
export type { Workspace, Space, WorkspaceSpace, ChatSession };

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Store the authenticated client in memory
let authenticatedClient: any = null;
let lastToken: string | null = null;

/**
 * Creates a Supabase client with the Clerk JWT token
 * This is necessary for Row Level Security policies to work correctly
 * Uses memoization to avoid creating multiple clients with the same token
 */
export async function createSupabaseClientWithToken(token: string) {
  if (!token) return supabase;

  // If we already have a client with this token, return it
  if (authenticatedClient && token === lastToken) {
    return authenticatedClient;
  }

  console.log("Creating Supabase client with token");

  // Create a new client with the token
  authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false, // We handle token refresh ourselves
      persistSession: false, // We don't need to persist the session
    },
  });

  // Store the token for future reference
  lastToken = token;

  return authenticatedClient;
}

/**
 * Checks if a Supabase client is valid by testing a simple query
 * Returns true if the client is valid, false otherwise
 */
export async function isClientValid(client: any): Promise<boolean> {
  if (!client) return false;
  
  try {
    // Make a simple query to test the client
    const { error } = await client.from("users").select("id").limit(1);
    
    // If there's an auth error, the client is invalid
    if (error && (error.code === "401" || error.code === "403" || error.message?.includes("JWT"))) {
      console.log("Token validation check failed:", error.message);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Error validating client:", err);
    return false;
  }
}

// Function to sync Clerk user with Supabase
export async function syncUserWithSupabase(userId: string, email: string) {
  // Check if user exists in our users table
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .single();

  // If user doesn't exist, create them
  if (!existingUser) {
    await supabase.from("users").insert([
      {
        id: userId,
        email,
        created_at: new Date().toISOString(),
      },
    ]);
  }

  return userId;
}
