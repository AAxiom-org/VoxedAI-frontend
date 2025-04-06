# Migration Plan: VoxedAI Frontend Functionality Migration

This document outlines the comprehensive plan for migrating functionality from the original components to the newly designed UI. The goal is to maintain the new UI aesthetic while implementing all existing functionality.

## Overview

The migration will focus on these major components:

- Sidebar
- Chat
- VoxPilot
- Notes
- Code

Each component requires specific functionality to be carried over from the original codebase while preserving the new UI design. We'll use dynamic variables from index.css to ensure proper light/dark mode support throughout.

## Phase 0: Supabase Migration

### 0.1 Workspace

Ensure workspace uses the real supabase data to populate the workspace selector and the space gallery

**Tasks:**

- [x] Migrate/use the supabase functions for getting and populating all data
- [x] Ensure ui populates with this data
- [x] Implement the management functions delete, edit, create, etc.
- [x] Ensure state management is maintained so later components know what the selected space is
- [x] Check console logs for any errors
- [x] Take screenshot of working sidebar with files

**Implementation Notes:**

- Integrated the existing supabase functions from workspaceService.ts into the new UI
- Added proper TypeScript types to fix linter errors
- Implemented workspace creation, deletion, and selection functionality
- Added state management for workspaces and spaces
- Implemented real data fetching for spaces based on selected workspace
- Connected space creation to Supabase using createSpaceWithWorkspace
- Maintained the new UI aesthetic while implementing the functionality
- Fixed workspace filtering to properly handle "All" selection
- Added workspace path display in space cards
- Added delete buttons for workspaces in the dropdown menu
- Implemented "Include nested spaces" toggle functionality to show spaces from child workspaces
- Improved UX by hiding the "Include nested spaces" toggle for workspaces without children

### 0.2 App.tsx Route Management

The application routes need to be updated to properly work with the new UI components.

**Tasks:**

- [x] Update App.tsx to import the correct new page components
- [x] Fix the existing linter errors in App.tsx regarding missing imports
- [x] Ensure routes are properly set up for all components
- [x] Implement proper authentication flows with the new UI components
- [x] Test navigation between different screens
- [x] Ensure routing uses correct supabase ids and id state is maintained between components
- [x] Check console logs for any errors
- [x] Take screenshot of working navigation

**Implementation Notes:**

- Updated App.tsx to use the new UI components
- Fixed import paths and component names
- Maintained the existing authentication flows
- Ensured proper routing between components
- Preserved the lazy loading for better performance
- Verified that navigation works correctly with real Supabase IDs

## Phase 1: Sidebar Migration

### 1.1 File Management System Setup

The new sidebar contains UI elements for files but lacks the actual functionality to manage them.

**Tasks:**

- [x] Implement file fetching from backend using the API structure from original Sidebar component
- [x] Add proper typing for FileItem interface based on the backend response structure
- [x] Implement file visibility toggling with backend synchronization
- [x] Set up file upload functionality
- [x] Add loading indicators during file operations
- [x] Implement file deletion with confirmation
- [x] Implement drag and drop files onto the entire page to upload a file
- [x] Check console logs for any errors
- [x] Take screenshot of working sidebar with files

**Implementation Notes:**

- Renamed the component from 'Sidebar' to 'Space' to match the file name
- Fixed the route parameter mismatch by using `{ id: spaceId }` in useParams
- Implemented file fetching from Supabase using the getSpaceFiles function
- Added proper typing for files with the ExtendedFile interface
- Implemented file visibility toggling
- Set up file upload functionality with the uploadAndProcessFile function
- Added loading indicators during file operations
- Implemented file deletion with confirmation
- Added proper error handling for file operations
- Ensured dark mode compatibility with appropriate CSS classes
- Fixed issues with the uploadAndProcessFile function parameters
- Added proper file type icons based on the file's MIME type
- Implemented drag and drop functionality for file uploads across the entire page
- Added a drag counter to prevent flickering during drag operations
- Added visual feedback with a drop overlay when dragging files

### 1.2 Note Creation & Management (sidebar only)

The new UI has a "New Note" button but lacks the functionality to create notes.

**Tasks:**

- [x] Implement note creation logic from original sidebar implementation
- [x] Add proper typing for note files
- [x] Connect the "New Note" button to the actual creation function
- [x] Add visual feedback during note creation
- [x] Rerender sidebar files and notes sections on note creation
- [x] Check console logs for any errors
- [x] Take screenshot of note creation process

**Implementation Notes:**

