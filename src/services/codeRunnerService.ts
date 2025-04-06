/**
 * Service to handle code execution requests.
 * Uses a real API endpoint to execute code in a secure sandbox.
 */

// Define request type for code execution
export type CodeExecutionRequest = {
  code: string;
  language?: string;
  input_data?: Record<string, any>;
  timeout?: number;
};

// Define response type for code execution
export type CodeExecutionResponse = {
  success: boolean;
  stdout?: string;
  stderr?: string;
  execution_time?: number;
  result?: Record<string, any>;
  output?: string;
  error?: string;
  executionTime?: number;
  // Track if there was a code execution error (separate from API success)
  has_execution_error?: boolean;
};

const API_BASE_URL = "https://voxed.aidanandrews.org/api/v1";

/**
 * Executes code by sending it to a real API endpoint
 *
 * @param code The code to execute
 * @param language The programming language of the code (defaults to python)
 * @param inputData Optional input data for the code
 * @param timeout Optional timeout in seconds
 * @returns A promise that resolves to the execution results
 */
export const executeCode = async (
  code: string,
  language: string = "python",
  inputData: Record<string, any> = {},
  timeout: number = 30,
): Promise<CodeExecutionResponse> => {
  console.log(`Sending ${language} code to API for execution...`);

  try {
    // Format the request payload
    const requestPayload: CodeExecutionRequest = {
      code,
      language: language === "javascript" ? "js" : language, // Some APIs use 'js' instead of 'javascript'
      input_data: inputData,
      timeout,
    };

    // Send the code execution request to the API
    const response = await fetch(`${API_BASE_URL}/code/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    // Handle API errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    // Parse the response
    const result = await response.json();

    console.log("API Response:", result);

    // Check if there's stderr content even though the API reported success
    // This happens for syntax errors, etc. when the API successfully processed the request
    // but the code itself had errors
    const hasExecutionError = result.stderr && result.stderr.trim().length > 0;

    // Format the response to our standardized format
    return {
      success: result.success,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      execution_time: result.execution_time,
      result: result.result,
      // Backward compatibility fields
      output: result.stdout || "",
      error: result.stderr || "",
      executionTime: result.execution_time,
      // Add flag to indicate if there was an execution error
      has_execution_error: hasExecutionError,
    };
  } catch (error: any) {
    console.error("Error in code execution:", error);

    // Return a formatted error response
    return {
      success: false,
      stdout: "",
      stderr: error.message || "Unknown error",
      output: "",
      error: `Execution failed: ${error.message || "Unknown error"}`,
      has_execution_error: true,
    };
  }
};

/**
 * Fallback execution for when the API is unavailable
 * This can be used for testing or when offline
 */
export const executeCodeLocally = async (
  code: string,
  language: string,
): Promise<CodeExecutionResponse> => {
  console.log(`Executing ${language} code locally (fallback mode)...`);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    // For JavaScript code, we can actually evaluate it in a controlled way
    if (language === "javascript") {
      try {
        // Create a safe evaluation environment (this is a very basic implementation)
        // In production, you would want more robust sandboxing
        const consoleOutput: string[] = [];
        const fakeCaptureConsole = {
          log: (...args: any[]) =>
            consoleOutput.push(args.map(String).join(" ")),
          error: (...args: any[]) =>
            consoleOutput.push(`ERROR: ${args.map(String).join(" ")}`),
          warn: (...args: any[]) =>
            consoleOutput.push(`WARNING: ${args.map(String).join(" ")}`),
        };

        // Safety timeout to prevent infinite loops
        const timeoutPromise = new Promise<CodeExecutionResponse>(
          (_, reject) => {
            setTimeout(
              () =>
                reject({
                  success: false,
                  output: "",
                  error: "Execution timed out after 5 seconds",
                }),
              5000,
            );
          },
        );

        // Actual execution promise
        const executionPromise = new Promise<CodeExecutionResponse>(
          async (resolve) => {
            const startTime = performance.now();

            // Replace console methods to capture output
            const originalConsole = { ...console };
            Object.assign(console, fakeCaptureConsole);

            try {
              // Very basic and unsafe evaluation - for demo purposes only
              // In a real app, this should be done server-side in a proper sandbox
              const result = Function(`
              "use strict";
              ${code}
            `)();

              if (
                result !== undefined &&
                !consoleOutput.includes(String(result))
              ) {
                consoleOutput.push(`Return value: ${result}`);
              }

              const endTime = performance.now();
              resolve({
                success: true,
                stdout: consoleOutput.join("\n"),
                output: consoleOutput.join("\n"),
                execution_time: Math.round(endTime - startTime) / 1000,
                executionTime: Math.round(endTime - startTime),
              });
            } catch (err: any) {
              resolve({
                success: false,
                stdout: consoleOutput.join("\n"),
                stderr: err.toString(),
                output: consoleOutput.join("\n"),
                error: err.toString(),
              });
            } finally {
              // Restore original console
              Object.assign(console, originalConsole);
            }
          },
        );

        // Race execution against timeout
        return await Promise.race([executionPromise, timeoutPromise]);
      } catch (err: any) {
        return {
          success: false,
          stderr: `Error evaluating JavaScript: ${err.toString()}`,
          output: "",
          error: `Error evaluating JavaScript: ${err.toString()}`,
        };
      }
    }

    // For other languages, simulate execution with mock responses
    const mockResponses: Record<string, CodeExecutionResponse> = {
      python: {
        success: true,
        stdout: "Hello, world!\nThe result is 30\n",
        execution_time: 0.00212,
        result: { x: 10, y: 20, result: 30 },
        output: "Hello, world!\nThe result is 30\n",
        executionTime: 212,
      },
      java: {
        success: true,
        stdout:
          "Java execution output would appear here.\nThis is a simulated response.",
        execution_time: 0.543,
        output:
          "Java execution output would appear here.\nThis is a simulated response.",
        executionTime: 543,
      },
      cpp: {
        success: true,
        stdout:
          "C++ execution output would appear here.\nA real implementation would compile and run this code on a server.",
        execution_time: 0.321,
        output:
          "C++ execution output would appear here.\nA real implementation would compile and run this code on a server.",
        executionTime: 321,
      },
      rust: {
        success: true,
        stdout:
          "Rust execution output would appear here.\nCompilation and execution would happen on a secure server in a real implementation.",
        execution_time: 0.432,
        output:
          "Rust execution output would appear here.\nCompilation and execution would happen on a secure server in a real implementation.",
        executionTime: 432,
      },
      php: {
        success: true,
        stdout:
          "PHP execution output would appear here.\nA real implementation would have a PHP interpreter on the server.",
        execution_time: 0.198,
        output:
          "PHP execution output would appear here.\nA real implementation would have a PHP interpreter on the server.",
        executionTime: 198,
      },
    };

    return (
      mockResponses[language] || {
        success: false,
        stdout: "",
        stderr: `Language "${language}" is not supported for execution.`,
        output: "",
        error: `Language "${language}" is not supported for execution.`,
      }
    );
  } catch (error: any) {
    console.error("Error in code execution:", error);
    return {
      success: false,
      stderr: `Execution failed: ${error.message || "Unknown error"}`,
      output: "",
      error: `Execution failed: ${error.message || "Unknown error"}`,
    };
  }
};
