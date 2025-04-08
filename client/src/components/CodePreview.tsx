
import { useEffect, useState, useRef } from "react";
import { File } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import CodeBlock from "./CodeBlock";
import { Button } from "@/components/ui/button";

interface CodePreviewProps {
  file: File;
  allFiles?: File[];
}

const CodePreviewComponent = ({ file, allFiles = [] }: CodePreviewProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [isPdf, setIsPdf] = useState(false);
  const [isImage, setIsImage] = useState(false);
  const webViewRef = useRef<HTMLIFrameElement>(null);

  // Función para obtener el ID del proyecto de forma segura
  const getProjectId = (): number | null => {
    if (!file) return null;

    const projectId = typeof file.projectId === 'number'
      ? file.projectId
      : parseInt(String(file.projectId));

    return !isNaN(projectId) ? projectId : null;
  };
  
  // Función para determinar el tipo de contenido
  const detectContentType = (fileName: string, content: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    // Detectar imágenes
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) {
      setIsImage(true);
      return 'image';
    }
    
    // Detectar PDF
    if (extension === 'pdf') {
      setIsPdf(true);
      return 'pdf';
    }
    
    // Para otros tipos, intentar determinar si es texto o binario
    const isBinary = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(content.substring(0, 1000));
    if (isBinary) {
      return 'binary';
    }
    
    // Por defecto, tratar como texto
    return 'text';
  };

  // Función para cargar el contenido del archivo seleccionado
  const loadFileContent = () => {
    if (!file) return;
    
    setIsLoading(true);
    setIsPdf(false);
    setIsImage(false);
    console.log("Cargando contenido del archivo:", file.name);
    
    try {
      // Asegurarse de que siempre tengamos contenido para previsualizar
      if (file.content !== undefined && file.content !== null) {
        // Detectar el tipo de contenido
        const contentType = detectContentType(file.name, file.content);
        
        // Actualizar el estado de contenido
        setPreviewContent(file.content);
        
        // Pequeño retraso para asegurar que la UI se actualice correctamente
        setTimeout(() => {
          setIsLoading(false);
          console.log("Contenido cargado:", file.name, "tipo:", contentType);
          toast({
            title: "Archivo cargado",
            description: `Se ha cargado el archivo "${file.name}" para previsualización`,
          });
        }, 300);
      } else {
        console.warn("Archivo sin contenido:", file.name);
        setPreviewContent("// Archivo sin contenido");
        setIsLoading(false);
        toast({
          title: "Archivo sin contenido",
          description: "El archivo seleccionado no tiene contenido para mostrar",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error al cargar el contenido del archivo:", error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "No se pudo cargar el contenido del archivo",
        variant: "destructive"
      });
    }
  };
  
  useEffect(() => {
    if (!file) return;
    
    // Inicialmente intentamos cargar el contenido al cambiar de archivo
    console.log("Archivo seleccionado cambiado:", file.name);
    setIsLoading(true);
    
    // Pequeño retraso para evitar problemas de renderizado
    const timer = setTimeout(() => {
      loadFileContent();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [file?.id]); // Solo se ejecuta cuando cambia el ID del archivo

  // Función para refrescar la vista previa
  const refreshPreview = () => {
    loadFileContent();
  };

  // Función para comunicarse con el WebView
  const postMessageToWebView = (message: any) => {
    if (webViewRef.current && webViewRef.current.contentWindow) {
      webViewRef.current.contentWindow.postMessage(message, '*');
    }
  };

  // Función para establecer un listener de mensajes desde el WebView
  useEffect(() => {
    const handleWebViewMessage = (event: MessageEvent) => {
      // Validar origen del mensaje si es necesario
      if (event.data && event.data.type === 'webviewReady') {
        console.log('WebView está listo para recibir contenido');
      }
      
      // Aquí puedes manejar otros tipos de mensajes desde el WebView
    };
    
    window.addEventListener('message', handleWebViewMessage);
    return () => window.removeEventListener('message', handleWebViewMessage);
  }, []);

  // Función para abrir la vista previa en una nueva ventana (WebView externo)
  const openInNewWindow = () => {
    if (!file) return;
    
    console.log("Abriendo vista previa en nueva ventana...");

    // Filtrar archivos por tipo
    const htmlFiles = allFiles.filter(f => f.type === 'html' || f.name.toLowerCase().endsWith('.html'));
    const cssFiles = allFiles.filter(f => f.type === 'css' || f.name.toLowerCase().endsWith('.css'));
    const jsFiles = allFiles.filter(f => f.type === 'javascript' || f.name.toLowerCase().endsWith('.js'));

    // Determinar el contenido principal según el tipo de archivo
    let htmlContent = '';
    let title = `Vista previa - ${file.name}`;
    
    if (file.type === 'html' || file.name.toLowerCase().endsWith('.html')) {
      // Si el archivo actual es HTML, usamos su contenido
      htmlContent = file.content || '';
    } else if (htmlFiles.length > 0) {
      // Si hay archivos HTML, usamos el primero
      htmlContent = htmlFiles[0].content || '';
    } else if (file.type === 'css' || file.name.toLowerCase().endsWith('.css')) {
      // Si es un archivo CSS, creamos un HTML con elementos de muestra
      htmlContent = `
        <div class="preview-container" style="padding: 20px; font-family: system-ui, sans-serif;">
          <h1>Previsualización de ${file.name}</h1>
          <p>Esta es una previsualización de los estilos CSS aplicados a elementos HTML básicos.</p>
          <h2>Encabezado H2</h2>
          <p>Párrafo de ejemplo con <a href="#">enlace</a> y <strong>texto en negrita</strong>.</p>
          <button>Botón</button>
          <div style="margin-top: 20px; padding: 15px; border: 1px solid #ccc;">Caja de ejemplo</div>
        </div>
      `;
    } else if (file.type === 'javascript' || file.name.toLowerCase().endsWith('.js')) {
      // Si es JavaScript, creamos un HTML con una consola y el script
      htmlContent = `
        <div style="padding: 20px; font-family: monospace;">
          <h1>JavaScript: ${file.name}</h1>
          <p>Abra la consola del navegador (F12) para ver la salida del script.</p>
          <div id="output" style="background: #f1f1f1; padding: 10px; border-radius: 4px; margin-top: 20px;">
            <pre>// La salida del script aparecerá aquí</pre>
          </div>
        </div>
        <script>
          // Capturar console.log para mostrarlo en la página
          (function() {
            const outputDiv = document.getElementById('output');
            const originalConsoleLog = console.log;
            console.log = function(...args) {
              originalConsoleLog.apply(console, args);
              const output = args.map(arg => {
                if (typeof arg === 'object') {
                  return JSON.stringify(arg, null, 2);
                }
                return String(arg);
              }).join(' ');
              const pre = document.createElement('pre');
              pre.textContent = output;
              outputDiv.appendChild(pre);
            };
            console.info("Script cargado y ejecutándose");
          })();
        </script>
      `;
    } else {
      // Para otros tipos de archivos, mostramos su contenido
      htmlContent = `
        <div style="padding: 20px; font-family: monospace;">
          <h1>Contenido de ${file.name}</h1>
          <pre style="background: #f1f1f1; padding: 10px; border-radius: 4px; white-space: pre-wrap; overflow-wrap: break-word;">${file.content || ''}</pre>
        </div>
      `;
    }

    // Recopilar todos los estilos CSS
    const css = cssFiles.map(f => f.content || '').join('\n');
    
    // Recopilar todos los scripts JavaScript
    const js = jsFiles.map(f => f.content || '').join('\n');

    // Crear contenido HTML completo
    const fullHtmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          /* Estilos base */
          body { 
            margin: 0; 
            padding: 10px; 
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
          }
          /* Estilos del usuario */
          ${css}
        </style>
      </head>
      <body>
        ${htmlContent}
        
        <!-- Scripts del usuario -->
        <script>${js}</script>
      </body>
      </html>
    `;

    try {
      // Crear blob y abrir en nueva ventana
      const blob = new Blob([fullHtmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Intentar abrir en una nueva ventana
      const newWindow = window.open(url, '_blank', 'width=800,height=600,resizable=yes');
      
      // Verificar si la ventana se abrió correctamente
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Si hay problemas con la apertura, mostrar mensaje
        console.warn("El navegador bloqueó la apertura de la ventana. Verifique la configuración de bloqueo de ventanas emergentes.");
        toast({
          title: "No se pudo abrir la ventana",
          description: "El navegador puede estar bloqueando ventanas emergentes. Por favor, permita ventanas emergentes para este sitio.",
          variant: "destructive"
        });
      } else {
        // Liberar URL cuando se cierra la ventana
        newWindow.addEventListener('beforeunload', () => {
          setTimeout(() => URL.revokeObjectURL(url), 100);
        });
        
        console.log("Vista previa abierta en nueva ventana");
        toast({
          title: "Vista previa abierta",
          description: "Se ha abierto la vista previa en una nueva ventana"
        });
      }
    } catch (error) {
      console.error("Error al abrir la vista previa:", error);
      toast({
        title: "Error",
        description: "No se pudo abrir la vista previa en una nueva ventana",
        variant: "destructive"
      });
    }
  };

  // Determinar el tipo de contenido y cómo mostrarlo
  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-slate-500">Cargando la vista previa...</p>
          </div>
        </div>
      );
    }

    if (!file) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-slate-500">Selecciona un archivo para ver la vista previa</p>
        </div>
      );
    }

    const isHtml = file.type === 'html' || file.name.toLowerCase().endsWith('.html');
    const isCss = file.type === 'css' || file.name.toLowerCase().endsWith('.css');
    const isJs = file.type === 'javascript' || file.name.toLowerCase().endsWith('.js');

    // Si es un archivo HTML, mostramos webview para previsualización
    if (isHtml) {
      const cssFiles = allFiles.filter(f => f.type === 'css');
      const jsFiles = allFiles.filter(f => f.type === 'javascript');

      const css = cssFiles.map(f => f.content || '').join('\n');
      const js = jsFiles.map(f => f.content || '').join('\n');
      
      // Contenido HTML completo para el WebView
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Estilos base */
            body { 
              margin: 0; 
              padding: 10px; 
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
            }
            /* Estilos del usuario */
            ${css}
          </style>
          <script>
            // Configurar comunicación con el componente padre
            window.addEventListener('message', function(event) {
              // Aquí puedes manejar mensajes desde el componente padre
              console.log('Mensaje recibido en WebView:', event.data);
            });
            
            // Notificar que el WebView está listo
            window.addEventListener('load', function() {
              window.parent.postMessage({ type: 'webviewReady' }, '*');
            });
          </script>
        </head>
        <body>
          ${file.content || '<div>No hay contenido HTML para mostrar</div>'}
          <script>${js}</script>
        </body>
        </html>
      `;
      
      console.log("Renderizando HTML en WebView");
      
      return (
        <div className="w-full h-full">
          <iframe
            ref={webViewRef}
            srcDoc={htmlContent}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-modals"
            title="Vista previa HTML"
            onLoad={() => console.log("WebView cargado")}
          />
        </div>
      );
    }

    // Si es CSS, mostramos una previsualización con elementos básicos
    if (isCss) {
      return (
        <iframe
          ref={webViewRef}
          srcDoc={`
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${file.content || ''}</style>
              <script>
                window.addEventListener('load', function() {
                  window.parent.postMessage({ type: 'webviewReady', contentType: 'css' }, '*');
                });
              </script>
            </head>
            <body>
              <div class="preview-container" style="padding: 20px; font-family: system-ui, sans-serif;">
                <h1>Encabezado H1</h1>
                <h2>Encabezado H2</h2>
                <p>Párrafo de ejemplo con <a href="#">enlace</a> y <strong>texto en negrita</strong>.</p>
                <button>Botón</button>
                <div style="margin-top: 20px; padding: 15px; border: 1px solid #ccc;">Caja de ejemplo</div>
              </div>
            </body>
            </html>
          `}
          className="w-full h-full border-none"
          sandbox="allow-scripts"
          title="Vista previa CSS"
        />
      );
    }

    // Si es JavaScript, implementamos un WebView con consola interactiva
    if (isJs) {
      return (
        <div className="h-full flex flex-col">
          <div className="mb-2 flex justify-between items-center p-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-medium">
              JavaScript: <span className="text-primary-500">{file.name}</span>
            </h3>
          </div>

          <div className="flex-1">
            <iframe
              ref={webViewRef}
              srcDoc={`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>JavaScript WebView</title>
                  <style>
                    body {
                      font-family: system-ui, sans-serif;
                      margin: 0;
                      padding: 10px;
                      display: flex;
                      flex-direction: column;
                      height: 100vh;
                      overflow: hidden;
                    }
                    
                    #output {
                      flex: 1;
                      background: #f5f5f5;
                      border-radius: 4px;
                      padding: 10px;
                      overflow-y: auto;
                      font-family: monospace;
                      margin-bottom: 10px;
                    }
                    
                    pre {
                      margin: 0 0 5px 0;
                      white-space: pre-wrap;
                    }
                    
                    .log { color: #333; }
                    .info { color: #0066cc; }
                    .warn { color: #cc7700; }
                    .error { color: #cc0000; }
                  </style>
                  <script>
                    // Configurar comunicación con el componente padre
                    window.addEventListener('message', function(event) {
                      if (event.data.type === 'executeCode') {
                        try {
                          eval(event.data.code);
                        } catch (err) {
                          console.error('Error al ejecutar código:', err.message);
                        }
                      }
                    });
                    
                    // Sobrescribir console.log para mostrar resultados en la página
                    window.addEventListener('DOMContentLoaded', function() {
                      const output = document.getElementById('output');
                      
                      const originalConsole = {
                        log: console.log,
                        info: console.info,
                        warn: console.warn,
                        error: console.error
                      };
                      
                      function logToOutput(type, args) {
                        const pre = document.createElement('pre');
                        pre.className = type;
                        pre.textContent = args.map(arg => {
                          if (typeof arg === 'object') {
                            return JSON.stringify(arg, null, 2);
                          }
                          return String(arg);
                        }).join(' ');
                        output.appendChild(pre);
                        output.scrollTop = output.scrollHeight;
                      }
                      
                      console.log = function() {
                        originalConsole.log.apply(console, arguments);
                        logToOutput('log', Array.from(arguments));
                      };
                      
                      console.info = function() {
                        originalConsole.info.apply(console, arguments);
                        logToOutput('info', Array.from(arguments));
                      };
                      
                      console.warn = function() {
                        originalConsole.warn.apply(console, arguments);
                        logToOutput('warn', Array.from(arguments));
                      };
                      
                      console.error = function() {
                        originalConsole.error.apply(console, arguments);
                        logToOutput('error', Array.from(arguments));
                      };
                      
                      // Notificar que el WebView está listo
                      window.parent.postMessage({ type: 'webviewReady', contentType: 'javascript' }, '*');
                      
                      // Ejecutar el código JS automáticamente
                      try {
                        // El código vendrá de un mensaje del padre
                        console.info('WebView JavaScript listo para ejecutar código');
                      } catch (err) {
                        console.error('Error al inicializar:', err.message);
                      }
                    });
                  </script>
                </head>
                <body>
                  <div id="output"></div>
                </body>
                </html>
              `}
              className="w-full h-full border-none"
              sandbox="allow-scripts"
              title="Vista previa JavaScript"
              onLoad={() => {
                if (webViewRef.current && file.content) {
                  // Enviar el código al WebView para ejecutar
                  setTimeout(() => {
                    postMessageToWebView({
                      type: 'executeCode',
                      code: file.content
                    });
                  }, 500);
                }
              }}
            />
          </div>
        </div>
      );
    }

    // Para PDFs
    if (isPdf) {
      return (
        <div className="p-4 h-full overflow-auto">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium">
              PDF: <span className="text-primary-500">{file.name}</span>
            </h3>
          </div>
          
          <div className="flex flex-col items-center justify-center">
            <p className="mb-4 text-slate-500">Este archivo es un PDF y no puede ser visualizado directamente aquí.</p>
            <Button
              onClick={() => {
                window.open(`/api/documents/${Math.abs(file.id || 0)}/raw`, '_blank');
              }}
            >
              <i className="ri-external-link-line mr-2"></i>
              Abrir PDF en nueva ventana
            </Button>
          </div>
        </div>
      );
    }
    
    // Para imágenes
    if (isImage) {
      return (
        <div className="p-4 h-full overflow-auto">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium">
              Imagen: <span className="text-primary-500">{file.name}</span>
            </h3>
          </div>
          
          <div className="flex flex-col items-center justify-center">
            {file.isDocument ? (
              <img 
                src={`/api/documents/${Math.abs(file.id || 0)}/raw`} 
                alt={file.name} 
                className="max-w-full max-h-[70vh] object-contain border border-slate-200 dark:border-slate-700 rounded-md"
              />
            ) : (
              <p className="text-slate-500">La imagen no puede ser visualizada directamente.</p>
            )}
          </div>
        </div>
      );
    }
    
    // Para archivos binarios no reconocidos
    if (file.isDocument && !isText(file.content || '')) {
      return (
        <div className="p-4 h-full overflow-auto">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium">
              Archivo binario: <span className="text-primary-500">{file.name}</span>
            </h3>
          </div>
          
          <div className="flex flex-col items-center justify-center">
            <p className="mb-4 text-slate-500">Este archivo no se puede previsualizar en este formato.</p>
            <Button
              onClick={() => {
                window.open(`/api/documents/${Math.abs(file.id || 0)}/raw`, '_blank');
              }}
            >
              <i className="ri-download-line mr-2"></i>
              Descargar archivo
            </Button>
          </div>
        </div>
      );
    }

    // Para otros tipos de archivos, mostramos el código con resaltado de sintaxis
    return (
      <div className="p-4 h-full overflow-auto">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-medium">
            Vista previa de <span className="text-primary-500">{file.name}</span>
          </h3>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
          <CodeBlock
            code={previewContent || '// Sin contenido'}
            language={file.type === 'javascript' ? 'js' : file.type}
            showLineNumbers={true}
          />
        </div>
      </div>
    );
  };
  
  // Función auxiliar para detectar si el contenido es texto
  function isText(content: string): boolean {
    const sample = content.substring(0, 1000);
    const nonTextChars = /[\x00-\x08\x0E-\x1F]/.test(sample);
    if (nonTextChars) return false;
    
    // Verificar si tiene una proporción razonable de caracteres imprimibles
    const printableChars = sample.replace(/[^\x20-\x7E]/g, '');
    return printableChars.length / sample.length > 0.8;
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      <div className="flex justify-between items-center p-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <button
            className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={refreshPreview}
            title="Actualizar vista previa"
          >
            <i className="ri-refresh-line"></i>
          </button>
          <span className="text-sm font-medium">
            {file?.name || "Vista Previa"}
          </span>
          {isLoading && (
            <span className="text-xs text-blue-500 animate-pulse">
              <i className="ri-loader-4-line animate-spin"></i> Cargando...
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            className={`px-2 py-1 rounded text-xs ${isLoading ? 'bg-slate-400' : 'bg-primary-500 hover:bg-primary-600'} text-white transition-colors`}
            onClick={() => {
              if (file) {
                console.log("Botón Cargar archivo presionado");
                // Forzar actualización completa
                setPreviewContent("");
                setTimeout(() => {
                  refreshPreview();
                }, 50);
              }
            }}
            title="Cargar archivo para previsualización"
            disabled={!file || isLoading}
          >
            {isLoading ? (
              <>
                <i className="ri-loader-4-line animate-spin mr-1"></i>
                Cargando...
              </>
            ) : (
              <>
                <i className="ri-file-load-line mr-1"></i>
                Cargar archivo
              </>
            )}
          </button>
          <button
            className="px-2 py-1 rounded flex items-center text-xs bg-primary-500 dark:bg-primary-600 text-white hover:bg-primary-600 dark:hover:bg-primary-700 transition-colors"
            onClick={() => {
              if (file && !isLoading) {
                openInNewWindow();
              }
            }}
            title="Abrir en nueva ventana"
            disabled={!file || isLoading}
          >
            <i className="ri-external-link-line mr-1"></i>
            <span>Abrir</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {renderPreview()}
      </div>
    </div>
  );
};

export default CodePreviewComponent;
