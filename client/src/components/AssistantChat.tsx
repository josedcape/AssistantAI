import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ModelSelector } from "./ModelSelector";
import CodeBlock from "./CodeBlock";
import { sounds } from '@/lib/sounds';
import { Loader2, Mic, MicOff, Send, RefreshCw, Copy, Trash2, Save, Download } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  fileChanges?: {
    file: string;
    content: string;
  }[];
  packageSuggestions?: {
    name: string;
    description: string;
    version?: string;
    isDev?: boolean;
  }[];
}

interface AssistantChatProps {
  projectId: number | null;
  files: any[]; // Tipo completo de archivos
  onApplyChanges?: (fileUpdates: {file: string, content: string}[]) => void;
  showSuccessMessage?: boolean;
}

// Mapa de temas a emoticonos
const emojiMap = {
  // Acciones y estados
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
  loading: "⏳",
  completed: "🎉",
  idea: "💡",
  important: "❗",

  // Desarrollo
  code: "💻",
  bug: "🐛",
  fix: "🔧",
  feature: "✨",
  update: "🔄",
  performance: "⚡",
  security: "🔒",

  // Paquetes y dependencias
  package: "📦",
  install: "🔽",
  dependency: "🔗",
  library: "📚",

  // Proyecto y archivos
  file: "📄",
  folder: "📁",
  project: "🏗️",
  structure: "🏢",
  database: "🗄️",
  api: "🌐",

  // UI/UX
  design: "🎨",
  responsive: "📱",
  accessibility: "♿",
  ux: "👤",

  // Técnicos
  react: "⚛️",
  vue: "🟢",
  angular: "🅰️",
  node: "🟩",
  typescript: "🔷",
  javascript: "🟨",

  // Comunicación y colaboración
  question: "❓",
  answer: "📝",
  suggestion: "🔆",
  tip: "💬",
  resource: "🔍",
  documentation: "📋",

  // Tiempo y progreso
  start: "🚀",
  progress: "⏱️",
  milestone: "🏁",
  schedule: "📅",

  // Herramientas
  tool: "🛠️",
  analyze: "🔬",
  test: "🧪",
  deploy: "🚢",

  // Adicionales
  eye: "👁️",
  mic: "🎤",
  ai: "🧠"
};

