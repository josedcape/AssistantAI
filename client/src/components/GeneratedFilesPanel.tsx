import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileIcon,
  FolderIcon,
  TrashIcon,
  SaveIcon,
  FileCodeIcon,
  FileTextIcon,
  ArrowRightIcon,
  Copy,
  Edit
} from "lucide-react";
import { useFileSystem, FileSystemProvider } from "@/lib/fileSystem";
import { sounds } from "@/lib/sounds";

interface GeneratedFile {
  name: string;
  content: string;
  extension?: string;
}

interface GeneratedFilesPanelProps {
  projectId: number;
}

// Component that wraps the content with the provider
const GeneratedFilesPanel = ({ projectId }: GeneratedFilesPanelProps) => {
  return (
    <FileSystemProvider projectId={projectId}>
      <GeneratedFilesPanelContent />
    </FileSystemProvider>
  );
};

// Content component that uses the file system hook
const GeneratedFilesPanelContent = () => {
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [viewContent, setViewContent] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const { toast } = useToast();
  const { createFile, refreshFiles } = useFileSystem();

  // Function to save files to localStorage
  const saveFilesToStorage = (files: GeneratedFile[]) => {
    localStorage.setItem('generatedFiles', JSON.stringify(files));
  };

  // Function to load files from localStorage
  const loadFilesFromStorage = () => {
    const storedFiles = localStorage.getItem('generatedFiles');
    if (storedFiles) {
      try {
        setGeneratedFiles(JSON.parse(storedFiles));
      } catch (error) {
        console.error("Error parsing stored files:", error);
      }
    }
  };

  // Load files on initial render and set up refresh interval
  useEffect(() => {
    console.log("Inicializando panel de archivos generados");
    loadFilesFromStorage();

    // Realizar verificaciones periódicas para asegurar que se muestren los archivos
    const refreshInterval = setInterval(() => {
      const storedFiles = localStorage.getItem('generatedFiles');
      if (storedFiles) {
        try {
          const parsedFiles = JSON.parse(storedFiles);
          if (parsedFiles.length > 0 && generatedFiles.length === 0) {
            console.log("Detectados archivos en storage que no están en el estado, actualizando...");
            setGeneratedFiles(parsedFiles);
          }
        } catch (error) {
          console.error("Error verificando archivos almacenados:", error);
        }
      }
    }, 3000); // Verificar cada 3 segundos para mejor respuesta

    // Listen for custom events to add new files
    const handleNewFileEvent = (e: CustomEvent) => {
      if (e.detail && e.detail.file) {
        console.log(`Archivo generado recibido: ${e.detail.file.name}${e.detail.file.extension}, procesando...`);

        // Verificar si el archivo ya existe para evitar duplicados
        const fileExists = generatedFiles.some(
          existingFile => 
            existingFile.name === e.detail.file.name && 
            existingFile.extension === e.detail.file.extension
        );

        if (fileExists) {
          console.log(`El archivo ${e.detail.file.name}${e.detail.file.extension} ya existe, no se añadirá`);
          return;
        }

        // Reducir el retraso para una mejor experiencia de usuario
        setTimeout(() => {
          const newFile = e.detail.file;
          setGeneratedFiles(prev => {
            const updated = [...prev, newFile];
            saveFilesToStorage(updated);
            
            // Toast informativo
            toast({
              title: "Archivo añadido",
              description: `${newFile.name}${newFile.extension} añadido al panel`,
              duration: 3000
            });
            
            console.log(`Archivo ${newFile.name}${newFile.extension} procesado y agregado correctamente`);
            return updated;
          });
        }, 500); // Reducido a 500ms para mejor respuesta
      }
    };

    window.addEventListener('add-generated-file', handleNewFileEvent as EventListener);

    // Escuchar eventos de refresco explícito
    const handleRefreshGeneratedFiles = () => {
      console.log("Recibida solicitud de refresco de archivos generados");
      loadFilesFromStorage();
    };

    window.addEventListener('refresh-generated-files', handleRefreshGeneratedFiles);

    // Escuchar eventos para añadir múltiples archivos a la vez
    const handleMultipleFilesEvent = (e: CustomEvent) => {
      if (e.detail && Array.isArray(e.detail.files) && e.detail.files.length > 0) {
        console.log(`Recibidos ${e.detail.files.length} archivos para procesar...`);
        
        const filesToAdd = e.detail.files.filter(file => {
          // Filtrar duplicados
          return !generatedFiles.some(
            existingFile => 
              existingFile.name === file.name && 
              existingFile.extension === file.extension
          );
        });
        
        if (filesToAdd.length > 0) {
          setGeneratedFiles(prev => {
            const updated = [...prev, ...filesToAdd];
            saveFilesToStorage(updated);
            
            toast({
              title: "Archivos añadidos",
              description: `${filesToAdd.length} archivos añadidos al panel`,
              duration: 3000
            });
            
            return updated;
          });
        }
      }
    };

    window.addEventListener('add-multiple-generated-files', handleMultipleFilesEvent as EventListener);

    return () => {
      window.removeEventListener('add-generated-file', handleNewFileEvent as EventListener);
      window.removeEventListener('refresh-generated-files', handleRefreshGeneratedFiles);
      window.removeEventListener('add-multiple-generated-files', handleMultipleFilesEvent as EventListener);
      clearInterval(refreshInterval);
    };
  }, [generatedFiles, toast]); // Añadir toast y generatedFiles como dependencias

  // Function to add a new file
  const addFile = (file: GeneratedFile) => {
    setGeneratedFiles(prev => {
      const updated = [...prev, file];
      saveFilesToStorage(updated);
      return updated;
    });
  };

  // Function to remove a file
  const removeFile = (index: number) => {
    setGeneratedFiles(prev => {
      const updated = prev.filter((_, i) => i !== index);
      saveFilesToStorage(updated);
      return updated;
    });

    if (selectedFile && generatedFiles[index] === selectedFile) {
      setSelectedFile(null);
      setViewContent(false);
    }
  };

  // Function to save file to the project
  const saveFileToProject = async (file: GeneratedFile) => {
    try {
      let fileName = file.name;

      // Add extension if not present
      if (file.extension && !fileName.endsWith(file.extension)) {
        fileName += file.extension;
      }

      // Create the file
      const result = await createFile(fileName, file.content);

      if (result) {
        toast({
          title: "Archivo guardado",
          description: `"${fileName}" se ha guardado en el proyecto`,
        });
        sounds.play('success', 0.4);

        // Refresh files list
        refreshFiles();
      }
    } catch (error) {
      console.error("Error al guardar el archivo:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el archivo en el proyecto",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
    }
  };

  // Handle file selection
  const handleFileClick = (file: GeneratedFile) => {
    setSelectedFile(file);
    setViewContent(true);
    setEditContent(file.content);
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  // Save edited content
  const saveEditedContent = () => {
    if (selectedFile) {
      const updatedFile = { ...selectedFile, content: editContent };

      setGeneratedFiles(prev => {
        const index = prev.findIndex(f => f === selectedFile);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = updatedFile;
          saveFilesToStorage(updated);
          return updated;
        }
        return prev;
      });

      setSelectedFile(updatedFile);
      setIsEditing(false);

      toast({
        title: "Cambios guardados",
        description: "El contenido del archivo ha sido actualizado",
      });
      sounds.play('success', 0.4);
    }
  };

  // Copy file content to clipboard
  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copiado",
      description: "Contenido copiado al portapapeles",
    });
    sounds.play('pop', 0.3);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Archivos Generados</h2>
        <p className="text-sm text-muted-foreground">
          Archivos generados por el asistente. Puedes guardarlos en tu proyecto.
        </p>
        {generatedFiles.length > 0 && (
          <div className="mt-2 flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Guardar todos los archivos de configuración
                const configFiles = generatedFiles.filter(file => 
                  file.name === 'package' || 
                  file.name === 'README' || 
                  file.name === '.gitignore' || 
                  file.name === 'requirements' ||
                  file.name === '.env.example' ||
                  file.name === 'vite.config' ||
                  file.name === 'tsconfig'
                );

                if (configFiles.length > 0) {
                  configFiles.forEach(file => saveFileToProject(file));
                  toast({
                    title: "Configuraciones guardadas",
                    description: `Se han guardado ${configFiles.length} archivos de configuración`,
                    duration: 3000
                  });
                  sounds.play('success', 0.4);
                } else {
                  toast({
                    title: "Información",
                    description: "No hay archivos de configuración para guardar",
                    duration: 3000
                  });
                }
              }}
              className="text-xs"
            >
              <SaveIcon className="h-3.5 w-3.5 mr-1" />
              Guardar configuraciones
            </Button>
          </div>
        )}
      </div>

      {generatedFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <FileIcon className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium">No hay archivos generados</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Cuando el asistente genere código, aparecerá aquí para que puedas guardarlo en tu proyecto.
          </p>
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-2">
              {generatedFiles.map((file, index) => {
                // Determinar si es un archivo de configuración especial
                const isConfigFile = 
                  file.name === 'package' && file.extension === '.json' || 
                  file.name === 'README' && file.extension === '.md' || 
                  file.name === '.gitignore' || 
                  file.name === 'requirements' && file.extension === '.txt' ||
                  file.name === '.env.example' ||
                  file.name === 'vite.config' ||
                  file.name === 'tsconfig' && file.extension === '.json';

                // Determinar el icono adecuado para el tipo de archivo
                let FileIconComponent = FileCodeIcon;
                let iconColorClass = "text-primary";

                if (file.extension === '.json') {
                  iconColorClass = "text-yellow-500";
                } else if (file.extension === '.md') {
                  FileIconComponent = FileTextIcon;
                  iconColorClass = "text-blue-500";
                } else if (file.name === '.gitignore') {
                  iconColorClass = "text-gray-500";
                } else if (file.extension === '.py') {
                  iconColorClass = "text-green-600";
                } else if (file.extension === '.html') {
                  iconColorClass = "text-orange-500";
                } else if (file.extension === '.css') {
                  iconColorClass = "text-blue-400";
                } else if (file.extension === '.js') {
                  iconColorClass = "text-yellow-400";
                }

                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                      selectedFile === file
                        ? 'bg-primary/10 dark:bg-primary/20'
                        : isConfigFile 
                          ? 'bg-slate-100 dark:bg-slate-800 hover:bg-accent/50' 
                          : 'hover:bg-accent/50'
                    }`}
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="flex items-center gap-2">
                      <FileIconComponent className={`h-5 w-5 ${iconColorClass}`} />
                      <span className={`font-medium truncate ${isConfigFile ? 'font-semibold' : ''}`}>
                        {file.name}{file.extension}
                        {isConfigFile && <span className="ml-2 text-xs bg-primary/20 px-1.5 py-0.5 rounded-full">config</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveFileToProject(file);
                        }}
                        title="Guardar en proyecto"
                        className={isConfigFile ? "text-primary" : ""}
                      >
                        <SaveIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        title="Eliminar"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {viewContent && selectedFile && (
            <Dialog open={viewContent} onOpenChange={setViewContent}>
              <DialogContent className="max-w-3xl h-[70vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileCodeIcon className="h-5 w-5" />
                    {selectedFile.name}{selectedFile.extension}
                  </DialogTitle>
                  <DialogDescription>
                    Vista previa del contenido del archivo
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden border rounded-md flex flex-col mt-2">
                  <div className="bg-muted p-2 flex justify-between items-center border-b">
                    <span className="text-sm font-medium">
                      {isEditing ? "Editando" : "Contenido"}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(selectedFile.content)}
                          >
                            <Copy className="h-4 w-4 mr-1" /> Copiar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={toggleEditMode}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Editar
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={saveEditedContent}
                        >
                          <SaveIcon className="h-4 w-4 mr-1" /> Guardar
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-4">
                    {isEditing ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-full font-mono text-sm p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    ) : (
                      <pre className="font-mono text-sm whitespace-pre-wrap">
                        {selectedFile.content}
                      </pre>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    onClick={() => saveFileToProject(selectedFile)}
                    className="gap-2"
                  >
                    <SaveIcon className="h-4 w-4" />
                    Guardar en proyecto
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}
    </div>
  );
};

export default GeneratedFilesPanel;