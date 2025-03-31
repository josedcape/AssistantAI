import { VM } from "vm2";
import { JSDOM } from "jsdom";
import { CodeExecutionRequest, CodeExecutionResponse } from "@shared/schema";

/**
 * Execute code in a secure sandbox environment
 */
export async function executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResponse> {
  const { code, language } = request;
  
  try {
    if (language === "javascript" || language === "js") {
      return executeJavaScript(code);
    } else if (language === "html") {
      return executeHTML(code);
    } else {
      return {
        success: false,
        output: "",
        error: `Ejecución de código en ${language} no está soportada actualmente.`
      };
    }
  } catch (error) {
    console.error("Error executing code:", error);
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Error desconocido al ejecutar el código"
    };
  }
}

/**
 * Execute JavaScript code in a secure VM
 */
function executeJavaScript(code: string): CodeExecutionResponse {
  try {
    // Create a secure VM with limited access
    const vm = new VM({
      timeout: 5000, // 5 second timeout
      sandbox: {
        console: {
          log: (...args: any[]) => results.push(...args.map(arg => String(arg))),
          info: (...args: any[]) => results.push(...args.map(arg => String(arg))),
          warn: (...args: any[]) => results.push(...args.map(arg => String(arg))),
          error: (...args: any[]) => results.push(...args.map(arg => String(arg)))
        },
        setTimeout,
        clearTimeout,
      },
      allowAsync: true
    });

    // Capture console output
    const results: string[] = [];
    
    // Execute the code
    const result = vm.run(code);
    
    // Convert any returned value to string and add to results
    if (result !== undefined && !results.includes(String(result))) {
      results.push(String(result));
    }
    
    return {
      success: true,
      output: results.join('\n')
    };
  } catch (error) {
    console.error("JavaScript execution error:", error);
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Error desconocido al ejecutar JavaScript"
    };
  }
}

/**
 * Execute HTML code with JSDOM for preview
 */
function executeHTML(code: string): CodeExecutionResponse {
  try {
    // Create a JSDOM instance to render the HTML
    const dom = new JSDOM(code, {
      runScripts: "outside-only", // Don't run scripts in the HTML for safety
      resources: "usable"
    });

    // Return HTML document details
    return {
      success: true,
      output: dom.serialize()
    };
  } catch (error) {
    console.error("HTML execution error:", error);
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Error desconocido al ejecutar HTML"
    };
  }
}
