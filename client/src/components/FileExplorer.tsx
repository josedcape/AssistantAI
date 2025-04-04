import { useState, useEffect } from "react";
import { File, Document, PanelLeft } from "@shared/schema"; // Assuming PanelLeft is correctly imported
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { getLanguageIcon } from "@/lib/types";
import { DocumentUploader } from "./DocumentUploader";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { FileIcon, FolderIcon, TrashIcon, RefreshCwIcon, PlusIcon, PackageOpenIcon, PackageIcon } from "lucide-react";
import { 
  SidebarGroup, 
  SidebarGroupLabel, 
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from "@/components/ui/sidebar"; // Assuming these are correctly imported


interface FileExplorerProps {
  projectId: number;
  onFileSelect: (file: File) => void;
  selectedFileId?: number;
}

import { projectStorage } from "@/lib/storage";

function FileExplorer({ projectId, onFileSelect, selectedFileId }: FileExplorerProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState<"files" | "documents" | "both">("both");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      setLoading(true);

      // Check if we have cached files first
      const cachedFiles = projectStorage.getProject<File[]>(projectId, []);
      if (cachedFiles && cachedFiles.length > 0) {
        console.log("Loading files from local storage", cachedFiles.length);
        setFiles(cachedFiles);
      }

      // Always fetch fresh data from server
      const response = await apiRequest("GET", `/api/projects/${projectId}/files`);
      const data = await response.json();

      // Update state and cache
      setFiles(data);
      projectStorage.saveProject(projectId, data);

      // Save project ID as last used
      projectStorage.saveLastProjectId(projectId);
    } catch (error) {
      console.error("Error loading files:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los archivos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const loadDocuments = async () => {
    try {
      // Check cache first
      const cachedDocs = projectStorage.getProject<Document[]>(`${projectId}_docs`, []);
      if (cachedDocs && cachedDocs.length > 0) {
        setDocuments(cachedDocs);
      }

      // Fetch fresh data
      const response = await apiRequest("GET", `/api/projects/${projectId}/documents`);
      const data = await response.json();

      // Update state and cache
      setDocuments(data);
      projectStorage.saveProject(`${projectId}_docs`, data);
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

    // Agregar listener para el evento de extraer repositorio
    const handleExtractRepoEvent = () => {
      // Buscar un documento que podría ser un repositorio (por nombre o tipo)
      const repoDoc = documents.find(doc => 
        doc.type === 'repository' || 
        doc.name.includes('Repositorio') || 
        doc.path?.endsWith('.zip')
      );

      if (repoDoc && repoDoc.id) {
        handleExtractRepository(repoDoc.id, new MouseEvent('click') as any);
      } else {
        toast({
          title: "Aviso",
          description: "No se encontró ningún repositorio para extraer. Selecciona un repositorio primero.",
          variant: "destructive",
        });
      }
    };

    document.addEventListener('extract-repository', handleExtractRepoEvent);

    return () => {
      document.removeEventListener('extract-repository', handleExtractRepoEvent);
    };
  }, [projectId, documents]);

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

  const handleExtractRepository = async (documentId: number, event: React.MouseEvent) => {
    event.stopPropagation();

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

      await loadDocuments();
    } catch (error) {
      console.error("Error extrayendo repositorio:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al extraer los archivos",
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

  // Organize documents by folder
  const docFolders = documents.reduce((acc, doc) => {
    const folderName = doc.path ? doc.path.split('/').slice(0, -1).join('/') || 'raíz' : 'raíz';
    acc[folderName] = acc[folderName] || [];
    acc[folderName].push(doc);
    return acc;
  }, {} as { [folderName: string]: Document[] });


  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800">
      <SidebarGroup>
        <SidebarGroupLabel className="flex justify-between">
          <span>Explorador</span>
          <div className="flex space-x-1">
            <Button variant="ghost" size="icon" onClick={handleRefresh} title="Actualizar">
              <RefreshCwIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCreateNewFile} title="Nuevo archivo">
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
        </SidebarGroupLabel>
        <SidebarGroupContent>

        {isLoading && (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}

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
          <CollapsibleContent>
            <DocumentUploader 
              projectId={projectId} 
              onDocumentUploaded={loadDocuments} 
            />
            {Object.keys(docFolders).length === 0 ? (
              <div className="py-2 px-1 text-sm text-slate-500 dark:text-slate-400">
                No hay documentos cargados
              </div>
            ) : (
              <div className="space-y-1 py-1">
                {Object.entries(docFolders).map(([folderName, docs]) => (
                  <Collapsible key={folderName} defaultOpen={folderName === 'raíz'}>
                    <CollapsibleTrigger className="flex w-full items-center py-1 px-2 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-700">
                      <FolderIcon className="h-3 w-3 mr-1" />
                      <span className="truncate flex-1 text-left">{folderName}</span>
                      <span className="text-xs text-slate-500">{docs.length}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="space-y-1 pl-4 mt-1">
                        {docs.map(doc => (
                          <li 
                            key={doc.id} 
                            className="flex justify-between items-center py-1 px-2 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-700 group cursor-pointer"
                            onClick={async () => {
                              try {
                                if (!doc.id) {
                                  throw new Error("El documento no tiene un ID válido");
                                }

                                // Obtener contenido del documento
                                const response = await apiRequest("GET", `/api/documents/${doc.id}/content`);
                                if (!response.ok) {
                                  const errorData = await response.json();
                                  throw new Error(errorData.error || "Error al cargar el documento");
                                }

                                const content = await response.text();

                                // Detectar el tipo de archivo basado en la extensión
                                const fileExt = doc.name ? doc.name.split('.').pop()?.toLowerCase() : '';
                                let fileType = 'text';

                                if (fileExt === 'js') fileType = 'javascript';
                                else if (fileExt === 'ts') fileType = 'typescript';
                                else if (fileExt === 'html') fileType = 'html';
                                else if (fileExt === 'css') fileType = 'css';
                                else if (fileExt === 'json') fileType = 'json';
                                else if (fileExt === 'py') fileType = 'python';

                                // Crear un archivo temporal para visualizar
                                const tempFile: File = {
                                  id: -doc.id, // ID negativo para diferenciar
                                  projectId: projectId,
                                  name: doc.name,
                                  content: content,
                                  type: fileType,
                                  createdAt: doc.createdAt,
                                  lastModified: doc.createdAt,
                                };

                                // Seleccionar el archivo para visualización
                                onFileSelect(tempFile);
                              } catch (error) {
                                console.error("Error cargando documento:", error);
                                toast({
                                  title: "Error",
                                  description: error instanceof Error ? error.message : "No se pudo cargar el documento",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <div className="flex items-center">
                              <FileIcon className="h-3 w-3 mr-1" />
                              <span className="truncate max-w-[150px]">
                                {/* Mostrar solo el nombre de archivo, sin la ruta */}
                                {doc.name.includes('/') ? doc.name.split('/').pop() : doc.name}
                              </span>
                            </div>
                            <div className="flex opacity-0 group-hover:opacity-100">
                              {(doc.type === 'repository' || doc.name.includes('Repositorio') || doc.path?.endsWith('.zip')) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  title="Extraer archivos"
                                  onClick={(e) => handleExtractRepository(doc.id!, e)}
                                >
                                  <PackageOpenIcon className="h-3 w-3" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                title="Eliminar documento"
                                onClick={(e) => handleDeleteDocument(doc.id!, e)}
                              >
                                <TrashIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}

export default FileExplorer;