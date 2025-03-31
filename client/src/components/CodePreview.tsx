import { useState, useEffect, useRef } from "react";
import { File } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface CodePreviewProps {
  file: File;
  allFiles?: File[];
}

const CodePreview = ({ file, allFiles }: CodePreviewProps) => {
  const [previewHtml, setPreviewHtml] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisualPreview, setIsVisualPreview] = useState(false);
  const { toast } = useToast();
  
  // Referencia para el iframe de JavaScript visual
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Función para ejecutar el código del archivo
  const executeCode = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result;
      
      // Si tenemos múltiples archivos relacionados (HTML, CSS, JS), enviamos todos juntos
      if (allFiles && allFiles.length > 0) {
        // Encontrar los archivos HTML, CSS y JS
        const htmlFile = allFiles.find(f => f.type === 'html' || f.name.endsWith('.html'));
        const cssFile = allFiles.find(f => f.type === 'css' || f.name.endsWith('.css'));
        const jsFile = allFiles.find(f => f.type === 'javascript' || f.name.endsWith('.js'));
        
        console.log("Archivos encontrados:", { 
          html: htmlFile?.name, 
          css: cssFile?.name, 
          js: jsFile?.name 
        });
        
        // Preparar el código con un formato de múltiples archivos
        const filesToSend = allFiles.map(f => ({
          name: f.name,
          content: f.content,
          language: f.type,
          type: f.type
        }));
        
        const response = await apiRequest("POST", "/api/execute", {
          code: JSON.stringify({ files: filesToSend }),
          language: htmlFile ? 'html' : (file.type || 'javascript') // Preferir HTML si está disponible
        });
        
        result = await response.json();
      } else {
        // Para un solo archivo, usamos el método tradicional
        const response = await apiRequest("POST", "/api/execute", {
          code: file.content,
          language: file.type
        });

        result = await response.json();
      }

      console.log("Respuesta de ejecución:", result); // Añadimos log para depuración

      if (!result.success) {
        setError(result.error || "Error al ejecutar el código");
        toast({
          title: "Error",
          description: result.error || "Error al ejecutar el código",
          variant: "destructive"
        });
        setPreviewHtml("");
      } else {
        // Si la respuesta indica que es contenido visual (HTML/CSS), activamos la vista visual
        if (result.visualOutput) {
          setIsVisualPreview(true);
          
          // Si hay contenido HTML específico, lo usamos para el iframe
          if (result.htmlContent) {
            // En este caso, usaremos el contenido HTML directamente
            setPreviewHtml(result.htmlContent);
          }
        } else {
          // Guardamos la salida de texto estándar para vista no visual (consola)
          setPreviewHtml(result.output);
        }
      }
    } catch (err) {
      setError("Error al generar la vista previa");
      console.error("Preview error:", err);
      toast({
        title: "Error",
        description: "No se pudo generar la vista previa",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para crear un ambiente visual para JavaScript
  const createVisualEnvironment = () => {
    // Solo para JavaScript
    if (file.type !== "javascript") return;
    
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vista Previa</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #333;
          }
          #app {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            padding: 20px;
            min-height: 300px;
          }
          #console-output {
            margin-top: 20px;
            padding: 10px;
            background-color: #f1f1f1;
            border-radius: 4px;
            border: 1px solid #ddd;
            font-family: monospace;
            white-space: pre-wrap;
            max-height: 200px;
            overflow-y: auto;
          }
          button {
            background-color: #4f46e5;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-right: 10px;
          }
          button:hover {
            background-color: #4338ca;
          }
          h1, h2, h3 {
            color: #333;
          }
          input, select, textarea {
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div id="app">
          <h2>Vista previa interactiva</h2>
          <div id="content">
            <!-- Elementos básicos para interactuar con el código JS -->
            <div style="margin-bottom: 15px;">
              <input type="text" id="userInput" placeholder="Escribe un mensaje..." style="padding: 8px; width: 70%; margin-right: 10px;">
              <button id="sendButton">Enviar</button>
            </div>
            
            <div id="output" style="min-height: 100px; border: 1px solid #ddd; border-radius: 4px; padding: 10px; margin-bottom: 15px;"></div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
              <button id="button1">Botón 1</button>
              <button id="button2">Botón 2</button>
              <button id="resetButton">Reiniciar</button>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
              <select id="dropdown" style="padding: 5px;">
                <option value="">-- Seleccionar --</option>
                <option value="opcion1">Opción 1</option>
                <option value="opcion2">Opción 2</option>
                <option value="opcion3">Opción 3</option>
              </select>
              
              <div>
                <input type="checkbox" id="checkbox1"> <label for="checkbox1">Opción A</label>
              </div>
            </div>
            
            <div id="visual-container" style="height: 100px; background-color: #f5f5f5; border-radius: 4px; margin-bottom: 15px;"></div>
          </div>
          <div id="console-output"></div>
        </div>
        <script>
          // Captura console.log y otros métodos
          const consoleOutput = document.getElementById('console-output');
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
          
          console.log = (...args) => {
            args.forEach(arg => appendToConsole(arg, 'log'));
            originalConsole.log(...args);
          };
          
          console.error = (...args) => {
            args.forEach(arg => appendToConsole(arg, 'error'));
            originalConsole.error(...args);
          };
          
          console.warn = (...args) => {
            args.forEach(arg => appendToConsole(arg, 'warn'));
            originalConsole.warn(...args);
          };
          
          console.info = (...args) => {
            args.forEach(arg => appendToConsole(arg, 'info'));
            originalConsole.info(...args);
          };
          
          window.onerror = function(message, source, lineno, colno, error) {
            appendToConsole('Error: ' + message, 'error');
            return true;
          };
          
          // Configuración de eventos para elementos interactivos
          document.getElementById('button1')?.addEventListener('click', function() {
            console.log('Botón 1 clickeado');
            const output = document.getElementById('output');
            if (output) output.innerHTML += '<p>Botón 1 clickeado</p>';
          });
          
          document.getElementById('button2')?.addEventListener('click', function() {
            console.log('Botón 2 clickeado');
            const output = document.getElementById('output');
            if (output) output.innerHTML += '<p>Botón 2 clickeado</p>';
          });
          
          document.getElementById('resetButton')?.addEventListener('click', function() {
            console.log('Reiniciando...');
            const output = document.getElementById('output');
            if (output) output.innerHTML = '';
          });
          
          document.getElementById('dropdown')?.addEventListener('change', function(e) {
            console.log('Opción seleccionada:', e.target.value);
            const output = document.getElementById('output');
            if (output) output.innerHTML += '<p>Seleccionado: ' + e.target.value + '</p>';
          });
          
          // Para facilitar la depuración de funciones handleUserInput comunes en chatbots
          window.handleUserInput = function(message) {
            console.log('Mensaje recibido:', message);
            const output = document.getElementById('output');
            if (output) output.innerHTML += '<p><strong>Tú:</strong> ' + message + '</p>';
            return message;
          };
          
          // Analizamos si el código es una función o un objeto para ejecutarlo correctamente
          try {
            // Ejecutamos el código inmediatamente como script
            ${file.content}
            
            // Intentamos extraer cualquier función de inicialización autoejecutada
            const code = \`${file.content}\`;
            
            // Ejecutar posibles funciones de inicialización (patrones comunes)
            try {
              // Verificar si es una IIFE (Immediately Invoked Function Expression)
              const iifeFunctionMatch = code.match(/\\(function\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\}\\)\\s*\\([^)]*\\)/);
              if (iifeFunctionMatch) {
                console.log('Detectada función autoejecutada (IIFE), ejecutando...');
                eval(iifeFunctionMatch[0]);
              }
              
              // Buscar funciones posiblemente exportadas o definidas que podrían ser principales
              const mainFunctionMatch = code.match(/function\\s+(init|main|setup|start|app|initialize)\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\}/);
              if (mainFunctionMatch) {
                const fnName = mainFunctionMatch[1];
                console.log(\`Detectada posible función principal "\${fnName}", intentando ejecutar...\`);
                eval(\`if (typeof \${fnName} === 'function') \${fnName}();\`);
              }
              
              // Ejecutar window.onload si está definido
              if (typeof window.onload === 'function') {
                console.log('Ejecutando window.onload...');
                window.onload(new Event('load'));
              }
              
              // Disparar DOMContentLoaded si hay listeners
              console.log('Disparando evento DOMContentLoaded...');
              document.dispatchEvent(new Event('DOMContentLoaded'));
            } catch (innerError) {
              console.warn('Error en ejecución de patrones:', innerError.message);
            }
          } catch (error) {
            console.error('Error al ejecutar el código:', error.message);
          }
        </script>
      </body>
      </html>
    `;
    
    if (iframeRef.current) {
      // Establecer el contenido del iframe
      const iframeDoc = iframeRef.current.contentDocument || 
                       (iframeRef.current.contentWindow && iframeRef.current.contentWindow.document);
                       
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlTemplate);
        iframeDoc.close();
      }
    }
  };
  
  // Cambiar entre vista de consola y vista visual
  const togglePreviewMode = () => {
    setIsVisualPreview(!isVisualPreview);
  };

  useEffect(() => {
    executeCode();
  }, [file, allFiles]);
  
  // Efecto para inicializar la vista visual cuando cambia isVisualPreview
  useEffect(() => {
    if (isVisualPreview) {
      createVisualEnvironment();
    }
  }, [isVisualPreview, file.content]);

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-800">
      <div className="flex-none border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between h-10 px-4">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Vista Previa</span>
          
          {/* Controles para JavaScript */}
          {file.type === "javascript" && !isLoading && !error && (
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={executeCode}
                className="text-xs"
              >
                <i className="ri-play-circle-line mr-1"></i>
                Ejecutar
              </Button>
              
              <Button 
                variant={isVisualPreview ? "default" : "outline"} 
                size="sm" 
                onClick={togglePreviewMode}
                className="text-xs"
              >
                <i className={`ri-${isVisualPreview ? 'terminal-line' : 'layout-line'} mr-1`}></i>
                {isVisualPreview ? "Ver consola" : "Vista interactiva"}
              </Button>
            </div>
          )}
          
          {/* Controles para HTML y CSS */}
          {(file.type === "html" || file.type === "css") && !isLoading && !error && (
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={executeCode}
                className="text-xs"
              >
                <i className="ri-refresh-line mr-1"></i>
                Actualizar vista
              </Button>
              
              {file.type === "css" && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  <i className="ri-information-line mr-1"></i>
                  Compatible con HTML
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-white dark:bg-slate-900 h-full rounded-lg shadow-sm p-4 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4">
              <p className="font-medium">Error:</p>
              <pre className="text-sm mt-2 whitespace-pre-wrap">{error}</pre>
            </div>
          ) : (
            <div className="w-full h-full">
              {/* HTML o CSS con visualOutput mostrará un iframe */}
              {((file.type === "html" || file.type === "css") || isVisualPreview) && (
                <div className="w-full h-full min-h-[350px] border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  {file.type === "javascript" && isVisualPreview && !previewHtml.includes('<!DOCTYPE html>') ? (
                    // Usamos el entorno por defecto que configuramos (cuando no hay HTML específico)
                    <iframe
                      ref={iframeRef}
                      title="JavaScript Visual Preview"
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-popups"
                    />
                  ) : (
                    // Usamos previewHtml cuando viene del backend (ya sea HTML directo o desde la función especializada)
                    <iframe
                      title="Preview"
                      srcDoc={previewHtml}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
                      onLoad={(e) => console.log("iframe cargado", e.currentTarget.contentWindow?.document.title)}
                    />
                  )}
                </div>
              )}
              
              {/* Salida de consola para texto (cuando no es una vista visual) */}
              {!isVisualPreview && file.type === "javascript" && (
                <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96 p-4 bg-slate-100 dark:bg-slate-800 rounded-md">
                  {previewHtml || "// Sin salida en consola"}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodePreview;
