import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { File, CodeExecutionResponse } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CodePreviewProps {
  file: File;
  allFiles?: File[];
}

const CodePreview = ({ file, allFiles = [] }: CodePreviewProps) => {
  const [result, setResult] = useState<CodeExecutionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<string>("preview");

  useEffect(() => {
    if (file) {
      previewCode();
    }
  }, [file]);

  const previewCode = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Determinar si debemos ejecutar el código individualmente o como parte de un conjunto
      if (file.type === 'html' && allFiles && allFiles.length > 0) {
        // Si es HTML, buscar archivos CSS y JS relacionados
        const cssFiles = allFiles.filter(f => f.type === 'css');
        const jsFiles = allFiles.filter(f => f.type === 'javascript');

        // Si hay archivos relacionados, enviar todo como un conjunto
        if (cssFiles.length > 0 || jsFiles.length > 0) {
          const files = [
            {
              name: file.name,
              content: file.content,
              type: file.type
            },
            ...cssFiles.map(f => ({
              name: f.name,
              content: f.content,
              type: f.type
            })),
            ...jsFiles.map(f => ({
              name: f.name,
              content: f.content,
              type: f.type
            }))
          ];

          // Enviar como un conjunto de archivos
          const response = await apiRequest("POST", "/api/execute", {
            code: JSON.stringify({ files }),
            language: "html"
          });

          const result = await response.json();
          setResult(result);
        } else {
          // Si no hay archivos relacionados, ejecutar solo el HTML
          const response = await apiRequest("POST", "/api/execute", {
            code: file.content,
            language: file.type
          });

          const result = await response.json();
          setResult(result);
        }
      } else {
        // Para archivos individuales (JavaScript, CSS, etc.)
        const response = await apiRequest("POST", "/api/execute", {
          code: file.content,
          language: file.type
        });

        const result = await response.json();
        setResult(result);
      }
    } catch (error) {
      console.error("Error previewing code:", error);
      setError("No se pudo previsualizar el código. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="preview">
              <i className="ri-eye-line mr-2"></i>
              Vista Previa
            </TabsTrigger>
            <TabsTrigger value="iframe">
              <i className="ri-window-line mr-2"></i>
              Ventana completa
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center space-x-2">
          <button
            onClick={previewCode}
            className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            title="Refrescar vista previa"
          >
            <i className="ri-refresh-line"></i>
          </button>
        </div>
      </div>

      <div className="flex-1">
        <TabsContent value="preview" className="h-full">
          <div className="h-full p-4 bg-white dark:bg-slate-900 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 p-4">
                <h3 className="font-bold mb-2">Error:</h3>
                <pre className="bg-red-50 dark:bg-red-900/20 p-4 rounded overflow-auto">
                  {error}
                </pre>
              </div>
            ) : result ? (
              result.visualOutput && result.htmlContent ? (
                <div className="border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden h-full">
                  <iframe
                    srcDoc={result.htmlContent}
                    className="w-full h-full"
                    sandbox="allow-scripts allow-forms allow-same-origin"
                    title="Preview"
                  ></iframe>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
                  <h3 className="font-medium mb-2">Resultado de ejecución:</h3>
                  <pre className="whitespace-pre-wrap bg-white dark:bg-slate-900 p-4 rounded-md border border-slate-200 dark:border-slate-700">
                    {result.output}
                  </pre>

                  {result.error && (
                    <div className="mt-4">
                      <h4 className="font-medium text-red-500 mb-2">Error:</h4>
                      <pre className="whitespace-pre-wrap bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-200 dark:border-red-800">
                        {result.error}
                      </pre>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <i className="ri-code-line text-5xl mb-4"></i>
                <p>Selecciona un archivo para ver la previsualización</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="iframe" className="h-full">
          {result?.visualOutput && result.htmlContent ? (
            <iframe
              srcDoc={result.htmlContent}
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-forms allow-same-origin"
              title="Full Preview"
            ></iframe>
          ) : (
            <div className="flex items-center justify-center h-full bg-slate-50 dark:bg-slate-800">
              <div className="text-center p-4">
                <i className="ri-file-text-line text-5xl text-slate-400 mb-4"></i>
                <p className="text-slate-600 dark:text-slate-400">
                  La vista previa solo está disponible para archivos HTML, CSS o JavaScript.
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </div>
    </div>
  );
};

export default CodePreview;