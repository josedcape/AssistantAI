import { VM } from "vm2";
import { JSDOM } from "jsdom";
import { CodeExecutionRequest, CodeExecutionResponse } from "@shared/schema";

// Objeto para almacenar información sobre la última ejecución
const ExecutionContext = {
  lastExecutionTimestamp: 0,
  lastHtmlContent: '',
  lastHtmlWithCss: '', // Para combinar HTML y CSS
  lastJsOutput: '',
  isHtmlMode: false
};

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
    
    // Verificar si el código JavaScript podría beneficiarse de una vista previa HTML
    const mightNeedHtmlInterface = (code.includes('document.getElementById') || 
                                  code.includes('addEventListener') || 
                                  code.includes('querySelector') || 
                                  code.includes('createElement')) &&
                                  (language === "javascript" || language === "js");
    
    if (mightNeedHtmlInterface) {
      // Este JavaScript parece interactuar con el DOM, entregamos una vista HTML interactiva
      return executeJavaScriptWithHtmlInterface(code);
    } else if (language === "javascript" || language === "js") {
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
      code.replace(/\bimport\s+\{([^}]+)\}\s+from\s+['"](.+?)['"]/g, (_, imports: string, module: string) => {
        importStatements.push(`// Simulación de: import { ${imports} } from "${module}"`);
        imports.split(',').map((imp: string) => imp.trim()).forEach((imp: string) => {
          const varName = imp.split(' as ').pop()?.trim() || imp.trim();
          importStatements.push(`const ${varName} = { /* Simulación de módulo importado */ };`);
        });
        return _;
      });
      
      // Extraer default imports
      code.replace(/\bimport\s+(\w+)\s+from\s+['"](.+?)['"]/g, (_, varName: string, module: string) => {
        importStatements.push(`// Simulación de: import ${varName} from "${module}"`);
        importStatements.push(`const ${varName} = { /* Simulación de módulo importado */ };`);
        return _;
      });
      
      // Extraer exports para mejor simulación
      code.replace(/\bexport\s+(const|let|var|function|class)\s+(\w+)/g, (_, type: string, name: string) => {
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
          querySelector: () => ({ 
            addEventListener: () => results.push("📝 Event listener agregado (simulado)"),
            style: {},
            value: "",
            innerText: "",
            innerHTML: "",
            classList: {
              add: () => {},
              remove: () => {},
              toggle: () => {},
              contains: () => false
            },
            setAttribute: () => {},
            getAttribute: () => null,
            removeAttribute: () => {}
          }),
          querySelectorAll: () => ({
            forEach: (callback: Function) => {
              results.push("📝 querySelectorAll forEach llamado (simulado)");
            },
            length: 0
          }),
          getElementById: () => ({ 
            addEventListener: () => results.push("📝 Event listener agregado (simulado)"),
            style: {},
            value: "",
            innerText: "",
            innerHTML: "",
            classList: {
              add: () => {},
              remove: () => {},
              toggle: () => {},
              contains: () => false
            },
            setAttribute: () => {},
            getAttribute: () => null,
            removeAttribute: () => {}
          }),
          getElementsByClassName: () => [],
          getElementsByTagName: () => [],
          createElement: (tag: string) => ({
            style: {},
            className: "",
            id: "",
            innerText: "",
            innerHTML: "",
            appendChild: () => {},
            setAttribute: () => {},
            addEventListener: () => results.push(`📝 Event listener agregado a elemento ${tag} (simulado)`)
          }),
          body: {
            appendChild: () => {},
            addEventListener: () => results.push("📝 Event listener agregado al body (simulado)")
          },
          addEventListener: (event: string, callback: Function) => {
            results.push(`📝 Event listener '${event}' agregado al documento (simulado)`);
          }
        },
        window: {
          alert: (msg: string) => results.push(`🔔 Alert: ${msg}`),
          confirm: () => false,
          prompt: () => null,
          addEventListener: (event: string, callback: Function) => {
            results.push(`📝 Event listener '${event}' agregado a window (simulado)`);
            if (event === 'load' && typeof callback === 'function') {
              // Ejecutar inmediatamente callbacks de window.onload
              try {
                callback();
              } catch (e) {
                results.push(`❌ Error en window.addEventListener('load'): ${e instanceof Error ? e.message : String(e)}`);
              }
            }
          },
          location: {
            href: "https://example.com",
            host: "example.com",
            pathname: "/",
            search: "",
            hash: ""
          },
          localStorage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
          },
          sessionStorage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
          }
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
/**
 * Execute JavaScript code with an HTML interface for interactive visualization
 */
