import { useState, useEffect, useRef } from "react";
import { File } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getLanguageIcon, getLanguageFromFileType } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import CodeCorrectionModal from "./CodeCorrectionModal";

// Local storage utility
const projectStorage = {
  saveFileContent: (fileId: string, content: string) => {
    localStorage.setItem(fileId, content);
  },
  loadFileContent: (fileId: string) => {
    return localStorage.getItem(fileId);
  }
};

interface CodeEditorProps {
  file: File;
  onUpdate?: (updatedFile: File) => void;
}

const CodeEditor = ({ file, onUpdate }: CodeEditorProps) => {
  const [content, setContent] = useState(file.content);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const language = getLanguageFromFileType(file.type);
  const languageIcon = getLanguageIcon(file.type);

  useEffect(() => {
    const loadedContent = projectStorage.loadFileContent(file.id);
    if (loadedContent) {
      setContent(loadedContent);
    } else {
      setContent(file.content);
    }
    setIsDirty(false);
  }, [file]);

  useEffect(() => {
    if (isMobile && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isMobile, file.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLTextAreaElement;
      if (!textareaRef.current || target !== textareaRef.current) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        insertTextAtCursor('  ');
      }

      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveFile();
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('keydown', handleKeyDown);
      return () => textarea.removeEventListener('keydown', handleKeyDown);
    }
  }, [content]);

  const insertTextAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + text + content.substring(end);
    setContent(newContent);
    setIsDirty(true);

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
    }, 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(true);
    if (file?.id) {
      projectStorage.saveFileContent(file.id, e.target.value);
    }
  };

  const saveFile = async () => {
    if (!isDirty) return;

    try {
      setIsSaving(true);
      const response = await apiRequest("PUT", `/api/files/${file.id}`, { content });
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

  const handleApplyCorrections = async (correctedCode: string) => {
    setContent(correctedCode);
    setIsDirty(true);

    const shouldSaveImmediately = true;
    if (shouldSaveImmediately) {
      try {
        setIsSaving(true);
        const response = await apiRequest("PUT", `/api/files/${file.id}`, { content: correctedCode });
        const updatedFile = await response.json();
        setIsDirty(false);

        if (onUpdate) {
          onUpdate(updatedFile);
        }
      } catch (error) {
        console.error("Error saving corrected code:", error);
        return Promise.reject(error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center space-x-2 overflow-hidden">
          <i className={`${languageIcon} flex-shrink-0`}></i>
          <span className="text-sm font-medium truncate">{file.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300 flex-shrink-0">{language}</span>
          {isDirty && <span className="text-xs text-blue-500 animate-pulse flex-shrink-0">•</span>}
        </div>
        <div className="flex space-x-1">
          <button
            className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none"
            onClick={() => setShowCorrectionModal(true)}
            aria-label="Corregir código con IA"
            title="Corregir código con IA"
          >
            <i className="ri-robot-line"></i>
          </button>
          <button
            className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none"
            onClick={saveFile}
            disabled={isSaving || !isDirty}
            aria-label="Guardar archivo"
            title="Guardar (Ctrl+S)"
          >
            {isSaving ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-save-line"></i>}
          </button>
          <button
            className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            <i className={`${isFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'}`}></i>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2 sm:p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm h-full flex flex-col relative">
          {isMobile && !isFullscreen && (
            <div className="absolute -top-3 left-0 right-0 flex justify-center z-10 pointer-events-none">
              <div className="bg-slate-200 dark:bg-slate-700 h-1 w-16 rounded-full pointer-events-auto"></div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            className="code-font text-sm flex-1 w-full h-full p-3 sm:p-4 resize-none bg-slate-900 text-slate-200 font-mono border-0 focus:ring-0 focus:outline-none [&]:selection:bg-slate-700 [&]:selection:text-slate-100"
            style={{
              whiteSpace: 'pre',
              fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              caretColor: '#fff',
              lineHeight: '1.6',
              color: '#d4d4d4',
              backgroundColor: '#1e1e2e'
            }}
            spellCheck="false"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
          />

          {isMobile && (
            <div className={`${isFullscreen ? 'flex' : 'hidden'} bg-slate-100 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600 p-1.5 overflow-x-auto whitespace-nowrap`}>
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-mono text-xs"
                  onClick={() => insertTextAtCursor('  ')}
                >
                  Tab
                </Button>
                {['()', '{}', '[]', '<>', '""', "''", '``', ';', ':', '=>', '->', '/**/'].map((char) => (
                  <Button
                    key={char}
                    variant="ghost"
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => {
                      const pairs: {[key: string]: [number, string]} = {
                        '()': [1, '()'],
                        '{}': [1, '{}'],
                        '[]': [1, '[]'],
                        '<>': [1, '<>'],
                        '""': [1, '""'],
                        "''": [1, "''"],
                        '``': [1, '``'],
                        '/**/': [2, '/**/']
                      };

                      if (pairs[char]) {
                        const [cursorOffset, pairText] = pairs[char];
                        const newContent = content.substring(0, textareaRef.current!.selectionStart) + pairText + content.substring(textareaRef.current!.selectionEnd);
                        setContent(newContent);
                        setIsDirty(true);

                        setTimeout(() => {
                          textareaRef.current!.selectionStart = textareaRef.current!.selectionEnd = textareaRef.current!.selectionStart + cursorOffset;
                          textareaRef.current!.focus();
                        }, 0);
                      } else {
                        const newContent = content.substring(0, textareaRef.current!.selectionStart) + char + content.substring(textareaRef.current!.selectionEnd);
                        setContent(newContent);
                        setIsDirty(true);

                        setTimeout(() => {
                          textareaRef.current!.selectionStart = textareaRef.current!.selectionEnd = textareaRef.current!.selectionStart + char.length;
                          textareaRef.current!.focus();
                        }, 0);
                      }
                    }}
                  >
                    {char}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isDirty && isMobile && !isFullscreen && (
        <div className="fixed bottom-4 right-4 z-10">
          <Button
            size="sm"
            onClick={saveFile}
            disabled={isSaving}
            className="h-10 px-3 shadow-lg flex items-center space-x-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transition-all duration-300"
          >
            {isSaving ? (
              <>
                <i className="ri-loader-4-line animate-spin mr-1"></i>
                <span>Guardando</span>
              </>
            ) : (
              <>
                <i className="ri-save-line mr-1"></i>
                <span>Guardar</span>
              </>
            )}
          </Button>
        </div>
      )}

      {showCorrectionModal && (
        <CodeCorrectionModal
          file={file}
          onClose={() => setShowCorrectionModal(false)}
          onApplyChanges={handleApplyCorrections}
          projectId={file.projectId}
        />
      )}
    </div>
  );
};

export default CodeEditor;
