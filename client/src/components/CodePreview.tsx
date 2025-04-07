import { useEffect, useState } from "react";
import { File } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import CodeBlock from "./CodeBlock";

interface CodePreviewProps {
  file: File;
  allFiles?: File[];
}

const CodePreviewComponent = ({ file, allFiles = [] }: CodePreviewProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [previewContent, setPreviewContent] = useState<string>("");

  // Función para obtener el ID del proyecto de forma segura
  const getProjectId = (): number | null => {
    if (!file) return null;

    const projectId = typeof file.projectId === 'number'
      ? file.projectId
      : parseInt(String(file.projectId));

    return !isNaN(projectId) ? projectId : null;
  };

  // Función para cargar el contenido del archivo seleccionado
  const loadFileContent = () => {
    if (!file) return;
    
    setIsLoading(true);
    
    // Asegurarse de que siempre tengamos contenido para previsualizar
    if (file.content !== undefined && file.content !== null) {
      setPreviewContent(file.content);
      toast({
        title: "Archivo cargado",
        description: `Se ha cargado el archivo "${file.name}" para previsualización`,
      });
    } else {
      console.warn("Archivo sin contenido:", file.name);
      setPreviewContent("// Archivo sin contenido");
      toast({
        title: "Archivo sin contenido",
        description: "El archivo seleccionado no tiene contenido para mostrar",
        variant: "destructive"
      });
    }
    
    setIsLoading(false);
  };
  
  useEffect(() => {
    if (!file) return;
    
    // Inicialmente intentamos cargar el contenido al cambiar de archivo
    loadFileContent();
  }, [file]);

  // Función para refrescar la vista previa
  const refreshPreview = () => {
    loadFileContent();
  };

  // Función para abrir la vista previa en una nueva ventana
  const openInNewWindow = () => {
    if (!file) return;

    const htmlFiles = allFiles.filter(f => f.type === 'html');
    const cssFiles = allFiles.filter(f => f.type === 'css');
    const jsFiles = allFiles.filter(f => f.type === 'javascript');

    let htmlContent = file.type === 'html' ? file.content : '';
    if (htmlFiles.length > 0 && !htmlContent) {
      htmlContent = htmlFiles[0].content;
    }

    const css = cssFiles.map(f => f.content).join('\n');
    const js = jsFiles.map(f => f.content).join('\n');

    const fullHtmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vista previa - ${file.name}</title>
        <style>${css}</style>
      </head>
      <body>
        ${htmlContent}
        <script>${js}</script>
      </body>
      </html>
    `;

    const blob = new Blob([fullHtmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // Determinar el tipo de contenido y cómo mostrarlo
  const renderPreview = () => {
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

    // Si es un archivo HTML, mostramos iframe para previsualización
    if (isHtml) {
      const cssFiles = allFiles.filter(f => f.type === 'css');
      const jsFiles = allFiles.filter(f => f.type === 'javascript');

      const css = cssFiles.map(f => f.content || '').join('\n');
      const js = jsFiles.map(f => f.content || '').join('\n');

      return (
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${css}</style>
            </head>
            <body>
              ${file.content || ''}
              <script>${js}</script>
            </body>
            </html>
          `}
          className="w-full h-full border-none"
          sandbox="allow-scripts"
          title="Vista previa HTML"
        />
      );
    }

    // Si es CSS, mostramos una previsualización con elementos básicos
    if (isCss) {
      return (
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>${file.content || ''}</style>
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

    // Si es JavaScript, podemos intentar mostrar la consola o simplemente el código
    if (isJs) {
      return (
        <div className="p-4 h-full overflow-auto">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium">
              JavaScript: <span className="text-primary-500">{file.name}</span>
            </h3>
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md">
            <CodeBlock
              code={file.content || '// Sin contenido'}
              language="javascript"
              showLineNumbers={true}
            />
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
            className="px-2 py-1 rounded text-xs bg-primary-500 text-white hover:bg-primary-600 transition-colors"
            onClick={refreshPreview}
            title="Cargar archivo para previsualización"
            disabled={!file}
          >
            <i className="ri-file-load-line mr-1"></i>
            Cargar archivo
          </button>
          <button
            className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            onClick={openInNewWindow}
            title="Abrir en nueva ventana"
          >
            <i className="ri-external-link-line"></i>
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