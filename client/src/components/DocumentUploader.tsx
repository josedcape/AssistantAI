import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackageOpenIcon, FolderIcon } from "lucide-react";

interface DocumentUploaderProps {
  projectId: number;
  onDocumentUploaded: () => void;
}

export function DocumentUploader({ projectId, onDocumentUploaded }: DocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlToFetch, setUrlToFetch] = useState("");
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
      //Added to show progress for large files
      if(files[i].size > 1024 * 1024){
        toast({
          title: 'Subiendo archivo',
          description: `Procesando ${files[i].name} (${(files[i].size / (1024 * 1024)).toFixed(2)} MB)...`,
        });
      }
    }
    formData.append("projectId", projectId.toString());
    formData.append("extractFiles", "false"); 

    try {
      const response = await fetch(`/api/projects/${projectId}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al cargar archivos: ${response.statusText}`);
      }

      const result = await response.json();

      toast({
        title: "Documentos cargados",
        description: `Se cargaron ${result.processed} archivos correctamente`,
      });

      onDocumentUploaded();
    } catch (error) {
      console.error("Error subiendo documentos:", error);
      toast({
        title: "Error de procesamiento",
        description: error instanceof Error ? error.message : "Error al cargar los documentos. Verifique el formato y tamaño.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlFetch = async (extractFiles = false) => {
    if (!urlToFetch.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa una URL",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const response = await apiRequest("POST", `/api/projects/${projectId}/documents/url`, {
        url: urlToFetch,
        extractFiles: extractFiles
      });

      const result = await response.json();

      toast({
        title: "Documentos procesados",
        description: extractFiles 
          ? `Se descomprimieron ${result.processed || 0} archivos correctamente` 
          : `Se procesaron los archivos desde la URL correctamente`,
      });

      onDocumentUploaded();
      setUrlToFetch("");
    } catch (error) {
      console.error("Error procesando URL:", error);
      toast({
        title: "Error de procesamiento",
        description: error instanceof Error ? error.message : "Error al procesar la URL. Verifique la URL ingresada.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Función para extraer archivos de un repositorio ya cargado
  const handleExtractRepo = async (documentId: number) => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const response = await apiRequest("POST", `/api/documents/${documentId}/extract`, {
        projectId: projectId
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al extraer archivos");
      }

      const result = await response.json();

      toast({
        title: "Repositorio extraído",
        description: `Se extrajeron ${result.processed || 0} archivos correctamente`,
      });

      onDocumentUploaded();
    } catch (error) {
      console.error("Error extrayendo repositorio:", error);
      toast({
        title: "Error de procesamiento",
        description: error instanceof Error ? error.message : "Error al extraer los archivos. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-md bg-slate-50 dark:bg-slate-800">
      <h3 className="text-lg font-medium">Cargar Documentos</h3>

      <Tabs defaultValue="file" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file">Archivos locales</TabsTrigger>
          <TabsTrigger value="url">URL / Repositorio</TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-4 pt-2">
          <div className="flex flex-col space-y-2">
            <label className="text-sm text-slate-500 dark:text-slate-400">
              Selecciona uno o varios archivos para cargar
            </label>
            <Input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={isUploading}
              className="cursor-pointer"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formatos soportados: .txt, .pdf, .doc, .docx, .zip, .rar, .js, .ts, .html, .css, .json
            </p>
          </div>
        </TabsContent>

        <TabsContent value="url" className="space-y-4 pt-2">
          <div className="flex flex-col space-y-3">
            <label className="text-sm text-slate-500 dark:text-slate-400">
              Ingresa la URL de un repositorio o archivo
            </label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://github.com/usuario/repositorio"
                value={urlToFetch}
                onChange={(e) => setUrlToFetch(e.target.value)}
                disabled={isUploading}
              />
              <Button 
                onClick={() => handleUrlFetch(false)} 
                disabled={isUploading || !urlToFetch.trim()}
                size="sm"
                variant="outline"
                title="Cargar como archivo único"
              >
                {isUploading ? "Procesando..." : "Importar"}
              </Button>
              <Button 
                onClick={() => handleUrlFetch(true)} 
                disabled={isUploading || !urlToFetch.trim()}
                size="sm"
                title="Descomprimir archivos individualmente"
              >
                <PackageOpenIcon className="h-4 w-4 mr-1" />
                Extraer
              </Button>
            </div>
            <div className="flex items-center">
              <div className="flex-grow h-px bg-slate-200 dark:bg-slate-700"></div>
              <span className="px-2 text-xs text-slate-500 dark:text-slate-400">o</span>
              <div className="flex-grow h-px bg-slate-200 dark:bg-slate-700"></div>
            </div>
            <p className="text-sm font-medium">
              Para extraer archivos de un repositorio ya cargado:
            </p>
            <div className="flex gap-2 items-center">
              <Button
                onClick={() => document.dispatchEvent(new CustomEvent('extract-repository'))}
                size="sm"
                variant="secondary"
                disabled={isProcessing}
              >
                <FolderIcon className="h-4 w-4 mr-1" />
                {isProcessing ? "Procesando..." : "Extraer repositorio"}
              </Button>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecciona un repositorio en el explorador y usa este botón
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      {/* Added Back Button */}
      <Button onClick={() => {/* Add your logic to go back to development area */}}>Volver al área de desarrollo</Button>

    </div>
  );
}