
import React, { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Send } from 'lucide-react';

interface TerminalProps {
  className?: string;
}

export function Terminal({ className }: TerminalProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Inicializar conexión WebSocket
    const ws = new WebSocket(`ws://${window.location.host}/terminal`);
    wsRef.current = ws;

    ws.onopen = () => {
      setHistory(prev => [...prev, '> Terminal conectada']);
      ws.send(JSON.stringify({ type: 'terminal:init' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'terminal:output') {
          setHistory(prev => [...prev, data.content]);
        }
      } catch (error) {
        console.error('Error al procesar mensaje:', error);
      }
    };

    ws.onclose = () => {
      setHistory(prev => [...prev, '> Terminal desconectada']);
    };

    ws.onerror = (error) => {
      console.error('Error en WebSocket:', error);
      setHistory(prev => [...prev, '> Error en la conexión']);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'terminal:input',
        content: input + '\n'
      }));
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

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
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-gray-700 text-green-400 focus:ring-green-500"
          placeholder="Ingrese un comando..."
        />
        <Button 
          type="submit" 
          variant="outline" 
          size="icon" 
          className="border-gray-700 text-green-400 hover:bg-gray-800"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

export default Terminal;
