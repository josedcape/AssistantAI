
import { useState, useEffect, useContext } from "react";
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

const GeneratedFilesPanelContent = ({ projectId }: GeneratedFilesPanelProps) => {
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [viewContent, setViewContent] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const { toast } = useToast();
  const { createFile, refreshFiles } = useFileSystem();

  // Escuchar eventos para recibir archivos
  useEffect(() => {
    // Handler para recibir archivos del asistente o de las plantillas
    const handleFilesFromAssistant = (e: CustomEvent) => {
      console.log("Evento send-files-to-explorer recibido en GeneratedFilesPanel", e.detail);
      
      if (e.detail?.files && Array.isArray(e.detail.files)) {
        const files = e.detail.files;
        const isFromTemplate = e.detail.fromTemplate === true;
        const eventProjectId = e.detail.projectId;
        
        // Verificar si el evento es para este proyecto o si no hay ID de proyecto
        if (!eventProjectId || Number(eventProjectId) === Number(projectId)) {
          console.log(`Agregando ${files.length} archivos al panel de generados para proyecto ${projectId}`);
          
          toast({
            title: isFromTemplate ? "Plantilla detectada" : "Archivos recibidos",
            description: `${files.length} archivo(s) recibidos${isFromTemplate ? " de la plantilla" : " del asistente"}`,
            duration: 3000
          });
          
          // Agregar los archivos recibidos al estado
          setGeneratedFiles(prev => {
            // Verificar si ya existen archivos con el mismo nombre
            const newFiles = files.filter(newFile => 
              !prev.some(existingFile => existingFile.name === newFile.name)
            );
            
            if (newFiles.length === 0) {
              toast({
                title: "Archivos duplicados",
                description: "Los archivos ya existen en el panel",
                duration: 3000
              });
              return prev;
            }
            
            return [...prev, ...newFiles];
          });
          
          sounds.play('success', 0.3);
        } else {
          console.log(`Ignorando archivos para proyecto ${eventProjectId}, estamos en ${projectId}`);
        }
      }
    };

    window.addEventListener('send-files-to-explorer', handleFilesFromAssistant as EventListener);
    
    return () => {
      window.removeEventListener('send-files-to-explorer', handleFilesFromAssistant as EventListener);
    };
  }, [projectId, toast]);

  // Transferir un archivo al explorador
  const handleTransferFile = async (file: GeneratedFile) => {
    try {
      if (!file.name || !file.content) {
        throw new Error("El archivo no tiene nombre o contenido");
      }
      
      const newFile = await createFile(file.name, file.content);
      
      if (newFile) {
        toast({
          title: "Archivo creado",
          description: `${file.name} ha sido añadido al proyecto`,
          duration: 3000
        });
        
        // Eliminar el archivo de la lista de generados
        setGeneratedFiles(prev => prev.filter(f => f !== file));
        
        // Refrescar el explorador de archivos
        refreshFiles();
        
        sounds.play('success', 0.3);
      }
    } catch (error) {
      console.error("Error transfiriendo archivo:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo transferir el archivo",
        variant: "destructive",
        duration: 3000
      });
      sounds.play('error', 0.3);
    }
  };

  // Transferir todos los archivos al explorador
  const handleTransferAllFiles = async () => {
    if (generatedFiles.length === 0) {
      toast({
        title: "No hay archivos",
        description: "No hay archivos para transferir",
        variant: "destructive",
        duration: 3000
      });
      return;
    }
    
    try {
      toast({
        title: "Transfiriendo archivos",
        description: `Procesando ${generatedFiles.length} archivos...`,
        duration: 3000
      });
      
      // Transferir cada archivo
      for (const file of generatedFiles) {
        await createFile(file.name, file.content);
      }
      
      // Limpiar la lista de archivos generados
      setGeneratedFiles([]);
      
      // Refrescar el explorador de archivos
      refreshFiles();
      
      toast({
        title: "Transferencia completada",
        description: "Todos los archivos han sido añadidos al proyecto",
        duration: 3000
      });
      
      sounds.play('success', 0.3);
    } catch (error) {
      console.error("Error transfiriendo archivos:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudieron transferir todos los archivos",
        variant: "destructive",
        duration: 3000
      });
      sounds.play('error', 0.3);
    }
  };

  // Eliminar un archivo de la lista
  const handleDeleteFile = (file: GeneratedFile) => {
    setGeneratedFiles(prev => prev.filter(f => f !== file));
    if (selectedFile === file) {
      setSelectedFile(null);
      setViewContent(false);
    }
    toast({
      title: "Archivo eliminado",
      description: `${file.name} ha sido eliminado de la lista`,
      duration: 3000
    });
    sounds.play('pop', 0.2);
  };

  // Eliminar todos los archivos
  const handleClearAllFiles = () => {
    setGeneratedFiles([]);
    setSelectedFile(null);
    setViewContent(false);
    toast({
      title: "Lista limpiada",
      description: "Todos los archivos han sido eliminados de la lista",
      duration: 3000
    });
    sounds.play('pop', 0.2);
  };

  // Ver contenido de un archivo
  const handleViewContent = (file: GeneratedFile) => {
    setSelectedFile(file);
    setEditContent(file.content);
    setViewContent(true);
  };

  // Guardar cambios en el contenido editado
  const handleSaveEditedContent = () => {
    if (!selectedFile) return;
    
    // Actualizar el contenido del archivo seleccionado
    setGeneratedFiles(prev => 
      prev.map(file => 
        file === selectedFile 
          ? { ...file, content: editContent } 
          : file
      )
    );
    
    // Actualizar el archivo seleccionado
    setSelectedFile({ ...selectedFile, content: editContent });
    setIsEditing(false);
    
    toast({
      title: "Cambios guardados",
      description: `El contenido de ${selectedFile.name} ha sido actualizado`,
      duration: 3000
    });
    sounds.play('success', 0.3);
  };

  // Obtener el icono según la extensión
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';
    
    switch (ext) {
      case 'html':
        return <FileCodeIcon className="h-4 w-4 text-orange-500" />;
      case 'css':
        return <FileCodeIcon className="h-4 w-4 text-blue-500" />;
      case 'js':
      case 'jsx':
        return <FileCodeIcon className="h-4 w-4 text-yellow-500" />;
      case 'ts':
      case 'tsx':
        return <FileCodeIcon className="h-4 w-4 text-blue-600" />;
      case 'json':
        return <FileCodeIcon className="h-4 w-4 text-green-500" />;
      default:
        return <FileTextIcon className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800 overflow-hidden">
      <div className="flex justify-between items-center p-2 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-medium">Archivos generados</h3>
        <div className="flex space-x-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs"
            onClick={handleTransferAllFiles}
            disabled={generatedFiles.length === 0}
          >
            <ArrowRightIcon className="h-3.5 w-3.5 mr-1.5" />
            Transferir todos
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs"
            onClick={handleClearAllFiles}
            disabled={generatedFiles.length === 0}
          >
            <TrashIcon className="h-3.5 w-3.5 mr-1.5" />
            Limpiar lista
          </Button>
        </div>
      </div>
      
      <div className="overflow-y-auto flex-grow p-2">
        {generatedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400 text-sm">
            <FolderIcon className="h-12 w-12 mb-2 opacity-30" />
            <p>No hay archivos generados</p>
            <p className="text-xs mt-1">Los archivos generados por plantillas o el asistente aparecerán aquí</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {generatedFiles.map((file, index) => (
              <li 
                key={index} 
                className="flex justify-between items-center p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 group text-sm"
              >
                <div 
                  className="flex items-center flex-grow cursor-pointer" 
                  onClick={() => handleViewContent(file)}
                >
                  {getFileIcon(file.name)}
                  <span className="ml-2 truncate">{file.name}</span>
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleTransferFile(file)}
                    title="Transferir al proyecto"
                  >
                    <ArrowRightIcon className="h-3.5 w-3.5 text-green-500" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteFile(file)}
                    title="Eliminar"
                  >
                    <TrashIcon className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {/* Diálogo para ver/editar contenido */}
      <Dialog open={viewContent} onOpenChange={setViewContent}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {selectedFile && getFileIcon(selectedFile.name)}
              <span className="ml-2">{selectedFile?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Contenido del archivo generado
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-grow overflow-y-auto">
            {isEditing ? (
              <div className="h-[50vh]">
                <textarea
                  className="w-full h-full p-4 font-mono text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-700"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              </div>
            ) : (
              <pre className="p-4 bg-slate-100 dark:bg-slate-900 rounded-md overflow-x-auto text-sm font-mono max-h-[50vh]">
                {selectedFile?.content}
              </pre>
            )}
          </div>
          
          <DialogFooter className="flex justify-between items-center">
            <div>
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="mr-2">
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveEditedContent}>
                    <SaveIcon className="h-4 w-4 mr-2" />
                    Guardar cambios
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedFile?.content || "");
                      toast({
                        title: "Contenido copiado",
                        description: "El contenido ha sido copiado al portapapeles",
                        duration: 2000
                      });
                    }}
                    className="mr-2"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(true)}
                    className="mr-2"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </>
              )}
            </div>
            
            <div>
              <Button 
                variant="default" 
                onClick={() => selectedFile && handleTransferFile(selectedFile)}
              >
                <ArrowRightIcon className="h-4 w-4 mr-2" />
                Transferir al proyecto
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Componente contenedor que provee el contexto del sistema de archivos
const GeneratedFilesPanel = ({ projectId }: GeneratedFilesPanelProps) => {
  return (
    <FileSystemProvider projectId={projectId}>
      <GeneratedFilesPanelContent projectId={projectId} />
    </FileSystemProvider>
  );
};

export default GeneratedFilesPanel;
