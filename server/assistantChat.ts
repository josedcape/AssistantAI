
import OpenAI from "openai";
import { storage } from "./storage";
import { File } from "@shared/schema";

const MODEL = "gpt-4o";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});

interface AssistantRequest {
  message: string;
  projectId: number | null;
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
 * Procesa mensajes del asistente de código y devuelve una respuesta
 * con posibles cambios a archivos
 */
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
    const systemMessage = `Eres un asistente de programación experto que ayuda a modificar y crear código.
    
Tu tarea principal es ayudar al usuario a realizar cambios en su código cuando te lo solicite.

Cuando el usuario quiera modificar un archivo existente o crear uno nuevo, deberás responder con:
1. Una explicación clara de lo que harás
2. El código completo del archivo (cuando sea necesario)
3. Marcar los cambios que propones utilizando un formato JSON específico

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

    // Llamar a la API de OpenAI
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.7,
    });

    const assistantResponse = response.choices[0].message.content || "Lo siento, no pude procesar tu solicitud.";
    
    // Intentar extraer cambios de archivos si existen
    const fileChanges = extractFileChanges(assistantResponse);
    
    return {
      message: assistantResponse,
      fileChanges: fileChanges
    };
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
    // Buscar bloque JSON con los cambios propuestos
    const jsonMatch = text.match(/```json\s*({[\s\S]*?})\s*```/);
    if (!jsonMatch) return undefined;
    
    const jsonData = JSON.parse(jsonMatch[1]);
    
    if (jsonData.fileChanges && Array.isArray(jsonData.fileChanges)) {
      return jsonData.fileChanges;
    }
    
    return undefined;
  } catch (error) {
    console.error("Error extracting file changes:", error);
    return undefined;
  }
}
