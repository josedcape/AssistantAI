import OpenAI from "openai";
import { CodeGenerationRequest, CodeGenerationResponse } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const MODEL = "gpt-4o";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ""
});

// Define types for agent communication
export interface AgentFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface AgentMessage {
  role: "system" | "user" | "assistant" | "function";
  content: string | null;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface Agent {
  name: string;
  description: string;
  systemPrompt: string;
  functions: AgentFunction[];
}

// Define available specialized agents
export const availableAgents: Agent[] = [
  {
    name: "frontend_designer",
    description: "Diseña interfaces de usuario con HTML, CSS y JavaScript",
    systemPrompt: "Eres un experto diseñador de interfaces. Tu tarea es crear HTML, CSS y JavaScript para interfaces de usuario atractivas y funcionales. Prioriza diseños responsivos, accesibles y con buenas prácticas de UX/UI.",
    functions: [
      {
        name: "create_html_structure",
        description: "Crea la estructura HTML de una página o componente.",
        parameters: {
          type: "object",
          properties: {
            component_name: {
              type: "string",
              description: "Nombre del componente o página a crear"
            },
            elements: {
              type: "array",
              description: "Elementos principales que debe incluir",
              items: {
                type: "string"
              }
            },
            responsive: {
              type: "boolean",
              description: "Si debe ser optimizado para diferentes dispositivos"
            }
          },
          required: ["component_name"]
        }
      },
      {
        name: "create_css_styles",
        description: "Crea estilos CSS para una interfaz.",
        parameters: {
          type: "object",
          properties: {
            component_name: {
              type: "string", 
              description: "Nombre del componente o página para el que se crean los estilos"
            },
            style_theme: {
              type: "string",
              description: "Tema de estilo (moderno, minimalista, colorido, etc.)"
            },
            color_scheme: {
              type: "string",
              description: "Esquema de colores principales"
            }
          },
          required: ["component_name"]
        }
      }
    ]
  },
  {
    name: "backend_developer",
    description: "Desarrolla lógica de servidor y APIs",
    systemPrompt: "Eres un experto desarrollador backend. Tu tarea es crear servidores, APIs y lógica de negocio robusta. Enfócate en crear código modular, eficiente y que siga buenas prácticas.",
    functions: [
      {
        name: "create_api_endpoint",
        description: "Crea un endpoint de API.",
        parameters: {
          type: "object",
          properties: {
            endpoint_name: {
              type: "string",
              description: "Nombre del endpoint a crear"
            },
            http_method: {
              type: "string",
              description: "Método HTTP (GET, POST, PUT, DELETE, etc.)"
            },
            parameters: {
              type: "array",
              description: "Parámetros que acepta el endpoint",
              items: {
                type: "string"
              }
            },
            response_format: {
              type: "string",
              description: "Formato de respuesta (JSON, XML, etc.)"
            }
          },
          required: ["endpoint_name", "http_method"]
        }
      },
      {
        name: "create_database_model",
        description: "Crea un modelo de base de datos.",
        parameters: {
          type: "object",
          properties: {
            model_name: {
              type: "string",
              description: "Nombre del modelo a crear"
            },
            fields: {
              type: "array",
              description: "Campos del modelo con sus tipos",
              items: {
                type: "string"
              }
            },
            relationships: {
              type: "array",
              description: "Relaciones con otros modelos",
              items: {
                type: "string"
              }
            }
          },
          required: ["model_name", "fields"]
        }
      }
    ]
  },
  {
    name: "data_processor",
    description: "Procesa y transforma datos",
    systemPrompt: "Eres un experto en procesamiento de datos. Tu tarea es crear funciones que procesen, validen, transformen y analicen datos de manera eficiente.",
    functions: [
      {
        name: "create_data_processor",
        description: "Crea un procesador de datos para un tipo específico.",
        parameters: {
          type: "object",
          properties: {
            processor_name: {
              type: "string",
              description: "Nombre del procesador a crear"
            },
            data_type: {
              type: "string",
              description: "Tipo de datos a procesar (JSON, CSV, XML, etc.)"
            },
            operations: {
              type: "array",
              description: "Operaciones a realizar sobre los datos",
              items: {
                type: "string"
              }
            }
          },
          required: ["processor_name", "data_type"]
        }
      },
      {
        name: "create_data_validator",
        description: "Crea un validador de datos.",
        parameters: {
          type: "object",
          properties: {
            validator_name: {
              type: "string",
              description: "Nombre del validador a crear"
            },
            validation_rules: {
              type: "array",
              description: "Reglas de validación",
              items: {
                type: "string"
              }
            },
            error_handling: {
              type: "string",
              description: "Estrategia de manejo de errores"
            }
          },
          required: ["validator_name", "validation_rules"]
        }
      }
    ]
  },
  {
    name: "testing_specialist",
    description: "Crea pruebas unitarias y de integración",
    systemPrompt: "Eres un experto en testing. Tu tarea es crear pruebas efectivas que verifiquen el correcto funcionamiento del código y encuentren posibles errores.",
    functions: [
      {
        name: "create_unit_tests",
        description: "Crea pruebas unitarias para una función o componente.",
        parameters: {
          type: "object",
          properties: {
            test_name: {
              type: "string",
              description: "Nombre del test a crear"
            },
            function_to_test: {
              type: "string",
              description: "Función o componente que se va a testear"
            },
            test_cases: {
              type: "array",
              description: "Casos de prueba a considerar",
              items: {
                type: "string"
              }
            }
          },
          required: ["test_name", "function_to_test"]
        }
      },
      {
        name: "create_integration_tests",
        description: "Crea pruebas de integración.",
        parameters: {
          type: "object",
          properties: {
            test_name: {
              type: "string",
              description: "Nombre del test a crear"
            },
            components: {
              type: "array",
              description: "Componentes que interactúan en la prueba",
              items: {
                type: "string"
              }
            },
            scenarios: {
              type: "array",
              description: "Escenarios a probar",
              items: {
                type: "string"
              }
            }
          },
          required: ["test_name", "components"]
        }
      }
    ]
  },
  {
    name: "project_architect",
    description: "Diseña la arquitectura general del proyecto",
    systemPrompt: "Eres un arquitecto de software experto. Tu tarea es diseñar la arquitectura general de proyectos, definir componentes, sus interacciones y flujos de datos.",
    functions: [
      {
        name: "create_architecture_plan",
        description: "Crea un plan arquitectónico para un proyecto.",
        parameters: {
          type: "object",
          properties: {
            project_name: {
              type: "string",
              description: "Nombre del proyecto"
            },
            components: {
              type: "array",
              description: "Componentes principales del sistema",
              items: {
                type: "string"
              }
            },
            data_flow: {
              type: "array",
              description: "Flujos de datos entre componentes",
              items: {
                type: "string"
              }
            },
            technologies: {
              type: "array",
              description: "Tecnologías recomendadas",
              items: {
                type: "string"
              }
            }
          },
          required: ["project_name"]
        }
      },
      {
        name: "create_component_specification",
        description: "Crea la especificación detallada de un componente.",
        parameters: {
          type: "object",
          properties: {
            component_name: {
              type: "string",
              description: "Nombre del componente a especificar"
            },
            functionality: {
              type: "array",
              description: "Funcionalidades principales",
              items: {
                type: "string"
              }
            },
            interfaces: {
              type: "array",
              description: "Interfaces con otros componentes",
              items: {
                type: "string"
              }
            },
            dependencies: {
              type: "array",
              description: "Dependencias del componente",
              items: {
                type: "string"
              }
            }
          },
          required: ["component_name", "functionality"]
        }
      }
    ]
  }
];

/**
 * Execute an agent to handle a specific task
 */
export async function executeAgent(
  agentName: string, 
  request: CodeGenerationRequest
): Promise<CodeGenerationResponse> {
  try {
    // Validar que existe el agente solicitado
    const agent = availableAgents.find(a => a.name === agentName);
    if (!agent) {
      throw new Error(`El agente "${agentName}" no está disponible`);
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.");
    }
    
    // Forzar el lenguaje JavaScript cuando se usan agentes, a menos que se especifique explícitamente
    if (!request.language) {
      request.language = "javascript";
    }

    // Configurar los mensajes para el agente
    const messages: AgentMessage[] = [
      {
        role: "system",
        content: agent.systemPrompt
      },
      {
        role: "user",
        content: `Tarea: ${request.prompt}\nEstoy trabajando en un proyecto y necesito tu ayuda específica como ${agent.description}.`
      }
    ];

    // Configurar las funciones disponibles para este agente
    const functions = agent.functions.map(fn => ({
      type: "function" as const,
      function: {
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters
      }
    }));

    // Llamar a la API
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: messages as any,
      tools: functions,
      temperature: 0.7,
    });

