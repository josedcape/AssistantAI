import OpenAI from "openai";
import { CodeGenerationRequest, CodeGenerationResponse } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});

/**
 * Generate code based on a natural language prompt
 */
export async function generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
  const { prompt, language = "javascript" } = request;
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.");
    }
    
    // Create a system message that guides the AI toward generating good code
    const systemMessage = `Eres un experto programador que genera código de alta calidad basado en descripciones en lenguaje natural.
    - Genera solo el código necesario para resolver la solicitud, sin explicaciones adicionales.
    - Usa buenas prácticas y patrones modernos.
    - Comenta el código cuando sea necesario para explicar partes complejas.
    - Si se solicita un lenguaje específico, usa ese lenguaje. De lo contrario, usa el lenguaje más apropiado para la tarea.
    - Responde con JSON en este formato: { "code": "string con el código", "language": "lenguaje usado", "suggestions": ["sugerencia 1", "sugerencia 2"] }`;

    // Prepare the user message with the prompt and language preference
    let userMessage = prompt;
    if (language !== "javascript") {
      userMessage += `\n\nPreferencia de lenguaje: ${language}`;
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No se recibió respuesta del modelo de IA");
    }
    
    const parsedResponse = JSON.parse(content);

    // Ensure the response has the expected structure
    if (!parsedResponse.code || !parsedResponse.language) {
      throw new Error("La respuesta del modelo de IA no tiene el formato esperado");
    }

    return {
      code: parsedResponse.code,
      language: parsedResponse.language,
      suggestions: parsedResponse.suggestions || []
    };
  } catch (error) {
    console.error("Error generating code:", error);
    throw new Error(`Error al generar código: ${error instanceof Error ? error.message : "Error desconocido"}`);
  }
}
