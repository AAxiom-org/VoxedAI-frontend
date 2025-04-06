import { z } from "zod";

// SpaceFile schema with Zod
export const SpaceFileSchema = z.object({
  id: z.string().uuid(),
  space_id: z.string().uuid(),
  user_id: z.string(),
  file_name: z.string(),
  file_path: z.string(),
  file_type: z.string(),
  file_size: z.number().int().positive(),
  is_note: z.boolean(),
  created_at: z.string().datetime(),
  metadata: z.record(z.any()).optional(),
});

// Type derived from the schema
export type SpaceFile = z.infer<typeof SpaceFileSchema>;

// Space schema with Zod
export const SpaceSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  emoji: z.string().optional(),
});

// Type derived from the schema
export type Space = z.infer<typeof SpaceSchema>;

// Define WorkspaceSchema type to handle circular reference
type WorkspaceSchemaType = z.ZodObject<{
  id: z.ZodString;
  user_id: z.ZodString;
  parent_workspace_id: z.ZodNullable<z.ZodString>;
  title: z.ZodString;
  description: z.ZodOptional<z.ZodString>;
  created_at: z.ZodString;
  updated_at: z.ZodString;
  isExpanded: z.ZodOptional<z.ZodBoolean>;
  children: z.ZodOptional<z.ZodArray<z.ZodLazy<z.ZodTypeAny>>>;
  spaces: z.ZodOptional<z.ZodArray<typeof SpaceSchema>>;
}>;

// Workspace schema with Zod
export const WorkspaceSchema: WorkspaceSchemaType = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  parent_workspace_id: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  // Virtual properties for UI state
  isExpanded: z.boolean().optional(),
  children: z.array(z.lazy(() => WorkspaceSchema)).optional(),
  spaces: z.array(SpaceSchema).optional(),
});

// Type derived from the schema
export type Workspace = z.infer<typeof WorkspaceSchema>;

// WorkspaceSpace schema with Zod
export const WorkspaceSpaceSchema = z.object({
  workspace_id: z.string().uuid(),
  space_id: z.string().uuid(),
  created_at: z.string().datetime(),
});

// Type derived from the schema
export type WorkspaceSpace = z.infer<typeof WorkspaceSpaceSchema>;
