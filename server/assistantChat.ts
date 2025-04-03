import OpenAI from "openai";
import { storage } from "./storage";
import { openai } from "./openai";
import { installPackage, uninstallPackage, runScript, getPackageInfo } from "./packageManager";

import { getActiveModel } from "./openai";

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
  type: 'install' | 'uninstall' | 'run-script' | 'info';
  packageName?: string;
  version?: string; 
  isDev?: boolean;
  scriptName?: string;
  manager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
}

/**
 * Detecta si el mensaje contiene un comando para el gestor de paquetes
 */
function detectPackageCommand(message: string): PackageAction | null {
  // Patrones para comandos de paquetes
  const installPattern = /instalar? (paquete|librería|biblioteca|dependencia|módulo)s?\s+([a-zA-Z0-9@\-_./]+)(\s+versión\s+([0-9.^~><= ]+))?(\s+como dev(eloper)?)?/i;
  const uninstallPattern = /desinstalar? (paquete|librería|biblioteca|dependencia|módulo)s?\s+([a-zA-Z0-9@\-_./]+)/i;
  const runScriptPattern = /ejecutar? (script|comando)\s+([a-zA-Z0-9\-_]+)/i;
  const infoPattern = /información (sobre|de) (paquete|librería|biblioteca|dependencia|módulo)s?\s+([a-zA-Z0-9@\-_./]+)/i;

  // Verificar instalación
  const installMatch = message.match(installPattern);
  if (installMatch) {
    return {
      type: 'install',
      packageName: installMatch[2],
      version: installMatch[4],
      isDev: !!installMatch[5],
      manager: 'npm'
    };
  }

  // Verificar desinstalación
  const uninstallMatch = message.match(uninstallPattern);
  if (uninstallMatch) {
    return {
      type: 'uninstall',
      packageName: uninstallMatch[2],
      manager: 'npm'
    };
  }

  // Verificar ejecución de script
  const runScriptMatch = message.match(runScriptPattern);
  if (runScriptMatch) {
    return {
      type: 'run-script',
      scriptName: runScriptMatch[2],
      manager: 'npm'
    };
  }

  // Verificar información de paquete
  const infoMatch = message.match(infoPattern);
  if (infoMatch) {
    return {
      type: 'info',
      packageName: infoMatch[3],
      manager: 'npm'
    };
  }

  return null;
}

export async function processAssistantChat(request: AssistantRequest): Promise<AssistantResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.");
    }

    // Obtener archivos del proyecto si existe un ID de proyecto
    let projectFiles: File[] = [];
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

Instrucciones para cambios de código:
1. Primero explica brevemente qué cambios harás y por qué
2. Luego muestra el código con los cambios propuestos
3. Si son múltiples archivos, organízalos en orden lógico
4. Utiliza el formato JSON especificado para los cambios

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

