import OpenAI from "openai";
import { CodeGenerationRequest, CodeGenerationResponse } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});

// Interfaz extendida para incluir el plan de acción
interface CodeGenerationWithPlanResponse extends CodeGenerationResponse {
  plan?: string[];
  architecture?: string;
  components?: string[];
  requirements?: string[];
}

/**
 * Crea un plan de desarrollo basado en una descripción
 */
export async function createDevelopmentPlan(description: string, language: string = "javascript"): Promise<CodeGenerationWithPlanResponse> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.");
    }
    
    // Mensaje para el sistema que guía la creación del plan
    const systemMessage = `Eres un experto arquitecto de software encargado de crear planes de desarrollo detallados.
    - Tu tarea es analizar la solicitud del usuario y crear un plan paso a paso para desarrollar la solución.
    - Incluye arquitectura, componentes principales, y requisitos técnicos.
    - No generes código en esta fase, solo el plan de desarrollo.
    - Utiliza un enfoque estructurado y claro.
    - Responde con JSON en este formato exacto: 
    {
      "language": "lenguaje principal a usar",
      "architecture": "descripción breve de la arquitectura",
      "plan": ["paso 1", "paso 2", "..."],
      "components": ["componente 1", "componente 2", "..."],
      "requirements": ["requisito 1", "requisito 2", "..."],
      "code": ""
    }`;

    // Preparar el mensaje con la solicitud y preferencia de lenguaje
    let userMessage = `Crea un plan de desarrollo detallado para: ${description}`;
    if (language && language !== "javascript") {
      userMessage += `\n\nPreferencia de lenguaje: ${language}`;
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No se recibió respuesta del modelo de IA para el plan");
    }
    
    const parsedResponse = JSON.parse(content);
    
    // Asegurarse de que la respuesta tiene la estructura esperada
    if (!parsedResponse.plan || !parsedResponse.language) {
      throw new Error("La respuesta del plan no tiene el formato esperado");
    }

    return {
      code: parsedResponse.code || "",
      language: parsedResponse.language,
      plan: parsedResponse.plan || [],
      architecture: parsedResponse.architecture || "",
      components: parsedResponse.components || [],
      requirements: parsedResponse.requirements || [],
      suggestions: []
    };
  } catch (error) {
    console.error("Error creating development plan:", error);
    throw new Error(`Error al crear plan de desarrollo: ${error instanceof Error ? error.message : "Error desconocido"}`);
  }
}

/**
 * Generate code based on a natural language prompt
 */
export async function generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
  const { prompt, language = "javascript" } = request;
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.");
    }
    
    // Primero, crear un plan de desarrollo
    const developmentPlan = await createDevelopmentPlan(prompt, language);
    
    // Crear un mensaje del sistema que guía al AI para generar código
    const systemMessage = `Eres un experto programador que genera código de alta calidad basado en descripciones y planes de desarrollo.
    - Genera solo el código necesario para resolver la solicitud, siguiendo el plan proporcionado.
    - Usa buenas prácticas y patrones modernos.
    - Comenta el código cuando sea necesario para explicar partes complejas.
    - Si se solicita un lenguaje específico, usa ese lenguaje. De lo contrario, usa el lenguaje más apropiado para la tarea.
    - Responde con JSON en este formato: 
    { 
      "code": "string con el código", 
      "language": "lenguaje usado", 
      "suggestions": ["sugerencia 1", "sugerencia 2"]
    }`;

    // Preparar el mensaje con la solicitud y el plan de desarrollo
    let userMessage = `
Descripción: ${prompt}
    
Plan de desarrollo:
${developmentPlan.plan?.map((step, index) => `${index + 1}. ${step}`).join('\n') || 'No disponible'}

Arquitectura: ${developmentPlan.architecture || 'No definida'}

Componentes principales:
${developmentPlan.components?.map(comp => `- ${comp}`).join('\n') || 'No definidos'}

Requisitos técnicos:
${developmentPlan.requirements?.map(req => `- ${req}`).join('\n') || 'No definidos'}

Ahora, genera el código basado en este plan de desarrollo.`;

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

    // Combinar la respuesta del código con el plan de desarrollo
    return {
      code: parsedResponse.code,
      language: parsedResponse.language,
      suggestions: parsedResponse.suggestions || [],
      plan: developmentPlan.plan,
      architecture: developmentPlan.architecture,
      components: developmentPlan.components,
      requirements: developmentPlan.requirements
    };
  } catch (error) {
    console.error("Error generating code:", error);
    throw new Error(`Error al generar código: ${error instanceof Error ? error.message : "Error desconocido"}`);
  }
}
