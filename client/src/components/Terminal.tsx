import React, { useState, useRef, useEffect } from 'react';
import { apiRequest } from '../lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Send } from 'lucide-react';

interface TerminalProps {
  className?: string;
  onCommandExecuted?: (output: string) => void;
}

export function Terminal({ className, onCommandExecuted }: TerminalProps) {
  const [history, setHistory] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  const executeCommand = async (cmd: string) => {
    try {
      setIsProcessing(true);
      const response = await apiRequest('POST', '/api/execute/command', { command: cmd });
      const result = await response.json();
      setHistory(prev => [...prev, `$ ${cmd}`, result.output || 'Command executed']);
    } catch (error) {
      setHistory(prev => [...prev, `$ ${cmd}`, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim() && !isProcessing) {
      executeCommand(command);
      setCommand('');
    }
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  // Método público para ejecutar comandos
  const executeCommandFromExternal = async (cmd: string) => {
    if (cmd.trim()) {
      await executeCommand(cmd);
      if (onCommandExecuted) {
        onCommandExecuted(`$ ${cmd}\n${history[history.length - 1]}`);
      }
    }
  };

  // Exponer el método al componente padre
  React.useImperativeHandle(React.createRef(), () => ({
    executeCommand: executeCommandFromExternal
  }));

  return (
    <div className={`flex flex-col h-full bg-black text-green-400 font-mono ${className}`}>
      <div ref={terminalRef} className="flex-1 p-4 overflow-y-auto">
        {history.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">{line}</div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 border-t border-gray-800">
        <span className="text-green-400">$</span>
        <Input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="flex-1 bg-transparent border-gray-700 text-green-400 focus:ring-green-500"
          placeholder="Enter command..."
          disabled={isProcessing}
        />
        <Button 
          type="submit" 
          variant="outline" 
          size="icon" 
          className="border-gray-700 text-green-400 hover:bg-gray-800"
          disabled={isProcessing}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}