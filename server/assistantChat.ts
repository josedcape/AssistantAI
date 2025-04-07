import OpenAI from "openai";
import { storage } from "./storage";
import { getActiveModel } from "./openai";
import { installPackage, uninstallPackage, runScript, getPackageInfo, listPackages } from "./packageManager";

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});

interface AssistantRequest {
  message: string;
  projectId: number | null;
  modelId?: string;
  history: Array<{
    role: string;
    content: string;
  }>;
}

interface AssistantResponse {
  message: string;
  fileChanges?: Array<{
    file: string;
    content: string;
  }>;
}

/**
 * Tipos para acciones del asistente relacionadas con paquetes
 */
interface PackageAction {
  type: 'install' | 'uninstall' | 'run-script' | 'info' | 'list';
  packageName?: string;
  version?: string; 
  isDev?: boolean;
  scriptName?: string;
  manager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
}

/**
 * Detecta si el mensaje contiene un comando para el gestor de paquetes
 * con soporte mejorado para múltiples idiomas y variaciones
 */
function detectPackageCommand(message: string): PackageAction | null {
  const normalizedMsg = message.toLowerCase().trim();

  // Patrones en español e inglés
  const installPatterns = [
    // Español
    /instalar? (paquete|librería|biblioteca|dependencia|módulo)s?\s+([a-zA-Z0-9@\-_./]+)(\s+versión\s+([0-9.^~><= ]+))?(\s+como dev(eloper)?)?/i,
    /añadir (paquete|librería|biblioteca|dependencia|módulo)s?\s+([a-zA-Z0-9@\-_./]+)(\s+versión\s+([0-9.^~><= ]+))?(\s+como dev(eloper)?)?/i,
    /agregar (paquete|librería|biblioteca|dependencia|módulo)s?\s+([a-zA-Z0-9@\-_./]+)(\s+versión\s+([0-9.^~><= ]+))?(\s+como dev(eloper)?)?/i,
    // Inglés
    /install (package|library|dependency|module)s?\s+([a-zA-Z0-9@\-_./]+)(\s+version\s+([0-9.^~><= ]+))?(\s+as dev(eloper)?)?/i,
    /add (package|library|dependency|module)s?\s+([a-zA-Z0-9@\-_./]+)(\s+version\s+([0-9.^~><= ]+))?(\s+as dev(eloper)?)?/i
  ];

  // Comandos directos (npm install X, yarn add X)
  const directInstallPatterns = [
    /npm\s+i(nstall)?\s+([a-zA-Z0-9@\-_./]+)(\s+version\s+([0-9.^~><= ]+))?(\s+(--save-dev|-D))?/i,
    /yarn\s+add\s+([a-zA-Z0-9@\-_./]+)(\s+version\s+([0-9.^~><= ]+))?(\s+(--dev|-D))?/i,
    /pnpm\s+add\s+([a-zA-Z0-9@\-_./]+)(\s+version\s+([0-9.^~><= ]+))?(\s+(--save-dev|-D))?/i,
    /bun\s+add\s+([a-zA-Z0-9@\-_./]+)(\s+version\s+([0-9.^~><= ]+))?(\s+(--dev|-D))?/i
  ];

  // Verificar instalación con patrones normales
  for (const pattern of installPatterns) {
    const match = normalizedMsg.match(pattern);
    if (match) {
      const manager = detectPackageManager(normalizedMsg);
      return {
        type: 'install',
        packageName: match[2],
        version: match[4],
        isDev: !!match[5],
        manager
      };
    }
  }

  // Verificar instalación con comandos directos
  for (const pattern of directInstallPatterns) {
    const match = normalizedMsg.match(pattern);
    if (match) {
      // Detectar el gestor basado en el comando
      let manager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm';
      if (match[0].startsWith('yarn')) manager = 'yarn';
      if (match[0].startsWith('pnpm')) manager = 'pnpm';
      if (match[0].startsWith('bun')) manager = 'bun';

      return {
        type: 'install',
        packageName: match[2],
        version: match[4],
        isDev: !!match[5],
        manager
      };
    }
  }

  // Patrones para desinstalar
  const uninstallPatterns = [
    // Español
    /desinstalar? (paquete|librería|biblioteca|dependencia|módulo)s?\s+([a-zA-Z0-9@\-_./]+)/i,
    /eliminar (paquete|librería|biblioteca|dependencia|módulo)s?\s+([a-zA-Z0-9@\-_./]+)/i,
    /quitar (paquete|librería|biblioteca|dependencia|módulo)s?\s+([a-zA-Z0-9@\-_./]+)/i,
    /remover (paquete|librería|biblioteca|dependencia|módulo)s?\s+([a-zA-Z0-9@\-_./]+)/i,
    // Inglés
    /uninstall (package|library|dependency|module)s?\s+([a-zA-Z0-9@\-_./]+)/i,
    /remove (package|library|dependency|module)s?\s+([a-zA-Z0-9@\-_./]+)/i
  ];

  // Comandos directos de desinstalación
  const directUninstallPatterns = [
    /npm\s+(uninstall|remove|r|un|rm)\s+([a-zA-Z0-9@\-_./]+)/i,
    /yarn\s+(remove|r)\s+([a-zA-Z0-9@\-_./]+)/i,
    /pnpm\s+(remove|r|uninstall|rm)\s+([a-zA-Z0-9@\-_./]+)/i,
    /bun\s+(remove|r|uninstall|rm)\s+([a-zA-Z0-9@\-_./]+)/i
  ];

  // Verificar desinstalación
  for (const pattern of uninstallPatterns) {
    const match = normalizedMsg.match(pattern);
    if (match) {
      const manager = detectPackageManager(normalizedMsg);
      return {
        type: 'uninstall',
        packageName: match[2],
        manager
      };
    }
  }

  // Verificar desinstalación con comandos directos
  for (const pattern of directUninstallPatterns) {
    const match = normalizedMsg.match(pattern);
    if (match) {
      let manager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm';
      if (match[0].startsWith('yarn')) manager = 'yarn';
      if (match[0].startsWith('pnpm')) manager = 'pnpm';
      if (match[0].startsWith('bun')) manager = 'bun';

      return {
        type: 'uninstall',
        packageName: match[2],
        manager
      };
    }
  }

  // Patrones para ejecutar scripts
  const runScriptPatterns = [
    // Español
    /ejecutar? (script|comando)\s+([a-zA-Z0-9\-_]+)/i,
    /correr (script|comando)\s+([a-zA-Z0-9\-_]+)/i,
    /lanzar (script|comando)\s+([a-zA-Z0-9\-_]+)/i,
    // Inglés
    /run (script|command)\s+([a-zA-Z0-9\-_]+)/i,
    /execute (script|command)\s+([a-zA-Z0-9\-_]+)/i,
    /start (script|command)\s+([a-zA-Z0-9\-_]+)/i
  ];

  // Comandos directos para scripts
  const directRunScriptPatterns = [
    /npm\s+(run|start)\s+([a-zA-Z0-9\-_]+)/i,
    /yarn\s+([a-zA-Z0-9\-_]+)(?!\s+(add|remove|info))/i,
    /pnpm\s+(run|start)\s+([a-zA-Z0-9\-_]+)/i,
    /bun\s+(run|start)\s+([a-zA-Z0-9\-_]+)/i
  ];

  // Verificar ejecución de script
  for (const pattern of runScriptPatterns) {
    const match = normalizedMsg.match(pattern);
    if (match) {
      const manager = detectPackageManager(normalizedMsg);
      return {
        type: 'run-script',
        scriptName: match[2],
        manager
      };
    }
  }

  // Verificar ejecución de script con comandos directos
  for (const pattern of directRunScriptPatterns) {
    const match = normalizedMsg.match(pattern);
    if (match) {
      let manager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm';
      if (match[0].startsWith('yarn')) manager = 'yarn';
      if (match[0].startsWith('pnpm')) manager = 'pnpm';
      if (match[0].startsWith('bun')) manager = 'bun';

      // El índice del grupo varía según el patrón
      const scriptIndex = manager === 'yarn' ? 1 : 2;

      return {
        type: 'run-script',
        scriptName: match[scriptIndex],
        manager
      };
    }
  }

  // Patrones para información de paquetes
  const infoPatterns = [
    // Español
    /información (sobre|de) (paquete|librería|biblioteca|dependencia|módulo)s?\s+([a-zA-Z0-9@\-_./]+)/i,
    /buscar (paquete|librería|biblioteca|dependencia|módulo)s?\s+([a-zA-Z0-9@\-_./]+)/i,
    /detalles (de|sobre) (paquete|librería|biblioteca|dependencia|módulo)s?\s+([a-zA-Z0-9@\-_./]+)/i,
    // Inglés
    /information (about|on) (package|library|dependency|module)s?\s+([a-zA-Z0-9@\-_./]+)/i,
    /search (for)? (package|library|dependency|module)s?\s+([a-zA-Z0-9@\-_./]+)/i,
    /details (of|about|on) (package|library|dependency|module)s?\s+([a-zA-Z0-9@\-_./]+)/i
  ];

  // Comandos directos para info
  const directInfoPatterns = [
    /npm\s+(info|view|show|v)\s+([a-zA-Z0-9@\-_./]+)/i,
    /yarn\s+info\s+([a-zA-Z0-9@\-_./]+)/i,
    /pnpm\s+info\s+([a-zA-Z0-9@\-_./]+)/i,
    /bun\s+pm\s+info\s+([a-zA-Z0-9@\-_./]+)/i
  ];

  // Verificar información de paquete
  for (const pattern of infoPatterns) {
    const match = normalizedMsg.match(pattern);
    if (match) {
      const manager = detectPackageManager(normalizedMsg);
      return {
        type: 'info',
        packageName: match[3] || match[2], // Adaptarse a diferentes patrones
        manager
      };
    }
  }

  // Verificar información con comandos directos
  for (const pattern of directInfoPatterns) {
    const match = normalizedMsg.match(pattern);
    if (match) {
      let manager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm';
      if (match[0].startsWith('yarn')) manager = 'yarn';
      if (match[0].startsWith('pnpm')) manager = 'pnpm';
      if (match[0].startsWith('bun')) manager = 'bun';

      return {
        type: 'info',
        packageName: match[2] || match[1], // Adaptarse a diferentes patrones
        manager
      };
    }
  }

  // Patrones para listar paquetes
  const listPatterns = [
    // Español
    /listar? (paquetes|librerías|bibliotecas|dependencias|módulos)/i,
    /mostrar (paquetes|librerías|bibliotecas|dependencias|módulos)/i,
    /ver (paquetes|librerías|bibliotecas|dependencias|módulos)/i,
    // Inglés
    /list (packages|libraries|dependencies|modules)/i,
    /show (packages|libraries|dependencies|modules)/i,
    /display (packages|libraries|dependencies|modules)/i
  ];

  // Comandos directos para listar
  const directListPatterns = [
    /npm\s+(list|ls|la|ll)\s*$/i,
    /yarn\s+(list)\s*$/i,
    /pnpm\s+(list|ls)\s*$/i,
    /bun\s+pm\s+(ls)\s*$/i
  ];

  // Verificar listado de paquetes
  for (const pattern of listPatterns) {
    if (pattern.test(normalizedMsg)) {
      const manager = detectPackageManager(normalizedMsg);
      return {
        type: 'list',
        manager
      };
    }
  }

  // Verificar listado con comandos directos
  for (const pattern of directListPatterns) {
    if (pattern.test(normalizedMsg)) {
      let manager: 'npm' | 'yarn' | 'pnpm' | 'bun' = 'npm';
      if (normalizedMsg.includes('yarn')) manager = 'yarn';
      if (normalizedMsg.includes('pnpm')) manager = 'pnpm';
      if (normalizedMsg.includes('bun')) manager = 'bun';

      return {
        type: 'list',
        manager
      };
    }
  }

  return null;
}

