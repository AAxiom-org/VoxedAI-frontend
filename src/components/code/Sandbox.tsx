import { SandpackProvider, SandpackLayout, SandpackCodeEditor, SandpackPreview, SandpackConsole, UnstyledOpenInCodeSandboxButton, useSandpack } from "@codesandbox/sandpack-react";
import { useState, useEffect, useRef } from "react";
import languageFiles from "../../utils/codeExamples";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { githubLight, atomDark } from "@codesandbox/sandpack-themes";
import { FaColumns, FaChevronDown, FaEyeSlash, FaPlus, FaTrash, FaSortDown, FaSortUp, FaKey } from "react-icons/fa";
import { useTheme } from "../../contexts/ThemeContext";
import { useSupabaseUser } from "../../contexts/UserContext";
import { deleteFileWithRetry } from "../../services/fileUpload";

import { python } from "@codemirror/lang-python";

import { executeCode, executeCodeLocally, CodeExecutionResponse } from "../../services/codeRunnerService";

type SandpackLayoutMode = "preview" | "tests" | "console";
type ConsoleLayoutMode = "side-by-side" | "below" | "collapsed";

// Define the file structure with metadata
interface FileData {
  code: string;
  active: boolean;
  isMain?: boolean;
  generationOrder: number;
  id?: string;
}

interface Files {
  [key: string]: FileData;
}