- Implemented note creation functionality using the uploadAndProcessFile service
- Added proper typing for note files using the ExtendedFile interface
- Connected the "New Note" button to the createNewNote function
- Added loading state and error handling for note creation
- Added toast notifications for success and error feedback
- Implemented proper state management for notes
- Added fetchNotes() call after note creation to refresh the notes list
- Discovered a Supabase permission issue: "new row violates row-level security policy" when trying to create notes
- Need to fix Supabase permissions to allow note creation
- Successfully implemented the UI flow for note creation, but backend permissions prevent actual creation

### 1.3 Note list population and management

The new UI has a notes list but it uses fake data. Don't worry about note editing or opening yet just the data loading and management.

**Tasks:**

- [x] Implement note fetching and population
- [x] Add proper typing for note files
- [x] Sync the sidebar and notes (on creation)
- [x] Ensure note operations work
- [x] Add new note card as the first note in the list
- [x] Handle no notes state
- [x] Use the simplest string matching for search
- [x] Implement opening notes in the notes panel using a dropdown
- [x] Make the "Notes" button in the sidebar clickable and that opens the notes list. arrow still clickable for dropdown
- [x] Actually populate the notes list in @Note.tsx with the real notes from the db. Remove fake data
- [x] Make a create note modal that exepts a title, description, and related files. This info will be stored in the metadata jsonb column of the space_files table. Still keep the unique file_name generation
- [x] Update the ui to use the name from the metadata for display purposes
- [x] Use the same setup from the old @NotesPanel.tsx file to have a note editor which opens when an individual note is clicked (either in sidebar or in list)
- [x] Check console logs for any errors
- [x] Take screenshot of note creation process

**Implementation Notes:**

- Implemented note fetching from Supabase using the getSpaceFiles function
- Added client-side filtering to show only notes (is_note: true)
- Added proper typing for notes with the ExtendedFile interface
- Implemented state management for notes
- Added loading indicators during note fetching
- Implemented note deletion functionality with visual feedback
- Added search functionality with simple string matching
- Implemented proper handling of empty states (no notes, loading, search with no results)
- Added visual selection state for the currently selected note
- Implemented opening notes in the notes panel when clicked
- Added proper error handling for note operations
- Ensured dark mode compatibility with appropriate CSS classes
- Implemented note creation functionality directly in the NotesInterface component
- Added a "New Note" button in the NotesInterface component
- Implemented the BlockNoteEditor component for editing notes
- Added a note creation modal with title, description, and related files selection
- Updated the SpaceFile type to include metadata for storing note information
- Implemented loading actual note content from Supabase storage
- Added autosave functionality for notes using debounce
- Made the Notes button in the sidebar clickable to open the notes panel
- Added a dropdown selector for notes
- Updated the UI to display note titles and descriptions from metadata
- Implemented proper note content saving to Supabase storage
- Fixed linter errors related to editor event handling

## Phase 1 Cleanup

- [x] Move sidebar code to Sidebar.tsx
- [x] Routing for notes: notes-list, note/:id (ensure sidebar uses routes aswell)
- [x] Differentiate notes buttons 3 subtasks
  - [x] Make the dropdown button not propagate and separate opening dropdown and opening notes component
  - [x] Individual note buttons need to open the notes themselves
- [x] Update create/edit modal
- [x] New note button in sidebar needs to pull up note creation modal (from note.tsx)
- [x] Note editing modal (edit button needs to work on list cards). Just use the existing note creation modal and pre-populate the details

## Phase 2: Chat Implementation

### 2.1 Message Handling System

The new Chat component has UI for messages but lacks actual sending/receiving functionality. To see how old code
worked read old_code/NotebookDetail.tsx and old_code/components/ChatInterface.tsx

**Tasks:**

- [ ] Implement message sending functionality from original ChatInterface
- [ ] Set up message receiving and streaming response display
- [ ] Add proper user/assistant message styling from the old ChatInterface
- [ ] Implement the auto-resize textarea functionality
- [ ] Ensure message streaming (no auto scroll)
- [ ] Check console logs for any errors
- [ ] Take screenshot of working chat interface

### 2.2 Chat History & Navigation

The original app had features to load and navigate between past conversations.

**Tasks:**

- [ ] Implement loading past conversations from the backend
- [ ] Add functionality to continue past conversations
- [ ] Implement the chat UI state change after sending a message
- [ ] Add chat session management (creating new sessions)
- [ ] Implement proper message formatting with markdown rendering
- [ ] Check console logs for any errors
- [ ] Take screenshot of chat history and navigation

