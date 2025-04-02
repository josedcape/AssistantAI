import { useEffect, useRef, useState } from "react";
import { File } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import CodeBlock from "./CodeBlock";

interface CodePreviewProps {
  file: File;
  allFiles?: File[];
}

const CodePreview = ({ file, allFiles = [] }: CodePreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  // Función para obtener el ID del proyecto de forma segura
  const getProjectId = (): number | null => {
    if (!file) return null;
    
    // Asegurarnos de que el projectId sea un número válido
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

    // Cuando cambia el archivo, actualizar la vista previa
    refreshPreview();
  }, [file]);

  // Función para refrescar la vista previa
  const refreshPreview = () => {
    setIsLoading(true);

    // Obtener el ID del proyecto de forma segura
    const projectId = getProjectId();
    if (!projectId) return;

    if (iframeRef.current) {
      // Crear la URL con el ID del proyecto como número
      const previewUrl = `/api/projects/${projectId}/preview`;
      iframeRef.current.src = previewUrl;

      // Configurar un listener para mensajes desde el iframe
      const handleIframeMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'previewReady') {
          setIsLoading(false);

          // Si hay archivos disponibles, enviarlos al iframe para actualizaciones
          if (allFiles && allFiles.length > 0) {
            // Encontrar archivos HTML, CSS y JS
            const htmlFiles = allFiles.filter(f => f.type === 'html');
            const cssFiles = allFiles.filter(f => f.type === 'css');
            const jsFiles = allFiles.filter(f => f.type === 'javascript');

            // Preparar un mapa de archivos CSS y JS para actualizar contenido
            const cssMap: Record<string, string> = {};
            cssFiles.forEach(f => { cssMap[f.name] = f.content; });

            const jsMap: Record<string, string> = {};
            jsFiles.forEach(f => { jsMap[f.name] = f.content; });

            // Si hay un archivo HTML, enviarlo junto con los archivos CSS y JS
            if (htmlFiles.length > 0) {
              try {
                const htmlContent = htmlFiles[0].content;

                // Enviar mensaje al iframe
                iframeRef.current?.contentWindow?.postMessage({
                  type: 'refreshContent',
                  html: htmlContent,
                  css: cssMap,
                  js: jsMap
                }, '*');
              } catch (e) {
                console.error("Error al comunicarse con la vista previa:", e);
              }
            }
          }
        }
      };

      window.addEventListener('message', handleIframeMessage);

      // Limpiar el listener cuando el componente se desmonte
      return () => {
        window.removeEventListener('message', handleIframeMessage);
      };
    }
  };

  // Función para abrir la vista previa en una nueva ventana
  const openInNewWindow = () => {
    // Verificar que el ID del proyecto sea válido
    const projectId = getProjectId();
    if (!projectId) {
      toast({
        title: "Error",
        description: "ID de proyecto inválido. No se puede abrir la vista previa.",
        variant: "destructive"
      });
      return;
    }

    window.open(`/api/projects/${projectId}/preview`, '_blank');
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

    // Verificar si es un archivo HTML o un proyecto web
    const projectId = getProjectId();
    const isHtml = file.type === 'html' || file.name.toLowerCase().endsWith('.html');
    const hasValidProject = projectId !== null;

    // Para archivos HTML o proyectos web, usar iframe
    if ((isHtml || hasValidProject) && hasValidProject) {
      return (
        <div className="relative h-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-900 bg-opacity-70 dark:bg-opacity-70 z-10">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-t-primary-500 border-primary-200 rounded-full animate-spin mb-2"></div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Cargando vista previa...</p>
              </div>
            </div>
          )}
          <iframe 
            ref={iframeRef}
            className="w-full h-full border-0"
            title="Vista previa"
            sandbox="allow-scripts allow-same-origin"
            loading="lazy"
          ></iframe>
        </div>
      );
    }

    // Para otros tipos de archivos, mostrar el contenido como texto
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

export default CodePreview;