
import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';

// Ruta para servir los archivos de sonido estáticos
export const setupSoundsRoutes = (app: any) => {
  // Crear directorio de sonidos si no existe
  const soundsDir = path.join(__dirname, '../public/sounds');
  if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
    
    // Generar sonidos básicos si no existen
    createBasicSounds(soundsDir);
  }
  
  // Servir los sonidos estáticamente
  app.use('/sounds', (req: Request, res: Response, next: any) => {
    const soundFile = path.join(soundsDir, req.path);
    
    // Verificar si el archivo existe
    if (fs.existsSync(soundFile) && fs.statSync(soundFile).isFile()) {
      res.sendFile(soundFile);
    } else {
      next();
    }
  });
};

// Función para generar sonidos básicos como archivos MP3 (simulados)
// En un caso real, deberías tener archivos MP3 reales
function createBasicSounds(directory: string) {
  // Lista de sonidos básicos que necesitamos
  const soundsList = [
    'click.mp3',
    'hover.mp3',
    'success.mp3',
    'error.mp3',
    'notification.mp3',
    'typing.mp3',
    'deploy.mp3',
    'save.mp3',
  ];
  
  // Crea un archivo MP3 simulado para cada sonido
  // Estos archivos son placeholders y no producirán sonido real
  // En producción, deberías reemplazar esto con archivos reales
  soundsList.forEach(sound => {
    const filePath = path.join(directory, sound);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, Buffer.from('Placeholder for sound file'));
    }
  });
  
  console.log('Archivos de sonido básicos creados en:', directory);
}