IMPORTANTE:
- Sé preciso y útil
- Explica claramente lo que haces
- Cuando propongas cambios, asegúrate de mantener la estructura y estilo del proyecto
- Si no puedes completar una solicitud, explica por qué y sugiere alternativas`;

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

    // Validar que el modelo sea válido, en caso contrario usar el modelo por defecto
    try {
      // Llamar a la API de OpenAI
      const response = await openai.chat.completions.create({
        model: modelToUse,
        messages,
        temperature: 0.7,
      });

      // Detectar si es un comando para el gestor de paquetes
      const packageCommand = detectPackageCommand(request.message);

      if (packageCommand) {
        let result;
        try {
          switch (packageCommand.type) {
            case 'install':
              if (!packageCommand.packageName) {
                return {
                  message: "No se especificó un nombre de paquete válido para instalar.",
                  fileChanges: undefined
                };
              }

              result = await installPackage({
                packageName: packageCommand.packageName,
                version: packageCommand.version,
                isDev: packageCommand.isDev,
                manager: packageCommand.manager
              });

              return {
                message: result.success 
                  ? `✅ Paquete **${packageCommand.packageName}** instalado correctamente.\n\n${result.output || ''}` 
                  : `❌ Error al instalar **${packageCommand.packageName}**:\n\n\`\`\`\n${result.error || result.message}\n\`\`\``,
                fileChanges: undefined
              };

            case 'uninstall':
              if (!packageCommand.packageName) {
                return {
                  message: "No se especificó un nombre de paquete válido para desinstalar.",
                  fileChanges: undefined
                };
              }

              result = await uninstallPackage({
                packageName: packageCommand.packageName,
                manager: packageCommand.manager
              });

              return {
                message: result.success 
                  ? `✅ Paquete **${packageCommand.packageName}** desinstalado correctamente.` 
                  : `❌ Error al desinstalar **${packageCommand.packageName}**:\n\n\`\`\`\n${result.error || result.message}\n\`\`\``,
                fileChanges: undefined
              };

            case 'run-script':
              if (!packageCommand.scriptName) {
                return {
                  message: "No se especificó un nombre de script válido para ejecutar.",
                  fileChanges: undefined
                };
              }

              result = await runScript(
                packageCommand.scriptName,
                packageCommand.manager
              );

              return {
                message: result.success 
                  ? `✅ Script **${packageCommand.scriptName}** ejecutado correctamente.\n\n\`\`\`\n${result.output || ''}\n\`\`\`` 
                  : `❌ Error al ejecutar script **${packageCommand.scriptName}**:\n\n\`\`\`\n${result.error || result.message}\n\`\`\``,
                fileChanges: undefined
              };

            case 'info':
              if (!packageCommand.packageName) {
                return {
                  message: "No se especificó un nombre de paquete válido para obtener información.",
                  fileChanges: undefined
                };
              }

              result = await getPackageInfo(
                packageCommand.packageName,
                packageCommand.manager
              );

              return {
                message: result.success 
                  ? `📦 Información de **${packageCommand.packageName}**:\n\n\`\`\`\n${result.output || ''}\n\`\`\`` 
                  : `❌ Error al obtener información de **${packageCommand.packageName}**:\n\n\`\`\`\n${result.error || result.message}\n\`\`\``,
                fileChanges: undefined
              };
          }
        } catch (error) {
          return {
            message: `❌ Error al procesar comando de paquete: ${error instanceof Error ? error.message : String(error)}`,
            fileChanges: undefined
          };
        }
      }


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
 * Extrae la información de cambios de archivos de la respuesta del asistente
 */
function extractFileChanges(text: string): Array<{file: string, content: string}> | undefined {
  try {
    // Buscar bloques de código y JSON
    const jsonMatch = text.match(/```json\s*({[\s\S]*?})\s*```/);
    const codeBlocks = text.match(/```([a-zA-Z]*)\n([\s\S]*?)```/g);
    
    // Si hay un bloque JSON explícito, usarlo
    if (jsonMatch) {
      const jsonData = JSON.parse(jsonMatch[1]);
      if (jsonData.fileChanges && Array.isArray(jsonData.fileChanges)) {
        return jsonData.fileChanges;
      }
    }
    
    // Si no hay JSON pero hay bloques de código, intentar extraer cambios
    if (codeBlocks && !jsonMatch) {
      const fileChanges: Array<{file: string, content: string}> = [];
      let currentFile = "";
      
      for (const block of codeBlocks) {
        // Buscar nombre de archivo en comentarios o líneas anteriores
        const fileMatch = block.match(/(?:\/\/|#|<!--)\s*File:\s*([^\n]+)/);
        if (fileMatch) {
          currentFile = fileMatch[1].trim();
          const content = block.replace(/```[a-zA-Z]*\n|```$/g, '').trim();
          if (currentFile && content) {
            fileChanges.push({ file: currentFile, content });
          }
        }
      }
      
      if (fileChanges.length > 0) {
        return fileChanges;
      }
    }

    return undefined;
  } catch (error) {
    console.error("Error extracting file changes:", error);
    return undefined;
  }
}