function executeJavaScriptWithHtmlInterface(code: string): CodeExecutionResponse {
  try {
    // Crear una plantilla HTML básica para interactuar con el código JavaScript
    const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JavaScript Interactivo</title>
  <style>
    /* Estilos básicos para la interfaz */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.5;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .container {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .chat-input {
      display: flex;
      gap: 10px;
    }
    
    input[type="text"] {
      flex: 1;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    button {
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
    }
    
    button:hover {
      background-color: #45a049;
    }
    
    .chat-output {
      min-height: 200px;
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      background-color: #f9f9f9;
    }
    
    .console-log {
      margin-top: 20px;
      padding: 10px;
      background-color: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-family: monospace;
      max-height: 150px;
      overflow-y: auto;
    }
    
    .user-message {
      background-color: #e1f5fe;
      padding: 8px 12px;
      border-radius: 15px;
      margin: 5px 0;
      align-self: flex-end;
      max-width: 80%;
      word-wrap: break-word;
    }
    
    .bot-message {
      background-color: #f1f1f1;
      padding: 8px 12px;
      border-radius: 15px;
      margin: 5px 0;
      align-self: flex-start;
      max-width: 80%;
      word-wrap: break-word;
    }
    
    .message-container {
      display: flex;
      flex-direction: column;
    }
    
    @media (max-width: 600px) {
      body { padding: 10px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Interfaz Interactiva JavaScript</h2>
    
    <!-- Chat UI -->
    <div class="chat-output" id="chatOutput"></div>
    
    <div class="chat-input">
      <input type="text" id="userInput" placeholder="Escribe un mensaje...">
      <button id="sendButton">Enviar</button>
    </div>
    
    <!-- Controles adicionales -->
    <div style="display: flex; gap: 10px;">
      <button id="clearButton">Limpiar chat</button>
      <button id="resetButton">Reiniciar</button>
    </div>
    
    <!-- Consola para logs -->
    <div class="console-log" id="consoleOutput">
      <div>Consola:</div>
    </div>
  </div>

  <script>
    // Configuración para capturar la salida de consola
    const consoleOutput = document.getElementById('consoleOutput');
    const originalConsole = { ...console };
    
    function appendToConsole(message, type = 'log') {
      if (!consoleOutput) return;
      const item = document.createElement('div');
      item.className = 'console-' + type;
      
      if (typeof message === 'object') {
        try {
          message = JSON.stringify(message, null, 2);
        } catch (e) {
          message = message.toString();
        }
      }
      
      item.textContent = message;
      consoleOutput.appendChild(item);
      consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
    
    console.log = function(...args) {
      args.forEach(arg => appendToConsole(arg, 'log'));
      originalConsole.log(...args);
    };
    
    console.error = function(...args) {
      args.forEach(arg => appendToConsole(arg, 'error'));
      originalConsole.error(...args);
    };
    
    console.warn = function(...args) {
      args.forEach(arg => appendToConsole(arg, 'warn'));
      originalConsole.warn(...args);
    };
    
    console.info = function(...args) {
      args.forEach(arg => appendToConsole(arg, 'info'));
      originalConsole.info(...args);
    };
    
    // Capturar errores no controlados
    window.onerror = function(message, source, lineno, colno, error) {
      console.error('Error: ' + message);
      return true;
    };
    
    // Función para agregar mensajes al chat
    function addMessage(text, isUser = false) {
      const chatOutput = document.getElementById('chatOutput');
      if (!chatOutput) return;
      
      const messageElement = document.createElement('div');
      messageElement.className = isUser ? 'user-message' : 'bot-message';
      messageElement.textContent = text;
      
      const container = document.createElement('div');
      container.className = 'message-container';
      container.appendChild(messageElement);
      
      chatOutput.appendChild(container);
      chatOutput.scrollTop = chatOutput.scrollHeight;
    }
    
    // Configurar eventos UI
    document.getElementById('sendButton').addEventListener('click', function() {
      const userInput = document.getElementById('userInput');
      const message = userInput.value.trim();
      
      if (message) {
        addMessage(message, true);
        userInput.value = '';
        
        // Si existe una función handleUserInput en el código del usuario, la llamamos
        if (typeof window.handleUserInput === 'function') {
          try {
            const response = window.handleUserInput(message);
            if (response && typeof response === 'string') {
              // Si la función devuelve un string, lo mostramos como respuesta
              setTimeout(() => addMessage(response), 500);
            } else if (response instanceof Promise) {
              // Si es una promesa, esperamos el resultado
              response
                .then(result => {
                  if (result && typeof result === 'string') {
                    setTimeout(() => addMessage(result), 500);
                  }
                })
                .catch(err => console.error('Error procesando respuesta:', err));
            }
          } catch (error) {
            console.error('Error al procesar entrada:', error.message);
          }
        }
      }
    });
    
    // Enviar mensaje al presionar Enter
    document.getElementById('userInput').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        document.getElementById('sendButton').click();
      }
    });
    
    // Botón para limpiar chat
    document.getElementById('clearButton').addEventListener('click', function() {
      const chatOutput = document.getElementById('chatOutput');
      if (chatOutput) chatOutput.innerHTML = '';
    });
    
    // Botón para reiniciar
    document.getElementById('resetButton').addEventListener('click', function() {
      const chatOutput = document.getElementById('chatOutput');
      const consoleOutput = document.getElementById('consoleOutput');
      if (chatOutput) chatOutput.innerHTML = '';
      if (consoleOutput) {
        consoleOutput.innerHTML = '<div>Consola:</div>';
      }
      console.log('Interfaz reiniciada');
    });
    
    // Crear variables globales que puedan ser útiles para chatbots
    window.sendResponse = function(text) {
      if (typeof text === 'string') {
        addMessage(text);
      }
    };
    
    // Inicializar mensajes
    console.log('Interfaz JavaScript interactiva lista');
    
    // Ejecutar el código del usuario
    try {
      // Código JavaScript del usuario
      ${code}
      
      // Si hay una función init, main o start, ejecutarla
      if (typeof window.init === 'function') {
        window.init();
      } else if (typeof window.main === 'function') {
        window.main();
      } else if (typeof window.start === 'function') {
        window.start();
      }
      
      // Disparar DOMContentLoaded y load para que funcionen los event listeners
      document.dispatchEvent(new Event('DOMContentLoaded'));
      window.dispatchEvent(new Event('load'));
      
    } catch (error) {
      console.error('Error al ejecutar el código:', error.message);
    }
  </script>
</body>
</html>`;

    return {
      success: true,
      output: "Código JavaScript preparado para visualización interactiva",
      visualOutput: true,
      htmlContent: htmlTemplate
    };
  } catch (error) {
    console.error("JS with HTML interface error:", error);
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Error al crear la interfaz interactiva"
    };
  }
}

function executeHTML(code: string): CodeExecutionResponse {
  try {
    // Actualizar el contexto de ejecución
    ExecutionContext.isHtmlMode = true;
    ExecutionContext.lastExecutionTimestamp = Date.now();
    ExecutionContext.lastHtmlContent = code;
    
    // Check if the HTML has basic structure, if not add it
    let processedCode = code;
    if (!code.includes('<html') && !code.includes('<HTML')) {
      processedCode = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vista previa HTML</title>
  <style>
    /* Estilos básicos para mejorar la visualización */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.5;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 15px;
    }
    
    /* Estilos de responsive design básicos */
    @media (max-width: 768px) {
      body { padding: 10px; }
    }
  </style>
</head>
<body>
${code}
<script>
  // Código para monitorear y reportar mensajes de consola
  (function() {
    const originalConsole = { ...console };
    console.log = function(...args) {
      originalConsole.log(...args);
      try {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        // Aquí podríamos enviar los logs al servidor si fuera necesario
      } catch (e) {
        // Ignorar errores de logging
      }
    };
    
    console.error = function(...args) {
      originalConsole.error(...args);
      try {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        // Reportar errores
      } catch (e) {
        // Ignorar errores de logging
      }
    };
    
    // Capturar errores no controlados
    window.addEventListener('error', function(event) {
      originalConsole.error('Error no controlado:', event.message);
    });
  })();
</script>
</body>
</html>`;
    }
    
    // Si hay CSS guardado de una ejecución anterior, lo integramos
    // Esto permite probar CSS y HTML de forma separada
    if (ExecutionContext.lastHtmlWithCss && code.includes('<head>')) {
      // Intentamos extraer el CSS para insertarlo en el HTML actual
      try {
        const styleMatch = ExecutionContext.lastHtmlWithCss.match(/<style>([\s\S]*?)<\/style>/);
        const cssContent = styleMatch ? styleMatch[1] : '';
        
        if (cssContent && !processedCode.includes(cssContent)) {
          processedCode = processedCode.replace(
            /<head>([\s\S]*?)<\/head>/,
            `<head>$1<style>${cssContent}</style></head>`
          );
        }
      } catch (e) {
        console.warn("Error integrating CSS into HTML:", e);
      }
    }
    
    // Create a JSDOM instance to render the HTML
    const dom = new JSDOM(processedCode, {
      runScripts: "dangerously", // Enable scripts to run for better preview
      resources: "usable",
      url: "https://example.org/", // Necesario para que algunas APIs del DOM funcionen correctamente
      referrer: "https://example.com/",
      contentType: "text/html",
      includeNodeLocations: true,
      storageQuota: 10000000,
    });
    
    // Guardar el HTML procesado con el CSS integrado
    ExecutionContext.lastHtmlWithCss = dom.serialize();

    // Return HTML document details
    return {
      success: true,
      output: dom.serialize(),
      visualOutput: true // Flag para indicar que es una salida visual
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
    // Guardamos el CSS para usarlo con HTML posteriormente
    ExecutionContext.lastExecutionTimestamp = Date.now();
    
    // Si hay contenido HTML previo, integramos el CSS con ese HTML
    if (ExecutionContext.isHtmlMode && ExecutionContext.lastHtmlContent) {
      // Intentamos aplicar el CSS al HTML existente
      return executeHTML(ExecutionContext.lastHtmlContent);
    }
    
    // Template enriquecido con varios elementos para probar los estilos
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vista previa CSS</title>
  <style>
    /* Estilos base para mejorar la visualización */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.5;
      color: #333;
      margin: 0;
      padding: 20px;
      background-color: #f8f9fa;
    }
    
    .css-preview-container {
      max-width: 1000px;
      margin: 0 auto;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 20px;
    }
    
    .preview-section {
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
    }
    
    .preview-title {
      font-size: 18px;
      margin-bottom: 10px;
      color: #555;
    }
    
    code {
      background-color: #f5f5f5;
      padding: 2px 5px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 14px;
    }
    
    /* Tus estilos personalizados */
${code}
  </style>
</head>
<body>
  <div class="css-preview-container">
    <h1>Vista previa de CSS</h1>
    <p>Esta página muestra cómo se ven los elementos con los estilos que has definido.</p>
    
    <div class="preview-section">
      <h2 class="preview-title">Tipografía</h2>
      <h1>Encabezado H1</h1>
      <h2>Encabezado H2</h2>
      <h3>Encabezado H3</h3>
      <p>Párrafo normal con <strong>texto en negrita</strong> y <em>texto en cursiva</em>.</p>
      <p>Otro párrafo con <a href="#">un enlace</a> para probar los estilos.</p>
      <blockquote>Esta es una cita para probar estilos de blockquote.</blockquote>
    </div>
    
    <div class="preview-section">
      <h2 class="preview-title">Contenedores y Clases</h2>
      <div class="container">Un div con clase "container"</div>
      <div class="box">Un div con clase "box"</div>
      <div class="card">
        <div class="card-header">Encabezado de tarjeta</div>
        <div class="card-body">Cuerpo de la tarjeta</div>
        <div class="card-footer">Pie de la tarjeta</div>
      </div>
    </div>
    
    <div class="preview-section">
      <h2 class="preview-title">Elementos de Formulario</h2>
      <form>
        <div class="form-group">
          <label for="input1">Campo de texto:</label>
          <input type="text" id="input1" class="form-control" placeholder="Escribe aquí...">
        </div>
        <div class="form-group">
          <label for="select1">Selección:</label>
          <select id="select1" class="form-control">
            <option>Opción 1</option>
            <option>Opción 2</option>
          </select>
        </div>
        <div class="form-group">
          <label>Checkbox:</label>
          <div class="checkbox">
            <input type="checkbox" id="check1">
            <label for="check1">Opción de checkbox</label>
          </div>
        </div>
        <div class="form-group">
          <button type="button" class="btn">Botón normal</button>
          <button type="button" class="btn btn-primary">Botón primario</button>
          <button type="button" class="btn btn-secondary">Botón secundario</button>
        </div>
      </form>
    </div>
    
    <div class="preview-section">
      <h2 class="preview-title">Elementos Flexbox</h2>
      <div class="flex-container">
        <div class="flex-item">Flex item 1</div>
        <div class="flex-item">Flex item 2</div>
        <div class="flex-item">Flex item 3</div>
      </div>
    </div>
    
    <div class="preview-section">
      <h2 class="preview-title">Grid Layout</h2>
      <div class="grid-container">
        <div class="grid-item">Grid item 1</div>
        <div class="grid-item">Grid item 2</div>
        <div class="grid-item">Grid item 3</div>
        <div class="grid-item">Grid item 4</div>
      </div>
    </div>
  </div>
</body>
</html>`;

    // Guardar el HTML con CSS para uso futuro
    ExecutionContext.lastHtmlWithCss = html;
    
    // Return the HTML with the CSS applied
    return {
      success: true,
      output: html,
      visualOutput: true
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
