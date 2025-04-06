# URL State Management Hooks

This directory contains custom hooks for managing complex UI state in the URL search parameters. These hooks utilize React Router's `useSearchParams` and TanStack Query for state management.

## Available Hooks

### `useUrlState`

The base hook for all URL state management. Persists any state in the URL search parameters.

```tsx
const [value, setValue] = useUrlState<ValueType>({
  key: "urlKey",
  defaultValue: initialValue,
  serializer: (value) => JSON.stringify(value), // optional
  deserializer: (value) => JSON.parse(value), // optional
});
```

### `useFilterState`

A specialized hook for managing filter/search state in the URL.

```tsx
const [filters, setFilters] = useFilterState({
  search: "",
  sortBy: "created_at",
  workspaceId: null,
  // other initial values...
});

// Access values
const { search, sortBy, workspaceId } = filters;

// Update values (partial updates supported)
setFilters({ search: "new search", sortBy: "name" });
```

### `useLayoutState`

A hook for managing UI layout preferences in the URL.

```tsx
const [layout, setLayout] = useLayoutState({
  sidebarOpen: true,
  selectedView: "chat",
  // other initial values...
});

// Access values
const { sidebarOpen, selectedView } = layout;

// Update values (partial updates supported)
setLayout({ sidebarOpen: false });
```

### `useTabState`

A hook for managing tab selection in the URL.

```tsx
const [selectedTab, setSelectedTab] = useTabState("tabKey", "defaultTab");
```

### `useMultiTabState`

A hook for managing multiple tab selections in the URL.

```tsx
const tabs = useMultiTabState({
  primaryTab: "info",
  secondaryTab: "details",
});

// Access values
const [primaryTab, setPrimaryTab] = tabs.primaryTab;
const [secondaryTab, setSecondaryTab] = tabs.secondaryTab;
```

## Benefits

- **Shareable URLs**: Users can share URLs that preserve the exact state of the UI
- **Browser Navigation**: Browser back/forward buttons work with state changes
- **Persistence**: State is preserved on page refresh
- **Bookmarking**: Users can bookmark specific states of the application
