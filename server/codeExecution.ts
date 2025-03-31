import { VM } from "vm2";
import { JSDOM } from "jsdom";
import { CodeExecutionRequest, CodeExecutionResponse } from "@shared/schema";

/**
 * Execute code in a secure sandbox environment
 */
export async function executeCode(request: CodeExecutionRequest): Promise<CodeExecutionResponse> {
  let { code, language } = request;
  
  try {
    // Detectamos automáticamente el lenguaje si parece incorrecto
    const detectedLanguage = detectCodeLanguage(code);
    
    // Si el lenguaje detectado es diferente al proporcionado, mostrar una advertencia
    if (detectedLanguage !== language && detectedLanguage !== "unknown") {
      console.warn(`Lenguaje declarado: ${language}, pero se detectó: ${detectedLanguage}`);
      // Si el usuario especificó un lenguaje no soportado pero detectamos uno soportado, usamos el detectado
      if ((language !== "javascript" && language !== "js" && language !== "html" && language !== "css") &&
          (detectedLanguage === "javascript" || detectedLanguage === "html" || detectedLanguage === "css")) {
        language = detectedLanguage;
      }
    }
    
    if (language === "javascript" || language === "js") {
      return executeJavaScript(code);
    } else if (language === "html") {
      return executeHTML(code);
    } else if (language === "css") {
      return executeCss(code);
    } else {
      // Intentamos ejecutar como JavaScript si el lenguaje no está soportado (como fallback)
      if (detectedLanguage === "javascript") {
        console.log("Intentando ejecutar como JavaScript aunque se especificó otro lenguaje");
        return executeJavaScript(code);
      }
      
      return {
        success: false,
        output: "",
        error: `Ejecución de código en ${language} no está soportada actualmente. 
        
Solo se soporta JavaScript, HTML y CSS. Por favor, genera el código en uno de estos lenguajes.`
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
 * Detecta el lenguaje del código basado en su contenido
 */
function detectCodeLanguage(code: string): string {
  // Extrae las primeras líneas para analizar
  const firstLines = code.split('\n').slice(0, 10).join('\n');
  
  // Detecta Javascript/TypeScript
  if (firstLines.includes('function ') || 
      firstLines.includes('const ') || 
      firstLines.includes('let ') || 
      firstLines.includes('import ') && firstLines.includes('from ') ||
      firstLines.includes('export ') ||
      firstLines.includes('() =>') ||
      /class\s+\w+\s*\{/.test(firstLines)) {
    return "javascript";
  }
  
  // Detecta HTML
  if (firstLines.includes('<html') || 
      firstLines.includes('<!DOCTYPE html') || 
      (firstLines.includes('<div') && firstLines.includes('</div>')) ||
      (firstLines.includes('<p') && firstLines.includes('</p>'))) {
    return "html";
  }
  
  // Detecta CSS
  if ((firstLines.includes('{') && firstLines.includes('}') && 
      (firstLines.includes('px') || firstLines.includes('em') || firstLines.includes('rem'))) ||
      firstLines.includes('@media') ||
      /\.\w+\s*\{/.test(firstLines)) {
    return "css";
  }
  
  // Detecta Python
  if (firstLines.includes('def ') || 
      firstLines.includes('import ') && !firstLines.includes('from ') ||
      firstLines.includes('print(') ||
      firstLines.includes('if __name__ == "__main__"')) {
    return "python";
  }
  
  // Si no se pudo determinar, devolvemos unknown
  return "unknown";
}

/**
 * Execute JavaScript code in a secure VM
 */
function executeJavaScript(code: string): CodeExecutionResponse {
  try {
    // Detectar si hay imports o exports en el código
    const hasModuleSyntax = /\b(import|export)\b/.test(code);
    
    // Si hay imports o exports, mostrar un mensaje de error más claro
    if (hasModuleSyntax) {
      // Extraer el lenguaje detectado de las primeras líneas para mostrar un mejor mensaje
      const firstLines = code.split('\n').slice(0, 5).join('\n');
      let detectedLanguage = "JavaScript";
      
      if (firstLines.includes("import random") || firstLines.includes("def ") || firstLines.includes("print(")) {
        detectedLanguage = "Python";
      } else if (firstLines.includes("package ") || firstLines.includes("public class")) {
        detectedLanguage = "Java";
      }
      
      if (detectedLanguage !== "JavaScript") {
        return {
          success: false,
          output: "",
          error: `Se detectó código en ${detectedLanguage}. Este entorno solo ejecuta JavaScript. 
          
El agente generó código en un lenguaje incorrecto. Por favor, intenta nuevamente seleccionando el lenguaje JavaScript explícitamente en tu prompt o usando un agente diferente.`
        };
      }

      // Para código JavaScript con módulos, transformarlo para ejecución en el entorno actual
      const importStatements: string[] = [];
      const exportStatements: string[] = [];
      
      // Extraer imports para simular su funcionalidad
      code.replace(/\bimport\s+\{([^}]+)\}\s+from\s+['"](.+?)['"]/g, (_, imports, module) => {
        importStatements.push(`// Simulación de: import { ${imports} } from "${module}"`);
        imports.split(',').map(imp => imp.trim()).forEach(imp => {
          const varName = imp.split(' as ').pop()?.trim() || imp.trim();
          importStatements.push(`const ${varName} = { /* Simulación de módulo importado */ };`);
        });
        return _;
      });
      
      // Extraer default imports
      code.replace(/\bimport\s+(\w+)\s+from\s+['"](.+?)['"]/g, (_, varName, module) => {
        importStatements.push(`// Simulación de: import ${varName} from "${module}"`);
        importStatements.push(`const ${varName} = { /* Simulación de módulo importado */ };`);
        return _;
      });
      
      // Extraer exports para mejor simulación
      code.replace(/\bexport\s+(const|let|var|function|class)\s+(\w+)/g, (_, type, name) => {
        exportStatements.push(`// Se exportaría: ${name}`);
        return `${type} ${name}`;
      });
      
      // Preparamos el código transformado
      code = `
// Declaraciones de import/export detectadas. En este entorno simulado:
console.log("⚠️ Las importaciones y exportaciones no están disponibles en este entorno de ejecución.");
console.log("ℹ️ Mostrando una simulación de la ejecución del código...");

// Simulaciones para evitar errores
${importStatements.join('\n')}

// Código principal (con imports/exports comentados)
${code.replace(/\bimport\s+.*?from\s+['"].*?['"]/g, '// $&')
       .replace(/\bimport\s+['"].*?['"]/g, '// $&')
       .replace(/\bexport\s+/g, '// export ')}

${exportStatements.join('\n')}

console.log("✅ Código transformado para simulación. Los imports/exports reales funcionarían en un entorno Node.js.");
`;
    }

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
        }),
        // Mock require para código CommonJS
        require: (moduleName: string) => {
          results.push(`⚠️ Módulo "${moduleName}" simulado en el entorno de ejecución.`);
          return {};
        }
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
