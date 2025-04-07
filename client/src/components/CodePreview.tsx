
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

  useEffect(() => {
    if (!file) return;
    setIsLoading(true);
    
    // Actualizar el contenido para la previsualización
    setPreviewContent(file.content || "");
    
    const projectId = getProjectId();
    if (!projectId) {
      console.error("ID de proyecto inválido:", file.projectId);
      toast({
        title: "Error",
        description: "ID de proyecto inválido. No se puede mostrar la vista previa.",
        variant: "destructive"
      });
    }

    refreshPreview();
  }, [file]);

  // Función para refrescar la vista previa
  const refreshPreview = () => {
    setIsLoading(true);

    const projectId = getProjectId();
    if (!projectId && file) {
      // Si no hay proyecto, simplemente mostramos el contenido del archivo
      setPreviewContent(file.content || "");
    } else if (projectId && allFiles) {
      // Si hay proyecto, preparamos una vista previa más completa
      prepareProjectPreview();
    }

    setIsLoading(false);
  };

  // Prepara la vista previa para proyectos HTML/CSS/JS
  const prepareProjectPreview = () => {
    const htmlFiles = allFiles.filter(f => f.type === 'html');
    const cssFiles = allFiles.filter(f => f.type === 'css');
    const jsFiles = allFiles.filter(f => f.type === 'javascript');

    let htmlContent = '';
    if (htmlFiles.length > 0) {
      htmlContent = htmlFiles[0].content;
    }

    const cssContent = cssFiles.map(f => f.content).join('\n');
    const jsContent = jsFiles.map(f => f.content).join('\n');

    // Si el archivo actual es HTML, actualizamos la vista previa
    if (file.type === 'html') {
      setPreviewContent(htmlContent);
    }
  };

  // Función para abrir la vista previa en una nueva ventana
  const openInNewWindow = () => {
    const projectId = getProjectId();
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

    const projectId = getProjectId();
    const isHtml = file.type === 'html' || file.name.toLowerCase().endsWith('.html');
    const isCss = file.type === 'css' || file.name.toLowerCase().endsWith('.css');
    const isJs = file.type === 'javascript' || file.name.toLowerCase().endsWith('.js');
    const hasValidProject = projectId !== null;

    // Si es un archivo HTML o el proyecto tiene archivos HTML, mostramos iframe para previsualización
    if (isHtml || (hasValidProject && allFiles.some(f => f.type === 'html'))) {
      const htmlFiles = allFiles.filter(f => f.type === 'html');
      const cssFiles = allFiles.filter(f => f.type === 'css');
      const jsFiles = allFiles.filter(f => f.type === 'javascript');

      // Si estamos viendo un archivo HTML, usamos su contenido
      // Si no, usamos el primer archivo HTML del proyecto
      let htmlContent = isHtml ? file.content : '';
      if (!isHtml && htmlFiles.length > 0) {
        htmlContent = htmlFiles[0].content;
      }

      const css = cssFiles.map(f => f.content).join('\n');
      const js = jsFiles.map(f => f.content).join('\n');

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
              ${htmlContent}
              <script>${js}</script>
            </body>
            </html>
          `}
          className="w-full h-full border-none"
          sandbox="allow-scripts"
          title="Vista previa"
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
              <style>${file.content}</style>
            </head>
            <body>
              <div class="preview-container">
                <h1>Encabezado H1</h1>
                <h2>Encabezado H2</h2>
                <p>Párrafo de ejemplo con <a href="#">enlace</a> y <strong>texto en negrita</strong>.</p>
                <button>Botón</button>
                <div class="box">Caja de ejemplo</div>
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
              code={file.content}
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
            code={file.content}
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

        <div className="flex items-center">
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