const AssistantChat: React.FC<AssistantChatProps> = ({
  projectId,
  files,
  onApplyChanges,
  showSuccessMessage
}) => {
  // Cargar mensajes del localStorage si existen
  const loadSavedMessages = (): Message[] => {
    try {
      const savedMessages = localStorage.getItem('chatMessages');
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages);
        // Convertir las cadenas de fecha a objetos Date
        return parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch (error) {
      console.error("Error al cargar mensajes guardados:", error);
    }

    // Mensaje de bienvenida por defecto
    return [
      {
        id: "welcome",
        role: "system",
        content: "# ¡Bienvenido a tu Asistente de Código! 👋\n\nPuedo ayudarte con las siguientes capacidades:\n\n- 💻 Crear o modificar archivos de código\n- 📦 Instalar paquetes y dependencias\n- 🔍 Analizar la estructura del proyecto\n- 🔗 Integrar nuevos componentes\n- 📚 Explicar conceptos de programación\n\n**¿En qué puedo ayudarte hoy?**",
        timestamp: new Date()
      }
    ];
  };

  const [messages, setMessages] = useState<Message[]>(loadSavedMessages());
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelId, setModelId] = useState<string>("gpt-4o");
  const [projectStructure, setProjectStructure] = useState<any>(null);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [pendingPackages, setPendingPackages] = useState<{
    name: string;
    description: string;
    version?: string;
    isDev?: boolean;
  }[]>([]);
  const [isInstallingPackage, setIsInstallingPackage] = useState(false);
  const [lastContext, setLastContext] = useState<string>("");
  const [isListening, setIsListening] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generar un ID único para cada mensaje
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Inicializar reconocimiento de voz
  useEffect(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      console.warn("El reconocimiento de voz no está soportado en este navegador");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    if (recognitionRef.current) {
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');

        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          // Si queremos seguir escuchando pero se detuvo, reiniciar
          try {
            recognitionRef.current?.start();
          } catch (e) {
            console.error("Error al reiniciar reconocimiento:", e);
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Error de reconocimiento de voz:", event.error);
        setIsListening(false);

        if (event.error !== "no-speech") {
          toast({
            title: "Error de reconocimiento",
            description: `No se pudo activar el micrófono: ${event.error}`,
            variant: "destructive"
          });
        }
      };
    }

    // Cleanup
    return () => {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } catch (e) {
        console.error("Error al detener reconocimiento:", e);
      }
    };
  }, [toast]);

  // Función para alternar el reconocimiento de voz
  const toggleSpeechRecognition = useCallback(() => {
    if (!recognitionRef.current) {
      toast({
        title: "No soportado",
        description: "El reconocimiento de voz no está soportado en este navegador",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
        sounds.play('click', 0.2);
      } else {
        recognitionRef.current.start();
        setIsListening(true);
        toast({
          title: "Micrófono activado",
          description: "Hable ahora. El texto aparecerá en el chat.",
        });
        sounds.play('pop', 0.3);
      }
    } catch (error) {
      console.error("Error al alternar reconocimiento de voz:", error);
      toast({
        title: "Error",
        description: "No se pudo activar el reconocimiento de voz",
        variant: "destructive"
      });
      setIsListening(false);
    }
  }, [isListening, toast]);

  // Función segura para interactuar con la API
  const safeApiRequest = useCallback(async (method: string, url: string, data?: any) => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      return await apiRequest(method, url, data, {
        signal: abortControllerRef.current.signal,
        timeout: 30000 // 30 segundos timeout
      });
    } catch (error) {
      if (error instanceof Error) {
        // Si es un error de abort, es intencional (no alertar)
        if (error.name === 'AbortError') {
          console.log('Petición cancelada');
          throw new Error('Petición cancelada por el usuario');
        }

        // Si es un error de timeout
        if (error.message.includes('timeout')) {
          throw new Error('La petición tomó demasiado tiempo. Verifica tu conexión a internet.');
        }
      }
      throw error;
    }
  }, []);

  // Verificar si hay un archivo para analizar enviado desde el explorador
  useEffect(() => {
    const fileDataStr = sessionStorage.getItem('fileToAssistant');
    if (fileDataStr) {
      try {
        const fileData = JSON.parse(fileDataStr);

        // Agregar el archivo como mensaje del asistente para fácil visualización
        const fileExtension = fileData.fileName.split('.').pop().toLowerCase();
        const language = fileExtension || 'text';

        // Crear un mensaje específico según el tipo de archivo
        const fileMessage = {
          id: generateId(),
          role: "assistant",
          content: `# ${emojiMap.file} Archivo cargado: ${fileData.fileName}\n\n\`\`\`${language}\n${fileData.content}\n\`\`\`\n\n${getFileAnalysisPrompt(fileData.fileName, fileExtension)}`,
          timestamp: new Date()
        };

        // Agregar mensaje al chat
        setMessages(prev => [...prev, fileMessage]);

        // Preparar una sugerencia de análisis en el input
        setInput(`Analiza este archivo y explícame qué hace.`);

        // Limpiar storage para evitar duplicados
        sessionStorage.removeItem('fileToAssistant');

        toast({
          title: "Archivo cargado",
          description: `Se ha cargado el archivo ${fileData.fileName} para análisis`,
        });

        sounds.play('pop', 0.3);
      } catch (error) {
        console.error("Error al cargar archivo desde sessionStorage:", error);
      }
    }
  }, [toast]);

  // Función para generar análisis inicial según tipo de archivo
  const getFileAnalysisPrompt = (fileName: string, extension: string): string => {
    switch(extension) {
      case 'js':
      case 'jsx':
        return "Este archivo contiene código JavaScript. ¿Quieres que analice su funcionalidad, optimice el código o busque problemas?";
      case 'ts':
      case 'tsx':
        return "Este archivo contiene código TypeScript. ¿Quieres que revise los tipos, busque mejoras o analice la estructura?";
      case 'css':
      case 'scss':
        return "Este archivo contiene estilos. ¿Necesitas ayuda para optimizar el CSS, mejorar la responsividad o solucionar problemas visuales?";
      case 'html':
        return "Este archivo contiene HTML. ¿Quieres que analice la estructura, mejore la accesibilidad o integre con JavaScript?";
      case 'json':
        return "Este archivo contiene datos JSON. ¿Necesitas validar su estructura, extraer información o transformar los datos?";
      case 'md':
        return "Este archivo contiene Markdown. ¿Necesitas ayuda para mejorar la documentación o convertirla a otro formato?";
      default:
        return "¿Qué te gustaría hacer con este archivo?";
    }
  };

  // Cargar el modelo activo al inicio
  useEffect(() => {
    const fetchActiveModel = async () => {
      try {
        const response = await safeApiRequest("GET", "/api/models");

        // Verificar tipo de contenido antes de parsear como JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const responseText = await response.text();
          console.warn("Respuesta no es JSON:", responseText.substring(0, 200));

          // Verificar si contiene CODESTORM
          if (responseText.includes('CODESTORM') || responseText.includes('BOTIDINAMIX')) {
            console.error("Error: Respuesta contiene HTML de CODESTORM en lugar de JSON");
            toast({
              title: "Error de conexión",
              description: "El servidor no está respondiendo correctamente. Intenta actualizar la página.",
              variant: "destructive"
            });
          }

          setModelId("gpt-4o");
          return;
        }

        if (response.ok) {
          const data = await safeParseJson(response);
          if (data.activeModel) {
            setModelId(data.activeModel);
            console.log("Modelo activo cargado:", data.activeModel);
          } else {
            // Si no hay modelo activo, usar el modelo por defecto
            setModelId("gpt-4o");
            console.log("Usando modelo por defecto: gpt-4o");
          }
        } else {
          // Si hay error en la petición, usar modelo por defecto
          setModelId("gpt-4o");
          console.log("Error al obtener modelos, usando modelo por defecto: gpt-4o");
        }
      } catch (error) {
        console.error("Error fetching active model:", error);
        // En caso de error, asegurar que haya un modelo por defecto
        setModelId("gpt-4o");
      }
    };

    fetchActiveModel();
  }, [safeApiRequest, toast]);

  // Autoscroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Guardar mensajes en localStorage cuando cambien
  useEffect(() => {
    try {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    } catch (error) {
      console.error("Error al guardar mensajes:", error);
    }
  }, [messages]);

  // Función para limpiar el historial de mensajes
  const handleClearHistory = () => {
    if (confirm("¿Estás seguro de que deseas borrar todo el historial de conversación?")) {
      setMessages([
        {
          id: "welcome",
          role: "system",
          content: "# ¡Historial borrado! 👋\n\n¿En qué puedo ayudarte ahora?",
          timestamp: new Date()
        }
      ]);
      sounds.play('click', 0.3);
      toast({
        title: "Historial borrado",
        description: "Se ha borrado todo el historial de conversación",
      });
    }
  };

  // Notificación cuando se aplican cambios
  useEffect(() => {
    if (showSuccessMessage) {
      toast({
        title: "Cambios aplicados",
        description: "Los cambios sugeridos se han aplicado correctamente",
      });
    }
  }, [showSuccessMessage, toast]);

  // Analizar la estructura del proyecto
  useEffect(() => {
    if (files && files.length > 0) {
      try {
        // Organizar los archivos en una estructura de directorios
        const structure = {
          directories: {},
          rootFiles: []
        };

        files.forEach(file => {
          if (file && file.path) {
            const pathParts = file.path.split('/').filter(Boolean);
            let currentLevel = structure.directories;

            pathParts.forEach((part, index) => {
              if (!currentLevel[part]) {
                currentLevel[part] = {
                  files: [],
                  directories: {}
                };
              }

              if (index === pathParts.length - 1) {
                currentLevel[part].files.push(file);
              } else {
                currentLevel = currentLevel[part].directories;
              }
            });
          } else if (file) {
            structure.rootFiles.push(file);
          }
        });

        setProjectStructure(structure);
      } catch (error) {
        console.error("Error al analizar estructura del proyecto:", error);
      }
    }
  }, [files]);

  // Función para mejorar el contenido con emoticonos basados en el tema
  const enhanceContentWithEmojis = useCallback((content: string) => {
    if (!content) return content;

    // Copia para no modificar el original
    let enhancedContent = content;

    // Lista de patrones para detectar temas
    const patterns = [
      // Encabezados con emoji
      { regex: /^(#+)\s+(.+)$/gm, replacement: (match, hashes, title) => {
        // Determinar qué emoji usar según el contenido del título
        let emoji = "";

        if (/instalación|instalar|install/i.test(title)) emoji = emojiMap.install;
        else if (/error|problema|issue|bug/i.test(title)) emoji = emojiMap.error;
        else if (/solución|solucion|solved|fix/i.test(title)) emoji = emojiMap.fix;
        else if (/éxito|exito|success/i.test(title)) emoji = emojiMap.success;
        else if (/rendimiento|performance/i.test(title)) emoji = emojiMap.performance;
        else if (/estructura|structure/i.test(title)) emoji = emojiMap.structure;
        else if (/código|code/i.test(title)) emoji = emojiMap.code;
        else if (/proyecto|project/i.test(title)) emoji = emojiMap.project;
        else if (/archivo|file/i.test(title)) emoji = emojiMap.file;
        else if (/carpeta|folder|directorio|directory/i.test(title)) emoji = emojiMap.folder;
        else if (/paquete|package|dependencia|dependency/i.test(title)) emoji = emojiMap.package;
        else if (/diseño|design/i.test(title)) emoji = emojiMap.design;
        else if (/test|prueba|testing/i.test(title)) emoji = emojiMap.test;
        else if (/deploy|despliegue|deployment/i.test(title)) emoji = emojiMap.deploy;
        else if (/inicio|start|comenzar|welcome/i.test(title)) emoji = emojiMap.start;
        else if (/documentación|documentation/i.test(title)) emoji = emojiMap.documentation;
        else if (/herramienta|tool/i.test(title)) emoji = emojiMap.tool;
        else if (/análisis|analisis|analyze/i.test(title)) emoji = emojiMap.analyze;
        else if (/importante|important/i.test(title)) emoji = emojiMap.important;
        else if (/sugerencia|suggestion|recomendación/i.test(title)) emoji = emojiMap.suggestion;
        else if (/tip|consejo/i.test(title)) emoji = emojiMap.tip;
        else if (/pregunta|question/i.test(title)) emoji = emojiMap.question;
        else if (/respuesta|answer|response/i.test(title)) emoji = emojiMap.answer;
        else if (/recurso|resource/i.test(title)) emoji = emojiMap.resource;
        // Para encabezados sin tema específico, usar un emoji genérico basado en el nivel
        else {
          const level = hashes.length;
          if (level === 1) emoji = emojiMap.idea;
          else if (level === 2) emoji = emojiMap.info;
          else emoji = "•";
        }

        return `${hashes} ${emoji} ${title}`;
      }},

      // Listas con emojis más específicos
      { regex: /^(\s*[-*+])\s+(.+)$/gm, replacement: (match, bullet, item) => {
        // No agregar emoji si ya tiene uno
        if (/[\u{1F300}-\u{1F6FF}]/u.test(item)) {
          return match;
        }

        let emoji = bullet;

        if (/instalación|instalar|install/i.test(item)) emoji = emojiMap.install;
        else if (/error|problema|issue|bug/i.test(item)) emoji = emojiMap.error;
        else if (/solución|solucion|solved|fix/i.test(item)) emoji = emojiMap.fix;
        else if (/éxito|exito|success/i.test(item)) emoji = emojiMap.success;
        else if (/código|code/i.test(item)) emoji = emojiMap.code;
        else if (/archivo|file/i.test(item)) emoji = emojiMap.file;
        else if (/carpeta|folder|directorio|directory/i.test(item)) emoji = emojiMap.folder;
        else if (/paquete|package|dependencia|dependency/i.test(item)) emoji = emojiMap.package;
        else if (/importante|important/i.test(item)) emoji = "🔑";
        else emoji = bullet; // Mantener el marcador original si no hay coincidencia

        return emoji === bullet ? match : `${bullet} ${emoji} ${item}`;
      }},

      // Secciones clave con emojis (párrafos que comienzan con palabras clave)
      { regex: /^(\s*)(Nota|Note|Importante|Important|Atención|Attention|Tip|Consejo|Advertencia|Warning):\s+(.+)$/gim,
        replacement: (match, space, keyword, content) => {
          let emoji = "";

          if (/nota|note/i.test(keyword)) emoji = emojiMap.info;
          else if (/importante|important/i.test(keyword)) emoji = emojiMap.important;
          else if (/atención|attention/i.test(keyword)) emoji = emojiMap.warning;
          else if (/tip|consejo/i.test(keyword)) emoji = emojiMap.tip;
          else if (/advertencia|warning/i.test(keyword)) emoji = emojiMap.warning;

          return `${space}**${emoji} ${keyword}:** ${content}`;
        }
      },
    ];

    // Aplicar cada patrón de reemplazo
    patterns.forEach(pattern => {
      enhancedContent = enhancedContent.replace(pattern.regex, pattern.replacement);
    });

    return enhancedContent;
  }, []);

  // Función segura para parsear JSON con manejo de errores
  const safeParseJson = async (response: Response) => {
    try {
      const contentType = response.headers.get('content-type');
      const text = await response.text();

      // Verificar si es HTML (respuesta de error o redirección)
      if (text.includes('<!DOCTYPE') || text.includes('<html') ||
          (!contentType || !contentType.includes('application/json'))) {

        // Comprobar si es un error de autenticación
        if (text.includes('login') || text.includes('sign in') ||
            text.includes('iniciar sesión') || response.status === 401) {
          throw new Error("Sesión expirada. Por favor, vuelve a iniciar sesión.");
        }

        // Comprobar si es un error del servidor
        if (response.status >= 500) {
          throw new Error(`Error del servidor (${response.status}). Intenta de nuevo más tarde.`);
        }

        // Intentar parsear JSON de todos modos (a veces el Content-Type es incorrecto)
        try {
          return JSON.parse(text);
        } catch {
          // Extraer mensaje de error del HTML (si existe)
          const errorMatch = text.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
                             text.match(/<title[^>]*>(.*?)<\/title>/i);

          throw new Error(errorMatch ?
            `Error: ${errorMatch[1]}` :
            "El servidor respondió con un formato inesperado. Contacta al soporte técnico.");
        }
      }

      // Intento de parsear como JSON
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error("Error al parsear JSON:", parseError);
        throw new Error(`Respuesta no válida: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
      }
    } catch (error) {
      console.error("Error al analizar respuesta:", error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Verificar si el mensaje contiene comandos de instalación de paquetes (mejorado)
    const packageInstallRegex = /\b(instala|instalar|agregar|añadir|agregar|add|install|npm\s+install|yarn\s+add)\s+([a-zA-Z0-9\-_@/.]+)(\s+--save-dev|\s+--dev|\s+-D)?\b/i;
    const packageMatch = input.match(packageInstallRegex);

    // Verificar comando npm install explícito
    const npmInstallRegex = /\bnpm\s+i(?:nstall)?\s+([a-zA-Z0-9\-_@/.]+)(\s+--save-dev|\s+-D)?\b/i;
    const npmMatch = input.match(npmInstallRegex);

    // Si es un comando directo de instalación de paquete, ejecutar de inmediato
    if (packageMatch || npmMatch) {
      const match = packageMatch || npmMatch;
      const packageName = match[2] || match[1];
      const isDev = !!(match[3]); // --save-dev o --dev o -D

      if (confirm(`¿Quieres instalar el paquete ${packageName}${isDev ? ' como dependencia de desarrollo' : ''}?`)) {
        await installPackageFromCommand(packageName, isDev);
        // Aún así enviar el mensaje para procesar como conversación normal
      }
    }

    let contextMessage = "";

    // Si es un análisis de proyecto o una petición relacionada con la estructura
    if (input.toLowerCase().includes("analiza") ||
        input.toLowerCase().includes("estructura") ||
        input.toLowerCase().includes("proyecto") ||
        input.toLowerCase().includes("arquitectura") ||
        input.toLowerCase().includes("organización")) {
      contextMessage = `${emojiMap.analyze} **Analizando la estructura actual del proyecto...**`;
    }

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setLastContext(contextMessage);
    setRetryCount(0);

    // Si hay un mensaje de contexto, agregarlo como indicador de carga
    if (contextMessage) {
      const loadingMessage = {
        id: generateId(),
        role: "assistant",
        content: contextMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, loadingMessage]);
    }

    await sendMessageWithRetry(input, contextMessage);
  };

  // Función para enviar mensaje con reintentos automáticos
  const sendMessageWithRetry = async (userInput: string, contextMessage: string, attempt = 1) => {
    const maxAttempts = 3;

    try {
      // Preparar el análisis de proyecto para enviar al backend
      const projectAnalysis = projectStructure ? {
        structure: projectStructure,
        fileCount: files.length,
        fileTypes: [...new Set(files.filter(f => f && f.type).map(f => f.type))],
        mainFiles: files.filter(f =>
          f && (
            f.name === "index.html" ||
            f.name === "index.js" ||
            f.name === "package.json" ||
            f.name === "App.jsx" ||
            f.name === "App.tsx" ||
            f.name === "main.js" ||
            f.name === "main.ts"
          )
        ).map(f => ({ name: f.name, type: f.type }))
      } : null;

      // Añadir más información del contexto
      const packageJson = files.find(f => f && f.name === "package.json");
      const packageInfo = packageJson && packageJson.content ?
        (typeof packageJson.content === 'string' ?
          JSON.parse(packageJson.content) : packageJson.content) : null;

      // Si es reintento, mostrar notificación
      if (attempt > 1) {
        toast({
          title: `Reintentando (${attempt}/${maxAttempts})`,
          description: "La conexión anterior falló, reintentando..."
        });

        // Esperar antes de reintentar (500ms, 1500ms)
        await new Promise(r => setTimeout(r, (attempt - 1) * 1000 + 500));
      }

      const response = await safeApiRequest("POST", "/api/assistant-chat", {
        message: userInput,
        projectId,
        modelId: modelId,
        projectAnalysis: projectAnalysis,
        packageInfo: packageInfo,
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      });

      if (!response.ok) {
        let errorMessage = `Error del servidor (${response.status})`;

        try {
          const errorData = await safeParseJson(response);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Ya manejado en safeParseJson
        }

        throw new Error(errorMessage);
      }

      // Parsear respuesta de forma segura
      const result = await safeParseJson(response);

      // Mejorar la respuesta con emoticonos según el contenido
      const enhancedMessage = enhanceContentWithEmojis(result.message);

      // Verificar si hay recomendaciones de paquetes
      let detectedPackages: any[] = [];

      if (userInput.match(/\b(instala|instalar|agregar|añadir|add|install|npm|yarn|pnpm)\b/i) ||
          result.message.includes("npm install") ||
          result.message.includes("yarn add") ||
          result.message.includes("pnpm add") ||
          result.message.includes("```") && result.message.includes("install")) {

        // Extraer nombres de paquetes mediante regex mejorados
        const npmInstallRegex = /\bnpm\s+(?:i|install)\s+([a-zA-Z0-9\-_@/.]+)(\s+--save-dev|\s+-D)?\b/g;
        const yarnAddRegex = /\byarn\s+add\s+([a-zA-Z0-9\-_@/.]+)(\s+--dev|\s+-D)?\b/g;
        const pnpmAddRegex = /\bpnpm\s+add\s+([a-zA-Z0-9\-_@/.]+)(\s+--save-dev|\s+--dev|\s+-D)?\b/g;

        // Buscar también en bloques de código
        const codeBlockRegex = /```(?:bash|sh|shell|zsh|console)?\s*\n([\s\S]*?)\n```/g;
        const installInCodeRegex = /(?:npm\s+(?:i|install)|yarn\s+add|pnpm\s+add)\s+([a-zA-Z0-9\-_@/.]+)(\s+--save-dev|\s+--dev|\s+-D)?/g;

        // Texto genérico sobre instalación de paquetes
        const installTextRegex = /instalar?\s+(?:el\s+)?(?:paquete|módulo|librería|biblioteca|dependencia)\s+['"]?([a-zA-Z0-9\-_@/.]+)['"]?/gi;

        let match;

        // Buscar en el texto general
        while ((match = npmInstallRegex.exec(result.message)) !== null) {
          detectedPackages.push({
            name: match[1],
            isDev: !!match[2],
            description: ""
          });
        }

        while ((match = yarnAddRegex.exec(result.message)) !== null) {
          detectedPackages.push({
            name: match[1],
            isDev: !!match[2],
            description: ""
          });
        }

        while ((match = pnpmAddRegex.exec(result.message)) !== null) {
          detectedPackages.push({
            name: match[1],
            isDev: !!match[2],
            description: ""
          });
        }
        // Buscar comandos de instalación en bloques de código
        let codeBlockMatch;
        while ((codeBlockMatch = codeBlockRegex.exec(result.message)) !== null) {
          const codeContent = codeBlockMatch[1];
          let installMatch;

          while ((installMatch = installInCodeRegex.exec(codeContent)) !== null) {
            detectedPackages.push({
              name: installMatch[1],
              isDev: !!installMatch[2],
              description: ""
            });
          }
(?:([a-z]+))?\s*\n([\s\S]*?)\n```/g;
          const codeBlocks: { language: string, code: string }[] = [];

          let match;
          while ((match = codeBlockRegex.exec(content)) !== null) {
            const language = match[1] || 'txt';
            const code = match[2];
            codeBlocks.push({ language, code });
          }

          if (codeBlocks.length === 0) {
            toast({
              title: "No se encontró código",
              description: "No hay bloques de código para guardar en este mensaje.",
              variant: "destructive"
            });
            return;
          }

          // Si hay más de un bloque de código, preguntar cuál guardar o todos
          let codeToSave: { language: string, code: string, fileName: string }[] = [];

          if (codeBlocks.length === 1) {
            const fileName = prompt("Nombre del archivo a guardar:", getDefaultFileName(codeBlocks[0].language));
            if (!fileName) return;

            codeToSave.push({
              ...codeBlocks[0],
              fileName
            });
          } else {
            // Mostrar diálogo con opciones
            const saveAll = confirm(`Se encontraron ${codeBlocks.length} bloques de código. ¿Quieres guardar todos?\nPresiona OK para guardar todos, o Cancelar para seleccionar uno.`);

            if (saveAll) {
              // Guardar todos
              for (let i = 0; i < codeBlocks.length; i++) {
                const fileName = prompt(`Nombre para el archivo ${i+1} (${codeBlocks[i].language}):`, getDefaultFileName(codeBlocks[i].language, i+1));
                if (fileName) {
                  codeToSave.push({
                    ...codeBlocks[i],
                    fileName
                  });
                }
              }
            } else {
              // Elegir uno
              const blockIndex = parseInt(prompt(`Elige el número del bloque a guardar (1-${codeBlocks.length}):`, "1") || "1");
              if (isNaN(blockIndex) || blockIndex < 1 || blockIndex > codeBlocks.length) {
                toast({
                  title: "Selección inválida",
                  description: "El número seleccionado está fuera de rango.",
                  variant: "destructive"
                });
                return;
              }

              const selectedBlock = codeBlocks[blockIndex - 1];
              const fileName = prompt("Nombre del archivo a guardar:", getDefaultFileName(selectedBlock.language));
              if (!fileName) return;

              codeToSave.push({
                ...selectedBlock,
                fileName
              });
            }
          }

          // Guardar todos los archivos seleccionados
          for (const file of codeToSave) {
            // Verificar si hay un proyecto activo
            if (!projectId) {
              toast({
                title: "Error al guardar",
                description: "No hay un proyecto activo donde guardar el archivo.",
                variant: "destructive"
              });
              continue;
            }

            // Crear el archivo en el proyecto
            const response = await safeApiRequest("POST", `/api/projects/${projectId}/files`, {
              name: file.fileName,
              content: file.code,
              type: getFileType(file.language)
            });

            if (!response.ok) {
              throw new Error(`Error al guardar el archivo: ${response.status} ${response.statusText}`);
            }

            toast({
              title: "Archivo guardado",
              description: `${emojiMap.file} Se ha guardado el archivo ${file.fileName}`,
            });

            sounds.play('save', 0.4);
          }
        } catch (error) {
          console.error("Error al guardar código:", error);
          toast({
            title: "Error al guardar código",
            description: error instanceof Error ? error.message : "Error desconocido",
            variant: "destructive"
          });
          sounds.play('error', 0.4);
        }
      };

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: enhancedMessage,
        timestamp: new Date(),
        fileChanges: result.fileChanges,
        packageSuggestions: detectedPackages
      };

      setMessages(prevMessages => {
        const updatedMessages = [...prevMessages];
        // Reemplazar el mensaje de carga con la respuesta completa si existe
        const loadingIndex = updatedMessages.findIndex(msg => msg.content === lastContext);
        if (loadingIndex !== -1) {
          updatedMessages[loadingIndex] = assistantMessage;
        } else {
          updatedMessages.push(assistantMessage);
        }
        return updatedMessages;
      });

      setIsLoading(false);
      // Ejecutar la función de guardado de código si hay cambios en los archivos
      if (result.fileChanges && result.fileChanges.length > 0) {
        if (onApplyChanges) {
          onApplyChanges(result.fileChanges);
        } else {
          await handleSaveCode(enhancedMessage);
        }
      }
      // Mostrar diálogo para instalar paquetes si hay sugerencias
      if (detectedPackages && detectedPackages.length > 0) {
        setShowPackageDialog(true);
        setPendingPackages(detectedPackages);
      }
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      setIsLoading(false);
      setRetryCount(prevCount => prevCount + 1);

      if (retryCount < maxAttempts) {
        sendMessageWithRetry(userInput, contextMessage, attempt + 1);
      } else {
        toast({
          title: "Error al conectar con el servidor",
          description: error instanceof Error ? error.message : "Error desconocido",
          variant: "destructive"
        });
        sounds.play('error', 0.4);
      }
    }
  };

  // Función para instalar paquete desde comando
  const installPackageFromCommand = async (packageName: string, isDev: boolean) => {
    setIsInstallingPackage(true);

    try {
      const response = await safeApiRequest("POST", "/api/packages/install", {
        packageName,
        isDev
      });

      if (!response.ok) {
        throw new Error(`Error al instalar el paquete: ${response.status} ${response.statusText}`);
      }

      const result = await safeParseJson(response);
      toast({
        title: "Paquete instalado",
        description: `${emojiMap.install} Se ha instalado el paquete ${packageName}`,
      });
      sounds.play('success', 0.4);
    } catch (error) {
      console.error("Error al instalar paquete:", error);
      toast({
        title: "Error al instalar paquete",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
      sounds.play('error', 0.4);
    } finally {
      setIsInstallingPackage(false);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast({
        title: "Mensaje copiado",
        description: "El mensaje se ha copiado al portapapeles",
      });
      sounds.play('copy', 0.3);
    }, (err) => {
      console.error("Failed to copy: ", err);
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar el mensaje al portapapeles",
        variant: "destructive"
      });
      sounds.play('error', 0.3);
    });
  };


  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow overflow-y-auto">
        <div className="flex flex-col space-y-2 p-4">
          {messages.map(message => (
            <div key={message.id} className={`p-4 rounded-lg relative ${message.role === "user" ? "bg-gray-100" : "bg-gray-700 text-white"}`}>
              <div className="absolute top-2 right-2 flex space-x-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopyMessage(message.content)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copiar al portapapeles</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {message.role === "assistant" && message.content.includes("