import { useUrlState } from "./useUrlState";

export type FilterOptions = {
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  workspaceId?: string | null;
  includeNested?: boolean;
  page?: number;
  view?: "list" | "grid";
  tags?: string[];
  [key: string]: any;
};

const defaultFilters: FilterOptions = {
  search: "",
  sortBy: "created_at",
  sortOrder: "desc",
  workspaceId: null,
  includeNested: false,
  page: 1,
  view: "grid",
  tags: [],
};

/**
 * A specialized hook for managing filter state in the URL
 * @param initialFilters - Optional overrides for the default filter values
 * @param key - Optional key for the URL parameter (defaults to 'filters')
 * @returns A tuple containing the current filters and a setter function
 */
export function useFilterState(
  initialFilters: Partial<FilterOptions> = {},
  key = "filters",
): [FilterOptions, (filters: Partial<FilterOptions>) => void] {
  const mergedDefaults = { ...defaultFilters, ...initialFilters };

  const [filters, setFiltersRaw] = useUrlState<FilterOptions>({
    key,
    defaultValue: mergedDefaults,
  });

  // Wrapper to allow partial updates
  const setFilters = (newFilters: Partial<FilterOptions>) => {
    setFiltersRaw({ ...filters, ...newFilters });
  };

  return [filters, setFilters];
}
