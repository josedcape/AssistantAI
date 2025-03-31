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
    } else if (language === "css") {
      return executeCss(code);
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
          log: (...args: any[]) => results.push(...args.map(arg => formatOutput(arg))),
          info: (...args: any[]) => results.push(`ℹ️ ${args.map(arg => formatOutput(arg)).join(' ')}`),
          warn: (...args: any[]) => results.push(`⚠️ ${args.map(arg => formatOutput(arg)).join(' ')}`),
          error: (...args: any[]) => results.push(`❌ ${args.map(arg => formatOutput(arg)).join(' ')}`)
        },
        Math,
        Date,
        Array,
        Object,
        String,
        RegExp,
        JSON,
        parseInt,
        parseFloat,
        setTimeout: (fn: Function, delay: number) => {
          if (delay > 3000) delay = 3000; // Limit timeout to 3s
          setTimeout(() => {
            try {
              fn();
            } catch (e) {
              results.push(`❌ Error in setTimeout: ${e instanceof Error ? e.message : String(e)}`);
            }
          }, delay);
        },
        clearTimeout,
        setInterval: (fn: Function, delay: number) => {
          if (delay < 300) delay = 300; // Prevent very rapid intervals
          return setInterval(() => {
            try {
              fn();
            } catch (e) {
              results.push(`❌ Error in setInterval: ${e instanceof Error ? e.message : String(e)}`);
              // Auto-clear problematic intervals
              clearInterval(intervalId);
            }
          }, delay);
        },
        clearInterval,
        document: {
          querySelector: () => null,
          querySelectorAll: () => [],
          getElementById: () => null,
          getElementsByClassName: () => [],
          getElementsByTagName: () => []
        },
        window: {
          alert: (msg: string) => results.push(`🔔 Alert: ${msg}`),
          confirm: () => false,
          prompt: () => null
        },
        fetch: () => Promise.resolve({
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(""),
          status: 200
        })
      },
      allowAsync: true
    });

    // Capture console output
    const results: string[] = [];
    
    let intervalId: any;
    
    // Execute the code
    const result = vm.run(code);
    
    // Convert any returned value to string and add to results
    if (result !== undefined && !results.includes(formatOutput(result))) {
      results.push(`Resultado: ${formatOutput(result)}`);
    }
    
    return {
      success: true,
      output: results.length > 0 ? results.join('\n') : "Código ejecutado correctamente (sin salida)"
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
 * Formats JavaScript output to be more readable
 */
function formatOutput(value: any): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  
  try {
    // For objects and arrays, create formatted JSON
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    
    // For all other types, convert to string
    return String(value);
  } catch (e) {
    return `[Error formatting output: ${e instanceof Error ? e.message : String(e)}]`;
  }
}

/**
 * Execute HTML code with JSDOM for preview
 */
function executeHTML(code: string): CodeExecutionResponse {
  try {
    // Check if the HTML has basic structure, if not add it
    let processedCode = code;
    if (!code.includes('<html') && !code.includes('<HTML')) {
      processedCode = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vista previa HTML</title>
</head>
<body>
${code}
</body>
</html>`;
    }
    
    // Create a JSDOM instance to render the HTML
    const dom = new JSDOM(processedCode, {
      runScripts: "dangerously", // Enable scripts to run for better preview
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

/**
 * Handle CSS code
 */
function executeCss(code: string): CodeExecutionResponse {
  try {
    // Create a simple HTML page to preview the CSS
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vista previa CSS</title>
  <style>
${code}
  </style>
</head>
<body>
  <div class="css-preview-container">
    <h1>Ejemplo de estilos aplicados</h1>
    <p>Este es un párrafo de ejemplo para mostrar estilos de texto.</p>
    <div class="box">Este es un contenedor con clase "box"</div>
    <button class="btn">Botón de ejemplo</button>
    <div class="flex-container">
      <div class="flex-item">Item 1</div>
      <div class="flex-item">Item 2</div>
      <div class="flex-item">Item 3</div>
    </div>
  </div>
</body>
</html>`;
    
    // Return the HTML with the CSS applied
    return {
      success: true,
      output: html
    };
  } catch (error) {
    console.error("CSS execution error:", error);
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Error desconocido al ejecutar CSS"
    };
  }
}
