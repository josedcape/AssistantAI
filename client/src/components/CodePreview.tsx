import { useEffect, useState, useRef } from "react";
import { File } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import CodeBlock from "./CodeBlock";
import { Button } from "@/components/ui/button";
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { FolderOpen, Eye, EyeOff } from 'lucide-react';
import FileExplorer from './FileExplorer';

interface CodePreviewProps {
  file: File;
  allFiles?: File[];
  onSendToAssistant?: (fileContent: string, fileName: string, message?: string, file?: File, isImage?: boolean) => void;
  onFileSelect?: (file: File) => void;
  projectId?: number;
}

interface CodePreviewProps {
  file: File;
  allFiles?: File[];
  onSendToAssistant?: (fileContent: string, fileName: string, message?: string, file?: File, isImage?: boolean) => void;
}

const CodePreviewComponent = ({ file, allFiles = [], onSendToAssistant, onFileSelect, projectId: propProjectId }: CodePreviewProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [isPdf, setIsPdf] = useState(false);
  const [isImage, setIsImage] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showExplorer, setShowExplorer] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isMobile = useIsMobile();

  const getProjectId = (): number | null => {
    // Primero intentar usar el projectId proporcionado como prop
    if (propProjectId && !isNaN(propProjectId)) {
      return propProjectId;
    }
    
    // Si no está disponible, intentar obtenerlo del archivo actual
    if (file) {
      const fileProjectId = typeof file.projectId === 'number'
        ? file.projectId
        : parseInt(String(file.projectId));
      return !isNaN(fileProjectId) ? fileProjectId : null;
    }
    
    // Si no hay archivo o proyecto, intentar obtenerlo de la URL
    const pathMatch = window.location.pathname.match(/\/workspace\/(\d+)/);
    if (pathMatch && pathMatch[1]) {
      return parseInt(pathMatch[1]);
    }
    
    return null;
  };

  const detectContentType = (fileName: string, content: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) {
      setIsImage(true);
      return 'image';
    }
    if (extension === 'pdf') {
      setIsPdf(true);
      return 'pdf';
    }
    const isBinary = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/.test(content.substring(0, 1000));
    if (isBinary) {
      return 'binary';
    }
    return 'text';
  };

  const loadFileContent = () => {
    if (!file) return;
    setIsLoading(true);
    setIsPdf(false);
    setIsImage(false);
    console.log("Cargando contenido del archivo:", file.name);
    try {
      if (file.content !== undefined && file.content !== null) {
        const contentType = detectContentType(file.name, file.content);
        setPreviewContent(file.content);
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
    console.log("Archivo seleccionado cambiado:", file.name);
    setIsLoading(true);
    const timer = setTimeout(() => {
      loadFileContent();
    }, 100);
    return () => clearTimeout(timer);
  }, [file?.id]);

  const refreshPreview = () => {
    loadFileContent();
  };


  const handleExplorerToggle = () => {
    if (isMobile) {
      setShowExplorer(!showExplorer);
    }
  };

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

    const combinedHTML = (htmlContent: string, cssContent: string, jsContent: string) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${cssContent}</style>
        </head>
        <body>
          ${htmlContent}
          <script>${jsContent}</script>
        </body>
      </html>
    `;

    if (isHtml || isCss || isJs) {
      const cssFiles = allFiles.filter(f => f.type === 'css');
      const jsFiles = allFiles.filter(f => f.type === 'javascript');
      const css = cssFiles.map(f => f.content || '').join('\n');
      const js = jsFiles.map(f => f.content || '').join('\n');
      let htmlContent = file.content || '';

      return (
        <div className={`flex-1 transition-all duration-300 ${showPreview ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {showPreview && (
            <iframe
              ref={iframeRef}
              srcDoc={combinedHTML(htmlContent, css, js)}
              className="w-full h-full border-0"
              title="Web Preview"
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          )}
          {!showPreview && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-500">Vista previa oculta</p>
            </div>
          )}
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
          <SheetTrigger onClick={handleExplorerToggle}>
            <Button variant={'ghost'} size={'sm'}><FolderOpen className="h-4 w-4"/></Button>
          </SheetTrigger>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {renderPreview()}
      </div>

      {/* Botón flotante para abrir el explorador de archivos en móvil */}
      {isMobile && (
        <div className="fixed bottom-24 right-6 z-50">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 border-2 border-white"
            onClick={() => setShowExplorer(true)}
            title="Explorador de archivos"
            aria-label="Abrir explorador de archivos"
            id="mobile-explorer-button"
          >
            <FolderOpen className="h-7 w-7 text-white" />
          </Button>
        </div>
      )}

      {/* Botón secundario para acceso rápido a explorador (más visible) */}
      {isMobile && (
        <div className="fixed bottom-24 left-6 z-50">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-amber-500 hover:bg-amber-600 border-2 border-white"
            onClick={() => setShowExplorer(true)}
            title="Ver explorador de archivos"
            aria-label="Ver explorador de archivos"
          >
            <FolderOpen className="h-7 w-7 text-white" />
          </Button>
        </div>
      )}

      <Sheet open={showExplorer} onOpenChange={setShowExplorer}>
        <SheetContent side="left" className="w-[85vw] sm:w-[350px] p-0 z-50 overflow-hidden">
          <FileExplorer 
            projectId={getProjectId() || 0} 
            onFileSelect={(file) => {
              if (onFileSelect) {
                onFileSelect(file);
              }
              setShowExplorer(false);
            }}
            onClose={() => setShowExplorer(false)}
            onSendToAssistant={onSendToAssistant}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CodePreviewComponent;