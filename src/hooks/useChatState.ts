import { useUrlState } from "./useUrlState";
import { Model, DEFAULT_MODEL } from "../types/models";

export type ChatStateOptions = {
  currentSessionId?: string | null;
  selectedView?: "initial" | "chat" | "grid";
  selectedModel?: Model;
};

const defaultChatState: ChatStateOptions = {
  currentSessionId: null,
  selectedView: "initial",
  selectedModel: DEFAULT_MODEL,
};

/**
 * A hook for managing chat state in the URL
 * @param initialState - Optional overrides for the default chat state values
 * @returns A tuple containing the current chat state and a setter function
 */
export function useChatState(
  initialState: Partial<ChatStateOptions> = {},
): [ChatStateOptions, (state: Partial<ChatStateOptions>) => void] {
  const mergedDefaults = { ...defaultChatState, ...initialState };

  const [chatState, setChatStateRaw] = useUrlState<ChatStateOptions>({
    key: "chat",
    defaultValue: mergedDefaults,
  });

  // Wrapper to allow partial updates
  const setChatState = (newState: Partial<ChatStateOptions>) => {
    setChatStateRaw({ ...chatState, ...newState });
  };

  return [chatState, setChatState];
}
