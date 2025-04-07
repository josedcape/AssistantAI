import { createContext, useContext, useState, useEffect } from 'react';
import { File } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { sounds } from '@/lib/sounds';

// Create context for file system
const FileSystemContext = createContext<any>(null);

// File system provider component
export function FileSystemProvider({ children, projectId }: { children: React.ReactNode, projectId: number }) {
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load files from API on initial render
  useEffect(() => {
    if (!projectId || isNaN(projectId)) return;

    const loadFiles = async () => {
      try {
        setLoading(true);

        // Get files from API
        const response = await apiRequest("GET", `/api/projects/${projectId}/files`);
        if (!response.ok) throw new Error("Failed to fetch files");

        const data = await response.json();
        setFiles(data);

        // Get documents
        const docsResponse = await apiRequest("GET", `/api/projects/${projectId}/documents`);
        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          setDocuments(docsData);
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
        setLoading(false);
      }
    };

    loadFiles();
  }, [projectId, toast]);

  // Create a new file
  const createFile = async (name: string, content = '') => {
    try {
      const filePath = currentPath === '/' ? name : `${currentPath}/${name}`;

      toast({
        title: "Creando archivo",
        description: filePath,
      });
      sounds.play('pop', 0.3);

      // Get file type based on extension
      const ext = name.split('.').pop()?.toLowerCase() || "txt";
      let fileType = 'text';

      switch (ext) {
        case 'js': fileType = 'javascript'; break;
        case 'jsx': fileType = 'javascript'; break;
        case 'ts': fileType = 'typescript'; break;
        case 'tsx': fileType = 'typescript'; break;
        case 'html': fileType = 'html'; break;
        case 'css': fileType = 'css'; break;
        case 'json': fileType = 'json'; break;
        case 'md': fileType = 'markdown'; break;
      }

      const response = await apiRequest("POST", `/api/projects/${projectId}/files`, {
        name: filePath,
        content,
        type: fileType,
        path: currentPath === '/' ? undefined : currentPath
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear archivo");
      }

      const newFile = await response.json();
      setFiles(prevFiles => [...prevFiles, newFile]);

      toast({
        title: "Archivo creado",
        description: `Se ha creado el archivo ${name}`,
      });
      sounds.play('success', 0.4);

      return newFile;
    } catch (error) {
      console.error("Error creando archivo:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear el archivo",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
      return null;
    }
  };

  // Create a new folder
  const createFolder = async (name: string) => {
    try {
      const folderPath = currentPath === '/' ? name : `${currentPath}/${name}`;

      toast({
        title: "Creando carpeta",
        description: folderPath,
      });
      sounds.play('pop', 0.3);

      // Create a .gitkeep file to represent the folder
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

      // Reload files
      const filesResponse = await apiRequest("GET", `/api/projects/${projectId}/files`);
      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        setFiles(filesData);
      }

      toast({
        title: "Carpeta creada",
        description: `Se ha creado la carpeta ${name}`,
      });
      sounds.play('success', 0.4);

      return true;
    } catch (error) {
      console.error("Error creando carpeta:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear la carpeta",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
      return false;
    }
  };

  // Delete a file
  const deleteFile = async (fileId: number) => {
    try {
      toast({
        title: "Eliminando archivo...",
        description: "Por favor espera",
      });
      sounds.play('pop', 0.2);

      const response = await apiRequest("DELETE", `/api/files/${fileId}`);
      if (!response.ok) throw new Error("Failed to delete file");

      // Update local state
      setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));

      toast({
        title: "Éxito",
        description: "Archivo eliminado correctamente",
      });
      sounds.play('success', 0.3);

      return true;
    } catch (error) {
      console.error("Error eliminando archivo:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el archivo",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
      return false;
    }
  };

  // Delete a document
  const deleteDocument = async (documentId: number) => {
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

      return true;
    } catch (error) {
      console.error("Error eliminando documento:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
      return false;
    }
  };

  // Update file content
  const updateFile = async (fileId: number, content: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) throw new Error("Archivo no encontrado");

      const response = await apiRequest("PUT", `/api/files/${fileId}`, {
        content,
        name: file.name,
        type: file.type
      });

      if (!response.ok) throw new Error("Failed to update file");

      // Update local state
      setFiles(prevFiles => 
        prevFiles.map(file => 
          file.id === fileId 
            ? { ...file, content } 
            : file
        )
      );

      return true;
    } catch (error) {
      console.error("Error actualizando archivo:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el archivo",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
      return false;
    }
  };

  // Rename a file
  const renameFile = async (fileId: number, newName: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) throw new Error("Archivo no encontrado");

      // Get the directory path
      const pathParts = file.name.split('/');
      pathParts.pop(); // Remove filename
      const dirPath = pathParts.length > 0 ? pathParts.join('/') : '';

      // New full path
      const newPath = dirPath ? `${dirPath}/${newName}` : newName;

      const response = await apiRequest("PUT", `/api/files/${fileId}`, {
        content: file.content,
        name: newPath,
        type: file.type
      });

      if (!response.ok) throw new Error("Failed to rename file");

      // Reload files to ensure correct paths
      const filesResponse = await apiRequest("GET", `/api/projects/${projectId}/files`);
      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        setFiles(filesData);
      }

      return true;
    } catch (error) {
      console.error("Error renombrando archivo:", error);
      toast({
        title: "Error",
        description: "No se pudo renombrar el archivo",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
      return false;
    }
  };

  // Navigate to a directory
  const navigateTo = (path: string) => {
    setCurrentPath(path);
  };

  // Get files in current directory
  const getFilesInCurrentDirectory = () => {
    return files.filter(file => {
      // Skip .gitkeep files
      if (file.name.endsWith('/.gitkeep')) return false;

      const filePath = file.name;
      const pathParts = filePath.split('/');

      if (currentPath === '/') {
        // Root directory: show only top-level files and folders
        return pathParts.length === 1 || (pathParts.length === 2 && pathParts[0] !== '');
      } else {
        // Inside a folder: match exact path prefix
        const prefix = currentPath.startsWith('/') ? currentPath.substring(1) : currentPath;
        const filePrefix = pathParts.slice(0, -1).join('/');
        return filePrefix === prefix;
      }
    });
  };

  // Get all folders
  const getFolders = () => {
    const folderSet = new Set<string>();

    files.forEach(file => {
      const pathParts = file.name.split('/');

      // Add each folder in the path
      let currentFolder = '';
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentFolder = currentFolder ? `${currentFolder}/${pathParts[i]}` : pathParts[i];
        folderSet.add(currentFolder);
      }
    });

    return Array.from(folderSet);
  };

  // Refresh files
  const refreshFiles = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("GET", `/api/projects/${projectId}/files`);
      if (!response.ok) throw new Error("Failed to fetch files");

      const data = await response.json();
      setFiles(data);

      const docsResponse = await apiRequest("GET", `/api/projects/${projectId}/documents`);
      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setDocuments(docsData);
      }

      toast({
        title: "Actualizado",
        description: "Lista de archivos actualizada",
      });
      sounds.play('success', 0.3);

      return true;
    } catch (error) {
      console.error("Error refreshing files:", error);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los archivos",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Efecto para escuchar evento de actualización de archivos
  useEffect(() => {
    const handleRefreshEvent = (e: CustomEvent) => {
      console.log("Evento refresh-files recibido");
      refreshFiles();
    };

    window.addEventListener('refresh-files', handleRefreshEvent as EventListener);

    return () => {
      window.removeEventListener('refresh-files', handleRefreshEvent as EventListener);
    };
  }, []);


  // Handle repository extraction
  const extractRepository = async (documentId: number) => {
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
        refreshFiles();
      }, 1000);

      return true;
    } catch (error) {
      console.error("Error extrayendo repositorio:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al extraer los archivos",
        variant: "destructive",
      });
      sounds.play('error', 0.3);
      return false;
    }
  };

  return (
    <FileSystemContext.Provider
      value={{
        files,
        documents,
        currentPath,
        loading,
        createFile,
        createFolder,
        deleteFile,
        deleteDocument,
        updateFile,
        renameFile,
        getFilesInCurrentDirectory,
        getFolders,
        navigateTo,
        refreshFiles,
        extractRepository
      }}
    >
      {children}
    </FileSystemContext.Provider>
  );
}

// Custom hook to use the file system
export function useFileSystem() {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
}