    // Procesar la respuesta
    const responseMessage = response.choices[0].message;
    const toolCalls = responseMessage.tool_calls || [];

    // Si el agente ha llamado a funciones, procesarlas
    if (toolCalls.length > 0) {
      // Solo tomamos el primer function call por simplicidad
      const functionCall = toolCalls[0];
      const functionName = functionCall.function.name;
      const functionArgs = JSON.parse(functionCall.function.arguments);

      // Generar código basado en la función llamada
      return {
        code: await generateCodeFromFunctionCall(functionName, functionArgs, request.language || "javascript"),
        language: request.language || "javascript",
        suggestions: [],
        agentName: agent.name,
        functionCall: {
          name: functionName,
          arguments: functionArgs
        }
      };
    }

    // Si no hay function calls, devolver la respuesta como código
    return {
      code: responseMessage.content || "// No se pudo generar código",
      language: request.language || "javascript",
      suggestions: [],
      agentName: agent.name
    };
  } catch (error) {
    console.error("Error executing agent:", error);
    throw new Error(`Error al ejecutar el agente: ${error instanceof Error ? error.message : "Error desconocido"}`);
  }
}

/**
 * Generar código basado en la llamada a una función
 */
async function generateCodeFromFunctionCall(
  functionName: string,
  functionArgs: any,
  language: string
): Promise<string> {
  try {
    // Preparar un prompt especializado basado en la función
    let prompt = `Necesito que generes código para implementar la siguiente funcionalidad:
    
Función: ${functionName}
Argumentos: ${JSON.stringify(functionArgs, null, 2)}
Lenguaje: ${language}

El código debe seguir las mejores prácticas, estar bien documentado y ser fácil de entender.`;

    // Llamar a la API para generar el código
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "Eres un experto programador. Tu tarea es generar código de alta calidad basado en requisitos específicos."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.5,
    });

    return response.choices[0].message.content || "// No se pudo generar código";
  } catch (error) {
    console.error("Error generating code from function call:", error);
    return `// Error generating code: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

/**
 * Orquestar múltiples agentes para un proyecto complejo
 */
export async function orchestrateAgents(
  request: CodeGenerationRequest, 
  agentNames: string[]
): Promise<CodeGenerationResponse[]> {
  const results: CodeGenerationResponse[] = [];

  try {
    // Primero, obtenemos el arquitecto para planificar el proyecto
    const architectRequest = {
      ...request,
      prompt: `[ARQUITECTO] Diseña la arquitectura para: ${request.prompt}. Define los componentes principales y cómo interactúan.`
    };

    // Si no se solicita explícitamente el arquitecto, lo agregamos
    if (!agentNames.includes("project_architect")) {
      const architectResult = await executeAgent("project_architect", architectRequest);
      results.push(architectResult);

      // Modificar el prompt original con la arquitectura generada
      request.prompt = `${request.prompt}\n\nArquitectura sugerida:\n${architectResult.code}`;
    }

    // Ejecutar cada agente solicitado
    for (const agentName of agentNames) {
      if (agentName === "project_architect" && results.length > 0) {
        // Ya lo ejecutamos, no repetir
        continue;
      }

      const agentRequest = {
        ...request,
        prompt: `[${agentName.toUpperCase()}] ${request.prompt}`
      };

      const result = await executeAgent(agentName, agentRequest);
      results.push(result);
    }

    return results;
  } catch (error) {
    console.error("Error orchestrating agents:", error);
    throw new Error(`Error al orquestar agentes: ${error instanceof Error ? error.message : "Error desconocido"}`);
  }
}

/**
 * Obtener la lista de agentes disponibles
 */
export function getAvailableAgents() {
  return availableAgents.map(agent => ({
    name: agent.name,
    description: agent.description,
    functions: agent.functions.map(fn => fn.name)
  }));
}