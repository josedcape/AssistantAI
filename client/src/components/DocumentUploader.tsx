
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DocumentUploaderProps {
  projectId: number;
  onDocumentUploaded: () => void;
}

export function DocumentUploader({ projectId, onDocumentUploaded }: DocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [urlToFetch, setUrlToFetch] = useState("");
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    formData.append("projectId", projectId.toString());

    try {
      const response = await fetch(`/api/projects/${projectId}/documents/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error al cargar archivos: ${response.statusText}`);
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
        title: "Error",
        description: error instanceof Error ? error.message : "Error al cargar los documentos",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlFetch = async () => {
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
      });

      const result = await response.json();
      
      toast({
        title: "Documentos procesados",
        description: `Se procesaron los archivos desde la URL correctamente`,
      });
      
      onDocumentUploaded();
      setUrlToFetch("");
    } catch (error) {
      console.error("Error procesando URL:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al procesar la URL",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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
          <div className="flex flex-col space-y-2">
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
                onClick={handleUrlFetch} 
                disabled={isUploading || !urlToFetch.trim()}
                size="sm"
              >
                {isUploading ? "Procesando..." : "Importar"}
              </Button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Soporta repositorios Git, archivos ZIP y recursos individuales
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
