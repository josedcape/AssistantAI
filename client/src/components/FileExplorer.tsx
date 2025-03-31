import { useState, useEffect } from "react";
import { File } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { getLanguageIcon } from "@/lib/types";

interface FileExplorerProps {
  projectId: number;
  files: File[];
  onFileSelect: (file: File) => void;
  onFilesUpdate: () => void;
}

const FileExplorer = ({ projectId, files, onFileSelect, onFilesUpdate }: FileExplorerProps) => {
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const { toast } = useToast();

  const handleFileClick = (file: File) => {
    onFileSelect(file);
  };

  const handleDeleteFile = async (fileId: number, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (files.length <= 1) {
      toast({
        title: "Error",
        description: "No puedes eliminar el único archivo del proyecto",
        variant: "destructive"
      });
      return;
    }
    
    if (!window.confirm(`¿Estás seguro de que quieres eliminar ${fileName}?`)) {
      return;
    }
    
    try {
      await apiRequest("DELETE", `/api/files/${fileId}`);
      
      toast({
        title: "Archivo eliminado",
        description: `${fileName} ha sido eliminado`
      });
      
      // Invalidate the files cache
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
      onFilesUpdate();
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el archivo",
        variant: "destructive"
      });
    }
  };
  
  const createNewFile = async () => {
    if (!newFileName.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa un nombre para el archivo",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Determine file type based on extension
      const extension = newFileName.split('.').pop()?.toLowerCase() || '';
      let fileType = 'text';
      
      if (extension === 'html') fileType = 'html';
      else if (extension === 'css') fileType = 'css';
      else if (extension === 'js') fileType = 'javascript';
      else if (extension === 'ts') fileType = 'typescript';
      else if (extension === 'json') fileType = 'json';
      else if (extension === 'md') fileType = 'markdown';
      else if (extension === 'py') fileType = 'python';
      
      const response = await apiRequest("POST", `/api/projects/${projectId}/files`, {
        name: newFileName,
        content: `// Nuevo archivo: ${newFileName}`,
        type: fileType
      });
      
      const newFile = await response.json();
      
      toast({
        title: "Archivo creado",
        description: `${newFileName} ha sido creado`
      });
      
      // Invalidate the files cache
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
      onFilesUpdate();
      
      // Select the new file
      onFileSelect(newFile);
      
      // Reset form
      setNewFileName("");
      setIsCreatingFile(false);
    } catch (error) {
      console.error("Error creating file:", error);
      toast({
        title: "Error",
        description: "No se pudo crear el archivo",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Explorador</h2>
        <button 
          className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none"
          onClick={() => setIsCreatingFile(true)}
        >
          <i className="ri-add-line"></i>
        </button>
      </div>
      
      {/* New File Form */}
      {isCreatingFile && (
        <div className="mb-3 p-2 bg-slate-100 dark:bg-slate-700 rounded">
          <div className="flex text-sm mb-2">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="nombre.ext"
              className="flex-1 px-2 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-l focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
            />
            <button
              className="px-2 py-1 bg-primary-500 text-white rounded-r hover:bg-primary-600"
              onClick={createNewFile}
            >
              <i className="ri-check-line"></i>
            </button>
          </div>
          <div className="flex space-x-1 text-xs">
            <button 
              className="px-1 bg-slate-200 dark:bg-slate-600 rounded hover:bg-slate-300 dark:hover:bg-slate-500"
              onClick={() => setNewFileName("index.html")}
            >
              html
            </button>
            <button 
              className="px-1 bg-slate-200 dark:bg-slate-600 rounded hover:bg-slate-300 dark:hover:bg-slate-500"
              onClick={() => setNewFileName("styles.css")}
            >
              css
            </button>
            <button 
              className="px-1 bg-slate-200 dark:bg-slate-600 rounded hover:bg-slate-300 dark:hover:bg-slate-500"
              onClick={() => setNewFileName("script.js")}
            >
              js
            </button>
          </div>
        </div>
      )}
      
      {/* Project Files */}
      <div className="space-y-1">
        {files.map((file) => (
          <div
            key={file.id}
            className="group flex items-center justify-between py-1 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            onClick={() => handleFileClick(file)}
          >
            <div className="flex items-center text-sm">
              <i className={`${getLanguageIcon(file.type)} mr-2`}></i>
              <span>{file.name}</span>
            </div>
            <div className="hidden group-hover:flex space-x-1">
              <button
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 focus:outline-none"
                onClick={(e) => handleDeleteFile(file.id, file.name, e)}
              >
                <i className="ri-delete-bin-line text-xs"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6">
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Configuración</h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
            <div className="flex items-center text-sm">
              <i className="ri-settings-line mr-2 text-slate-500"></i>
              <span>package.json</span>
            </div>
          </div>
          <div className="flex items-center justify-between py-1 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
            <div className="flex items-center text-sm">
              <i className="ri-git-branch-line mr-2 text-slate-500"></i>
              <span>.gitignore</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileExplorer;
