
import { Command } from 'commander';
import path from 'path';
import fs from 'fs/promises';
import { Server as SocketServer } from 'socket.io';

const program = new Command();
const PROJECT_ROOT = process.cwd();

// Función para sanitizar rutas
const sanitizePath = (inputPath: string): string => {
  return inputPath
    .replace(/\.\.\//g, '')
    .replace(/\\/g, '/')
    .replace(/[^a-zA-Z0-9_\-./]/g, '');
};

// Comandos básicos para manejo de archivos
export const initializeCommands = (io: SocketServer) => {
  io.on('connection', (socket) => {
    socket.on('chat-command', async (command: string) => {
      try {
        const args = command.split(' ');
        const cmd = args[0];
        const params = args.slice(1);

        switch (cmd) {
          case 'crear-archivo':
            await crearArchivo(params[0], socket);
            break;
          case 'crear-directorio':
            await crearDirectorio(params[0], socket);
            break;
          case 'eliminar':
            await eliminar(params[0], socket);
            break;
          case 'listar':
            await listar(params[0], socket);
            break;
          default:
            socket.emit('command-error', 'Comando no reconocido');
        }
      } catch (err) {
        socket.emit('command-error', `Error: ${err.message}`);
      }
    });
  });
};

async function crearArchivo(ruta: string, socket: any) {
  const rutaSanitizada = sanitizePath(ruta);
  const rutaAbsoluta = path.join(PROJECT_ROOT, rutaSanitizada);
  
  if (!rutaAbsoluta.startsWith(PROJECT_ROOT)) {
    throw new Error('Ruta fuera del ámbito del proyecto');
  }

  await fs.writeFile(rutaAbsoluta, '');
  socket.emit('command-success', `Archivo creado: ${rutaSanitizada}`);
}

async function crearDirectorio(ruta: string, socket: any) {
  const rutaSanitizada = sanitizePath(ruta);
  const rutaAbsoluta = path.join(PROJECT_ROOT, rutaSanitizada);
  
  await fs.mkdir(rutaAbsoluta, { recursive: true });
  socket.emit('command-success', `Directorio creado: ${rutaSanitizada}`);
}

async function eliminar(ruta: string, socket: any) {
  const rutaSanitizada = sanitizePath(ruta);
  const rutaAbsoluta = path.join(PROJECT_ROOT, rutaSanitizada);
  
  const stat = await fs.stat(rutaAbsoluta);
  if (stat.isDirectory()) {
    await fs.rm(rutaAbsoluta, { recursive: true });
  } else {
    await fs.unlink(rutaAbsoluta);
  }
  socket.emit('command-success', `Eliminado: ${rutaSanitizada}`);
}

async function listar(ruta: string, socket: any) {
  const rutaSanitizada = sanitizePath(ruta || '.');
  const rutaAbsoluta = path.join(PROJECT_ROOT, rutaSanitizada);
  
  const archivos = await fs.readdir(rutaAbsoluta);
  socket.emit('command-success', `Contenido de ${rutaSanitizada}:\n${archivos.join('\n')}`);
}