/**
 * Detecta el gestor de paquetes preferido en el mensaje
 */
function detectPackageManager(message: string): 'npm' | 'yarn' | 'pnpm' | 'bun' {
  const normalizedMsg = message.toLowerCase();

  if (normalizedMsg.includes('yarn')) return 'yarn';
  if (normalizedMsg.includes('pnpm')) return 'pnpm';
  if (normalizedMsg.includes('bun')) return 'bun';

  // Valor por defecto
  return 'npm';
}

/**
 * Crea un archivo y lo registra en el almacenamiento
 */
async function createFile(fileName: string, content: string, projectId: number | null): Promise<void> {
  try {
    // Get file type based on extension
    const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';
    let fileType = 'text';
    
    switch (ext) {
      case 'js': fileType = 'javascript'; break;
      case 'jsx': fileType = 'javascript'; break;
      case 'ts': fileType = 'typescript'; break;
      case 'tsx': fileType = 'typescript'; break;
      case 'html': fileType = 'html'; break;
      case 'css': fileType = 'css'; break;
      case 'json': fileType = 'json'; break;
      case 'md': fileType = 'markdown'; break;
    }

    // Add file to storage
    await storage.addFile({
      name: fileName,
      content,
      type: fileType,
      projectId
    });

    console.log(`Archivo ${fileName} creado y agregado al proyecto ${projectId}`);

    // Trigger file explorer update
    const fileEvent = new CustomEvent('files-updated');
    window.dispatchEvent(fileEvent);
  } catch (error) {
    console.error("Error creating file:", error);
    throw error;
  }
}

