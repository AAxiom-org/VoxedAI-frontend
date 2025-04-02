import React, { useState, useEffect } from "react";
import {
  Bot,
  Brain,
  Search,
  FileText,
  Edit,
  Code,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  RotateCw,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { z } from "zod"; // For runtime validation

// TypeScript interfaces & zod schemas
const StatusEnum = z.enum(["completed", "in-progress", "waiting"]);
type Status = z.infer<typeof StatusEnum>;

const StepDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: StatusEnum,
});
type StepDetail = z.infer<typeof StepDetailSchema>;

const WorkflowStepSchema = z.object({
  id: z.string(),
  type: z.enum(["message", "tool"]),
  status: StatusEnum,
  content: z.string().optional(),
  name: z.string().optional(),
  icon: z.any().optional(), // React component type
  isOpen: z.boolean().optional(),
  details: z.array(StepDetailSchema).optional(),
});
type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

interface AgentWorkflowIndicatorProps {
  className?: string;
  darkMode?: boolean;
}

const AgentWorkflowIndicator = ({
  className = "",
  darkMode = false,
}: AgentWorkflowIndicatorProps) => {
  // Auto-detect system color scheme if not explicitly set
  const [isDarkMode, setIsDarkMode] = useState(darkMode);

  // Listen for system color scheme changes
  useEffect(() => {
    if (darkMode) {
      setIsDarkMode(darkMode);
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);

    setIsDarkMode(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [darkMode]);

  // Simulated agent workflow steps
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: "routing",
      type: "message",
      content: "Routing to necessary tools...",
      status: "completed",
    },
    {
      id: "search",
      type: "tool",
      name: "Searching the web...",
      icon: Search,
      status: "completed",
      isOpen: false,
      details: [
        { id: "search1", name: "Query refinement", status: "completed" },
        { id: "search2", name: "Web search execution", status: "completed" },
        { id: "search3", name: "Result parsing", status: "completed" },
      ],
    },
    {
      id: "readFile",
      type: "tool",
      name: "Reading the file...",
      icon: FileText,
      status: "completed",
      isOpen: false,
      details: [
        { id: "read1", name: "File access", status: "completed" },
        { id: "read2", name: "Content extraction", status: "completed" },
        { id: "read3", name: "Data validation", status: "completed" },
      ],
    },
    {
      id: "editFile",
      type: "tool",
      name: "Editing the file...",
      icon: Edit,
      status: "completed",
      isOpen: false,
      details: [
        { id: "edit1", name: "File access", status: "completed" },
        { id: "edit2", name: "Changes applied", status: "completed" },
        { id: "edit3", name: "Verification", status: "completed" },
      ],
    },
    {
      id: "codeRunning",
      type: "tool",
      name: "Code running...",
      icon: Code,
      status: "in-progress",
      isOpen: false,
      details: [
        { id: "code1", name: "Environment setup", status: "completed" },
        { id: "code2", name: "Script execution", status: "in-progress" },
        { id: "code3", name: "Output capture", status: "waiting" },
        { id: "code4", name: "Result analysis", status: "waiting" },
      ],
    },
    {
      id: "response",
      type: "message",
      content: "Final response...",
      status: "waiting",
    },
  ]);

  // Validate steps with Zod (runtime validation)
  useEffect(() => {
    try {
      z.array(WorkflowStepSchema).parse(steps);
    } catch (error) {
      console.error("Invalid workflow steps data:", error);
    }
  }, [steps]);

  const toggleDropdown = (id: string): void => {
    setSteps(
      steps.map((step) =>
        step.id === id ? { ...step, isOpen: !step.isOpen } : step
      )
    );
  };

  // Dynamic styling based on theme
  const getStatusColor = (status: Status): string => {
    if (isDarkMode) {
      switch (status) {
        case "completed":
          return "text-emerald-400";
        case "in-progress":
          return "text-blue-400";
        case "waiting":
          return "text-gray-500";
        default:
          return "text-gray-400";
      }
    } else {
      switch (status) {
        case "completed":
          return "text-emerald-600";
        case "in-progress":
          return "text-blue-600";
        case "waiting":
          return "text-gray-400";
        default:
          return "text-gray-600";
      }
    }
  };

  const getStatusBgColor = (status: Status): string => {
    if (isDarkMode) {
      switch (status) {
        case "completed":
          return "bg-emerald-500";
        case "in-progress":
          return "bg-blue-500";
        case "waiting":
          return "bg-gray-600";
        default:
          return "bg-gray-700";
      }
    } else {
      switch (status) {
        case "completed":
          return "bg-emerald-500";
        case "in-progress":
          return "bg-blue-500";
        case "waiting":
          return "bg-gray-400";
        default:
          return "bg-gray-600";
      }
    }
  };

  const getStatusIcon = (status: Status, animated = true): React.ReactNode => {
    switch (status) {
      case "completed":
        return <Check className={`h-4 w-4 ${getStatusColor(status)}`} />;
      case "in-progress":
        return animated ? (
          <RotateCw
            className={`h-4 w-4 ${getStatusColor(status)} animate-spin`}
          />
        ) : (
          <Clock className={`h-4 w-4 ${getStatusColor(status)}`} />
        );
      case "waiting":
        return <Clock className={`h-4 w-4 ${getStatusColor(status)}`} />;
      default:
        return null;
    }
  };

  // Theme-adaptive classes
  const baseClasses = isDarkMode
    ? "bg-gray-900 text-gray-100"
    : "bg-white text-gray-800";

  const containerClasses = isDarkMode
    ? "bg-gray-800 shadow-md"
    : "bg-gray-50 shadow-sm";

  const messageClasses = isDarkMode
    ? "bg-gray-800 border border-gray-700"
    : "bg-gray-100";

  const toolCardClasses = isDarkMode
    ? "bg-gray-800 border border-gray-700 hover:bg-gray-750"
    : "bg-white hover:bg-gray-50";

  const toolDetailClasses = isDarkMode
    ? "bg-gray-750 border-gray-700"
    : "bg-gray-50 border-gray-100";

  const detailItemClasses = isDarkMode
    ? "bg-gray-800 border border-gray-700"
    : "bg-white";

  return (
    <div
      className={`w-full max-w-md mx-auto rounded-xl p-4 transition-colors duration-200 ${className}`}
    >
      <div className="flex items-center mb-4">
        <div
          className={`p-2 rounded-lg`}
        >
          <Bot className="h-5 w-5 text-indigo-400" />
        </div>
        <h3
          className={`font-medium ${
            isDarkMode ? "text-gray-100" : "text-gray-800"
          } ml-2 text-sm`}
        >
          Agent Workflow
        </h3>
      </div>

      {/* Chat-style workflow */}
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="animate-fadeIn">
            {step.type === "message" ? (
              // Message step - theme adaptive
              <div
                className={`py-2 px-3 rounded-lg ${
                  step.status === "completed"
                    ? messageClasses
                    : `${messageClasses} opacity-60`
                } text-sm transition-colors duration-200`}
              >
                <div className="flex items-center">
                  <MessageSquare className="h-3.5 w-3.5 mr-2 text-indigo-400" />
                  <span>{step.content}</span>
                </div>
              </div>
            ) : (
              // Tool step with dropdown - theme adaptive
              <div
                className={`rounded-lg overflow-hidden transition-all duration-200`}
              >
                <div
                  className="flex items-center justify-between py-2.5 px-3 cursor-pointer relative"
                  onClick={() => toggleDropdown(step.id)}
                >
                  <div className="flex items-center">
                    <div
                     
                    ></div>
                    {step.icon && (
                      <step.icon
                        className={`h-4 w-4 mr-2 ${getStatusColor(
                          step.status
                        )}`}
                      />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        isDarkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      <span
                        className={
                          isDarkMode ? "text-gray-100" : "text-gray-900"
                        }
                      >
                        {step.name}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {step.status === "in-progress" && (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          isDarkMode
                            ? "bg-blue-900/50 text-blue-300"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        Active
                      </span>
                    )}
                    {getStatusIcon(step.status)}
                    {step.isOpen ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Dropdown details - theme adaptive */}
                {step.isOpen && step.details && (
                  <div className="px-3 pb-2 pt-0">
                    <div
                      className={`pt-2 pb-1 border-t ${
                        isDarkMode ? "border-gray-700" : "border-gray-100"
                      }`}
                    >
                      <h4
                        className={`text-xs font-medium ${
                          isDarkMode ? "text-gray-400" : "text-gray-500"
                        } mb-2 flex items-center`}
                      >
                        <Brain className="h-3 w-3 mr-1 text-indigo-400" />
                        Process Details
                      </h4>
                      <div className="space-y-1.5">
                        {step.details.map((detail) => (
                          <div
                            key={detail.id}
                            className={`flex items-center justify-between py-1.5 px-2 rounded-md ${detailItemClasses}`}
                          >
                            <span
                              className={`text-xs ${
                                isDarkMode ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              {detail.name}
                            </span>
                            <div className="flex items-center">
                              {getStatusIcon(
                                detail.status,
                                detail.status === "in-progress"
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CSS for animations with cubic-bezier easing */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-3px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .animate-spin {
          animation: spin 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default AgentWorkflowIndicator;