### 2.3 Toggle Systems for Notes & Code

The chat interface needs controls to toggle between different modes.

**Tasks:**

- [ ] Implement the mode toggle functionality for notes and code
- [ ] Connect toggles to their respective panels
- [ ] Ensure proper state management between components
- [ ] Update UI based on current mode selection
- [ ] Test toggling between different modes
- [ ] Check console logs for any errors
- [ ] Take screenshot of mode toggling

## Phase 3: VoxPilot Implementation

### 3.1 Toggle System & UI Enhancements

VoxPilot needs to properly open/close and maintain a clean interface.

**Tasks:**

- [ ] Implement open/close toggle functionality
- [ ] Update VoxPilot UI to match the old ChatInterface design patterns
- [ ] Add animations for opening/closing
- [ ] Ensure proper positioning and z-index
- [ ] Test VoxPilot opening/closing
- [ ] Check console logs for any errors
- [ ] Take screenshot of VoxPilot open and closed states

### 3.2 Message System Implementation

VoxPilot needs its own message handling system that reuses chat functionality.

**Tasks:**

- [ ] Reuse chat message sending/receiving code for VoxPilot
- [ ] Implement message streaming in VoxPilot
- [ ] Add proper message formatting including code blocks
- [ ] Ensure VoxPilot has its own state management
- [ ] Create proper error handling for message failures
- [ ] Check console logs for any errors
- [ ] Take screenshot of working VoxPilot conversation

## Phase 4: Notes Panel Implementation

### 4.1 Notes Editor Integration

The Notes panel needs the BlockNote editor and proper saving functionality.

**Tasks:**

- [ ] Integrate BlockNote editor from original implementation
- [ ] Implement note loading from backend
- [ ] Add note saving functionality with autosave
- [ ] Implement proper note switching
- [ ] Add note title editing
- [ ] Check console logs for any errors
- [ ] Take screenshot of working notes panel

### 4.2 Notes Organization & Search

The original notes panel had organization and search features.

**Tasks:**

- [ ] Implement note searching functionality
- [ ] Add note organization by tags or categories
- [ ] Implement note deletion with confirmation
- [ ] Add visual indicators for note status (saved/unsaved)
- [ ] Ensure proper light/dark mode support for notes
- [ ] Check console logs for any errors
- [ ] Take screenshot of note organization features

## Phase 5: Code Sandbox Implementation

### 5.1 Code Editor Integration

The Code component needs proper editor functionality from the original Sandbox.

**Tasks:**

- [ ] Integrate SandpackProvider and related components
- [ ] Implement language selection from original Sandbox
- [ ] Add layout mode toggling
- [ ] Set up console output display
- [ ] Implement code running functionality
- [ ] Check console logs for any errors
- [ ] Take screenshot of working code editor

### 5.2 Code Execution & Output

The code sandbox needs to properly run code and display output.

**Tasks:**

- [ ] Routing for code
- [ ] Implement code execution service integration
- [ ] Add proper output formatting with line numbers
- [ ] Implement error handling for code execution
- [ ] Add loading indicators during code execution
- [ ] Ensure output is properly styled in both light/dark modes
- [ ] Check console logs for any errors
- [ ] Take screenshot of code execution and output

### 5.3 Advanced Editor Features

The original sandbox had several advanced features to be carried over.

**Tasks:**

- [ ] Implement autocompletion based on selected language
- [ ] Add theme support based on application theme
- [ ] Implement console layout switching
- [ ] Add external code sandbox opening
- [ ] Ensure proper keyboard shortcuts work
- [ ] Check console logs for any errors
- [ ] Take screenshot of advanced editor features

## Overall Integration & Testing

### Final Integration

Ensure all components work together seamlessly.

**Tasks:**

- [ ] Test integration between all components
- [ ] Ensure sidebar can properly toggle panels
- [ ] Test chat with code and notes mode toggling
- [ ] Ensure VoxPilot works properly with other panels
- [ ] Verify session management works across all components
- [ ] Check all components for light/dark mode compatibility
- [ ] Take screenshot of fully integrated application

### User Flow Testing

Test complete user flows through the application.

**Tasks:**

- [ ] Test complete flow: login → create note → chat → use code → save
- [ ] Test file uploading and management across components
- [ ] Ensure all transitions and animations work properly
- [ ] Verify error states and recovery
- [ ] Test responsive design at different viewport sizes
- [ ] Check console logs for any errors
- [ ] Take screenshot of complete user flow
