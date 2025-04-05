import { useState, useEffect, useCallback, useRef } from "react";
import { File, Document } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getLanguageIcon } from "@/lib/types";
import { DocumentUploader } from "./DocumentUploader";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { 
  FileIcon, 
  FolderIcon, 
  TrashIcon, 
  RefreshCwIcon, 
  PlusIcon, 
  PackageOpenIcon,
  ChevronRight,
  ChevronDown,
  FileTextIcon,
  FileCodeIcon,
  FolderPlusIcon
} from "lucide-react";
import { 
  SidebarGroup, 
  SidebarGroupLabel, 
  SidebarGroupContent
} from "@/components/ui/sidebar";
import { projectStorage } from "@/lib/storage";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sounds } from "@/lib/sounds";

interface FileExplorerProps {
  projectId: number;
  onFileSelect: (file: File) => void;
  selectedFileId?: number;
}

function FileExplorer({ projectId, onFileSelect, selectedFileId }: FileExplorerProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openSections, setOpenSections] = useState({
    files: true,
    documents: true
  });
  const [openTypes, setOpenTypes] = useState<Record<string, boolean>>({});
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    'raíz': true
  });
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [fileExtension, setFileExtension] = useState(".js");
  const [currentPath, setCurrentPath] = useState(""); // Para guardar la ruta actual al crear archivos/carpetas
  const { toast } = useToast();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Common file extensions
  const commonExtensions = [
    { value: ".js", label: "JavaScript (.js)" },
    { value: ".jsx", label: "React (.jsx)" },
    { value: ".ts", label: "TypeScript (.ts)" },
    { value: ".tsx", label: "React TS (.tsx)" },
    { value: ".html", label: "HTML (.html)" },
    { value: ".css", label: "CSS (.css)" },
    { value: ".json", label: "JSON (.json)" },
    { value: ".md", label: "Markdown (.md)" },
    { value: ".txt", label: "Text (.txt)" }
  ];

  // Get file type from extension
  const getFileType = useCallback((fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || "";

    switch (ext) {
      case 'js': return 'javascript';
      case 'jsx': return 'javascript';
      case 'ts': return 'typescript';
      case 'tsx': return 'typescript';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'json': return 'json';
      case 'md': return 'markdown';
      default: return 'text';
    }
  }, []);

  // Memoized data fetching functions
  const loadFiles = useCallback(async (showToast = false) => {
    if (!projectId || isNaN(projectId)) return;

    try {
      setIsLoading(true);

      // Check cache first
      const cachedFiles = projectStorage.getProject<File[]>(projectId, 'files');
      if (cachedFiles?.length > 0) {
        setFiles(cachedFiles);
      }

      // Always fetch fresh data
      const response = await apiRequest("GET", `/api/projects/${projectId}/files`);
      if (!response.ok) throw new Error("Failed to fetch files");

      const data = await response.json();
      setFiles(data);
      projectStorage.saveProject(projectId, 'files', data);
      projectStorage.saveLastProjectId(projectId);

      if (showToast) {
        toast({
          title: "Actualizado",
          description: "Lista de archivos actualizada",
        });
        sounds.play('success', 0.3);
      }
    } catch (error) {
      console.error("Error loading files:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los archivos",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, toast]);

  const loadDocuments = useCallback(async (showToast = false) => {
    if (!projectId || isNaN(projectId)) return;

    try {
      // Check cache first
      const cachedDocs = projectStorage.getProject<Document[]>(projectId, 'documents');
      if (cachedDocs?.length > 0) {
        setDocuments(cachedDocs);
      }

      // Fetch fresh data
      const response = await apiRequest("GET", `/api/projects/${projectId}/documents`);
      if (!response.ok) throw new Error("Failed to fetch documents");

      const data = await response.json();
      setDocuments(data);
      projectStorage.saveProject(projectId, 'documents', data);

      if (showToast) {
        toast({
          title: "Actualizado",
          description: "Lista de documentos actualizada",
        });
        sounds.play('success', 0.3);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
    }
  }, [projectId, toast]);

  // Handle repository extraction
  const handleExtractRepository = useCallback(async (documentId: number, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      toast({
        title: "Procesando",
        description: "Extrayendo archivos del repositorio...",
      });
      sounds.play('pop', 0.3);

      const response = await apiRequest("POST", `/api/documents/${documentId}/extract`, {
        projectId
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
      sounds.play('success', 0.4);

      // Reload files with a delay to ensure backend has processed them
      setTimeout(() => {
        loadFiles(true);
        loadDocuments(true);
      }, 1000);
    } catch (error) {
      console.error("Error extrayendo repositorio:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al extraer los archivos",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
    }
  }, [projectId, toast, loadFiles, loadDocuments]);

  // Initial data loading
  useEffect(() => {
    if (projectId && !isNaN(projectId)) {
      loadFiles();
      loadDocuments();
    }
  }, [projectId, loadFiles, loadDocuments]);

  // Repository extraction event listener
  useEffect(() => {
    const handleExtractRepoEvent = () => {
      const repoDoc = documents.find(doc => 
        doc.type === 'repository' || 
        doc.name.includes('Repositorio') || 
        doc.path?.endsWith('.zip')
      );

      if (repoDoc?.id) {
        handleExtractRepository(repoDoc.id, new MouseEvent('click') as any);
      } else {
        toast({
          title: "Aviso",
          description: "No se encontró ningún repositorio para extraer. Selecciona un repositorio primero.",
          variant: "destructive",
        });
        sounds.play('error', 0.3);
      }
    };

    document.addEventListener('extract-repository', handleExtractRepoEvent);
    return () => document.removeEventListener('extract-repository', handleExtractRepoEvent);
  }, [documents, handleExtractRepository, toast]);

  // File operations
  const handleDeleteFile = async (fileId: number, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      toast({
        title: "Eliminando archivo...",
        description: "Por favor espera",
      });
      sounds.play('pop', 0.2);

      const response = await apiRequest("DELETE", `/api/files/${fileId}`);
      if (!response.ok) throw new Error("Failed to delete file");

      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
      toast({
        title: "Éxito",
        description: "Archivo eliminado correctamente",
      });
      sounds.play('success', 0.3);
    } catch (error) {
      console.error("Error eliminando archivo:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el archivo",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
    }
  };

  const handleDeleteDocument = async (documentId: number, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      toast({
        title: "Eliminando documento...",
        description: "Por favor espera",
      });
      sounds.play('pop', 0.2);

      const response = await apiRequest("DELETE", `/api/documents/${documentId}`);
      if (!response.ok) throw new Error("Failed to delete document");

      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentId));
      toast({
        title: "Éxito",
        description: "Documento eliminado correctamente",
      });
      sounds.play('success', 0.3);
    } catch (error) {
      console.error("Error eliminando documento:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
    }
  };

  const handleCreateNewFile = async () => {
    if (!newFileName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del archivo no puede estar vacío",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
      return;
    }

    const fullFileName = newFileName + fileExtension;
    const filePath = currentPath ? `${currentPath}/${fullFileName}` : fullFileName;

    try {
      toast({
        title: "Creando archivo",
        description: filePath,
      });
      sounds.play('pop', 0.3);

      const fileType = getFileType(fullFileName);
      const response = await apiRequest("POST", `/api/projects/${projectId}/files`, {
        name: filePath,
        content: "", // Contenido inicial vacío
        type: fileType,
        path: currentPath || undefined
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear archivo");
      }

      const newFile = await response.json();

      // Update state
      setFiles(prevFiles => [...prevFiles, newFile]);

      // Select the new file
      onFileSelect(newFile);

      // Reset form
      setNewFileName("");
      setShowNewFileDialog(false);

      // Auto-expand the file type group
      const ext = fullFileName.split('.').pop()?.toLowerCase() || "other";
      setOpenTypes(prev => ({ ...prev, [ext]: true }));

      // Auto-expand the folder if in a subfolder
      if (currentPath) {
        setOpenFolders(prev => ({ ...prev, [currentPath]: true }));
      }

      toast({
        title: "Archivo creado",
        description: `Se ha creado el archivo ${fullFileName}`,
      });
      sounds.play('success', 0.4);

      // Reload files to ensure the UI is updated
      setTimeout(() => loadFiles(), 500);
    } catch (error) {
      console.error("Error creando archivo:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear el archivo",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
    }
  };

  const handleCreateNewFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la carpeta no puede estar vacío",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
      return;
    }

    const folderPath = currentPath 
      ? `${currentPath}/${newFolderName}` 
      : newFolderName;

    try {
      toast({
        title: "Creando carpeta",
        description: folderPath,
      });
      sounds.play('pop', 0.3);

      // Crear un archivo oculto .gitkeep para representar la carpeta
      const response = await apiRequest("POST", `/api/projects/${projectId}/files`, {
        name: `${folderPath}/.gitkeep`,
        content: "",
        type: "text",
        path: folderPath
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear carpeta");
      }

      // Reset form
      setNewFolderName("");
      setShowNewFolderDialog(false);

      // Auto-expand the folder
      setOpenFolders(prev => ({ ...prev, [folderPath]: true }));

      toast({
        title: "Carpeta creada",
        description: `Se ha creado la carpeta ${newFolderName}`,
      });
      sounds.play('success', 0.4);

      // Importante: recargar archivos para mostrar la nueva estructura
      await loadFiles(false);
    } catch (error) {
      console.error("Error creando carpeta:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear la carpeta",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
    }
  };
  const handleRefresh = () => {
    // Avoid multiple quick refreshes
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Show loading indicator
    setIsLoading(true);
    sounds.play('click', 0.2);

    refreshTimeoutRef.current = setTimeout(() => {
      loadFiles(true);
      loadDocuments(true);
      refreshTimeoutRef.current = null;
    }, 300);
  };

  const handleViewDocument = async (doc: Document) => {
    try {
      if (!doc.id) {
        throw new Error("El documento no tiene un ID válido");
      }

      toast({
        title: "Cargando documento",
        description: doc.name,
      });
      sounds.play('pop', 0.2);

      // Get document content
      const response = await apiRequest("GET", `/api/documents/${doc.id}/content`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al cargar el documento");
      }

      const content = await response.text();

      // Detect file type based on extension
      const fileType = getFileType(doc.name);

      // Create temporary file for viewing
      const tempFile: File = {
        id: -doc.id, // Negative ID to differentiate
        projectId,
        name: doc.name,
        content,
        type: fileType,
        createdAt: doc.createdAt,
        lastModified: doc.createdAt,
      };

      // Select file for viewing
      onFileSelect(tempFile);
    } catch (error) {
      console.error("Error loading document:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo cargar el documento",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
    }
  };

  // Toggle section visibility
  const toggleSection = (section: 'files' | 'documents') => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
    sounds.play('click', 0.1);
  };

  // Toggle file type visibility
  const toggleTypeSection = (type: string) => {
    setOpenTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
    sounds.play('click', 0.1);
  };

  // Toggle folder visibility
  const toggleFolder = (folderName: string) => {
    setOpenFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
    sounds.play('click', 0.1);
  };

  // Get icon for file by type
  const getFileIconByType = (fileType: string) => {
    switch (fileType) {
      case 'javascript':
      case 'typescript':
        return <FileCodeIcon className="h-3.5 w-3.5 text-yellow-500" />;
      case 'html':
        return <FileCodeIcon className="h-3.5 w-3.5 text-orange-500" />;
      case 'css':
        return <FileCodeIcon className="h-3.5 w-3.5 text-blue-500" />;
      case 'json':
        return <FileCodeIcon className="h-3.5 w-3.5 text-green-500" />;
      default:
        return <FileTextIcon className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  // Organize files by folder structure
  const organizeFilesByFolder = useCallback(() => {
    const fileStructure: {
      [folderPath: string]: {
        files: File[];
        subfolders: string[];
      }
    } = {
      'raíz': {
        files: [],
        subfolders: []
      }
    };

    // First pass: identify all folders
    files.forEach(file => {
      if (!file.name) return;

      const pathParts = file.name.split('/');

      if (pathParts.length === 1) {
        // Root file
        fileStructure['raíz'].files.push(file);
        return;
      }

      // Create folder structure
      let currentPath = '';
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];
        const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;

        if (!fileStructure[newPath]) {
          fileStructure[newPath] = {
            files: [],
            subfolders: []
          };

          // Add as subfolder to parent
          const parentPath = i === 0 ? 'raíz' : currentPath;
          if (!fileStructure[parentPath].subfolders.includes(newPath)) {
            fileStructure[parentPath].subfolders.push(newPath);
          }
        }

        currentPath = newPath;
      }

      // Add file to its folder
      fileStructure[currentPath].files.push(file);
    });

    return fileStructure;
  }, [files]);

  // Organize documents by folder
  const docFolders = documents.reduce((acc, doc) => {
    const folderName = doc.path ? doc.path.split('/').slice(0, -1).join('/') || 'raíz' : 'raíz';
    acc[folderName] = acc[folderName] || [];
    acc[folderName].push(doc);
    return acc;
  }, {} as { [folderName: string]: Document[] });

  // Organize files by extension for better grouping
  const filesByType = files.reduce((acc, file) => {
    // Skip files that are in subfolders for the type view
    if (file.name && file.name.includes('/')) return acc;

    const ext = file.name.split('.').pop()?.toLowerCase() || 'other';
    acc[ext] = acc[ext] || [];
    acc[ext].push(file);
    return acc;
  }, {} as { [ext: string]: File[] });

  // File type order for display
  const fileTypeOrder = [
    'html', 'css', 'js', 'jsx', 'ts', 'tsx', 'json', 'md'
  ];

  // Sort file types by predefined order, then alphabetically
  const sortedFileTypes = Object.keys(filesByType).sort((a, b) => {
    const indexA = fileTypeOrder.indexOf(a);
    const indexB = fileTypeOrder.indexOf(b);

    if (indexA >= 0 && indexB >= 0) return indexA - indexB;
    if (indexA >= 0) return -1;
    if (indexB >= 0) return 1;
    return a.localeCompare(b);
  });

  // Get folder structure
  const fileStructure = organizeFilesByFolder();

  // Render folder and its contents recursively
  const renderFolder = (folderPath: string, folderName: string, level = 0) => {
    const folder = fileStructure[folderPath];
    if (!folder) return null;

    const displayName = folderPath === 'raíz' 
      ? 'Principal' 
      : folderName;

    return (
      <div key={folderPath} className="mb-1">
        <div 
          className={`
            flex items-center w-full py-1 px-1.5 rounded text-xs 
            hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer
            ${level > 0 ? 'ml-2' : ''}
          `}
          onClick={() => toggleFolder(folderPath)}
        >
          {openFolders[folderPath] !== false ? 
            <ChevronDown className="h-3 w-3 mr-1 text-slate-400" /> : 
            <ChevronRight className="h-3 w-3 mr-1 text-slate-400" />
          }
          <FolderIcon className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
          <span className="truncate flex-1 text-left font-medium">
            {displayName}
          </span>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPath(folderPath === 'raíz' ? '' : folderPath);
                setShowNewFileDialog(true);
              }}
              title="Nuevo archivo"
            >
              <PlusIcon className="h-3 w-3 text-blue-500" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPath(folderPath === 'raíz' ? '' : folderPath);
                setShowNewFolderDialog(true);
              }}
              title="Nueva carpeta"
            >
              <FolderPlusIcon className="h-3 w-3 text-amber-500" />
            </Button>
          </div>
        </div>

        {openFolders[folderPath] !== false && (
          <div className={`pl-${level > 0 ? '4' : '2'} space-y-0.5`}>
            {/* Files in this folder */}
            {folder.files
              .filter(file => !file.name.endsWith('/.gitkeep')) // Hide .gitkeep files
              .sort((a, b) => {
                const nameA = a.name.split('/').pop() || '';
                const nameB = b.name.split('/').pop() || '';
                return nameA.localeCompare(nameB);
              })
              .map(file => {
                const fileName = file.name.split('/').pop() || file.name;
                return (
                  <div 
                    key={file.id} 
                    className={`
                      flex justify-between items-center p-1 rounded text-xs cursor-pointer group
                      ${selectedFileId === file.id ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}
                    `}
                    onClick={() => onFileSelect(file)}
                    title={fileName}
                  >
                    <div className="flex items-center truncate">
                      {getFileIconByType(file.type)}
                      <span className="ml-1.5 truncate">{fileName}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteFile(file.id!, e)}
                      title="Eliminar archivo"
                    >
                      <TrashIcon className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                );
              })}

            {/* Subfolders */}
            {folder.subfolders.sort().map(subfolder => {
              const subfolderName = subfolder.split('/').pop() || '';
              return renderFolder(subfolder, subfolderName, level + 1);
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800">
      <SidebarGroup>
        <SidebarGroupLabel className="flex justify-between items-center">
          <span>Explorador</span>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh} 
              title="Actualizar"
              className="h-7 w-7"
              disabled={isLoading}
            >
              <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                setCurrentPath('');
                setShowNewFileDialog(true);
              }} 
              title="Nuevo archivo"
              className="h-7 w-7"
              disabled={isLoading}
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                setCurrentPath('');
                setShowNewFolderDialog(true);
              }} 
              title="Nueva carpeta"
              className="h-7 w-7"
              disabled={isLoading}
            >
              <FolderPlusIcon className="h-4 w-4" />
            </Button>
          </div>
        </SidebarGroupLabel>
        <SidebarGroupContent>
          {isLoading && (
            <div className="flex justify-center items-center h-12">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Files Section */}
          <Collapsible 
            open={openSections.files} 
            onOpenChange={() => toggleSection('files')}
            className="mb-2"
          >
            <CollapsibleTrigger className="flex items-center w-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
              {openSections.files ? 
                <ChevronDown className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> : 
                <ChevronRight className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              }
              <FolderIcon className="h-4 w-4 mr-1.5 text-blue-500" />
              <span className="text-sm font-medium">Archivos</span>
              <span className="ml-auto text-xs text-slate-500">{files.length}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-3 pt-1 space-y-1">
              {files.length === 0 ? (
                <div className="text-xs text-slate-500 p-2 rounded bg-slate-50 dark:bg-slate-700 my-2">
                  <p className="text-center">No hay archivos</p>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      className="w-full h-7 text-xs" 
                      onClick={() => {
                        setCurrentPath('');
                        setShowNewFileDialog(true);
                      }}
                    >
                      <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                      Crear archivo
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full h-7 text-xs" 
                      onClick={() => {
                        setCurrentPath('');
                        setShowNewFolderDialog(true);
                      }}
                    >
                      <FolderPlusIcon className="h-3.5 w-3.5 mr-1.5" />
                      Crear carpeta
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Vista por carpetas */}
                  <Collapsible 
                    open={true}
                    className="mb-2"
                  >
                    <CollapsibleContent>
                      {renderFolder('raíz', 'Principal')}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Vista por tipos de archivo */}
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-xs font-medium text-slate-500 mb-1 px-1">Por tipo</div>
                    {sortedFileTypes.map((type) => (
                      <Collapsible 
                        key={type} 
                        open={openTypes[type] !== false} // default to open
                        onOpenChange={() => toggleTypeSection(type)}
                      >
                        <CollapsibleTrigger className="flex items-center w-full p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-xs">
                          {openTypes[type] !== false ? 
                            <ChevronDown className="h-3 w-3 mr-1 text-slate-400" /> : 
                            <ChevronRight className="h-3 w-3 mr-1 text-slate-400" />
                          }
                          <span className="font-medium">.{type.toUpperCase()}</span>
                          <span className="ml-auto text-xs text-slate-500">{filesByType[type].length}</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="ml-2 space-y-0.5 mt-0.5">
                          <ul>
                            {filesByType[type].sort((a, b) => a.name.localeCompare(b.name)).map((file) => (
                              <li 
                                key={file.id} 
                                className={`
                                  flex justify-between items-center p-1 rounded text-xs cursor-pointer group
                                  ${selectedFileId === file.id ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}
                                `}
                                onClick={() => onFileSelect(file)}
                                title={file.name}
                              >
                                <div className="flex items-center truncate">
                                  {getFileIconByType(file.type)}
                                  <span className="ml-1.5 truncate">{file.name}</span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => handleDeleteFile(file.id!, e)}
                                  title="Eliminar archivo"
                                >
                                  <TrashIcon className="h-3 w-3 text-red-500" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Documents Section */}
          <Collapsible 
            open={openSections.documents} 
            onOpenChange={() => toggleSection('documents')}
          >
            <CollapsibleTrigger className="flex items-center w-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
              {openSections.documents ? 
                <ChevronDown className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> : 
                <ChevronRight className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              }
              <FolderIcon className="h-4 w-4 mr-1.5 text-purple-500" />
              <span className="text-sm font-medium">Documentos</span>
              <span className="ml-auto text-xs text-slate-500">{documents.length}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-1 pt-2">
              <DocumentUploader 
                projectId={projectId} 
                onDocumentUploaded={loadDocuments} 
              />
              {Object.keys(docFolders).length === 0 ? (
                <div className="py-2 px-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 rounded my-2">
                  <p className="text-center">No hay documentos cargados</p>
                </div>
              ) : (
                <div className="space-y-1 py-1 pl-2">
                  {Object.keys(docFolders).sort().map((folderName) => (
                    <Collapsible 
                      key={folderName} 
                      open={openFolders[folderName] !== false}
                      onOpenChange={() => toggleFolder(folderName)}
                    >
                      <CollapsibleTrigger className="flex w-full items-center py-1 px-1.5 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700">
                        {openFolders[folderName] !== false ? 
                          <ChevronDown className="h-3 w-3 mr-1 text-slate-400" /> : 
                          <ChevronRight className="h-3 w-3 mr-1 text-slate-400" />
                        }
                        <FolderIcon className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                        <span className="truncate flex-1 text-left font-medium">
                          {folderName === 'raíz' ? 'Principal' : folderName.split('/').pop()}
                        </span>
                        <span className="text-xs text-slate-500">{docFolders[folderName].length}</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="ml-4 mt-1 space-y-0.5">
                        <ul>
                          {docFolders[folderName].sort((a, b) => a.name.localeCompare(b.name)).map(doc => (
                            <li 
                              key={doc.id} 
                              className="flex justify-between items-center py-1 px-1 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700 group cursor-pointer"
                              onClick={() => handleViewDocument(doc)}
                              title={doc.name}
                            >
                              <div className="flex items-center truncate">
                                <FileIcon className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                                <span className="truncate">
                                  {doc.name.includes('/') ? doc.name.split('/').pop() : doc.name}
                                </span>
                              </div>
                              <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                {(doc.type === 'repository' || doc.name.includes('Repositorio') || doc.path?.endsWith('.zip')) && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    title="Extraer archivos"
                                    onClick={(e) => handleExtractRepository(doc.id!, e)}
                                  >
                                    <PackageOpenIcon className="h-3 w-3 text-blue-500" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  title="Eliminar documento"
                                  onClick={(e) => handleDeleteDocument(doc.id!, e)}
                                >
                                  <TrashIcon className="h-3 w-3 text-red-500" />
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

      {/* Dialog for creating new file */}
      <Dialog open={showNewFileDialog} onOpenChange={setShowNewFileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear nuevo archivo</DialogTitle>
            <DialogDescription>
              {currentPath 
                ? `El archivo se creará en la carpeta: ${currentPath}` 
                : "Introduce el nombre y tipo del archivo que deseas crear"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="filename" className="col-span-4">
                Nombre del archivo
              </Label>
              <div className="col-span-3">
                <Input 
                  id="filename"
                  placeholder="nombre-archivo"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="col-span-3"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateNewFile();
                    }
                  }}
                />
              </div>
              <div className="col-span-1">
                <select 
                  value={fileExtension}
                  onChange={(e) => setFileExtension(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {commonExtensions.map(ext => (
                    <option key={ext.value} value={ext.value}>{ext.value}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground col-span-4">
                El archivo se creará como: <strong>{newFileName}{fileExtension}</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowNewFileDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreateNewFile}>
              Crear archivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for creating new folder */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear nueva carpeta</DialogTitle>
            <DialogDescription>
              {currentPath 
                ? `La carpeta se creará dentro de: ${currentPath}` 
                : "Introduce el nombre de la carpeta que deseas crear"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="foldername" className="col-span-4">
                Nombre de la carpeta
              </Label>
              <div className="col-span-4">
                <Input 
                  id="foldername"
                  placeholder="mi-carpeta"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="col-span-4"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateNewFolder();
                    }
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground col-span-4">
                La carpeta se creará como: <strong>{currentPath ? `${currentPath}/` : ''}{newFolderName}</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreateNewFolder}>
              Crear carpeta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FileExplorer;
