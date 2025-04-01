import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { File } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface CodePreviewProps {
  file: File;
  allFiles?: File[];
}

const CodePreview = ({ file, allFiles = [] }: CodePreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Efecto para renderizar el código en el iframe
  useEffect(() => {
    const renderPreview = async () => {
      if (!iframeRef.current) return;

      setLoading(true);

      try {
        // Si es un archivo HTML, intentamos obtener una vista previa completa
        if (file.type === 'html') {
          // Obtenemos la URL de la API para la vista previa del proyecto
          const projectId = file.projectId;


  // Función para renderizar HTML directamente en el iframe
  const renderDirectHTML = () => {
    if (!iframeRef.current) return;
    
    const iframe = iframeRef.current;
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;

    if (iframeDocument) {
      try {
        iframeDocument.open();
        
        // Si hay archivos CSS o JS en el proyecto, los incorporamos
        let htmlContent = file.content;
        
        // Buscar archivos CSS y JS relacionados si tenemos allFiles
        if (allFiles && allFiles.length > 0) {
          const cssFiles = allFiles.filter(f => f.type === 'css');
          const jsFiles = allFiles.filter(f => f.type === 'javascript');
          
          // Asegurarse de que el HTML tenga estructura básica
          if (!htmlContent.includes('<!DOCTYPE html>')) {
            htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
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
        }
        
        iframeDocument.write(htmlContent);
        iframeDocument.close();
      } catch (e) {
        console.error("Error rendering HTML directly:", e);
        iframeDocument.write(`
          <html>
            <body>
              <h2>Error al renderizar HTML</h2>
              <pre>${e instanceof Error ? e.message : String(e)}</pre>
            </body>
          </html>
        `);
        iframeDocument.close();
      }
    }
  };

          // Verificar que el ID del proyecto sea válido
          if (!projectId || isNaN(Number(projectId))) {
            throw new Error("ID de proyecto inválido");
          }

          try {
            // Agregar un parámetro de tiempo para evitar caché
            const timestamp = new Date().getTime();
            const previewUrl = `/api/projects/${Number(projectId)}/preview?t=${timestamp}`;
            
            // Registrar el evento de carga del iframe
            const iframe = iframeRef.current;
            
            // Configurar un manejador de eventos para detectar cuándo se carga el iframe
            iframe.onload = () => {
              console.log("Vista previa cargada correctamente");
              setLoading(false);
            };
            
            iframe.onerror = (e) => {
              console.error("Error al cargar la vista previa:", e);
              // Fallback a renderización directa
              renderDirectHTML();
            };
            
            // Cargar la URL de vista previa
            iframe.src = previewUrl;
          } catch (error) {
            console.error("Error loading preview:", error);
            // Si hay un error, mostramos solo el contenido HTML
            renderDirectHTML();
          }
        } else if (file.type === 'css') {
          // Para archivos CSS, mostramos una vista previa con ejemplos
          const iframe = iframeRef.current;
          const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;

          if (iframeDocument) {
            iframeDocument.open();
            iframeDocument.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <style>${file.content}</style>
              </head>
              <body>
                <div class="preview-container">
                  <h1>Vista previa de CSS</h1>
                  <p>Este es un ejemplo de cómo se verían los estilos aplicados.</p>
                  <button>Botón de ejemplo</button>
                  <div class="card">
                    <h2>Tarjeta de ejemplo</h2>
                    <p>Contenido de la tarjeta</p>
                  </div>
                </div>
              </body>
              </html>
            `);
            iframeDocument.close();
          }
        } else if (file.type === 'javascript') {
          // Para JavaScript, mostramos el código y los resultados de la consola
          const iframe = iframeRef.current;
          const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;

          if (iframeDocument) {
            iframeDocument.open();
            iframeDocument.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; padding: 20px; }
                  pre { background: #f5f5f5; padding: 10px; border-radius: 5px; }
                  .console { margin-top: 20px; border: 1px solid #ccc; border-radius: 5px; overflow: hidden; }
                  .console-header { background: #f1f1f1; padding: 10px; border-bottom: 1px solid #ccc; }
                  .console-output { padding: 10px; max-height: 200px; overflow-y: auto; }
                  .error { color: red; }
                </style>
              </head>
              <body>
                <h2>Código JavaScript</h2>
                <pre><code>${file.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>

                <div class="console">
                  <div class="console-header">Consola</div>
                  <div class="console-output" id="consoleOutput">Ejecutando código...</div>
                </div>

                <script>
                  // Reemplazar console.log para capturar la salida
                  const consoleOutput = document.getElementById('consoleOutput');
                  consoleOutput.innerHTML = '';

                  const originalConsole = {
                    log: console.log,
                    error: console.error,
                    warn: console.warn,
                    info: console.info
                  };

                  console.log = function() {
                    const output = Array.from(arguments).join(' ');
                    consoleOutput.innerHTML += \`<div>\${output}</div>\`;
                    originalConsole.log.apply(console, arguments);
                  };

                  console.error = function() {
                    const output = Array.from(arguments).join(' ');
                    consoleOutput.innerHTML += \`<div class="error">\${output}</div>\`;
                    originalConsole.error.apply(console, arguments);
                  };

                  console.warn = function() {
                    const output = Array.from(arguments).join(' ');
                    consoleOutput.innerHTML += \`<div style="color: orange">\${output}</div>\`;
                    originalConsole.warn.apply(console, arguments);
                  };

                  console.info = function() {
                    const output = Array.from(arguments).join(' ');
                    consoleOutput.innerHTML += \`<div style="color: blue">\${output}</div>\`;
                    originalConsole.info.apply(console, arguments);
                  };

                  // Ejecutar el código del usuario dentro de un try-catch
                  try {
                    // Usar una función para evitar problemas de ámbito
                    (function() {
                      ${file.content}
                    })();

                    if (consoleOutput.innerHTML === '') {
                      consoleOutput.innerHTML = '<div>El código se ejecutó sin salida en la consola.</div>';
                    }
                  } catch (error) {
                    console.error('Error:', error.message);
                  }
                </script>
              </body>
              </html>
            `);
            iframeDocument.close();
          }
        } else {
          // Para otros tipos de archivo, mostramos el contenido en un formato legible
          const iframe = iframeRef.current;
          const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;

          if (iframeDocument) {
            iframeDocument.open();
            iframeDocument.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: monospace; padding: 20px; white-space: pre; }
                </style>
              </head>
              <body>
                ${file.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
              </body>
              </html>
            `);
            iframeDocument.close();
          }
        }
      } catch (error) {
        console.error("Error rendering preview:", error);
        toast({
          title: "Error al mostrar la vista previa",
          description: error instanceof Error ? error.message : "Error desconocido",
          variant: "destructive"
        });

        // Mostrar un mensaje de error en el iframe
        const iframe = iframeRef.current;
        if (iframe) {
          const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDocument) {
            iframeDocument.open();
            iframeDocument.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; padding: 20px; }
                  .error { color: red; background: #ffeeee; padding: 15px; border-radius: 5px; }
                </style>
              </head>
              <body>
                <div class="error">
                  <h2>Error al mostrar la vista previa</h2>
                  <p>${error instanceof Error ? error.message : "Error desconocido"}</p>
                </div>
                <div>
                  <h3>Contenido del archivo:</h3>
                  <pre>${file.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                </div>
              </body>
              </html>
            `);
            iframeDocument.close();
          }
        }
      } finally {
        setLoading(false);
      }
    };

    renderPreview();
  }, [file, toast]);

  return (
    <iframe ref={iframeRef} className="w-full h-full border-none" title="Preview" />
  );
};

export default CodePreview;