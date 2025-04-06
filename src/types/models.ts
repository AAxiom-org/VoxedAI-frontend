import { z } from "zod";

// Model types
export const MODELS = {
  NORMAL: "meta-llama/llama-4-maverick:free",
  REASONING: "deepseek/deepseek-r1:free",
} as const;

// Model display names
export const MODEL_DISPLAY_NAMES = {
  [MODELS.NORMAL]: "Normal",
  [MODELS.REASONING]: "Reasoning",
} as const;

// Model schema using Zod
export const ModelSchema = z.enum([MODELS.NORMAL, MODELS.REASONING]);

// Type derived from the schema
export type Model = z.infer<typeof ModelSchema>;

// Default model
export const DEFAULT_MODEL = MODELS.NORMAL;
