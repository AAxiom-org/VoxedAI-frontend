# Note Content Integration with AI Queries

This implementation allows the application to include note content in AI queries when a note is open. This provides additional context to the AI when answering note-related questions.

## Implementation Overview

### 1. useNoteState Hook

The `useNoteState` hook provides:

- Information about whether a note is currently open
- The ID of the open note
- A function to fetch the content of the open note when needed

```typescript
const { isNoteOpen, noteId, fetchNoteContent } = useNoteState();
```

This hook is designed to be efficient - it only fetches note content when explicitly requested, rather than loading it automatically when a note is open, to avoid unnecessary database queries and potential infinite loops.

### 2. Enhanced GeminiService

The `streamChatWithGemini` function has been updated to accept note content:

```typescript
export async function streamChatWithGemini(
  history: Message[],
  onStreamUpdate: (content: string) => void,
  userId: string | null,
  isCodingQuestion: boolean = false,
  isNoteQuestion: boolean = false,
  noteToggledFiles?: string[],
  noteContent?: string,
): Promise<void> { ... }
```

When note content is provided, it's included in the query request to the AI service.

### 3. Integration in Chat Components

- In VoxPilot.tsx and Chat.tsx, we check if a note is open when submitting a query
- If a note is open and the question is marked as a note question, we fetch the note content
- The note content is then passed to the `streamChatWithGemini` function

## Usage Flow

1. User opens a note (sets `noteId` in URL)
2. User submits a question and marks it as a note question
3. On submit, the application fetches the note content
4. The note content is included in the AI query
5. AI response takes the note content into account

## Benefits

- Provides context-aware responses for note-related queries
- Only fetches note content when needed (on submit)
- Avoids infinite loops by not triggering updates when note content changes
