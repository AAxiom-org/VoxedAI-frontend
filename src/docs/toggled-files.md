# Toggled Files Implementation

## Overview

The toggled files feature allows users to select which files should be included in the model context when responding to queries. This document explains the simplified implementation that maintains a direct 1:1 relationship between the local state and the data stored in Supabase.

## Key Components

### 1. Data Storage

- Toggled files are stored in the `users` table in Supabase under the `toggled_files` column
- The data is stored as an array of file IDs (UUIDs)

### 2. Custom Hook: `useToggledFiles`

The `useToggledFiles` hook provides a simple interface for managing toggled files:

```typescript
const {
  toggledFiles, // Set<string> - The current toggled files
  isLoading, // boolean - Whether the files are being loaded
  error, // Error | null - Any error that occurred
  toggleFile, // (fileId: string) => void - Toggle a file on/off
  setFiles, // (fileIds: string[]) => void - Set multiple files at once
  validateFiles, // (availableFileIds: string[]) => void - Validate files against available files
  isFileToggled, // (fileId: string) => boolean - Check if a file is toggled
} = useToggledFiles(userId);
```

### 3. Cache System

To minimize API calls, a simple cache system is implemented:

- The cache is stored in memory in the `userService.ts` file
- The cache is updated whenever files are loaded from or saved to the server
- The cache is used to provide quick access to toggled files without making API calls

### 4. Usage in Components

The Sidebar component uses the `useToggledFiles` hook to manage toggled files:

```typescript
// In Sidebar.tsx
const {
  toggledFiles,
  toggleFile,
  validateFiles
} = useToggledFiles(userId);

// Validate files when the files list changes
useEffect(() => {
  if (files.length > 0) {
    validateFiles(files.map(file => file.id));
  }
}, [files, validateFiles]);

// Pass to SpaceView
<SpaceView
  // ...other props
  checkedFiles={toggledFiles}
  toggleFileChecked={(fileId, e) => {
    e.stopPropagation();
    toggleFile(fileId);
  }}
/>
```

## Benefits of the New Implementation

1. **Single Source of Truth**: The Supabase database is the single source of truth for toggled files
2. **Simplified State Management**: No global variables or complex state management
3. **Consistent Data**: The local state is always in sync with the server data
4. **Reusable**: The custom hook can be used in any component that needs access to toggled files
5. **Efficient**: The cache system minimizes API calls while maintaining data consistency

## API Reference

### `getToggledFiles(userId: string, token?: string): Promise<string[]>`

Fetches toggled files from Supabase.

### `saveToggledFiles(userId: string, toggledFiles: string[], token?: string): Promise<boolean>`

Saves toggled files to Supabase.

### `updateToggledFilesCache(userId: string, toggledFiles: string[]): void`

Updates the local cache with the latest toggled files.

### `getToggledFilesFromCache(userId: string): string[]`

Gets toggled files from the local cache.

### `getCurrentToggledFiles(userId: string, token?: string): Promise<string[]>`

Gets the current toggled files, first checking the cache and then falling back to the server if needed.
