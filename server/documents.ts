
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';
import crypto from 'crypto';
import { Document, InsertDocument } from '@shared/schema';
import { storage } from './storage';
import fetch from 'node-fetch';
import AdmZip from 'adm-zip';
import multer from 'multer';
import os from 'os';

const streamPipeline = promisify(pipeline);

// Creamos directorio de documentos si no existe
const DOCUMENTS_DIR = path.join(process.cwd(), 'documents');
if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

// Configurar multer para la carga de archivos
export const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const projectId = req.params.projectId;
      const projectDir = path.join(DOCUMENTS_DIR, projectId);
      
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }
      
      cb(null, projectDir);
    },
    filename: function (req, file, cb) {
      // Generar nombre único para evitar colisiones
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const fileExt = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${fileExt}`);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB límite
  },
});

// Función para procesar un archivo ZIP
async function processZipFile(filePath: string, projectId: number): Promise<number> {
  try {
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();
    
    const zipBaseName = path.basename(filePath, '.zip');
    const extractPath = path.join(DOCUMENTS_DIR, projectId.toString(), 'extracted_' + zipBaseName);
    if (!fs.existsSync(extractPath)) {
      fs.mkdirSync(extractPath, { recursive: true });
    }
    
    zip.extractAllTo(extractPath, true);
    
    let processedCount = 0;
    for (const entry of zipEntries) {
      if (!entry.isDirectory) {
        // Crear una ruta relativa que incluya la estructura completa del directorio
        const relativePath = path.join('extracted_' + zipBaseName, entry.entryName);
        
        // Estructurar nombre para mostrar la ruta dentro del repositorio
        const displayName = entry.entryName;
        
        await storage.createDocument({
          projectId,
          name: displayName,
          path: relativePath,
          type: 'file',
          size: entry.header.size,
        });
        processedCount++;
      }
    }
    
    return processedCount;
  } catch (error) {
    console.error('Error procesando archivo ZIP:', error);
    throw error;
  }
}

// Función para descargar archivo desde URL
export async function downloadFromUrl(url: string, projectId: number): Promise<number> {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Error al descargar desde URL: ${response.statusText}`);
    }
    
    const projectDir = path.join(DOCUMENTS_DIR, projectId.toString());
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    const urlObj = new URL(url);
    // Generar un nombre de archivo único
    const originalFileName = path.basename(urlObj.pathname) || 'downloaded_file';
    const uniqueFileName = Date.now() + '-' + originalFileName;
    const filePath = path.join(projectDir, uniqueFileName);
    
    const fileStream = fs.createWriteStream(filePath);
    await streamPipeline(response.body, fileStream);
    
    const stats = fs.statSync(filePath);
    
    // Verificar si es un archivo ZIP
    if (originalFileName.endsWith('.zip')) {
      const processedCount = await processZipFile(filePath, projectId);
      return processedCount;
    }
    
    // Determinar el tipo basado en la extensión
    const fileExt = path.extname(originalFileName).toLowerCase();
    const fileType = getFileTypeFromExtension(fileExt);
    
    // Registrar el documento con una ruta relativa
    await storage.createDocument({
      projectId,
      name: originalFileName,
      path: uniqueFileName, // Usar el nombre único como ruta relativa
      type: fileType || 'url',
      size: stats.size,
    });
    
    return 1;
  } catch (error) {
    console.error('Error descargando desde URL:', error);
    throw error;
  }
}

// Función auxiliar para determinar el tipo de archivo
function getFileTypeFromExtension(extension: string): string {
  const typeMap: Record<string, string> = {
    '.js': 'javascript',
    '.ts': 'typescript',
    '.jsx': 'javascript',
    '.tsx': 'typescript',
    '.html': 'html',
    '.css': 'css',
    '.json': 'json',
    '.py': 'python',
    '.txt': 'text',
    '.md': 'markdown',
    '.php': 'php',
    '.rb': 'ruby',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.go': 'go',
  };
  
  return typeMap[extension] || 'file';
}

// Función para procesar archivo cargado
export async function processUploadedFile(file: Express.Multer.File, projectId: number): Promise<boolean> {
  try {
    // Verificar si es un archivo ZIP
    if (file.originalname.endsWith('.zip')) {
      await processZipFile(file.path, projectId);
      return true;
    }
    
    // Si el archivo viene de multer memory storage, podría no tener filename
    const filename = file.filename || path.basename(file.originalname);
    
    // Asegurarse de que el archivo exista en el sistema de archivos
    const projectDir = path.join(DOCUMENTS_DIR, projectId.toString());
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    // Si el archivo no tiene una ruta en el sistema, copiarlo
    let filePath = file.path;
    if (!fs.existsSync(filePath) || !path.isAbsolute(filePath)) {
      const newPath = path.join(projectDir, filename);
      fs.writeFileSync(newPath, file.buffer || fs.readFileSync(filePath));
      filePath = filename; // Guardar el nombre relativo
    } else {
      // Si ya tiene ruta absoluta, convertirla a relativa para almacenar
      filePath = filename;
    }
    
    // Registrar el documento con una ruta válida
    await storage.createDocument({
      projectId,
      name: file.originalname,
      path: filePath, // Ahora siempre tendrá un valor válido
      type: 'file',
      size: file.size,
    });
    
    return true;
  } catch (error) {
    console.error('Error procesando archivo cargado:', error);
    return false;
  }
}

// Función para buscar archivos utilizando los documentos cargados
export async function searchInDocuments(projectId: number, query: string): Promise<any[]> {
  try {
    // Aquí implementaríamos la búsqueda en los documentos
    // Por ahora, solo devolvemos una lista de los documentos disponibles
    const documents = await storage.getDocumentsByProjectId(projectId);
    return documents.filter(doc => 
      doc.name.toLowerCase().includes(query.toLowerCase())
    );
  } catch (error) {
    console.error('Error buscando en documentos:', error);
    throw error;
  }
}

// Función para obtener el contenido de un documento
export async function getDocumentContent(documentId: number): Promise<string | null> {
  try {
    // Obtener información del documento
    const document = await storage.getDocumentById(documentId);
    
    if (!document) {
      return null;
    }
    
    if (!document.path) {
      console.error(`El documento con ID ${documentId} no tiene una ruta definida`);
      return null;
    }
    
    // Construir la ruta al archivo
    const projectDir = path.join(DOCUMENTS_DIR, document.projectId.toString());
    let filePath = path.join(projectDir, document.path);
    
    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      console.error(`Archivo no encontrado en ruta: ${filePath}`);
      return null;
    }
    
    // Leer y devolver el contenido del archivo
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error obteniendo contenido del documento:', error);
    throw error;
  }
}
