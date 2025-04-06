import { useUrlState } from "./useUrlState";

// Default layout state shape
interface LayoutState {
  sidebarOpen: boolean;
  filesExpanded: boolean;
  notesExpanded: boolean;
  selectedView: "chat" | "notes" | "code" | "brain";
  selectedNoteId: string | null;
  selectedNodeId?: string | null;
  rightPanelCollapsed?: boolean;
  brainView?: "main" | "graph" | "detailed";
  panelSizes?: {
    sidebar?: number;
    main?: number;
  };
}

// Default state values
const DEFAULT_LAYOUT: LayoutState = {
  sidebarOpen: true,
  filesExpanded: false,
  notesExpanded: true,
  selectedView: "brain",
  selectedNoteId: null,
  selectedNodeId: null,
  rightPanelCollapsed: false,
  brainView: "main",
  panelSizes: {
    sidebar: 250,
    main: 700,
  },
};

/**
 * Custom hook to manage and persist layout state in the URL
 *
 * @param initialState - Optional override of default layout values
 * @returns [layout, setLayout] - Current layout state and setter function
 */
export function useLayoutState(initialState: Partial<LayoutState> = {}) {
  // Merge defaults with provided initial values
  const defaultValues = { ...DEFAULT_LAYOUT, ...initialState };

  // Use url state for persistence
  const [layout, setLayoutRaw] = useUrlState<LayoutState>({
    key: "layout",
    defaultValue: defaultValues,
  });

  // Wrapper function to handle partial updates
  const setLayout = (updates: Partial<LayoutState>) => {
    console.log("Updating layout state:", updates);

    // Combine current state with updates in a single call
    setLayoutRaw({
      ...layout,
      ...updates,
    });
  };

  return [layout, setLayout] as const;
}
