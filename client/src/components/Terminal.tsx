import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import "xterm/css/xterm.css";

interface TerminalProps {
  className?: string;
}

export function Terminal({ className }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Inicializar xterm
    const xterm = new XTerm({
      cursorBlink: true,
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#c0caf5'
      }
    });
    xtermRef.current = xterm;

    // Addons
    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(new WebLinksAddon());

    // Montar terminal
    xterm.open(terminalRef.current);
    fitAddon.fit();

    // Conectar WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/terminal`);
    wsRef.current = ws;

    ws.onopen = () => {
      xterm.writeln('Terminal conectada');
      ws.send(JSON.stringify({ type: 'terminal:init' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'terminal:output') {
          xterm.write(data.content);
        }
      } catch (error) {
        console.error('Error al procesar mensaje:', error);
      }
    };

    // Manejar input del usuario
    xterm.onData((data) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'terminal:input',
          content: data
        }));
      }
    });

    // Manejar resize
    const handleResize = () => {
      fitAddon.fit();
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'terminal:resize',
          dimensions: {
            cols: xterm.cols,
            rows: xterm.rows
          }
        }));
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return (
    <div className={`terminal-container h-full ${className}`}>
      <div ref={terminalRef} className="h-full" />
    </div>
  );
}

export default Terminal;