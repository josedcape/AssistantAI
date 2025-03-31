import { useState, useEffect } from "react";
import { File } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getLanguageIcon, getLanguageFromFileType } from "@/lib/types";

interface CodeEditorProps {
  file: File;
  onUpdate?: (updatedFile: File) => void;
}

// Simple code editor implementation
// In a production app, this would be replaced with Monaco Editor or CodeMirror
const CodeEditor = ({ file, onUpdate }: CodeEditorProps) => {
  const [content, setContent] = useState(file.content);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  
  const language = getLanguageFromFileType(file.type);
  const languageIcon = getLanguageIcon(file.type);

  useEffect(() => {
    setContent(file.content);
    setIsDirty(false);
  }, [file]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(true);
  };

  const saveFile = async () => {
    if (!isDirty) return;
    
    try {
      setIsSaving(true);
      
      const response = await apiRequest("PUT", `/api/files/${file.id}`, {
        content
      });
      
      const updatedFile = await response.json();
      setIsDirty(false);
      
      toast({
        title: "Archivo guardado",
        description: `${file.name} ha sido guardado correctamente`
      });
      
      if (onUpdate) {
        onUpdate(updatedFile);
      }
    } catch (error) {
      console.error("Error saving file:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el archivo",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <i className={languageIcon}></i>
          <span className="text-sm font-medium">{file.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300">{language}</span>
          {isDirty && <span className="text-xs text-blue-500">•</span>}
        </div>
        <div className="flex space-x-1">
          <button
            className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none"
            onClick={saveFile}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? (
              <i className="ri-loader-4-line animate-spin"></i>
            ) : (
              <i className="ri-save-line"></i>
            )}
          </button>
          <button className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none">
            <i className="ri-search-line"></i>
          </button>
          <button className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none">
            <i className="ri-settings-line"></i>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm h-full flex flex-col">
          <textarea
            value={content}
            onChange={handleChange}
            className="code-font text-sm flex-1 w-full h-full p-4 resize-none bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-0 focus:ring-0 focus:outline-none"
            spellCheck="false"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                saveFile();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
