import { useState, useEffect } from "react";
import { File } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CodePreviewProps {
  file: File;
  allFiles?: File[];
}

const CodePreview = ({ file, allFiles }: CodePreviewProps) => {
  const [previewHtml, setPreviewHtml] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const generatePreview = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // If we're previewing HTML directly
        if (file.type === "html") {
          setPreviewHtml(file.content);
          setIsLoading(false);
          return;
        }

        // For JS/CSS, we need to execute the code
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

    generatePreview();
  }, [file, allFiles, toast]);

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-800">
      <div className="flex-none border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center h-10 px-4">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Vista Previa</span>
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
              {file.type === "html" && (
                <iframe
                  title="HTML Preview"
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                />
              )}
              
              {file.type === "javascript" && (
                <div className="max-w-md mx-auto">
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Salida de consola:</h3>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-sm overflow-auto">
                      {previewHtml || "(Sin salida)"}
                    </pre>
                  </div>
                </div>
              )}
              
              {file.type === "css" && (
                <div className="max-w-md mx-auto">
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">Vista previa de CSS:</h3>
                    <div className="mt-4">
                      <p className="text-sm mb-2">Utiliza la vista previa de HTML para ver los estilos aplicados.</p>
                    </div>
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
