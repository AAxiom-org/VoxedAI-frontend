import React, { useState } from "react";
import {
  File,
  FileText,
  FileImage,
  FileVideo2,
  Plus,
  ChevronDown,
  ChevronRight,
  User,
  Moon,
  Info,
  LogOut,
  Code,
  Eye,
  EyeOff,
  Folder,
  NotebookPen,
  Brain,
  Sun,
  Loader,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { UserProfile } from "@clerk/clerk-react";
import { useUser } from "@clerk/clerk-react";

import type { SpaceFile } from "../types/space";

// Extended file type with visibility state
interface ExtendedFile extends SpaceFile {
  visible: boolean;
  isProcessing?: boolean;
  isDeletingFile?: boolean;
}

interface SidebarProps {
  spaceName: string;
  files: ExtendedFile[];
  notes: ExtendedFile[];
  isLoadingFiles: boolean;
  isLoadingNotes: boolean;
  uploadingFiles: Set<string>;
  isCreatingNote: boolean;
  selectedNote: string | null;
  noteSearch: string;
  setNoteSearch: (search: string) => void;
  setSelectedNote: (id: string | null) => void;
  toggleFileVisibility: (id: string) => void;
  handleDeleteFile: (id: string) => void;
  handleDeleteNote: (id: string) => void;
  createNewNote: () => void;
  handleNewFile: (type: string) => void;
  setShowBrain: (show: boolean) => void;
  setShowChat: (show: boolean) => void;
  setShowNote: (show: boolean) => void;
  setShowSandbox: (show: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  openNote?: (noteId: string) => void;
  showNotesList?: () => void;
}

const Sidebar = ({
  spaceName,
  files,
  notes,
  isLoadingFiles,
  isLoadingNotes,
  uploadingFiles,
  isCreatingNote,
  selectedNote,
  noteSearch,
  setNoteSearch,
  setSelectedNote,
  toggleFileVisibility,
  handleDeleteFile,
  handleDeleteNote,
  createNewNote,
  handleNewFile,
  setShowBrain,
  setShowChat,
  setShowNote,
  setShowSandbox,
  fileInputRef,
  handleFileUpload,
  openNote,
  showNotesList,
}: SidebarProps) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [filesExpanded, setFilesExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(true);
  const [showNewFileMenu, setShowNewFileMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { user } = useUser();

  // Get file type icon
  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes("image")) {
      return (
        <FileImage size={14} className="text-gray-500 mr-2 flex-shrink-0" />
      );
    } else if (
      fileType.includes("text") ||
      fileType.includes("document") ||
      fileType.includes("pdf")
    ) {
      return (
        <FileText size={14} className="text-gray-500 mr-2 flex-shrink-0" />
      );
    } else if (
      fileType.includes("python") ||
      fileType.includes("javascript") ||
      fileType.includes("code") ||
      fileType.includes("json") ||
      fileType.includes("html") ||
      fileType.includes("css")
    ) {
      return <Code size={14} className="text-gray-500 mr-2 flex-shrink-0" />;
    } else if (fileType.includes("video")) {
      return (
        <FileVideo2 size={14} className="text-gray-500 mr-2 flex-shrink-0" />
      );
    } else {
      return <File size={14} className="text-gray-500 mr-2 flex-shrink-0" />;
    }
  };

  // Get display name for a file, using metadata.title if available
  const getDisplayName = (file: ExtendedFile) => {
    if (
      file.metadata &&
      typeof file.metadata === "object" &&
      "title" in file.metadata
    ) {
      return file.metadata.title as string;
    }
    return file.file_name.replace(/\.json$/, "");
  };

  // Filter notes based on search term - search in both title and filename
  const filteredNotes = notes.filter((note) => {
    const displayName = getDisplayName(note).toLowerCase();
    const fileName = note.file_name.toLowerCase();
    return (
      displayName.includes(noteSearch.toLowerCase()) ||
      fileName.includes(noteSearch.toLowerCase())
    );
  });

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowProfile(false);
    }
  };

  const profile = (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 w-full max-w-2xl relative">
        <UserProfile />
      </div>
    </div>
  );

  return (
    <div className="w-60 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out">
      {/* Header - with space for the toggle button */}
      <div className="p-3 pl-16 flex items-center gap-2">
        {showProfile && profile}
        <div className="flex items-center">
          <div className="w-6 h-6 rounded-full bg-yellow-200 flex items-center justify-center text-xs font-bold">
            👨
          </div>
          <span className="ml-2 font-medium text-adaptive">{spaceName}</span>
        </div>
      </div>

      {/* Chat */}
      <div className="mx-4 my-2">
        <button
          onClick={() => {
            setShowChat(true);
            setShowNote(false);
            setShowSandbox(false);
          }}
          className="text-gray-400 w-full rounded-md px-3 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className="icon-xl-heavy"
          >
            <path
              d="M15.6729 3.91287C16.8918 2.69392 18.8682 2.69392 20.0871 3.91287C21.3061 5.13182 21.3061 7.10813 20.0871 8.32708L14.1499 14.2643C13.3849 15.0293 12.3925 15.5255 11.3215 15.6785L9.14142 15.9899C8.82983 16.0344 8.51546 15.9297 8.29289 15.7071C8.07033 15.4845 7.96554 15.1701 8.01005 14.8586L8.32149 12.6785C8.47449 11.6075 8.97072 10.615 9.7357 9.85006L15.6729 3.91287ZM18.6729 5.32708C18.235 4.88918 17.525 4.88918 17.0871 5.32708L11.1499 11.2643C10.6909 11.7233 10.3932 12.3187 10.3014 12.9613L10.1785 13.8215L11.0386 13.6986C11.6812 13.6068 12.2767 13.3091 12.7357 12.8501L18.6729 6.91287C19.1108 6.47497 19.1108 5.76499 18.6729 5.32708ZM11 3.99929C11.0004 4.55157 10.5531 4.99963 10.0008 5.00007C9.00227 5.00084 8.29769 5.00827 7.74651 5.06064C7.20685 5.11191 6.88488 5.20117 6.63803 5.32695C6.07354 5.61457 5.6146 6.07351 5.32698 6.63799C5.19279 6.90135 5.10062 7.24904 5.05118 7.8542C5.00078 8.47105 5 9.26336 5 10.4V13.6C5 14.7366 5.00078 15.5289 5.05118 16.1457C5.10062 16.7509 5.19279 17.0986 5.32698 17.3619C5.6146 17.9264 6.07354 18.3854 6.63803 18.673C6.90138 18.8072 7.24907 18.8993 7.85424 18.9488C8.47108 18.9992 9.26339 19 10.4 19H13.6C14.7366 19 15.5289 18.9992 16.1458 18.9488C16.7509 18.8993 17.0986 18.8072 17.362 18.673C17.9265 18.3854 18.3854 17.9264 18.673 17.3619C18.7988 17.1151 18.8881 16.7931 18.9393 16.2535C18.9917 15.7023 18.9991 14.9977 18.9999 13.9992C19.0003 13.4469 19.4484 12.9995 20.0007 13C20.553 13.0004 21.0003 13.4485 20.9999 14.0007C20.9991 14.9789 20.9932 15.7808 20.9304 16.4426C20.8664 17.116 20.7385 17.7136 20.455 18.2699C19.9757 19.2107 19.2108 19.9756 18.27 20.455C17.6777 20.7568 17.0375 20.8826 16.3086 20.9421C15.6008 21 14.7266 21 13.6428 21H10.3572C9.27339 21 8.39925 21 7.69138 20.9421C6.96253 20.8826 6.32234 20.7568 5.73005 20.455C4.78924 19.9756 4.02433 19.2107 3.54497 18.2699C3.24318 17.6776 3.11737 17.0374 3.05782 16.3086C2.99998 15.6007 2.99999 14.7266 3 13.6428V10.3572C2.99999 9.27337 2.99998 8.39922 3.05782 7.69134C3.11737 6.96249 3.24318 6.3223 3.54497 5.73001C4.02433 4.7892 4.78924 4.0243 5.73005 3.54493C6.28633 3.26149 6.88399 3.13358 7.55735 3.06961C8.21919 3.00673 9.02103 3.00083 9.99922 3.00007C10.5515 2.99964 10.9996 3.447 11 3.99929Z"
              fill="currentColor"
            ></path>
          </svg>
          <a className="text-sm">Chat With Vox</a>
        </button>
      </div>

      {/* Second Brain */}
      <div className="mx-4 my-2">
        <button
          onClick={() => {
            setShowBrain(true);
            setShowChat(false);
            setShowNote(false);
            setShowSandbox(false);
          }}
          className="text-gray-400 w-full rounded-md px-3 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
        >
          <Brain size={24} />
          <a className="text-sm">Second Brain</a>
        </button>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

      {/* Main Sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Notes Section */}
        <div className="my-2">
          <div className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
            <div
              className="flex items-center flex-1"
              onClick={() => {
                if (showNotesList) {
                  // Use the dedicated function to show notes list
                  showNotesList();
                } else if (openNote) {
                  // Clear the selected note but show notes view
                  setSelectedNote(null);
                  setShowNote(true);
                } else {
                  setShowNote(true);
                  setShowChat(false);
                  setShowSandbox(false);
                }
              }}
            >
              <NotebookPen size={16} className="text-gray-500 mr-2" />
              <span className="text-sm text-adaptive">Notes</span>
            </div>
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-2">{notes.length}</span>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setNotesExpanded(!notesExpanded);
                }}
                className="cursor-pointer p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                {notesExpanded ? (
                  <ChevronDown size={16} className="text-gray-500" />
                ) : (
                  <ChevronRight size={16} className="text-gray-500" />
                )}
              </div>
            </div>
          </div>

          {/* Notes List - only visible when expanded */}
          {notesExpanded && (
            <div className="ml-4 bg-gray-50 dark:bg-gray-800 p-2 rounded-md mx-2">
              {/* Notes search */}
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-adaptive"
                />
              </div>

              {/* Loading state */}
              {isLoadingNotes ? (
                <div className="flex justify-center py-4">
                  <Loader size={16} className="animate-spin text-gray-500" />
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-center py-2">
                  {noteSearch ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No notes matching "{noteSearch}"
                    </p>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No notes created yet
                    </p>
                  )}
                </div>
              ) : (
                // Notes list
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`flex items-center justify-between py-1 px-2 text-sm rounded cursor-pointer ${
                        selectedNote === note.id
                          ? "bg-blue-100 dark:bg-blue-900"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      onClick={() => {
                        if (openNote) {
                          openNote(note.id);
                        } else {
                          setSelectedNote(note.id);
                          setShowNote(true);
                          setShowChat(false);
                          setShowSandbox(false);
                        }
                      }}
                    >
                      <div className="flex items-center overflow-hidden">
                        {note.metadata?.emoji ? (
                          <span className="mr-2 flex-shrink-0">
                            {note.metadata.emoji}
                          </span>
                        ) : (
                          <FileText
                            size={14}
                            className="text-gray-500 mr-2 flex-shrink-0"
                          />
                        )}
                        <span className="truncate text-adaptive">
                          {getDisplayName(note)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        {note.isDeletingFile ? (
                          <Loader
                            size={14}
                            className="animate-spin text-gray-500 mr-2"
                          />
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNote(note.id);
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mr-2"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Create new note button */}
                  <div
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mt-2 w-full cursor-pointer py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    onClick={() => {
                      createNewNote();
                    }}
                  >
                    {isCreatingNote ? (
                      <>
                        <Loader size={14} className="animate-spin mr-1" />
                        <span>Creating note...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} className="mr-1" />
                        <span>New note</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Code Section */}
        <div
          className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          onClick={() => {
            setShowSandbox(true);
            setShowNote(false);
            setShowChat(false);
          }}
        >
          <div className="flex items-center">
            <Code size={16} className="text-gray-500 mr-2" />
            <span className="text-sm text-adaptive">Code</span>
          </div>
          <span className="text-xs text-gray-500">1</span>
        </div>

        {/* Files Section */}
        <div className="my-2">
          <div
            className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            onClick={() => setFilesExpanded(!filesExpanded)}
          >
            <div className="flex items-center">
              <Folder size={16} className="text-gray-500 mr-2" />
              <span className="text-sm text-adaptive">Files</span>
            </div>
            {filesExpanded ? (
              <ChevronDown size={16} className="text-gray-500" />
            ) : (
              <ChevronRight size={16} className="text-gray-500" />
            )}
          </div>

          {/* Files List - only visible when expanded */}
          {filesExpanded && (
            <div className="ml-4 bg-gray-50 dark:bg-gray-800 p-2 rounded-md mx-2">
              {/* File upload input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={uploadingFiles.size > 0}
              />

              {/* Loading state */}
              {isLoadingFiles ? (
                <div className="flex justify-center py-4">
                  <Loader size={16} className="animate-spin text-gray-500" />
                </div>
              ) : files.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-2">
                  No files uploaded yet
                </p>
              ) : (
                // Files list
                files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between py-1 px-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <div className="flex items-center overflow-hidden">
                      {file.metadata?.emoji ? (
                        <NotebookPen
                          size={14}
                          className="text-gray-500 mr-2 flex-shrink-0"
                        />
                      ) : (
                        getFileTypeIcon(file.file_type)
                      )}
                      <span className="truncate text-adaptive">
                        {getDisplayName(file)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      {file.isDeletingFile ? (
                        <Loader
                          size={14}
                          className="animate-spin text-gray-500 mr-2"
                        />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mr-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFileVisibility(file.id);
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {file.visible ? (
                          <Eye size={14} />
                        ) : (
                          <EyeOff size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* Add new file button */}
              <label
                htmlFor="file-upload"
                className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mt-2 w-full cursor-pointer"
              >
                {uploadingFiles.size > 0 ? (
                  <>
                    <Loader size={14} className="animate-spin mr-1" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus size={14} className="mr-1" />
                    Add file
                  </>
                )}
              </label>
            </div>
          )}
        </div>

        {/* Links Section */}

        {/* Create new button */}
        <div className="relative">
          <div
            className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => setShowNewFileMenu(!showNewFileMenu)}
          >
            <Plus size={16} className="text-gray-400 mr-1" />
            <span className="text-sm text-adaptive">Create new</span>
          </div>

          {showNewFileMenu && (
            <div className="absolute left-8 mt-1 w-32 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
              <div
                className="flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleNewFile("note")}
              >
                <FileText size={16} className="text-gray-500 mr-2" />
                <span className="text-adaptive">New Note</span>
              </div>
              <div
                className="flex items-center px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleNewFile("code")}
              >
                <Code size={16} className="text-gray-500 mr-2" />
                <span className="text-adaptive">New Code</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom menu */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-auto">
        <div
          className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          onClick={() => {
            setShowProfile(true);
          }}
        >
          <div className="flex items-center">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt="User"
                className="w-5 h-5 rounded-full mr-2"
              />
            ) : (
              <User size={16} className="text-gray-500 mr-2" />
            )}
            <span className="text-sm text-adaptive">Profile</span>
          </div>
        </div>

        <div
          className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          onClick={() => {
            toggleTheme();
          }}
        >
          <div className="flex items-center">
            {theme === "dark" ? (
              <Sun size={16} className="text-gray-500 mr-2" />
            ) : (
              <Moon size={16} className="text-gray-500 mr-2" />
            )}
            <span className="text-sm text-adaptive">Dark mode</span>
          </div>
        </div>

        <div
          className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          onClick={() => {
            window.open("https://voxed.ai", "_blank");
          }}
        >
          <div className="flex items-center">
            <Info size={16} className="text-gray-500 mr-2" />
            <span className="text-sm text-adaptive">About</span>
          </div>
        </div>

        <div
          className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          onClick={() => {
            navigate("/");
          }}
        >
          <div className="flex items-center">
            <LogOut size={16} className="text-gray-500 mr-2" />
            <span className="text-sm text-adaptive">Leave</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
