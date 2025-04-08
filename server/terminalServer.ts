
import { WebSocketServer, WebSocket } from 'ws';
import { spawn } from 'child_process';
import * as os from 'os';
import { log } from './vite';
import * as http from 'http';

export function setupTerminalServer(server: http.Server) {
  log('Configurando servidor de terminal con WebSockets', 'terminal');

  const wss = new WebSocketServer({ 
    server,
    perMessageDeflate: false,
    clientTracking: true,
    path: '/terminal'
  });
  
  log('Servidor WebSocket iniciado en path: /terminal', 'terminal');
  
  wss.on('error', (error) => {
    log(`Error en servidor WebSocket: ${error.message}`, 'terminal');
  });
  
  if (server.listening) {
    log(`WebSocket adjunto a servidor HTTP que ya está escuchando`, 'terminal');
  } else {
    log(`WebSocket adjunto a servidor HTTP que aún no está escuchando`, 'terminal');
  }

  wss.on('connection', (ws, req) => {
    log(`Nuevo cliente de terminal conectado desde ${req.socket.remoteAddress}`, 'terminal');
    
    let shell: any = null;
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'terminal:init') {
          initializeTerminal(ws);
        } else if (data.type === 'terminal:input') {
          handleInput(ws, data.content);
        } else if (data.type === 'terminal:resize') {
          handleResize(data.dimensions);
        }
      } catch (error) {
        log(`Error al procesar mensaje: ${error}`, 'terminal');
      }
    });
    
    ws.on('close', () => {
      log('Cliente de terminal desconectado', 'terminal');
      if (shell) {
        try {
          shell.kill();
        } catch (error) {
          // Ignorar errores al matar el proceso
        }
        shell = null;
      }
    });
    
    function initializeTerminal(ws: WebSocket) {
      log('Inicializando terminal para cliente', 'terminal');
      
      const shellPath = os.platform() === 'win32' ? 'cmd.exe' : '/bin/bash';
      const shellArgs = os.platform() === 'win32' ? [] : [];
      
      try {
        shell = spawn(shellPath, shellArgs, {
          cwd: process.cwd(),
          env: process.env,
          shell: true,
          windowsHide: true
        });
        
        log(`Terminal iniciada con PID: ${shell.pid}`, 'terminal');
        sendMessage(ws, 'terminal:output', `Terminal iniciada (${os.platform()})\r\n`);
        
        shell.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          sendMessage(ws, 'terminal:output', output);
        });
        
        shell.stderr.on('data', (data: Buffer) => {
          const output = data.toString();
          sendMessage(ws, 'terminal:output', output);
        });
        
        shell.on('exit', (code: number) => {
          sendMessage(ws, 'terminal:output', `\r\nProceso terminado (código ${code})\r\n`);
          shell = null;
        });
        
        shell.on('error', (err: Error) => {
          log(`Error en proceso de terminal: ${err.message}`, 'terminal');
          sendMessage(ws, 'terminal:output', `\r\nError: ${err.message}\r\n`);
          shell = null;
        });
      } catch (error: any) {
        log(`Error al iniciar terminal: ${error.message}`, 'terminal');
        sendMessage(ws, 'terminal:output', `Error al iniciar terminal: ${error.message}\r\n`);
      }
    }
    
    function handleInput(ws: WebSocket, data: string) {
      if (shell && shell.stdin && !shell.stdin.destroyed) {
        shell.stdin.write(data);
      } else {
        sendMessage(ws, 'terminal:output', '\r\nTerminal no disponible. Reconectando...\r\n');
        initializeTerminal(ws);
      }
    }
    
    function handleResize(dimensions: {cols: number, rows: number}) {
      if (shell && shell.resize) {
        try {
          shell.resize(dimensions.cols, dimensions.rows);
        } catch (error) {
          // Ignorar errores de ajuste de tamaño
        }
      }
    }
    
    function sendMessage(ws: WebSocket, type: string, content: string) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, content }));
      }
    }
  });
  
  log('Servidor de terminal WebSocket configurado', 'terminal');
}