/**
 * Procesa los mensajes del asistente, incluyendo comandos de paquetes
 */
export async function processAssistantChat(request: AssistantRequest): Promise<AssistantResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.");
    }

    // Detectar si es un comando para el gestor de paquetes ANTES de llamar a la API
    const packageCommand = detectPackageCommand(request.message);
    if (packageCommand) {
      return await handlePackageCommand(packageCommand);
    }

    // Verificar si es una solicitud de creación de archivo
    if (request.message.toLowerCase().includes("crear archivo")) {
      try {
        const fileName = request.message.match(/crear archivo\s+["']?([^"']+)["']?/i)?.[1];
        if (!fileName) {
          return {
            message: "❌ Por favor especifica un nombre de archivo válido."
          };
        }

        const content = request.message.includes("contenido:") 
          ? request.message.split("contenido:")[1].trim()
          : "";

        await createFile(fileName, content, request.projectId);

        return {
          message: `✅ Archivo **${fileName}** creado correctamente.`,
          fileChanges: [{
            file: fileName,
            content: content
          }]
        };
      } catch (error) {
        return {
          message: `❌ Error al crear el archivo: ${error instanceof Error ? error.message : "Error desconocido"}`
        };
      }
    }

    // Obtener archivos del proyecto si existe un ID de proyecto
    let projectFiles = [];
    if (request.projectId) {
      projectFiles = await storage.getFilesByProjectId(request.projectId);
    }

    // Crear información de contexto sobre los archivos
    const filesContext = projectFiles.length > 0 
      ? `Archivos en el proyecto actual:\n${projectFiles.map(f => `- ${f.name} (${f.type})`).join('\n')}`
      : "No hay archivos en el proyecto actual.";

    // Preparar mensaje del sistema
    const systemMessage = `Eres un asistente de programación experto especializado en desarrollo web y Node.js.

Tu tarea principal es ayudar al usuario a modificar y crear código de forma precisa y eficiente.

Reglas para tus respuestas:
1. Sé conciso y directo en tus explicaciones
2. Cuando modifiques código, muestra SOLO los cambios necesarios
3. Para código nuevo, proporciona código completo y funcional
4. Usa comentarios solo cuando sean necesarios para explicar lógica compleja
5. Mantén consistencia con el estilo de código existente

INFORMACIÓN DEL PROYECTO ACTUAL:
${filesContext}

FORMATO DE RESPUESTA PARA CAMBIOS DE CÓDIGO:
Cuando propongas cambios a archivos, incluye al final de tu mensaje un bloque JSON con esta estructura:
\`\`\`json
{
  "fileChanges": [
    {
      "file": "nombre_del_archivo.ext",
      "content": "contenido completo del archivo con los cambios"
    }
  ]
}
\`\`\`

COMANDOS ESPECIALES:
- Puedes instalar paquetes con "instalar paquete X" o "npm install X"
- Puedes desinstalar paquetes con "desinstalar paquete X" o "npm uninstall X"
- Puedes ejecutar scripts con "ejecutar script X" o "npm run X"
- Puedes obtener información con "información sobre paquete X" o "npm info X"`;

    // Convertir el historial de mensajes al formato esperado por OpenAI
    const formattedHistory = request.history.map(msg => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content
    }));

    // Preparar los mensajes para la API
    const messages = [
      { role: "system" as const, content: systemMessage },
      ...formattedHistory,
      { role: "user" as const, content: request.message }
    ];

    // Usar el modelo especificado o el modelo activo como respaldo
    let modelToUse = request.modelId || getActiveModel();

    try {
      // Llamar a la API de OpenAI
      const response = await openai.chat.completions.create({
        model: modelToUse,
        messages,
        temperature: 0.7,
      });

      return {
        message: response.choices[0].message.content || "Lo siento, no pude procesar tu solicitud.",
        fileChanges: extractFileChanges(response.choices[0].message.content || "")
      };
    } catch (error) {
      console.error(`Error con el modelo ${modelToUse}:`, error);

      // Si hay error con el modelo seleccionado, intentar con gpt-4o como respaldo
      if (modelToUse !== "gpt-4o") {
        try {
          console.log("Intentando con modelo alternativo gpt-4o...");
          const fallbackResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages,
            temperature: 0.7,
          });

          return {
            message: fallbackResponse.choices[0].message.content || "Lo siento, no pude procesar tu solicitud.",
            fileChanges: extractFileChanges(fallbackResponse.choices[0].message.content || "")
          };
        } catch (fallbackError) {
          console.error("Error también con modelo alternativo:", fallbackError);
          throw new Error(`Error al procesar con modelos disponibles: ${error.message}`);
        }
      } else {
        throw error; // Re-lanzar el error original si ya estábamos usando el modelo de respaldo
      }
    }
  } catch (error) {
    console.error("Error en processAssistantChat:", error);
    throw new Error(`Error al procesar el chat: ${error instanceof Error ? error.message : "Error desconocido"}`);
  }
}

