import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ModelSelector } from "./ModelSelector";
import CodeBlock from "./CodeBlock";
import { sounds } from '@/lib/sounds';
import { Loader2, Mic, MicOff, Send, RefreshCw } from "lucide-react";
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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "system",
      content: "# ¡Bienvenido a tu Asistente de Código! 👋\n\nPuedo ayudarte con las siguientes capacidades:\n\n- 💻 Crear o modificar archivos de código\n- 📦 Instalar paquetes y dependencias\n- 🔍 Analizar la estructura del proyecto\n- 🔗 Integrar nuevos componentes\n- 📚 Explicar conceptos de programación\n\n**¿En qué puedo ayudarte hoy?**",
      timestamp: new Date()
    }
  ]);
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
        // Cargar el contenido del archivo como mensaje inicial
        setInput(fileData.message || `Analiza este archivo ${fileData.fileName}:\n\`\`\`\n${fileData.content}\n\`\`\``);
        // Limpiar el storage para no mostrar el mismo archivo si se recarga la página
        sessionStorage.removeItem('fileToAssistant');

        toast({
          title: "Archivo cargado",
          description: `Se ha cargado el archivo ${fileData.fileName} para análisis`,
        });
      } catch (error) {
        console.error("Error al cargar archivo desde sessionStorage:", error);
      }
    }
  }, [toast]);

  // Cargar el modelo activo al inicio
  useEffect(() => {
    const fetchActiveModel = async () => {
      try {
        const response = await safeApiRequest("GET", "/api/models");

        // Verificar tipo de contenido antes de parsear como JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn("Respuesta no es JSON:", await response.text());
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
  }, [safeApiRequest]);

  // Autoscroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const generateId = () => Math.random().toString(36).substring(2, 9);

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

    // Verificar si el mensaje contiene comandos de instalación de paquetes
    const packageInstallRegex = /\b(instala|instalar|agregar|añadir|agregar|add|install|npm\s+install|yarn\s+add)\s+([a-zA-Z0-9\-_@/]+)(\s+--save-dev|\s+--dev|\s+-D)?\b/i;
    const packageMatch = input.match(packageInstallRegex);

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
          result.message.includes("pnpm add")) {

        // Extraer nombres de paquetes mediante regex
        const npmInstallRegex = /\bnpm\s+install\s+([a-zA-Z0-9\-_@/.]+)(\s+--save-dev|\s+-D)?\b/g;
        const yarnAddRegex = /\byarn\s+add\s+([a-zA-Z0-9\-_@/.]+)(\s+--dev|\s+-D)?\b/g;
        const pnpmAddRegex = /\bpnpm\s+add\s+([a-zA-Z0-9\-_@/.]+)(\s+--save-dev|\s+--dev|\s+-D)?\b/g;

        let match;
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

        // Si hay sugerencias explícitas de paquetes en la respuesta
        if (result.packageSuggestions && result.packageSuggestions.length > 0) {
          detectedPackages = [...detectedPackages, ...result.packageSuggestions];
        }

        // Eliminar duplicados
        const uniquePackages = Array.from(
          new Set(detectedPackages.map(p => p.name))
        ).map(name => 
          detectedPackages.find(p => p.name === name)
        );

        // Si hay paquetes para instalar, mostrar diálogo de confirmación
        if (uniquePackages.length > 0) {
          setPendingPackages(uniquePackages);

          // Obtener descripciones para los paquetes detectados
          try {
            const packagesInfo = await safeApiRequest("POST", "/api/package-info", {
              packages: uniquePackages.map(p => p.name)
            });

            // Verificar respuesta antes de parsear
            if (packagesInfo.ok) {
              const packagesData = await safeParseJson(packagesInfo);

              if (packagesData.packages) {
                const enhancedPackages = uniquePackages.map(pkg => ({
                  ...pkg,
                  description: packagesData.packages[pkg.name]?.description || "No hay descripción disponible",
                  version: packagesData.packages[pkg.name]?.version || "latest"
                }));

                setPendingPackages(enhancedPackages);
              }
            }
          } catch (error) {
            console.error("Error al obtener información de paquetes:", error);
            // No interrumpir el flujo principal si falla la info de paquetes
          }

          setShowPackageDialog(true);
        }
      }

      // Si hay un mensaje de contexto, reemplazarlo con la respuesta real
      if (contextMessage) {
        setMessages(prev => {
          const newMessages = [...prev];
          const loadingIndex = newMessages.findIndex(msg => msg.content === contextMessage);
          if (loadingIndex !== -1) {
            newMessages[loadingIndex] = {
              ...newMessages[loadingIndex],
              content: enhancedMessage,
              fileChanges: result.fileChanges || [],
              packageSuggestions: detectedPackages.length > 0 ? detectedPackages : undefined
            };
          }
          return newMessages;
        });
      } else {
        // Respuesta normal
        setMessages(prev => [...prev, {
          id: generateId(),
          role: "assistant",
          content: enhancedMessage,
          timestamp: new Date(),
          fileChanges: result.fileChanges || [],
          packageSuggestions: detectedPackages.length > 0 ? detectedPackages : undefined
        }]);
      }

      // Manejo de cambios de archivo (solo mostrar confirmación si no hay pendiente diálogo de paquetes)
      if (result.fileChanges && result.fileChanges.length > 0 && onApplyChanges && !detectedPackages.length) {
        setTimeout(() => {
          if (confirm(`${emojiMap.file} ¿Deseas aplicar los cambios propuestos a los archivos?`)) {
            onApplyChanges(result.fileChanges);
            toast({
              title: "Cambios aplicados",
              description: `${emojiMap.success} Se aplicaron cambios a ${result.fileChanges.length} archivo(s)`,
            });
          }
        }, 500);
      }
    } catch (error) {
      console.error(`Error al comunicarse con el asistente (intento ${attempt}/${maxAttempts}):`, error);

      // Reintentar si no hemos alcanzado el límite de intentos
      if (attempt < maxAttempts) {
        setRetryCount(attempt);
        return sendMessageWithRetry(userInput, contextMessage, attempt + 1);
      }

      // Mostrar error si ya no se puede reintentar
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo procesar tu solicitud",
        variant: "destructive"
      });

      // Eliminar mensaje de carga y mostrar error
      if (contextMessage) {
        setMessages(prev => [...prev.filter(m => m.content !== contextMessage), {
          id: generateId(),
          role: "assistant",
          content: `${emojiMap.error} **Lo siento, ocurrió un error al procesar tu solicitud:**\n\n${error instanceof Error ? error.message : "Error desconocido"}.\n\nPor favor, inténtalo de nuevo.`,
          timestamp: new Date()
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: generateId(),
          role: "assistant",
          content: `${emojiMap.error} **Lo siento, ocurrió un error al procesar tu solicitud:**\n\n${error instanceof Error ? error.message : "Error desconocido"}.\n\nPor favor, inténtalo de nuevo.`,
          timestamp: new Date()
        }]);
      }
    } finally {
      setIsLoading(false);
      setRetryCount(0);
    }
  };

  // Función para instalar paquetes
  const handleInstallPackages = async () => {
    if (pendingPackages.length === 0 || isInstallingPackage) return;

    setIsInstallingPackage(true);

    try {
      toast({
        title: "Instalando paquetes",
        description: `${emojiMap.install} Por favor espera...`,
      });

      // Intentar hasta 3 veces con espera entre intentos
      let retryCount = 0;
      const maxRetries = 2;
      let success = false;
      let lastError;

      while (retryCount <= maxRetries && !success) {
        try {
          if (retryCount > 0) {
            toast({
              title: "Reintentando",
              description: `${emojiMap.loading} Intento ${retryCount + 1} de ${maxRetries + 1}...`
            });
            // Esperar antes de reintentar (1s, 3s)
            await new Promise(r => setTimeout(r, retryCount * 2000 + 1000));
          }

          const response = await safeApiRequest("POST", "/api/install-packages", {
            projectId,
            packages: pendingPackages.map(pkg => ({
              name: pkg.name,
              isDev: pkg.isDev || false,
              version: pkg.version || "latest"
            }))
          });

          // Manejar la respuesta con cuidado
          if (!response.ok) {
            throw new Error(`Error en la respuesta: ${response.status} ${response.statusText}`);
          }

          const result = await safeParseJson(response);

          if (result.success) {
            success = true;
            toast({
              title: "Paquetes instalados",
              description: `${emojiMap.success} Los paquetes se instalaron correctamente.`,
            });
          } else {
            lastError = result.error || "Error desconocido al instalar paquetes";
            throw new Error(lastError);
          }
        } catch (error) {
          retryCount++;
          lastError = error instanceof Error ? error.message : "Error desconocido";
          console.error(`Error al instalar paquetes (intento ${retryCount}/${maxRetries + 1}):`, error);
        }
      }

      if (!success) {
        throw new Error(`Falló la instalación de paquetes después de ${maxRetries + 1} intentos: ${lastError}`);
      }
    } catch (error) {
      console.error("Error al instalar paquetes:", error);
      toast({
        title: "Error al instalar paquetes",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsInstallingPackage(false);
    }
  };

  const handleClosePackageDialog = () => {
    setShowPackageDialog(false);
    setPendingPackages([]);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow overflow-y-auto">
        <div className="flex flex-col space-y-2 p-4">
          {messages.map(message => (
            <div key={message.id} className={`p-4 rounded-lg ${message.role === "user" ? "bg-gray-100" : "bg-gray-50"}`}>
              <p className="text-sm text-gray-600">{new Intl.DateTimeFormat('es-ES', {
                year: 'numeric', month: 'numeric', day: 'numeric',
                hour: 'numeric', minute: 'numeric', second: 'numeric'
              }).format(message.timestamp)}</p>
              <ReactMarkdown remarkPlugins={[remarkGfm]} children={message.content} />
              {message.fileChanges && message.fileChanges.length > 0 && (
                <div className="mt-2">
                  <Alert variant="primary">
                    <AlertTitle>Cambios en los archivos</AlertTitle>
                    <AlertDescription>
                      Se detectaron cambios en {message.fileChanges.length} archivo(s).
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-gray-200 flex items-center space-x-4">
        <Button onClick={toggleSpeechRecognition} variant={isListening ? "destructive" : "default"} size="icon">
          {isListening ? <MicOff /> : <Mic />}
        </Button>
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Escribe tu mensaje..."
          className="flex-grow"
        />
        <Button onClick={handleSendMessage} disabled={isLoading} >
          {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Send />}
        </Button>
        <ModelSelector selectedModel={modelId} onChange={setModelId} />
      </div>

      {/* Diálogo para confirmar la instalación de paquetes */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogHeader>
          <DialogTitle>Instalar paquetes</DialogTitle>
          <DialogDescription>
            Se han detectado los siguientes paquetes para instalar:
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <ul className="space-y-2">
            {pendingPackages.map(pkg => (
              <li key={pkg.name} className="flex items-center space-x-2">
                <Badge variant="secondary">{pkg.name}</Badge>
                <span>{pkg.description}</span>
                {pkg.version && <span className="text-xs text-gray-500">({pkg.version})</span>}
              </li>
            ))}
          </ul>
        </DialogContent>
        <DialogFooter>
          <Button variant="default" onClick={handleClosePackageDialog}>
            Cancelar
          </Button>
          <Button onClick={handleInstallPackages} disabled={isInstallingPackage}>
            {isInstallingPackage ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              "Instalar"
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
};

export default AssistantChat;