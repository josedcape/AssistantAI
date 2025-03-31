import { File } from "@shared/schema";

interface StatusBarProps {
  activeFile?: File;
  projectName?: string;
}

const StatusBar = ({ activeFile, projectName }: StatusBarProps) => {
  // Get language from the file type
  const getLanguageLabel = (fileType?: string): string => {
    if (!fileType) return "N/A";
    
    switch (fileType.toLowerCase()) {
      case "html":
        return "HTML";
      case "css":
        return "CSS";
      case "javascript":
      case "js":
        return "JavaScript";
      case "typescript":
      case "ts":
        return "TypeScript";
      case "python":
      case "py":
        return "Python";
      default:
        return fileType;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-1 px-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="hidden sm:flex items-center">
            <i className="ri-folder-line mr-1"></i>
            <span>{projectName || "Proyecto"}</span>
          </div>
          <div className="flex items-center">
            <i className="ri-code-line mr-1"></i>
            <span>{getLanguageLabel(activeFile?.type)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center">
            <span>Espacios: 2</span>
          </div>
          <div className="hidden sm:flex items-center">
            <span>UTF-8</span>
          </div>
          <div className="flex items-center">
            <i className="ri-information-line mr-1"></i>
            <span>v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
