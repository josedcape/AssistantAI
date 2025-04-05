import { useState, useEffect, useRef } from "react";
import { useFileSystem } from "@/lib/fileSystem";
import { useToast } from "@/hooks/use-toast";
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
  FolderPlusIcon,
  XIcon,
  Pencil,
  Copy,
  MessageSquare
} from "lucide-react";
import { 
  SidebarGroup, 
  SidebarGroupLabel, 
  SidebarGroupContent
} from "@/components/ui/sidebar";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sounds } from "@/lib/sounds";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useForm } from "react-hook-form";
import { File } from "@shared/schema";

interface FileExplorerProps {
  projectId: number;
  onFileSelect: (file: File) => void;
  selectedFileId?: number;
  onClose?: () => void;
  onSendToAssistant?: (fileContent: string, fileName: string) => void;
}

interface NewFileFormData {
  fileName: string;
  fileExtension: string;
}

interface NewFolderFormData {
  folderName: string;
}

interface RenameFileFormData {
  newName: string;
}

function FileExplorer({ projectId, onFileSelect, selectedFileId, onClose, onSendToAssistant }: FileExplorerProps) {
  // Hooks y estados
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { toast } = useToast();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [fileToRename, setFileToRename] = useState<File | null>(null);
  const [openSections, setOpenSections] = useState({
    files: true,
    documents: true
  });
  const [openTypes, setOpenTypes] = useState<Record<string, boolean>>({});
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    '/': true
  });

  // Formularios
  const fileForm = useForm<NewFileFormData>({
    defaultValues: {
      fileName: "",
      fileExtension: ".js"
    }
  });

  const folderForm = useForm<NewFolderFormData>({
    defaultValues: {
      folderName: ""
    }
  });

  const renameForm = useForm<RenameFileFormData>({
    defaultValues: {
      newName: ""
    }
  });

  // Cargar el contexto del sistema de archivos
  const { 
    files, 
    documents, 
    currentPath,
    loading, 
    createFile, 
    createFolder, 
    deleteFile,
    deleteDocument,
    renameFile,
    navigateTo, 
    getFilesInCurrentDirectory,
    refreshFiles,
    extractRepository
  } = useFileSystem();

  // Extensiones comunes para archivos
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
  const getFileType = (fileName: string): string => {
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
  };

  // Manejadores de eventos
  const handleRefresh = () => {
    // Avoid multiple quick refreshes
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    sounds.play('click', 0.2);
    refreshFiles();
  };

  const handleCreateNewFile = async (data: NewFileFormData) => {
    if (!data.fileName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del archivo no puede estar vacío",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
      return;
    }

    const fullFileName = data.fileName + data.fileExtension;

    const newFile = await createFile(fullFileName, "");

    if (newFile) {
      // Reset form
      fileForm.reset();
      setShowNewFileDialog(false);

      // Auto-expand the file type group
      const ext = fullFileName.split('.').pop()?.toLowerCase() || "other";
      setOpenTypes(prev => ({ ...prev, [ext]: true }));

      // Select the newly created file
      setTimeout(() => onFileSelect(newFile), 100);
    }
  };

  const handleCreateNewFolder = async (data: NewFolderFormData) => {
    if (!data.folderName.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la carpeta no puede estar vacío",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
      return;
    }

    const success = await createFolder(data.folderName);

    if (success) {
      // Reset form
      folderForm.reset();
      setShowNewFolderDialog(false);

      // Auto-expand the folder
      const folderPath = currentPath === '/' ? data.folderName : `${currentPath}/${data.folderName}`;
      setOpenFolders(prev => ({ ...prev, [folderPath]: true }));
    }
  };

  const handleRenameFile = async (data: RenameFileFormData) => {
    if (!fileToRename || !data.newName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del archivo no puede estar vacío",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
      return;
    }

    const success = await renameFile(fileToRename.id!, data.newName);

    if (success) {
      renameForm.reset();
      setShowRenameDialog(false);
      setFileToRename(null);
    }
  };

  const handleViewDocument = async (doc: any) => {
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
      const response = await fetch(`/api/documents/${doc.id}/content`);
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

      // Auto-close sidebar on mobile after selecting a file
      if (isMobile && onClose) {
        setTimeout(onClose, 300);
      }
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

  // Función para enviar archivo al asistente
  const handleSendToAssistant = async (file: File) => {
    if (!onSendToAssistant) {
      toast({
        title: "Función no disponible",
        description: "No se puede enviar al asistente en este contexto",
        variant: "destructive",
      });
      return;
    }

    try {
      // Si el contenido no está ya cargado en el objeto file, asegurarse de obtenerlo
      let content = file.content;
      if (!content && file.id) {
        const response = await fetch(`/api/files/${file.id}/content`);
        if (!response.ok) {
          throw new Error("No se pudo obtener el contenido del archivo");
        }
        content = await response.text();
      }

      if (!content) {
        throw new Error("El archivo no tiene contenido");
      }

      // Llamar a la función para enviar al asistente
      onSendToAssistant(content, file.name);
      
      toast({
        title: "Archivo enviado al asistente",
        description: `Se ha enviado ${file.name} al chat del asistente`,
      });
      sounds.play('success', 0.3);
    } catch (error) {
      console.error("Error al enviar archivo al asistente:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar el archivo al asistente",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
    }
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

  // Extract path parts for breadcrumb
  const pathParts = currentPath.split('/').filter(Boolean);

  // Files en el directorio actual
  const filesInCurrentDir = getFilesInCurrentDirectory();

  // Organize documents by folder
  const docFolders = documents.reduce((acc, doc) => {
    const folderName = doc.path ? doc.path.split('/').slice(0, -1).join('/') || '/' : '/';
    acc[folderName] = acc[folderName] || [];
    acc[folderName].push(doc);
    return acc;
  }, {} as { [folderName: string]: any[] });

  return (
    <div className={`h-full flex flex-col bg-white dark:bg-slate-800 transition-all duration-300 ${isMobile ? 'fixed inset-0 z-50 overflow-hidden' : ''}`}>
      <SidebarGroup>
        <SidebarGroupLabel className="flex justify-between items-center">
          <span>Explorador</span>
          <div className="flex space-x-1">
            {isMobile && onClose && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose} 
                title="Cerrar"
                className="h-7 w-7"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh} 
              title="Actualizar"
              className="h-7 w-7"
              disabled={loading}
            >
              <RefreshCwIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                setShowNewFileDialog(true);
                fileForm.reset();
              }} 
              title="Nuevo archivo"
              className="h-7 w-7"
              disabled={loading}
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                setShowNewFolderDialog(true);
                folderForm.reset();
              }} 
              title="Nueva carpeta"
              className="h-7 w-7"
              disabled={loading}
            >
              <FolderPlusIcon className="h-4 w-4" />
            </Button>
          </div>
        </SidebarGroupLabel>
        <SidebarGroupContent>
          {loading && (
            <div className="flex justify-center items-center h-12">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Breadcrumb Navigation */}
          <div className="flex flex-wrap items-center text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 mb-2 rounded">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-1 text-xs font-medium" 
              onClick={() => navigateTo('/')}
            >
              <FolderIcon className="h-3.5 w-3.5 mr-1" />
              Raíz
            </Button>
            {pathParts.map((part, index) => {
              const path = '/' + pathParts.slice(0, index + 1).join('/');
              return (
                <div key={path} className="flex items-center">
                  <ChevronRight className="h-3 w-3 mx-1 text-slate-400" />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-1 text-xs font-medium" 
                    onClick={() => navigateTo(path)}
                  >
                    {part}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Files Section */}
          <Collapsible 
            open={openSections.files} 
            onOpenChange={() => toggleSection('files')}
            className="mb-2 overflow-y-auto"
          >
            <CollapsibleTrigger className="flex items-center w-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
              {openSections.files ? 
                <ChevronDown className="h-3.5 w-3.5 mr-1.5 text-slate-500" /> : 
                <ChevronRight className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              }
              <FolderIcon className="h-4 w-4 mr-1.5 text-blue-500" />
              <span className="text-sm font-medium">Archivos</span>
              <span className="ml-auto text-xs text-slate-500">{filesInCurrentDir.length}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-3 pt-1 space-y-1">
              {filesInCurrentDir.length === 0 ? (
                <div className="text-xs text-slate-500 p-2 rounded bg-slate-50 dark:bg-slate-700 my-2">
                  <p className="text-center">No hay archivos en esta carpeta</p>
                  <div className="flex gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      className="w-full h-7 text-xs" 
                      onClick={() => {
                        setShowNewFileDialog(true);
                        fileForm.reset();
                      }}
                    >
                      <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                      Crear archivo
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full h-7 text-xs" 
                      onClick={() => {
                        setShowNewFolderDialog(true);
                        folderForm.reset();
                      }}
                    >
                      <FolderPlusIcon className="h-3.5 w-3.5 mr-1.5" />
                      Crear carpeta
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Lista de archivos y carpetas */}
                  <ul className="space-y-0.5">
                    {filesInCurrentDir.sort((a, b) => {
                      // Primero las carpetas, luego los archivos
                      const aIsFolder = a.name.includes('/');
                      const bIsFolder = b.name.includes('/');
                      if (aIsFolder && !bIsFolder) return -1;
                      if (!aIsFolder && bIsFolder) return 1;

                      // Ordenar alfabéticamente
                      const aName = a.name.split('/').pop() || a.name;
                      const bName = b.name.split('/').pop() || b.name;
                      return aName.localeCompare(bName);
                    }).map(file => {
                      const fileName = file.name.split('/').pop() || file.name;
                      const isFolder = file.name.includes('/') && !file.name.endsWith('/.gitkeep');
                      const folderPath = isFolder ? file.name.split('/').slice(0, -1).join('/') : '';

                      return (
                        <li 
                          key={file.id} 
                          className={`
                            flex justify-between items-center p-1 rounded text-xs cursor-pointer group
                            ${selectedFileId === file.id ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}
                          `}
                          onClick={() => {
                            if (isFolder) {
                              navigateTo(`${currentPath}/${fileName}`);
                            } else {
                              onFileSelect(file);
                              if (isMobile && onClose) {
                                setTimeout(onClose, 300);
                              }
                            }
                          }}
                          title={fileName}
                        >
                          <div className="flex items-center truncate">
                            {isFolder ? (
                              <FolderIcon className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                            ) : (
                              getFileIconByType(file.type)
                            )}
                            <span className="ml-1.5 truncate">{fileName}</span>
                          </div>
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onSendToAssistant && !isFolder && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendToAssistant(file);
                                }}
                                title="Enviar al asistente"
                              >
                                <MessageSquare className="h-3 w-3 text-green-500" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFileToRename(file);
                                renameForm.setValue('newName', fileName);
                                setShowRenameDialog(true);
                              }}
                              title="Renombrar"
                            >
                              <Pencil className="h-3 w-3 text-blue-500" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteFile(file.id!);
                              }}
                              title="Eliminar"
                            >
                              <TrashIcon className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

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
                                onClick={() => {
                                  onFileSelect(file);
                                  if (isMobile && onClose) {
                                    setTimeout(onClose, 300);
                                  }
                                }}
                                title={file.name}
                              >
                                <div className="flex items-center truncate">
                                  {getFileIconByType(file.type)}
                                  <span className="ml-1.5 truncate">{file.name}</span>
                                </div>
                                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {onSendToAssistant && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSendToAssistant(file);
                                      }}
                                      title="Enviar al asistente"
                                    >
                                      <MessageSquare className="h-3 w-3 text-green-500" />
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFileToRename(file);
                                      renameForm.setValue('newName', file.name);
                                      setShowRenameDialog(true);
                                    }}
                                    title="Renombrar"
                                  >
                                    <Pencil className="h-3 w-3 text-blue-500" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteFile(file.id!);
                                    }}
                                    title="Eliminar"
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
                onDocumentUploaded={refreshFiles} 
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
                          {folderName === '/' ? 'Principal' : folderName.split('/').pop()}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      extractRepository(doc.id!);
                                    }}
                                  >
                                    <PackageOpenIcon className="h-3 w-3 text-blue-500" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  title="Eliminar documento"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDocument(doc.id!);
                                  }}
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
              {currentPath !== '/' 
                ? `El archivo se creará en la carpeta: ${currentPath}` 
                : "Introduce el nombre y tipo del archivo que deseas crear"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={fileForm.handleSubmit(handleCreateNewFile)}>
            <div className="grid gap-4 py-3">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fileName" className="col-span-4">
                  Nombre del archivo
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="fileName"
                    placeholder="nombre-archivo"
                    {...fileForm.register("fileName", { required: true })}
                    className="col-span-3"
                    autoFocus
                  />
                </div>
                <div className="col-span-1">
                  <select 
                    {...fileForm.register("fileExtension")}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {commonExtensions.map(ext => (
                      <option key={ext.value} value={ext.value}>{ext.value}</option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-muted-foreground col-span-4">
                  El archivo se creará como: <strong>{fileForm.watch("fileName")}{fileForm.watch("fileExtension")}</strong>
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewFileDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear archivo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for creating new folder */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear nueva carpeta</DialogTitle>
            <DialogDescription>
              {currentPath !== '/' 
                ? `La carpeta se creará dentro de: ${currentPath}` 
                : "Introduce el nombre de la carpeta que deseas crear"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={folderForm.handleSubmit(handleCreateNewFolder)}>
            <div className="grid gap-4 py-3">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="folderName" className="col-span-4">
                  Nombre de la carpeta
                </Label>
                <div className="col-span-4">
                  <Input 
                    id="folderName"
                    placeholder="mi-carpeta"
                    {...folderForm.register("folderName", { required: true })}
                    className="col-span-4"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground col-span-4">
                  La carpeta se creará como: <strong>{currentPath === '/' ? '/' : currentPath + '/'}{folderForm.watch("folderName")}</strong>
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewFolderDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear carpeta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for renaming file */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renombrar archivo</DialogTitle>
            <DialogDescription>
              Introduce el nuevo nombre para el archivo
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={renameForm.handleSubmit(handleRenameFile)}>
            <div className="grid gap-4 py-3">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="newName" className="col-span-4">
                  Nuevo nombre
                </Label>
                <div className="col-span-4">
                  <Input 
                    id="newName"
                    placeholder="nuevo-nombre"
                    {...renameForm.register("newName", { required: true })}
                    className="col-span-4"
                    autoFocus
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRenameDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Renombrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FileExplorer;