import { useState, useEffect } from "react";

interface ConsoleOutputProps {
  projectId: number;
  activeFileId?: number;
}

const ConsoleOutput = ({ projectId, activeFileId }: ConsoleOutputProps) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (activeFileId) {
      // In a real implementation, this would connect to the server
      // for real-time console output from the executed code
      setLogs([
        "Ejecutando archivo...",
        "Archivo cargado correctamente.",
        "Console output aparecerá aquí cuando ejecutes el código."
      ]);
    }
  }, [activeFileId]);

  const clearConsole = () => {
    setIsClearing(true);
    setTimeout(() => {
      setLogs([]);
      setIsClearing(false);
    }, 300);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-800">
      <div className="flex-none border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center h-10 px-4 justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Consola</span>
          <button 
            className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 focus:outline-none"
            onClick={clearConsole}
            disabled={isClearing}
          >
            <i className="ri-delete-bin-line"></i>
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-white dark:bg-slate-900 h-full rounded-lg shadow-sm p-4 overflow-auto">
          <div className="code-font text-sm">
            {logs.length === 0 ? (
              <div className="text-slate-400 dark:text-slate-500 text-center py-8">
                <i className="ri-terminal-box-line block text-2xl mb-2"></i>
                <p>No hay registros para mostrar</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1 text-slate-800 dark:text-slate-200">
                  <span className="text-slate-400 dark:text-slate-500 mr-2">&gt;</span>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsoleOutput;
