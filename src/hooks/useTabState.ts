import { useUrlState } from "./useUrlState";

/**
 * A hook for managing tab selection state in the URL
 * @param tabKey - Unique identifier for this set of tabs in the URL
 * @param defaultTab - The default tab to select if none is in the URL
 * @returns A tuple containing the currently selected tab and a setter function
 */
export function useTabState<T extends string>(
  tabKey: string,
  defaultTab: T,
): [T, (tab: T) => void] {
  const [selectedTab, setSelectedTab] = useUrlState<T>({
    key: tabKey,
    defaultValue: defaultTab,
  });

  return [selectedTab, setSelectedTab];
}

/**
 * A hook for managing multiple tab selection states in the URL
 * @param tabs - An object mapping tab keys to their default values
 * @returns An object with getters and setters for each tab
 */
export function useMultiTabState<T extends Record<string, string>>(
  tabs: T,
): { [K in keyof T]: [T[K], (tab: T[K]) => void] } {
  const result = {} as { [K in keyof T]: [T[K], (tab: T[K]) => void] };

  for (const [key, defaultValue] of Object.entries(tabs)) {
    // @ts-ignore - Dynamic creation of hooks
    result[key] = useTabState(key, defaultValue);
  }

  return result;
}