/**
 * Maneja los comandos específicos de gestión de paquetes
 */
async function handlePackageCommand(command: PackageAction): Promise<AssistantResponse> {
  try {
    let result;
    switch (command.type) {
      case 'install':
        if (!command.packageName) {
          return {
            message: "No se especificó un nombre de paquete válido para instalar.",
          };
        }

        result = await installPackage({
          packageName: command.packageName,
          version: command.version,
          isDev: command.isDev,
          manager: command.manager
        });

        return {
          message: result.success 
            ? `✅ Paquete **${command.packageName}${command.version ? `@${command.version}` : ''}** instalado correctamente${command.isDev ? ' como dependencia de desarrollo' : ''}.
               \n\n${formatCommandOutput(result.output)}` 
            : `❌ Error al instalar **${command.packageName}**:\n\n\`\`\`\n${result.error || result.message}\n\`\`\``,
        };

      case 'uninstall':
        if (!command.packageName) {
          return {
            message: "No se especificó un nombre de paquete válido para desinstalar.",
          };
        }

        result = await uninstallPackage({
          packageName: command.packageName,
          manager: command.manager
        });

        return {
          message: result.success 
            ? `✅ Paquete **${command.packageName}** desinstalado correctamente.` 
            : `❌ Error al desinstalar **${command.packageName}**:\n\n\`\`\`\n${result.error || result.message}\n\`\`\``,
        };

      case 'run-script':
        if (!command.scriptName) {
          return {
            message: "No se especificó un nombre de script válido para ejecutar.",
          };
        }

        result = await runScript(
          command.scriptName,
          command.manager
        );

        return {
          message: result.success 
            ? `✅ Script **${command.scriptName}** ejecutado correctamente.\n\n\`\`\`\n${result.output || ''}\n\`\`\`` 
            : `❌ Error al ejecutar script **${command.scriptName}**:\n\n\`\`\`\n${result.error || result.message}\n\`\`\``,
        };

      case 'info':
        if (!command.packageName) {
          return {
            message: "No se especificó un nombre de paquete válido para obtener información.",
          };
        }

        result = await getPackageInfo(
          command.packageName,
          command.manager
        );

        return {
          message: result.success 
            ? `📦 Información de **${command.packageName}**:\n\n\`\`\`\n${result.output || ''}\n\`\`\`` 
            : `❌ Error al obtener información de **${command.packageName}**:\n\n\`\`\`\n${result.error || result.message}\n\`\`\``,
        };

      case 'list':
        result = await listPackages(command.manager);

        return {
          message: result.success 
            ? `📋 Lista de paquetes (${command.manager}):\n\n\`\`\`\n${result.output || ''}\n\`\`\`` 
            : `❌ Error al listar paquetes:\n\n\`\`\`\n${result.error || result.message}\n\`\`\``,
        };

      default:
        return {
          message: "Comando de paquete no reconocido.",
        };
    }
  } catch (error) {
    return {
      message: `❌ Error al procesar comando de paquete: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Formatea la salida de comandos para mejor legibilidad
 */
function formatCommandOutput(output?: string): string {
  if (!output) return '';

  // Limitar longitud y añadir formato
  if (output.length > 1000) {
    output = output.substring(0, 1000) + '... [Salida truncada]';
  }

  return '```\n' + output + '\n```';
}

/**
 * Extrae la información de cambios de archivos de la respuesta del asistente
 */
function extractFileChanges(text: string): Array<{file: string, content: string}> | undefined {
  try {
    // Buscar bloques de código JSON explícitos
    const jsonMatch = text.match(/```json\s*({[\s\S]*?})\s*```/);

    // Si hay un bloque JSON explícito, usarlo
    if (jsonMatch) {
      const jsonData = JSON.parse(jsonMatch[1]);
      if (jsonData.fileChanges && Array.isArray(jsonData.fileChanges)) {
        return jsonData.fileChanges;
      }
    }

    // Buscar bloques de código con nombres de archivo
    const fileCodeBlocks = [];
    const codeBlockRegex = /```([a-zA-Z]*)\s*(?:\/\/|#|<!--)?\s*[Ff]ile:\s*([^\n]+)\s*(?:-->)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const language = match[1] || '';
      const fileName = match[2].trim();
      const content = match[3];

      if (fileName && content) {
        fileCodeBlocks.push({ file: fileName, content });
      }
    }

    if (fileCodeBlocks.length > 0) {
      return fileCodeBlocks;
    }

    return undefined;
  } catch (error) {
    console.error("Error extracting file changes:", error);
    return undefined;
  }
}