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

  // Load files on initial render
  useEffect(() => {
    loadFilesFromStorage();

    // Listen for custom events to add new files
    const handleNewFileEvent = (e: CustomEvent) => {
      if (e.detail && e.detail.file) {
        // Add file with a slight delay to give time for processing
        console.log("Archivo generado recibido, procesando en 20 segundos...");
        setTimeout(() => {
          const newFile = e.detail.file;
          setGeneratedFiles(prev => {
            const updated = [...prev, newFile];
            saveFilesToStorage(updated);
            return updated;
          });
          console.log("Archivo generado procesado y agregado correctamente");
        }, 20000); // 20 seconds delay
      }
    };

    window.addEventListener('add-generated-file', handleNewFileEvent as EventListener);

    return () => {
      window.removeEventListener('add-generated-file', handleNewFileEvent as EventListener);
    };
  }, []);

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
              {generatedFiles.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                    selectedFile === file
                      ? 'bg-primary/10 dark:bg-primary/20'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handleFileClick(file)}
                >
                  <div className="flex items-center gap-2">
                    <FileCodeIcon className="h-5 w-5 text-primary" />
                    <span className="font-medium truncate">
                      {file.name}{file.extension}
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
              ))}
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
