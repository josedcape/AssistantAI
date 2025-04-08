
import React, { useState, useRef, useEffect } from 'react';
import { apiRequest } from '../lib/utils';

interface TerminalProps {
  className?: string;
}

export function Terminal({ className }: TerminalProps) {
  const [history, setHistory] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const terminalRef = useRef<HTMLDivElement>(null);

  const executeCommand = async (cmd: string) => {
    try {
      const response = await apiRequest('POST', '/api/execute/command', { command: cmd });
      const result = await response.json();
      setHistory(prev => [...prev, `$ ${cmd}`, result.output]);
    } catch (error) {
      setHistory(prev => [...prev, `$ ${cmd}`, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      executeCommand(command);
      setCommand('');
    }
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  return (
    <div className={`bg-black text-green-400 p-4 rounded-lg font-mono ${className}`}>
      <div ref={terminalRef} className="h-48 overflow-y-auto mb-2">
        {history.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">{line}</div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex">
        <span className="mr-2">$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="flex-1 bg-transparent outline-none"
          placeholder="Enter command..."
        />
      </form>
    </div>
  );
}