// Custom console output component
const CustomConsoleOutput = ({ result, setCodeExecutionResult, setLayoutMode, isRunning, setIsRunning }: { result: CodeExecutionResponse | null, setCodeExecutionResult: React.Dispatch<React.SetStateAction<CodeExecutionResponse | null>>, setLayoutMode: React.Dispatch<React.SetStateAction<SandpackLayoutMode>>, isRunning: boolean, setIsRunning: React.Dispatch<React.SetStateAction<boolean>> }) => {
  
  const renderWithLineNumbers = (text: string | undefined) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    return (
      <div className="relative bg-card">
        <div className={`absolute left-0 top-0 px-2 py-3 text-right select-none border-r border-adaptive`} style={{ width: '3rem' }}>
          {lines.map((_, i) => (
            <div key={i} className="text-adaptive text-xs pr-1 leading-6 h-6">{i + 1}</div>
          ))}
        </div>
        <div className="pl-16 pr-4 py-3 whitespace-pre-wrap font-mono">
          {lines.map((line, i) => (
            <div key={i} className="leading-6 h-6 text-adaptive">
              {line || '\u00A0'} {/* Use non-breaking space to preserve empty lines */}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!result) {
    return (
      <div className="font-mono text-sm h-full bg-background overflow-auto flex flex-col justify-center items-center">
        <div className="p-4 text-adaptive flex flex-col justify-center items-center space-y-4">
          <p>Run your code to see output here.</p>
          <RunPythonButton
            files={{}}
            fileKeys={[]}
            getOrderedFiles={() => []} 
            setCodeExecutionResult={setCodeExecutionResult}
            toggleConsoleLayoutRunButton={() => {}}
            isRunning={isRunning}
            setIsRunning={setIsRunning}
          />
        </div>
      </div>
    );
  }

  // Check if there's an actual code execution error, even if the API reported success
  const hasExecutionError = result.has_execution_error || (result.stderr && result.stderr.trim().length > 0);
  const hasResult = result.result && Object.keys(result.result || {}).length > 0;
  const hasOutput = result.stdout && result.stdout.trim().length > 0;

  return (
    <div className="font-mono text-sm bg-background overflow-auto">
      <div className="p-4">
        {/* Execution Status Header */}
        <div className={`${hasExecutionError ? "text-red-600" : "text-green-600"} mb-2`}>
          {hasExecutionError ? (
            <>✗ Code execution error</>
          ) : (
            <>✓ Code executed successfully</>
          )}
          {result.execution_time && ` (${result.execution_time.toFixed(4)}s)`}
        </div>
        
        {/* Standard output */}
        {hasOutput && (
          <div className="mb-4">
            <div className="text-adaptive font-semibold mb-1">Output:</div>
            <div className={`bg-background rounded-md overflow-auto border border-adaptive`}>
              {renderWithLineNumbers(result.stdout)}
            </div>
          </div>
        )}
        
        {/* Error output - shown regardless of success status if stderr exists */}
        {hasExecutionError && (
          <div className="mb-4">
            <div className="text-red-600 font-semibold mb-1">Error:</div>
            <div className="bg-red-50 rounded-md overflow-auto border border-red-200">
              {renderWithLineNumbers(result.stderr)}
            </div>
          </div>
        )}
        
        {/* Return values */}
        {hasResult && (
          <div className="mb-4">
            <div className="text-adaptive font-semibold mb-1">Variables:</div>
            <div className={`bg-card p-3 rounded-md overflow-auto border border-adaptive`}>
              <table className="w-full text-left">
                <thead className="border-b border-adaptive">
                  <tr>
                    <th className="pb-2 pr-4 font-semibold text-adaptive">Name</th>
                    <th className="pb-2 font-semibold text-adaptive">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.result || {}).map(([key, value]) => (
                    <tr key={key} className="border-b border-adaptive last:border-0">
                      <td className="py-2 pr-4 text-blue-600">{key}</td>
                      <td className="py-2 text-adaptive">
                        {typeof value === 'object' 
                          ? JSON.stringify(value, null, 2)
                          : String(value)
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Show a message when there's no data to display */}
        {!hasOutput && !hasExecutionError && !hasResult && (
          <div className="text-muted italic">
            No output or variables to display.
          </div>
        )}
      </div>
    </div>
  );
};

export default function Sandbox() {
  const { theme } = useTheme();
  const { getSupabaseClient, refreshSupabaseToken } = useSupabaseUser();
  const [layoutMode, setLayoutMode] = useState<SandpackLayoutMode>("console");
  const [codeExecutionResult, setCodeExecutionResult] = useState<CodeExecutionResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [consoleLayout, setConsoleLayout] = useState<ConsoleLayoutMode>("collapsed");
  const [files, setFiles] = useState<Files>({});
  const [fileKeys, setFileKeys] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string>("/main.py");
  const [newFileModalOpen, setNewFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [generationCounter, setGenerationCounter] = useState(1);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with default Python file
  useEffect(() => {
    const pythonExample = languageFiles.python;
    
    // Convert to our file structure format
    const initialFiles: Files = {};
    let initialFileKeys: string[] = [];
    
    Object.entries(pythonExample).forEach(([key, value], index) => {
      const isMain = key === "/main.py";
      initialFiles[key] = {
        ...value, 
        isMain,
        generationOrder: index + 1
      };
      initialFileKeys.push(key);
    });
    
    setFiles(initialFiles);
    setFileKeys(initialFileKeys);
    setGenerationCounter(Object.keys(initialFiles).length + 1);
  }, []);

  // Add new file handler
  const handleAddFile = () => {
    if (!newFileName) return;
    
    // Ensure the file has a .py extension
    let filename = newFileName;
    if (!filename.endsWith(".py")) {
      filename += ".py";
    }
    
    // Make sure the filename has a leading slash
    if (!filename.startsWith("/")) {
      filename = "/" + filename;
    }
    
    // Check if the file already exists
    if (fileKeys.includes(filename)) {
      alert("A file with this name already exists.");
      return;
    }
    
    // Add the new file
    const newFiles = {
      ...files,
      [filename]: {
        code: "# New Python file\n",
        active: true,
        isMain: false,
        generationOrder: generationCounter
      }
    };
    
    const newFileKeys = [...fileKeys, filename];
    
    setFiles(newFiles);
    setFileKeys(newFileKeys);
    setActiveFile(filename);
    setNewFileModalOpen(false);
    setNewFileName("");
    setGenerationCounter(prev => prev + 1);
  };

  // Delete file handler
  const handleDeleteFile = async (filename: string) => {
    // Don't delete if it's the only file or if it's the main file
    if (fileKeys.length <= 1 || files[filename].isMain) {
      return;
    }
    
    // If this is a file from the database (it has an id), delete it there first
    if (files[filename].id) {
      try {
        const result = await deleteFileWithRetry(
          files[filename].id as string,
          refreshSupabaseToken,
          getSupabaseClient
        );
        
        if (!result.success) {
          console.error("Failed to delete file from database:", result.error);
          return;
        }
      } catch (error) {
        console.error("Error deleting file:", error);
        return;
      }
    }
    
    const newFiles = { ...files };
    delete newFiles[filename];
    
    const newFileKeys = fileKeys.filter(key => key !== filename);
    
    setFiles(newFiles);
    setFileKeys(newFileKeys);
    
    // If we deleted the active file, set a new active file
    if (activeFile === filename) {
      setActiveFile(newFileKeys[0]);
    }
  };

  // Set as main file handler
  const handleSetMainFile = (filename: string) => {
    const newFiles = { ...files };
    
    // Update all files to not be main
    Object.keys(newFiles).forEach(key => {
      if (newFiles[key].isMain) {
        newFiles[key] = { ...newFiles[key], isMain: false };
      }
    });
    
    // Set the selected file as main
    newFiles[filename] = { ...newFiles[filename], isMain: true };
    
    setFiles(newFiles);
  };

  // Move file up in generation order
  const handleMoveFileUp = (filename: string) => {
    const currentOrder = files[filename].generationOrder;
    
    // Find the file that's right before this one in order
    const fileToSwapWith = Object.entries(files).find(
      ([_, data]) => data.generationOrder === currentOrder - 1
    );
    
    if (!fileToSwapWith) return; // Can't move up if already at the top
    
    const newFiles = { ...files };
    newFiles[filename] = { ...newFiles[filename], generationOrder: currentOrder - 1 };
    newFiles[fileToSwapWith[0]] = { ...newFiles[fileToSwapWith[0]], generationOrder: currentOrder };
    
    setFiles(newFiles);
  };

  // Move file down in generation order
  const handleMoveFileDown = (filename: string) => {
    const currentOrder = files[filename].generationOrder;
    
    // Find the file that's right after this one in order
    const fileToSwapWith = Object.entries(files).find(
      ([_, data]) => data.generationOrder === currentOrder + 1
    );
    
    if (!fileToSwapWith) return; // Can't move down if already at the bottom
    
    const newFiles = { ...files };
    newFiles[filename] = { ...newFiles[filename], generationOrder: currentOrder + 1 };
    newFiles[fileToSwapWith[0]] = { ...newFiles[fileToSwapWith[0]], generationOrder: currentOrder };
    
    setFiles(newFiles);
  };

  // Convert our file structure to Sandpack format
  const getSandpackFiles = () => {
    const sandpackFiles: Record<string, { code: string, active: boolean }> = {};
    
    Object.entries(files).forEach(([key, value]) => {
      sandpackFiles[key] = {
        code: value.code,
        active: key === activeFile
      };
    });
    
    return sandpackFiles;
  };

  // Get files in order of generation (with main file always last)
  const getOrderedFiles = () => {
    // First get all non-main files sorted by generationOrder
    const nonMainFiles = Object.entries(files)
      .filter(([_, data]) => !data.isMain)
      .sort((a, b) => a[1].generationOrder - b[1].generationOrder);
    
    // Then find the main file
    const mainFile = Object.entries(files).find(([_, data]) => data.isMain);
    
    // Combine them with main file last
    return [
      ...nonMainFiles,
      ...(mainFile ? [mainFile] : [])
    ];
  };

  // Focus the new file input when modal opens
  useEffect(() => {
    if (newFileModalOpen && newFileInputRef.current) {
      newFileInputRef.current.focus();
    }
  }, [newFileModalOpen]);

  // Console layout toggle handler
  const toggleConsoleLayout = () => {
    const layouts: ConsoleLayoutMode[] = ["below", "side-by-side", "collapsed"];
    const currentIndex = layouts.indexOf(consoleLayout);
    const nextIndex = (currentIndex + 1) % layouts.length;
    setConsoleLayout(layouts[nextIndex]);
  };

  const toggleConsoleLayoutRunButton = () => {
    if (consoleLayout === "collapsed") {
      toggleConsoleLayout();
    }
  };

  // Function to get icon based on current layout
  const getConsoleLayoutIcon = () => {
    switch (consoleLayout) {
      case "side-by-side":
        return <FaColumns className="mr-1" />;
      case "below":
        return <FaChevronDown className="mr-1" />;
      case "collapsed":
        return <FaEyeSlash className="mr-1" />;
    }
  };

  // Function to get label text for the layout toggle button
  const getConsoleLayoutLabel = () => {
    switch (consoleLayout) {
      case "below":
        return "Below";
      case "side-by-side":
        return "Side";
      case "collapsed":
        return "Hidden";
    }
  };

  // Function to get tooltip text for the layout toggle button
  const getConsoleLayoutTooltip = () => {
    switch (consoleLayout) {
      case "side-by-side":
        return "Switch to console below";
      case "below":
        return "Hide console";
      case "collapsed":
        return "Show console side-by-side";
    }
  };

  // Create a custom theme that adapts to the current theme
  const customTheme = {
    ...(theme === "dark" ? atomDark : githubLight),
    colors: {
      ...(theme === "dark" ? atomDark.colors : githubLight.colors),
      surface1: theme === 'dark' ? '#212121' : '#ffffff',
      surface2: theme === 'dark' ? '#333333' : '#f5f5f5',
      surface3: theme === 'dark' ? '#404040' : '#e5e5e5',
      clickable: theme === 'dark' ? '#aaaaaa' : '#808080',
      base: theme === 'dark' ? '#ffffff' : '#000000',
      disabled: theme === 'dark' ? '#4d4d4d' : '#cccccc',
      hover: theme === 'dark' ? '#2d2d2d' : '#eaeaea',
      accent: '#6c47ff',
    }
  };

  return (
    <div className="flex flex-col h-full w-full py-6 px-4">
      <SandpackProvider
        theme={customTheme}
        files={getSandpackFiles()}
        template="vanilla"
        customSetup={{
          entry: activeFile,
          dependencies: {
          }
        }}
        options={{
          activeFile: activeFile,
          visibleFiles: fileKeys,
        }}
      >
        {/* File Management Toolbar */}
        <div className="mb-4 flex items-center justify-between bg-card p-2 rounded-md">
          <div className="flex items-center space-x-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
            {getOrderedFiles().map(([filename, fileData]) => (
              <div key={filename} className="flex-shrink-0">
                <button
                  className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                    activeFile === filename
                      ? "bg-primary text-white"
                      : "bg-card-secondary hover:bg-card-secondary/80 text-adaptive"
                  }`}
                  onClick={() => setActiveFile(filename)}
                >
                  {fileData.isMain && <FaKey className="mr-1 text-xs" />}
                  {filename.replace("/", "")}
                </button>
              </div>
            ))}
          </div>
          
          <div className="ml-2 flex items-center">
            <button
              onClick={() => setNewFileModalOpen(true)}
              className="p-1.5 rounded-md bg-primary text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
              title="Create new file"
            >
              <FaPlus size={14} />
            </button>
            
            <button
              onClick={toggleConsoleLayout}
              className="ml-2 p-1.5 rounded-md bg-card-secondary text-adaptive hover:bg-card-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary/50"
              title={getConsoleLayoutTooltip()}
            >
              {getConsoleLayoutIcon()}
            </button>
          </div>
        </div>
        
        <div className={`h-full ${consoleLayout === "side-by-side" ? "flex gap-4" : "flex flex-col gap-4"}`}>
          <div className={`${consoleLayout === "side-by-side" ? "w-1/2" : "w-full"}`}>
            <SandpackCodeEditor
              showLineNumbers={true}
              showInlineErrors={true}
              wrapContent={true}
              extensions={[python(), autocompletion()]}
            />
          </div>
          
          {consoleLayout !== "collapsed" && (
            <div className={`${consoleLayout === "side-by-side" ? "w-1/2" : "w-full"} border border-adaptive rounded-md overflow-hidden`}>
              <CustomConsoleOutput
                result={codeExecutionResult}
                setCodeExecutionResult={setCodeExecutionResult}
                setLayoutMode={setLayoutMode}
                isRunning={isRunning}
                setIsRunning={setIsRunning}
              />
            </div>
          )}
        </div>
        
        {/* File Actions */}
        <div className="pb-14 flex flex-wrap items-center gap-2">
          <RunPythonButton
            files={files}
            fileKeys={fileKeys}
            getOrderedFiles={getOrderedFiles}
            setCodeExecutionResult={setCodeExecutionResult}
            toggleConsoleLayoutRunButton={toggleConsoleLayoutRunButton}
            isRunning={isRunning}
            setIsRunning={setIsRunning}
          />
          
          {activeFile && !files[activeFile]?.isMain && (
            <button
              onClick={() => handleSetMainFile(activeFile)}
              className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
            >
              <FaKey className="mr-1" />
              Set as Main
            </button>
          )}
          
          {activeFile && fileKeys.length > 1 && !files[activeFile]?.isMain && (
            <button
              onClick={() => handleDeleteFile(activeFile)}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
            >
              <FaTrash className="mr-1" />
              Delete
            </button>
          )}
          
          {activeFile && (
            <>
              <button
                onClick={() => handleMoveFileUp(activeFile)}
                disabled={files[activeFile]?.generationOrder <= 1}
                className="px-3 py-1.5 bg-card-secondary text-adaptive rounded-md hover:bg-card-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
              >
                <FaSortUp className="mr-1" />
                Move Up
              </button>
              
              <button
                onClick={() => handleMoveFileDown(activeFile)}
                disabled={
                  files[activeFile]?.generationOrder >= 
                  Math.max(...Object.values(files).map(f => f.generationOrder))
                }
                className="px-3 py-1.5 bg-card-secondary text-adaptive rounded-md hover:bg-card-secondary/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
              >
                <FaSortDown className="mr-1" />
                Move Down
              </button>
            </>
          )}
        </div>
      </SandpackProvider>
      
      {/* New File Modal */}
      {newFileModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-4 rounded-md w-96 max-w-full">
            <h3 className="text-lg font-semibold mb-4 text-adaptive">Create New File</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleAddFile(); }}>
              <div className="mb-4">
                <label htmlFor="filename" className="block text-sm font-medium text-adaptive mb-1">
                  File Name
                </label>
                <input
                  ref={newFileInputRef}
                  type="text"
                  id="filename"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="example.py"
                  className="w-full p-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card text-adaptive"
                />
                <p className="text-xs text-muted mt-1">
                  .py extension will be added automatically if not specified
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => { setNewFileModalOpen(false); setNewFileName(""); }}
                  className="px-3 py-1.5 border border-adaptive text-adaptive rounded-md hover:bg-card-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFileName.trim()}
                  className="px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Run button component for Python multi-file execution
function RunPythonButton({ 
  files,
  fileKeys,
  getOrderedFiles,
  setCodeExecutionResult, 
  toggleConsoleLayoutRunButton,
  isRunning, 
  setIsRunning 
}: { 
  files: Files,
  fileKeys: string[],
  getOrderedFiles: () => [string, FileData][],
  setCodeExecutionResult: React.Dispatch<React.SetStateAction<CodeExecutionResponse | null>>, 
  toggleConsoleLayoutRunButton: () => void,
  isRunning: boolean,
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const [apiConnectionAttempts, setApiConnectionAttempts] = useState(0);

  const runCode = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    toggleConsoleLayoutRunButton();
    
    try {
      // Get all files in generation order, with main file last
      const orderedFiles = getOrderedFiles();
      
      // Concatenate all files, separated by newlines
      let combinedCode = "";
      
      for (const [filename, fileData] of orderedFiles) {
        // Add a comment to indicate the file source
        combinedCode += `\n# ---- File: ${filename} ----\n`;
        combinedCode += fileData.code;
        combinedCode += "\n\n";
      }
      
      let result: CodeExecutionResponse;
      
      // Try to use the API if we haven't failed too many times
      if (!useLocalFallback && apiConnectionAttempts < 3) {
        try {
          // Execute the code using the API
          result = await executeCode(combinedCode, 'python');
          
          // If we get here, the API is working
          setApiConnectionAttempts(0);
        } catch (error) {
          console.error("API execution failed, falling back to local execution:", error);
          
          // Increment the API connection attempt counter
          setApiConnectionAttempts(prev => prev + 1);
          
          // If we've failed 3 times, switch to local fallback
          if (apiConnectionAttempts >= 2) {
            setUseLocalFallback(true);
          }
          
          // Use local fallback for this attempt
          result = await executeCodeLocally(combinedCode, 'python');
        }
      } else {
        // Use local fallback execution
        result = await executeCodeLocally(combinedCode, 'python');
      }
      
      setCodeExecutionResult(result);
    } catch (error) {
      console.error("Failed to run code:", error);
      setCodeExecutionResult({
        success: false,
        output: '',
        error: `Failed to run code: ${String(error)}`
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <button
      onClick={runCode}
      disabled={isRunning}
      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
    >
      {isRunning ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Running Python...
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
          Run Python {useLocalFallback && '(Local Mode)'}
        </>
      )}
    </button>
  );
}