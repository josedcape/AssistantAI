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
async function processZipFile(filePath: string, projectId: number, extractFiles: boolean = false): Promise<number> {
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

    if (extractFiles) {
      // Extraer cada archivo como un documento individual
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
            type: getFileTypeFromExtension(path.extname(displayName)),
            size: entry.header.size,
          });
          processedCount++;
        }
      }
    } else {
      // Guardar el zip como un único documento
      await storage.createDocument({
        projectId,
        name: zipBaseName + ' (Repositorio)',
        path: path.relative(DOCUMENTS_DIR, filePath),
        type: 'repository',
        size: fs.statSync(filePath).size,
        metadata: {
          isRepository: true,
          extractPath: extractPath,
          entryCount: zipEntries.length
        }
      });
      processedCount = 1;
    }

    return processedCount;
  } catch (error) {
    console.error('Error procesando archivo ZIP:', error);
    throw error;
  }
}

// Función para extraer archivos de un repositorio ya cargado
export async function extractRepositoryFiles(documentId: number, projectId: number): Promise<number> {
  try {
    // Obtener información del documento
    const document = await storage.getDocumentById(documentId);

    if (!document) {
      throw new Error(`Documento con ID ${documentId} no encontrado`);
    }

    if (!document.path) {
      throw new Error(`El documento con ID ${documentId} no tiene una ruta definida`);
    }

    // Construir la ruta al archivo
    const docDir = path.join(DOCUMENTS_DIR, document.projectId.toString());
    const filePath = path.join(docDir, document.path);

    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo no encontrado en ruta: ${filePath}`);
    }

    // Extraer archivos del repositorio
    const isZip = document.path.endsWith('.zip') || document.type === 'repository';
    if (isZip) {
      return await processZipFile(filePath, projectId, true);
    } else {
      throw new Error('El documento no es un archivo comprimido o repositorio');
    }
  } catch (error) {
    console.error('Error extrayendo archivos de repositorio:', error);
    throw error;
  }
}

// Función para descargar archivo desde URL
export async function downloadFromUrl(url: string, projectId: number, extractFiles: boolean = false): Promise<number> {
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

    // Verificar si es un archivo ZIP o repositorio
    if (originalFileName.endsWith('.zip') || url.includes('github.com') || url.includes('gitlab.com')) {
      const processedCount = await processZipFile(filePath, projectId, extractFiles);
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
    // Si es un archivo ZIP, descomprimirlo
    if (file.originalname.endsWith('.zip')) {
      const zip = new AdmZip(file.buffer);
      const zipEntries = zip.getEntries();

      // Crear directorio temporal para extraer
      const extractDir = path.join(process.cwd(), 'temp', `extract-${Date.now()}`);
      fs.mkdirSync(extractDir, { recursive: true });

      console.log(`Extrayendo ZIP en: ${extractDir}`);

      try {
        // Extraer archivos con manejo de errores
        zip.extractAllTo(extractDir, true);

        let filesImported = 0;

        // Procesar archivos extraídos
        for (const entry of zipEntries) {
          if (!entry.isDirectory) {
            try {
              const filePath = path.join(extractDir, entry.entryName);

              // Verificar si el archivo existe
              if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, 'utf-8');

                // Guardar como documento
                await saveDocument(projectId, entry.entryName, fileContent);
                filesImported++;
              } else {
                console.error(`Archivo no encontrado: ${filePath}`);
              }
            } catch (entryError) {
              console.error(`Error procesando archivo ${entry.entryName}:`, entryError);
            }
          }
        }

        console.log(`Procesados ${filesImported} de ${zipEntries.length} archivos`);

        // Limpiar directorio temporal
        try {
          fs.rmSync(extractDir, { recursive: true, force: true });
        } catch (cleanupError) {
          console.error('Error al limpiar directorio temporal:', cleanupError);
        }

        return { success: true, message: `Repositorio ZIP procesado: ${filesImported} archivos importados` };
      } catch (extractError) {
        console.error('Error al extraer archivos ZIP:', extractError);
        return { success: false, message: `Error al descomprimir archivo: ${extractError.message}` };
      }
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

// Función para extraer texto de documentos DOC/DOCX
export async function extractTextFromDocument(filePath: string, fileExtension: string): Promise<string> {
  try {
    // En un entorno real, usaríamos bibliotecas como mammoth para DOCX
    // y antiword o alguna otra biblioteca para DOC
    
    // Para esta implementación, simularemos el procesamiento de documentos
    // En una implementación real, deberías instalar estas bibliotecas y usarlas aquí
    
    if (fileExtension === '.docx') {
      // Simulación de extracción de texto de DOCX
      // En un entorno real usaríamos: const result = await mammoth.extractRawText({path: filePath});
      
      // Para esta implementación, leeremos el archivo binario y devolveremos un mensaje informativo
      const fileContent = fs.readFileSync(filePath);
      
      if (fileContent.length > 0) {
        // Examinar los primeros bytes para verificar si es un documento válido
        const isDocx = fileContent.slice(0, 4).toString('hex') === '504b0304'; // Signature de ZIP (DOCX es un ZIP)
        
        if (isDocx) {
          return `[Este es un documento DOCX válido. En una implementación completa, se extraería el texto usando la biblioteca mammoth.]\n\nPara una implementación completa, instale las dependencias:\nnpm install mammoth\n\nY use el siguiente código en documents.ts:\n\nimport * as mammoth from 'mammoth';\n\nconst result = await mammoth.extractRawText({path: filePath});\nreturn result.value;`;
        } else {
          return "El archivo parece tener un formato DOCX inválido o corrupto.";
        }
      } else {
        return "El documento está vacío o no se pudo leer correctamente.";
      }
    } else if (fileExtension === '.doc') {
      // Simulación de extracción de texto de DOC
      // En un entorno real usaríamos una biblioteca como antiword o textract
      
      // Para esta implementación, leeremos el archivo binario y devolveremos un mensaje informativo
      const fileContent = fs.readFileSync(filePath);
      
      if (fileContent.length > 0) {
        // Examinar los primeros bytes para verificar si es un documento válido
        const isDoc = fileContent.slice(0, 8).toString('hex') === 'd0cf11e0a1b11ae1'; // Signature de DOC
        
        if (isDoc) {
          return `[Este es un documento DOC válido. En una implementación completa, se extraería el texto usando una biblioteca como antiword o textract.]\n\nPara una implementación completa, puede usar herramientas del sistema como antiword o catdoc, o implementar una solución basada en Node.js con textract:\n\nnpm install textract\n\nY usar el siguiente código:\n\nimport textract from 'textract';\n\nreturn new Promise((resolve, reject) => {\n  textract.fromFileWithPath(filePath, (error, text) => {\n    if (error) {\n      reject(error);\n    } else {\n      resolve(text);\n    }\n  });\n});`;
        } else {
          return "El archivo parece tener un formato DOC inválido o corrupto.";
        }
      } else {
        return "El documento está vacío o no se pudo leer correctamente.";
      }
    } else {
      throw new Error(`Formato de archivo no soportado: ${fileExtension}`);
    }
  } catch (error) {
    console.error('Error extrayendo texto del documento:', error);
    throw error;
  }
}

async function saveDocument(projectId: number, name: string, content: string) {
  // Placeholder for actual document saving logic.  Replace with your actual implementation.
  console.log(`Saving document: projectId=${projectId}, name=${name}, content=${content.substring(0, 50)}...`);
  // await storage.createDocument(...)  // Replace with your database interaction
}