// Define interfaces for our data types
export interface BrainNoteMetadata {
  tags?: string[];
  emoji?: string;
  title?: string;
  [key: string]: any;
}

export interface BrainNote {
  id: string;
  space_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  is_note: boolean;
  is_brain_note: boolean;
  note_content: string;
  metadata?: BrainNoteMetadata;
  created_at?: string;
  updated_at?: string;
}

export interface ResearchEntry {
  id: string;
  content?: string;
  created_at: string;
  updated_at: string;
  metadata?: {
    label?: string;
    emoji?: string;
    tags?: string[];
    [key: string]: any;
  };
  related_data?: any;
  [key: string]: any;
}

export interface BrainInterfaceProps {
  currentView: "main" | "graph";
  setCurrentView: (view: "main" | "graph" | "detailed") => void;
  spaceId?: string;
}

export interface ResearchDigest {
  id: string;
  space_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at?: string;
  related_note_ids?: string[];
  all_links?: string[];
  [key: string]: any;
}

export interface BrainStatistics {
  totalEntries: number;
  totalTags: number;
  lastUpdated: string;
  entriesThisWeek: number;
}
