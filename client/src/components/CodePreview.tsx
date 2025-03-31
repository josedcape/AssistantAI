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
      // For all types, we'll use the server's execution environment
      const response = await apiRequest("POST", "/api/execute", {
        code: file.content,
        language: file.type
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Error al ejecutar el código");
        toast({
          title: "Error",
          description: result.error || "Error al ejecutar el código",
          variant: "destructive"
        });
        setPreviewHtml("");
      } else {
        setPreviewHtml(result.output);
        
        // Si la respuesta indica que es contenido visual (HTML/CSS), activamos la vista visual
        if (result.visualOutput) {
          setIsVisualPreview(true);
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
          <div id="content"></div>
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
          
          // Tu código JavaScript personalizado se inyectará aquí
          try {
            ${file.content}
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
  }, [file, allFiles, toast]);
  
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
                  {file.type === "javascript" && isVisualPreview ? (
                    <iframe
                      ref={iframeRef}
                      title="JavaScript Visual Preview"
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-popups"
                    />
                  ) : (
                    <iframe
                      title="HTML/CSS Preview"
                      srcDoc={previewHtml}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-popups"
                    />
                  )}
                </div>
              )}
              
              {/* JavaScript en modo consola */}
              {file.type === "javascript" && !isVisualPreview && (
                <div className="max-w-md mx-auto">
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Salida de consola:</h3>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-sm overflow-auto min-h-[200px]">
                      {previewHtml || "(Sin salida)"}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodePreview;
