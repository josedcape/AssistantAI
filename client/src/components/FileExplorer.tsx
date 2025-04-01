
import { useState, useEffect } from "react";
import { File, Document } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { getLanguageIcon } from "@/lib/types";
import { DocumentUploader } from "./DocumentUploader";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { FileIcon, FolderIcon, TrashIcon, RefreshCwIcon, PlusIcon } from "lucide-react";

interface FileExplorerProps {
  projectId: number;
  onFileSelect: (file: File) => void;
  selectedFileId?: number;
}

function FileExplorer({ projectId, onFileSelect, selectedFileId }: FileExplorerProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState<"files" | "documents" | "both">("both");
  const { toast } = useToast();

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await apiRequest("GET", `/api/projects/${projectId}/files`);
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error("Error loading files:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los archivos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const response = await apiRequest("GET", `/api/projects/${projectId}/documents`);
      const data = await response.json();
      setDocuments(data);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (projectId) {
      loadFiles();
      loadDocuments();
    }
  }, [projectId]);

  const handleDeleteFile = async (fileId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm("¿Estás seguro de eliminar este archivo?")) {
      return;
    }

    try {
      await apiRequest("DELETE", `/api/files/${fileId}`);
      setFiles(files.filter(file => file.id !== fileId));
      toast({
        title: "Éxito",
        description: "Archivo eliminado correctamente",
      });
    } catch (error) {
      console.error("Error eliminando archivo:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el archivo",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (documentId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm("¿Estás seguro de eliminar este documento?")) {
      return;
    }

    try {
      await apiRequest("DELETE", `/api/documents/${documentId}`);
      setDocuments(documents.filter(doc => doc.id !== documentId));
      toast({
        title: "Éxito",
        description: "Documento eliminado correctamente",
      });
    } catch (error) {
      console.error("Error eliminando documento:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive",
      });
    }
  };

  const handleCreateNewFile = async () => {
    const fileName = prompt("Introduce el nombre del archivo (incluyendo extensión):");
    if (!fileName) return;

    try {
      const fileType = fileName.split('.').pop() || "txt";
      const response = await apiRequest("POST", `/api/projects/${projectId}/files`, {
        name: fileName,
        content: "",
        type: fileType,
      });

      const newFile = await response.json();
      setFiles([...files, newFile]);
      onFileSelect(newFile);
      
      toast({
        title: "Éxito",
        description: "Archivo creado correctamente",
      });
    } catch (error) {
      console.error("Error creando archivo:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el archivo",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    await loadFiles();
    await loadDocuments();
    toast({
      title: "Actualizado",
      description: "Lista de archivos actualizada",
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center p-2 border-b">
        <h3 className="text-sm font-medium">Explorador</h3>
        <div className="flex space-x-1">
          <Button variant="ghost" size="icon" onClick={handleRefresh} title="Actualizar">
            <RefreshCwIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleCreateNewFile} title="Nuevo archivo">
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-grow overflow-auto p-1">
        {/* Archivos */}
        <Collapsible 
          open={openSection === "files" || openSection === "both"} 
          onOpenChange={() => setOpenSection(openSection === "files" ? "both" : "files")}
          className="mb-2"
        >
          <CollapsibleTrigger className="flex items-center w-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
            <FolderIcon className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Archivos</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-2 pt-1">
            {files.length === 0 ? (
              <p className="text-xs text-slate-500 p-1">No hay archivos</p>
            ) : (
              <ul className="space-y-1">
                {files.map((file) => (
                  <li 
                    key={file.id} 
                    className={`
                      flex justify-between items-center p-1 rounded text-xs cursor-pointer
                      ${selectedFileId === file.id ? 'bg-slate-200 dark:bg-slate-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}
                    `}
                    onClick={() => onFileSelect(file)}
                  >
                    <div className="flex items-center">
                      <span className="mr-1">{getLanguageIcon(file.type)}</span>
                      <span className="truncate max-w-[150px]">{file.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 hover:opacity-100 group-hover:opacity-100"
                      onClick={(e) => handleDeleteFile(file.id!, e)}
                    >
                      <TrashIcon className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Documentos */}
        <Collapsible 
          open={openSection === "documents" || openSection === "both"} 
          onOpenChange={() => setOpenSection(openSection === "documents" ? "both" : "documents")}
        >
          <CollapsibleTrigger className="flex items-center w-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
            <FolderIcon className="h-4 w-4 mr-1" />
            <span className="text-sm font-medium">Documentos</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-2 pt-1">
            <DocumentUploader 
              projectId={projectId} 
              onDocumentUploaded={() => loadDocuments()} 
            />
            
            {documents.length === 0 ? (
              <p className="text-xs text-slate-500 p-1 mt-2">No hay documentos</p>
            ) : (
              <ul className="space-y-1 mt-2">
                {documents.map((doc) => (
                  <li 
                    key={doc.id} 
                    className="flex justify-between items-center p-1 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center">
                      <FileIcon className="h-3 w-3 mr-1" />
                      <span className="truncate max-w-[150px]">{doc.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 hover:opacity-100 group-hover:opacity-100"
                      onClick={(e) => handleDeleteDocument(doc.id!, e)}
                    >
                      <TrashIcon className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

export default FileExplorer;
