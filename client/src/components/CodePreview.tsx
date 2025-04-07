import { useEffect, useRef, useState } from "react";
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

    const projectId = getProjectId();
    if (!projectId) {
      console.error("ID de proyecto inválido:", file.projectId);
      toast({
        title: "Error",
        description: "ID de proyecto inválido. No se puede mostrar la vista previa.",
        variant: "destructive"
      });
      return;
    }

    refreshPreview();
  }, [file]);

  // Función para refrescar la vista previa
  const refreshPreview = () => {
    setIsLoading(true);

    const projectId = getProjectId();
    if (!projectId) return;

    const htmlFiles = allFiles.filter(f => f.type === 'html');
    const cssFiles = allFiles.filter(f => f.type === 'css');
    const jsFiles = allFiles.filter(f => f.type === 'javascript');

    let htmlContent = '';
    if (htmlFiles.length > 0) {
      htmlContent = htmlFiles[0].content;
    }

    const cssMap: Record<string, string> = {};
    cssFiles.forEach(f => { cssMap[f.name] = f.content; });

    const jsMap: Record<string, string> = {};
    jsFiles.forEach(f => { jsMap[f.name] = f.content; });

    const css = Object.values(cssMap).join('\n');
    const js = Object.values(jsMap).join('\n');

    setIsLoading(false);
  };

  // Función para abrir la vista previa en una nueva ventana
  const openInNewWindow = () => {
    const projectId = getProjectId();
    if (!projectId) {
      toast({
        title: "Error",
        description: "ID de proyecto inválido. No se puede abrir la vista previa.",
        variant: "destructive"
      });
      return;
    }

    const htmlFiles = allFiles.filter(f => f.type === 'html');
    const cssFiles = allFiles.filter(f => f.type === 'css');
    const jsFiles = allFiles.filter(f => f.type === 'javascript');

    let htmlContent = '';
    if (htmlFiles.length > 0) {
      htmlContent = htmlFiles[0].content;
    }

    const cssMap: Record<string, string> = {};
    cssFiles.forEach(f => { cssMap[f.name] = f.content; });

    const jsMap: Record<string, string> = {};
    jsFiles.forEach(f => { jsMap[f.name] = f.content; });

    const css = Object.values(cssMap).join('\n');
    const js = Object.values(jsMap).join('\n');

    const fullHtmlContent = `
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
    const hasValidProject = projectId !== null;

    if ((isHtml || hasValidProject) && hasValidProject) {
      const htmlFiles = allFiles.filter(f => f.type === 'html');
      const cssFiles = allFiles.filter(f => f.type === 'css');
      const jsFiles = allFiles.filter(f => f.type === 'javascript');

      let htmlContent = '';
      if (htmlFiles.length > 0) {
        htmlContent = htmlFiles[0].content;
      }

      const cssMap: Record<string, string> = {};
      cssFiles.forEach(f => { cssMap[f.name] = f.content; });

      const jsMap: Record<string, string> = {};
      jsFiles.forEach(f => { jsMap[f.name] = f.content; });

      const css = Object.values(cssMap).join('\n');
      const js = Object.values(jsMap).join('\n');

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
        />
      );
    }

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
        <div className="flex items-center">
          <button
            className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 mr-2"
            onClick={refreshPreview}
            title="Actualizar vista previa"
          >
            <i className="ri-refresh-line text-lg"></i>
          </button>
          <span className="text-sm font-medium">
            {file?.name || "Vista Previa"}
          </span>
        </div>

        <div className="flex items-center">
          <button
            className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            onClick={openInNewWindow}
            title="Abrir en nueva ventana"
          >
            <i className="ri-external-link-line text-lg"></i>
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
