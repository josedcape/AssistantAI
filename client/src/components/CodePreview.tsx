
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { File } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface CodePreviewProps {
  file: File;
  allFiles?: File[];
}

const CodePreview = ({ file, allFiles = [] }: CodePreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Efecto para renderizar el código en el iframe
  useEffect(() => {
    const renderPreview = async () => {
      if (!iframeRef.current) return;

      setLoading(true);

      try {
        // Verificar que el ID del proyecto sea válido
        const projectId = file.projectId;
        if (!projectId || isNaN(Number(projectId))) {
          throw new Error("ID de proyecto inválido");
        }

        // Determinar qué tipo de archivo estamos previsualizando
        if (file.type === 'html') {
          try {
            // Crear una URL única para evitar problemas de caché
            const timestamp = new Date().getTime();
            const url = `/api/projects/${Number(projectId)}/preview?t=${timestamp}`;
            setPreviewUrl(url);
            
            // Configurar manejo de eventos del iframe
            const iframe = iframeRef.current;
            
            iframe.onload = () => {
              console.log("Vista previa HTML cargada correctamente");
              setLoading(false);
            };
            
            iframe.onerror = () => {
              console.error("Error al cargar la vista previa HTML");
              renderDirectHTML();
            };
            
            // Cargar la URL en el iframe
            iframe.src = url;
          } catch (error) {
            console.error("Error cargando la vista previa:", error);
            renderDirectHTML();
          }
        } else if (file.type === 'css') {
          renderCSSPreview();
        } else if (file.type === 'javascript') {
          renderJavaScriptPreview();
        } else {
          renderGenericFilePreview();
        }
      } catch (error) {
        console.error("Error al renderizar la vista previa:", error);
        toast({
          title: "Error al mostrar la vista previa",
          description: error instanceof Error ? error.message : "Error desconocido",
          variant: "destructive"
        });
        
        renderErrorMessage(error);
      } finally {
        setLoading(false);
      }
    };

    renderPreview();
  }, [file, allFiles, toast]);

  // Función para renderizar HTML directamente en el iframe usando DOM
  const renderDirectHTML = () => {
    if (!iframeRef.current) return;
    
    const iframe = iframeRef.current;
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;

    if (iframeDocument) {
      try {
        iframeDocument.open();
        
        // Buscar archivos CSS y JS relacionados
        const cssFiles = allFiles.filter(f => f.type === 'css');
        const jsFiles = allFiles.filter(f => f.type === 'javascript');
        
        // Preparar el contenido HTML
        let htmlContent = file.content;
        
        // Asegurarse de que el HTML tenga estructura básica
        if (!htmlContent.includes('<!DOCTYPE html>')) {
          htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vista Previa</title>
  ${cssFiles.map(css => `<style>${css.content}</style>`).join('\n')}
</head>
<body>
  ${htmlContent}
  ${jsFiles.map(js => `<script>${js.content}</script>`).join('\n')}
</body>
</html>`;
        } else {
          // Si ya tiene estructura, insertar CSS en head y JS antes de cerrar body
          if (cssFiles.length > 0 && htmlContent.includes('</head>')) {
            htmlContent = htmlContent.replace('</head>', 
              `${cssFiles.map(css => `<style>${css.content}</style>`).join('\n')}\n</head>`);
          }
          
          if (jsFiles.length > 0 && htmlContent.includes('</body>')) {
            htmlContent = htmlContent.replace('</body>', 
              `${jsFiles.map(js => `<script>${js.content}</script>`).join('\n')}\n</body>`);
          }
        }
        
        // Escribir el contenido HTML en el iframe
        iframeDocument.write(htmlContent);
        iframeDocument.close();
        
        // Configurar comunicación con el iframe para manipulación DOM en tiempo real
        setupIframeCommunication(iframeDocument);
        
      } catch (e) {
        console.error("Error renderizando HTML directamente:", e);
        renderErrorMessage(e);
      }
    }
  };

  // Configurar comunicación con el iframe para manipulación DOM
  const setupIframeCommunication = (iframeDocument: Document) => {
    if (!iframeDocument || !iframeDocument.body) return;
    
    // Agregar un script para habilitar la comunicación
    const script = iframeDocument.createElement('script');
    script.textContent = `
      // Comunicación desde el iframe al padre
      window.addEventListener('message', function(event) {
        if (event.data.type === 'refreshContent') {
          // Aplicar cambios en tiempo real
          const newStyles = event.data.css;
          const newScript = event.data.js;
          
          // Actualizar estilos
          if (newStyles) {
            let styleElement = document.getElementById('dynamic-styles');
            if (!styleElement) {
              styleElement = document.createElement('style');
              styleElement.id = 'dynamic-styles';
              document.head.appendChild(styleElement);
            }
            styleElement.textContent = newStyles;
          }
          
          // Actualizar scripts
          if (newScript) {
            try {
              // Ejecutar nuevo script
              const executeScript = new Function(newScript);
              executeScript();
            } catch (error) {
              console.error('Error ejecutando script:', error);
            }
          }
        }
      });
      
      // Informar que estamos listos
      window.parent.postMessage({ type: 'iframeReady' }, '*');
    `;
    iframeDocument.body.appendChild(script);
  };

  // Renderizar vista previa de CSS
  const renderCSSPreview = () => {
    if (!iframeRef.current) return;
    
    const iframe = iframeRef.current;
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;

    if (iframeDocument) {
      iframeDocument.open();
      iframeDocument.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vista Previa CSS</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              padding: 20px;
              max-width: 1000px;
              margin: 0 auto;
              background-color: #f9f9f9;
            }
            .preview-header {
              background-color: #f0f0f0;
              border-bottom: 1px solid #ddd;
              padding: 10px 15px;
              margin-bottom: 20px;
              border-radius: 4px;
            }
            .preview-section {
              margin-bottom: 30px;
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .preview-title {
              background-color: #f5f5f5;
              padding: 10px 15px;
              margin: 0;
              font-size: 16px;
              border-bottom: 1px solid #eee;
            }
            .preview-content {
              padding: 15px;
            }
            .color-sample {
              display: inline-block;
              width: 100px;
              height: 100px;
              margin: 10px;
              border-radius: 4px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            }
            .form-group {
              margin-bottom: 15px;
            }
            .form-control {
              display: block;
              width: 100%;
              padding: 8px 12px;
              border: 1px solid #ddd;
              border-radius: 4px;
              margin-top: 5px;
            }
            label {
              display: block;
              margin-bottom: 5px;
              font-weight: 500;
            }
            .btn {
              display: inline-block;
              padding: 8px 16px;
              background-color: #e9e9e9;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              margin-right: 8px;
            }
            .btn-primary {
              background-color: #007bff;
              color: white;
            }
            .btn-secondary {
              background-color: #6c757d;
              color: white;
            }
            .flex-container {
              display: flex;
              gap: 10px;
              margin-top: 15px;
            }
            .flex-item {
              flex: 1;
              background-color: #e9ecef;
              padding: 20px;
              border-radius: 4px;
              text-align: center;
            }
            .grid-container {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin-top: 15px;
            }
            .grid-item {
              background-color: #e9ecef;
              padding: 20px;
              border-radius: 4px;
              text-align: center;
            }
          </style>
          <style id="user-styles">${file.content}</style>
        </head>
        <body>
          <div class="preview-header">
            <h1>Vista previa de CSS</h1>
            <p>Visualización de los estilos aplicados a elementos HTML comunes</p>
          </div>
          
          <div class="preview-section">
            <h2 class="preview-title">Tipografía</h2>
            <div class="preview-content">
              <h1>Encabezado H1</h1>
              <h2>Encabezado H2</h2>
              <h3>Encabezado H3</h3>
              <p>Párrafo de texto normal. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris.</p>
              <p><strong>Texto en negrita</strong> y <em>texto en cursiva</em></p>
              <blockquote>Esta es una cita de bloque que muestra cómo se ven las citas con tus estilos.</blockquote>
              <pre><code>// Esto es un bloque de código
function ejemplo() {
  return "Hola mundo";
}</code></pre>
            </div>
          </div>
          
          <div class="preview-section">
            <h2 class="preview-title">Elementos de Formulario</h2>
            <div class="preview-content">
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
          </div>
          
          <div class="preview-section">
            <h2 class="preview-title">Elementos Flexbox</h2>
            <div class="preview-content">
              <div class="flex-container">
                <div class="flex-item">Flex item 1</div>
                <div class="flex-item">Flex item 2</div>
                <div class="flex-item">Flex item 3</div>
              </div>
            </div>
          </div>
          
          <div class="preview-section">
            <h2 class="preview-title">Grid Layout</h2>
            <div class="preview-content">
              <div class="grid-container">
                <div class="grid-item">Grid item 1</div>
                <div class="grid-item">Grid item 2</div>
                <div class="grid-item">Grid item 3</div>
                <div class="grid-item">Grid item 4</div>
                <div class="grid-item">Grid item 5</div>
                <div class="grid-item">Grid item 6</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      iframeDocument.close();
    }
  };

  // Renderizar vista previa de JavaScript
  const renderJavaScriptPreview = () => {
    if (!iframeRef.current) return;
    
    const iframe = iframeRef.current;
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;

    if (iframeDocument) {
      iframeDocument.open();
      iframeDocument.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vista Previa JavaScript</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 20px; 
              max-width: 900px;
              margin: 0 auto;
              line-height: 1.6;
              background-color: #f8f9fa;
            }
            h1, h2 { 
              color: #333;
              border-bottom: 1px solid #eaecef;
              padding-bottom: 10px;
            }
            pre { 
              background: #f5f7f9; 
              padding: 15px; 
              border-radius: 5px; 
              border: 1px solid #e1e4e8;
              overflow: auto;
              font-family: 'Consolas', 'Monaco', monospace;
              font-size: 14px;
              margin-bottom: 20px;
            }
            code {
              font-family: 'Consolas', 'Monaco', monospace;
              color: #24292e;
            }
            .console { 
              margin: 20px 0; 
              border: 1px solid #ddd; 
              border-radius: 5px; 
              overflow: hidden; 
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .console-header { 
              background: #f1f3f4; 
              padding: 12px 15px; 
              border-bottom: 1px solid #ddd; 
              font-weight: bold;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .console-header .clear-btn {
              background: #e1e4e8;
              border: none;
              padding: 5px 10px;
              border-radius: 3px;
              cursor: pointer;
              font-size: 12px;
            }
            .console-header .clear-btn:hover {
              background: #d1d5db;
            }
            .console-output { 
              padding: 15px; 
              max-height: 300px; 
              overflow-y: auto; 
              background: #fff;
            }
            .error { 
              color: #e53935; 
              background-color: rgba(229, 57, 53, 0.1);
              padding: 4px 8px;
              border-radius: 3px;
            }
            .warning {
              color: #f9a825;
              background-color: rgba(249, 168, 37, 0.1);
              padding: 4px 8px;
              border-radius: 3px;
            }
            .info {
              color: #2196f3;
              background-color: rgba(33, 150, 243, 0.1);
              padding: 4px 8px;
              border-radius: 3px;
            }
            .control-panel {
              background-color: white;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .control-panel button {
              background-color: #4caf50;
              color: white;
              border: none;
              padding: 8px 15px;
              border-radius: 4px;
              cursor: pointer;
              margin-right: 10px;
            }
            .control-panel button:hover {
              background-color: #43a047;
            }
            .demo-area {
              background-color: white;
              padding: 20px;
              border-radius: 5px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            #demo-element {
              width: 100px;
              height: 100px;
              background-color: #3f51b5;
              margin: 10px 0;
              transition: all 0.3s ease;
            }
          </style>
        </head>
        <body>
          <h1>Vista Previa de JavaScript</h1>
          <p>Este entorno te permite ver el comportamiento del código JavaScript y su interacción con el DOM.</p>
          
          <h2>Código JavaScript</h2>
          <pre><code>${file.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>

          <div class="control-panel">
            <button id="run-js">Ejecutar código</button>
            <button id="reset-demo">Reiniciar demostración</button>
          </div>
          
          <h2>Área de demostración</h2>
          <p>Esta área contiene elementos HTML que puedes manipular con tu código JavaScript.</p>
          <div class="demo-area">
            <div id="demo-output">
              <p>Área de salida para manipulación DOM</p>
              <div id="demo-element"></div>
              <button id="demo-button">Haz clic aquí</button>
              <input type="text" id="demo-input" placeholder="Escribe algo aquí">
            </div>
          </div>

          <div class="console">
            <div class="console-header">
              <span>Consola</span>
              <button class="clear-btn" id="clear-console">Limpiar</button>
            </div>
            <div class="console-output" id="consoleOutput"></div>
          </div>

          <script>
            // Preparar el entorno
            const consoleOutput = document.getElementById('consoleOutput');
            
            // Sobrescribir métodos de console
            const originalConsole = {
              log: console.log,
              error: console.error,
              warn: console.warn,
              info: console.info
            };

            function appendToConsole(content, className = '') {
              const entry = document.createElement('div');
              entry.className = className;
              entry.innerHTML = content;
              consoleOutput.appendChild(entry);
              consoleOutput.scrollTop = consoleOutput.scrollHeight;
            }

            console.log = function() {
              const args = Array.from(arguments);
              const output = args.map(arg => {
                if (typeof arg === 'object') {
                  return JSON.stringify(arg, null, 2);
                }
                return String(arg);
              }).join(' ');
              appendToConsole(output);
              originalConsole.log.apply(console, arguments);
            };

            console.error = function() {
              const args = Array.from(arguments);
              const output = args.map(arg => String(arg)).join(' ');
              appendToConsole(output, 'error');
              originalConsole.error.apply(console, arguments);
            };

            console.warn = function() {
              const args = Array.from(arguments);
              const output = args.map(arg => String(arg)).join(' ');
              appendToConsole(output, 'warning');
              originalConsole.warn.apply(console, arguments);
            };

            console.info = function() {
              const args = Array.from(arguments);
              const output = args.map(arg => String(arg)).join(' ');
              appendToConsole(output, 'info');
              originalConsole.info.apply(console, arguments);
            };

            // Guardar el estado inicial de la demo
            const demoInitialState = document.getElementById('demo-output').innerHTML;
            
            // Configurar botones
            document.getElementById('run-js').addEventListener('click', function() {
              try {
                // Ejecutar el código del usuario
                const userCode = \`${file.content.replace(/`/g, '\\`')}\`;
                const executeFunction = new Function(userCode);
                executeFunction();
                
                if (consoleOutput.innerHTML === '') {
                  appendToConsole('El código se ejecutó sin salida en la consola.');
                }
              } catch (error) {
                console.error('Error:', error.message);
              }
            });
            
            document.getElementById('reset-demo').addEventListener('click', function() {
              document.getElementById('demo-output').innerHTML = demoInitialState;
              appendToConsole('Demostración reiniciada', 'info');
            });
            
            document.getElementById('clear-console').addEventListener('click', function() {
              consoleOutput.innerHTML = '';
            });
            
            // Ejecutar automáticamente para eventos demo
            document.getElementById('demo-button').addEventListener('click', function() {
              appendToConsole('Evento: Botón clickeado');
            });
            
            document.getElementById('demo-input').addEventListener('input', function(e) {
              appendToConsole('Evento: Input cambiado a: ' + e.target.value);
            });
            
            // Mensaje inicial
            appendToConsole('Consola iniciada. Haz clic en "Ejecutar código" para ver los resultados.', 'info');
          </script>
        </body>
        </html>
      `);
      iframeDocument.close();
    }
  };

  // Renderizar vista previa genérica
  const renderGenericFilePreview = () => {
    if (!iframeRef.current) return;
    
    const iframe = iframeRef.current;
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;

    if (iframeDocument) {
      iframeDocument.open();
      iframeDocument.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vista Previa</title>
          <style>
            body { 
              font-family: monospace; 
              padding: 20px; 
              white-space: pre-wrap;
              word-wrap: break-word;
              background-color: #f8f9fa;
              color: #24292e;
              line-height: 1.5;
              font-size: 14px;
            }
            .file-header {
              background-color: #f1f3f4;
              padding: 10px 15px;
              border-radius: 5px;
              margin-bottom: 20px;
              font-family: sans-serif;
              border: 1px solid #ddd;
            }
            .file-content {
              background-color: white;
              padding: 15px;
              border-radius: 5px;
              border: 1px solid #ddd;
              overflow-x: auto;
            }
          </style>
        </head>
        <body>
          <div class="file-header">
            <h2 style="margin: 0;">${file.name}</h2>
            <div>Tipo: ${file.type || 'desconocido'}</div>
          </div>
          <div class="file-content">
${file.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
          </div>
        </body>
        </html>
      `);
      iframeDocument.close();
    }
  };

  // Renderizar mensaje de error
  const renderErrorMessage = (error: any) => {
    if (!iframeRef.current) return;
    
    const iframe = iframeRef.current;
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (iframeDocument) {
      iframeDocument.open();
      iframeDocument.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 20px;
              background-color: #f8f9fa;
            }
            .error-container {
              background-color: #ffebee;
              border: 1px solid #ffcdd2;
              border-left: 5px solid #f44336;
              border-radius: 5px;
              padding: 20px;
              margin-bottom: 20px;
            }
            h2 {
              color: #d32f2f;
              margin-top: 0;
            }
            pre {
              background-color: white;
              padding: 15px;
              border-radius: 5px;
              overflow: auto;
              border: 1px solid #ddd;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h2>Error al mostrar la vista previa</h2>
            <p>${error instanceof Error ? error.message : "Error desconocido al generar la vista previa"}</p>
          </div>
          <h3>Contenido del archivo:</h3>
          <pre>${file.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
        </html>
      `);
      iframeDocument.close();
    }
  };

  // Función para abrir la vista previa en una nueva ventana
  const openInNewWindow = () => {
    // Verificar que el ID del proyecto sea válido
    const projectId = file.projectId;
    if (!projectId || isNaN(Number(projectId))) {
      toast({
        title: "Error",
        description: "ID de proyecto inválido. No se puede abrir la vista previa.",
        variant: "destructive"
      });
      return;
    }

    window.open(`/api/projects/${Number(projectId)}/preview`, '_blank');
  };

  // Interfaz de usuario con controles de vista previa
  return (
    <div className="flex flex-col h-full">
      <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-2 flex justify-between items-center">
        <div className="flex items-center text-sm">
          <span className="text-slate-500 dark:text-slate-400">Vista previa:</span>
          <span className="ml-2 font-medium">{file.name}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              // Recargar la vista previa
              if (previewUrl) {
                const iframe = iframeRef.current;
                if (iframe) {
                  const timestamp = new Date().getTime();
                  iframe.src = `${previewUrl.split('?')[0]}?t=${timestamp}`;
                }
              } else {
                // Renderizar de nuevo si no hay URL (vista previa directa)
                renderDirectHTML();
              }
            }}
          >
            <i className="ri-refresh-line mr-1"></i>
            Recargar
          </Button>
          
          <Button size="sm" variant="outline" onClick={openInNewWindow}>
            <i className="ri-external-link-line mr-1"></i>
            Abrir
          </Button>
        </div>
      </div>
      
      <div className="flex-1 bg-white dark:bg-slate-900 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 z-10">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 rounded-full border-t-transparent"></div>
          </div>
        )}
        <iframe 
          ref={iframeRef} 
          className="w-full h-full border-none"
          title="Vista previa" 
          sandbox="allow-same-origin allow-scripts allow-forms"
        />
      </div>
    </div>
  );
};

export default CodePreview;
