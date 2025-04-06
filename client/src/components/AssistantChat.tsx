import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Loader2, Mic, MicOff, Send, Save, Copy, Check, 
  MessageSquare, PanelLeft, Save as SaveIcon, FileText, List
} from "lucide-react";
import ModelSelector from "./ModelSelector";
import * as sounds from "@/lib/sounds"; //Import sounds module
import { ConversationList } from "./ConversationList";
import { 
  saveConversation, 
  getConversation, 
  setActiveConversation,
  getActiveConversation,
  generateConversationId,
  generateConversationTitle,
  Conversation,
  Message as ConversationMessage
} from "@/lib/conversationStorage";


// Tipos para mensajes y paquetes
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Package {
  name: string;
  isDev: boolean;
  description: string;
}

// Componente principal AssistantChat
export const AssistantChat: React.FC = () => {
  // Estado para mensajes y entrada
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "Soy un asistente de IA diseñado para ayudarte con tu proyecto."
    },
    {
      role: "assistant",
      content: "¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy con tu proyecto?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelId, setModelId] = useState("gpt-3.5-turbo");
  const [isListening, setIsListening] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pendingPackages, setPendingPackages] = useState<Package[]>([]);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [isInstallingPackage, setIsInstallingPackage] = useState(false);
  
  // Estado para conversaciones
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showConversations, setShowConversations] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState<'unsaved' | 'saving' | 'saved'>('unsaved');

  // Referencias para el reconocimiento de voz
  const recognitionRef = useRef<any>(null);
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

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
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

      recognitionRef.current.onerror = (event: any) => {
        console.error("Error de reconocimiento de voz:", event.error);
        setIsListening(false);

        if (event.error !== "no-speech") {
          // Mostrar error con toast cuando sea implementado
          console.error(`No se pudo activar el micrófono: ${event.error}`);
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
  }, []);

  // Cargar conversación activa al iniciar
  useEffect(() => {
    const activeConversationId = getActiveConversation();
    if (activeConversationId) {
      const conversation = getConversation(activeConversationId);
      if (conversation) {
        setMessages(conversation.messages as Message[]);
        setModelId(conversation.modelId);
        setCurrentConversationId(activeConversationId);
        setSavedStatus('saved');
      } else {
        startNewConversation();
      }
    } else {
      startNewConversation();
    }
  }, []);

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    // Marca la conversación como no guardada cuando cambian los mensajes
    // excepto durante la carga inicial
    if (currentConversationId && messages.length > 2) {
      setSavedStatus('unsaved');
    }
  }, [messages]);
  
  // Guardar cambios automáticamente cuando hay cambios
  useEffect(() => {
    if (savedStatus === 'unsaved' && currentConversationId) {
      const saveTimer = setTimeout(() => {
        saveCurrentConversation();
      }, 2000); // Guardar después de 2 segundos de inactividad
      
      return () => clearTimeout(saveTimer);
    }
  }, [messages, savedStatus, currentConversationId]);
  
  // Iniciar una nueva conversación
  const startNewConversation = () => {
    const initialMessages = [
      {
        role: "system",
        content: "Soy un asistente de IA diseñado para ayudarte con tu proyecto."
      },
      {
        role: "assistant",
        content: "¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy con tu proyecto?"
      }
    ];
    
    setMessages(initialMessages);
    setCurrentConversationId(null);
    setActiveConversation(null);
    setSavedStatus('unsaved');
    sounds.play("click");
  };
  
  // Guardar la conversación actual
  const saveCurrentConversation = () => {
    if (messages.length <= 2) {
      // No guardar si solo tiene los mensajes iniciales
      return;
    }
    
    setIsSaving(true);
    setSavedStatus('saving');
    
    try {
      // Si no hay ID de conversación, crear uno nuevo
      const conversationId = currentConversationId || generateConversationId();
      const title = generateConversationTitle(messages);
      const now = new Date();
      
      const conversation: Conversation = {
        id: conversationId,
        title,
        messages: messages as ConversationMessage[],
        modelId,
        createdAt: currentConversationId 
          ? (getConversation(conversationId)?.createdAt || now) 
          : now,
        updatedAt: now
      };
      
      saveConversation(conversation);
      setActiveConversation(conversationId);
      setCurrentConversationId(conversationId);
      setSavedStatus('saved');
      sounds.play("save");
    } catch (error) {
      console.error("Error guardando conversación:", error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Cargar una conversación guardada
  const loadConversation = (conversation: Conversation) => {
    setMessages(conversation.messages as Message[]);
    setModelId(conversation.modelId);
    setCurrentConversationId(conversation.id);
    setActiveConversation(conversation.id);
    setShowConversations(false);
    setSavedStatus('saved');
    sounds.play("notification");
  };

  // Función para enviar mensajes
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);
    sounds.play("send");

    try {
      const response = await fetch("/api/assistant-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          modelId: modelId,
          history: messages,
          projectId: null
        }),
      });

      if (!response.ok) {
        throw new Error(`Error al comunicarse con el asistente: ${response.status} ${response.statusText}`);
      }

      // Verificar el tipo de contenido antes de intentar parsear como JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Respuesta no JSON:", text);
        throw new Error("La respuesta del servidor no es JSON válido");
      }

      const data = await response.json();
      const assistantMessage = data.message;

      if (!assistantMessage) {
        throw new Error("El formato de respuesta es incorrecto");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assistantMessage }]);
      if (sounds && sounds.play) {
        sounds.play("notification");
      }
      
      // Marcar como no guardado para activar el guardado automático
      setSavedStatus('unsaved');

      // Detectar y sugerir paquetes
      const packages = detectPackages(assistantMessage);
      if (packages.length > 0) {
        setPendingPackages(packages);
        setShowPackageDialog(true);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `## ⚠️ Error en la solicitud

🚨 Lo siento, ha ocurrido un error al procesar tu solicitud:
\`\`\`
${error instanceof Error ? error.message : "Error desconocido"}
\`\`\`

### 🔍 Posibles soluciones:
* 🔄 Verifica que el servidor de la API esté funcionando correctamente
* 📡 Comprueba tu conexión a internet
* 🔧 Reinicia la aplicación si el problema persiste`
        },
      ]);
      sounds.play("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Función para alternar el reconocimiento de voz
  const toggleSpeechRecognition = useCallback(() => {
    if (!recognitionRef.current) {
      console.error("No soportado: El reconocimiento de voz no está soportado en este navegador");
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
        console.log("Micrófono activado. Hable ahora. El texto aparecerá en el chat.");
        sounds.play('pop', 0.3);
      }
    } catch (error) {
      console.error("Error al alternar reconocimiento de voz:", error);
      setIsListening(false);
    }
  }, [isListening]);

  // Detectar paquetes mencionados en el mensaje
  const detectPackages = (content: string) => {
    // Expresión regular para detectar comandos de instalación
    const installCommandRegex = /```(?:bash|shell|sh)?\s*((?:npm|yarn|pnpm)(?:\s+add|\s+install)\s+[^`]+)```/g;
    let match;
    const suggestedPackages: { name: string; isDev: boolean; description: string }[] = [];

    while ((match = installCommandRegex.exec(content)) !== null) {
      const installCommand = match[1].trim();

      // Extraer paquetes del comando
      if (installCommand.includes('npm install') || installCommand.includes('npm add')) {
        const parts = installCommand.split(/\s+/);
        const devFlag = parts.includes('--save-dev') || parts.includes('-D');

        // Obtener nombres de paquetes
        for (let i = 2; i < parts.length; i++) {
          const part = parts[i];
          if (!part.startsWith('-') && part !== 'install' && part !== 'add' && part !== '--save-dev' && part !== '-D') {
            suggestedPackages.push({
              name: part,
              isDev: devFlag,
              description: 'Sugerido por asistente'
            });
          }
        }
      }
    }

    // Buscar paquetes mencionados con formato específico
    const packageSuggestionRegex = /debes?\s+instalar\s+(?:el\s+paquete\s+|la\s+biblioteca\s+)?[`"']([^`"']+)[`"']/gi;
    const codeBlockRegex = /```[^\n]*\n([\s\S]*?)```/g;

    let packageMatch;
    while ((packageMatch = packageSuggestionRegex.exec(content)) !== null) {
      suggestedPackages.push({
        name: packageMatch[1].trim(),
        isDev: false,
        description: 'Mencionado en la respuesta'
      });
    }
    return suggestedPackages;
  };

  // Guardar código de un mensaje y crear archivo automáticamente
  const handleSaveCode = async (content: string) => {
    const codeBlockRegex = /```(?:(\w+))?\s*\n([\s\S]*?)\n```/g;
    let match;
    let savedCount = 0;
    let firstSavedFilePath = "";
    
    // Extraer todos los bloques de código
    const codeBlocks: { language: string, code: string }[] = [];
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || "js";
      const codeContent = match[2];
      codeBlocks.push({ language, code: codeContent });
    }
    
    if (codeBlocks.length === 0) {
      console.warn("No se encontraron bloques de código para guardar");
      return;
    }

    // Preparar para guardar archivos
    try {
      for (const [index, codeBlock] of codeBlocks.entries()) {
        // Determinar la extensión del archivo basada en el lenguaje
        let fileExtension = ".js"; // Predeterminado a JavaScript
        
        switch (codeBlock.language.toLowerCase()) {
          case "javascript":
          case "js":
            fileExtension = ".js";
            break;
          case "typescript":
          case "ts":
            fileExtension = ".ts";
            break;
          case "html":
            fileExtension = ".html";
            break;
          case "css":
            fileExtension = ".css";
            break;
          case "json":
            fileExtension = ".json";
            break;
          case "jsx":
            fileExtension = ".jsx";
            break;
          case "tsx":
            fileExtension = ".tsx";
            break;
          case "python":
          case "py":
            fileExtension = ".py";
            break;
          // Añadir más lenguajes según sea necesario
        }
        
        // Generar nombre de archivo único basado en el contenido o tipo de código
        let fileName = `generated_code_${index + 1}${fileExtension}`;
        
        // Intentar detectar un mejor nombre basado en patrones en el código
        // Por ejemplo, para un componente React, usar el nombre del componente
        if (codeBlock.code.includes("export default") && codeBlock.code.includes("function")) {
          const componentMatch = codeBlock.code.match(/export\s+default\s+function\s+(\w+)/);
          if (componentMatch && componentMatch[1]) {
            fileName = `${componentMatch[1]}${fileExtension}`;
          }
        } else if (codeBlock.code.includes("class") && codeBlock.code.includes("extends")) {
          const classMatch = codeBlock.code.match(/class\s+(\w+)\s+extends/);
          if (classMatch && classMatch[1]) {
            fileName = `${classMatch[1]}${fileExtension}`;
          }
        }
        
        // Enviar solicitud para crear el archivo
        const response = await fetch("/api/files/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName,
            content: codeBlock.code,
            path: "", // Guardar en la ruta actual
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Error al guardar el archivo ${fileName}`);
        }
        
        savedCount++;
        if (savedCount === 1) {
          firstSavedFilePath = fileName;
        }
      }
      
      sounds.play("save");
      
      // Mensaje de éxito con información sobre los archivos guardados
      let successMessage = "";
      if (savedCount === 1) {
        successMessage = `## ✅ Código guardado exitosamente

📝 Se ha creado el archivo **${firstSavedFilePath}** con el código proporcionado.

🔄 El explorador de archivos se actualizará automáticamente para mostrar el nuevo archivo.`;
      } else {
        successMessage = `## ✅ Código guardado exitosamente

📝 Se han creado **${savedCount} archivos** con el código proporcionado.

🔄 El explorador de archivos se actualizará automáticamente para mostrar los nuevos archivos.`;
      }
      
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: successMessage
        },
      ]);
      
      // Disparar evento para actualizar el explorador de archivos
      const fileEvent = new CustomEvent('files-updated');
      window.dispatchEvent(fileEvent);
      
      // Buscar y actualizar el explorador de archivos si existe
      setTimeout(() => {
        const fileExplorer = document.querySelector('[data-component="file-explorer"]');
        if (fileExplorer) {
          const refreshButton = fileExplorer.querySelector('button[aria-label="Refrescar"]');
          if (refreshButton) {
            (refreshButton as HTMLButtonElement).click();
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error("Error al guardar archivos:", error);
      sounds.play("error");
      
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `## ⚠️ Error al guardar el código

❌ No se pudieron guardar los archivos debido a un error:
\`\`\`
${error instanceof Error ? error.message : "Error desconocido"}
\`\`\`

*Por favor, intenta nuevamente o crea los archivos manualmente.*`
        },
      ]);
    }
  };

  // Función para copiar código al portapapeles
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setHasCopied(true);
    setTimeout(() => {
      setHasCopied(false);
      setCopiedIndex(null);
    }, 2000);
  };

  // Función para extraer código de un mensaje
  const extractCodeFromMessage = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    let match;
    const codes: { language: string; code: string }[] = [];

    while ((match = codeBlockRegex.exec(content)) !== null) {
      codes.push({
        language: match[1] || "plaintext",
        code: match[2],
      });
    }

    return codes;
  };

  // Función para resaltar emojis en el contenido y agregar automáticamente emojis a puntos importantes
  const enhanceContentWithEmojis = (content: string) => {
    // Reemplazar etiquetas de emoji existentes
    let enhancedContent = content.replace(/:([\w_]+):/g, (match, emojiName) => {
      const emojiMap: Record<string, string> = {
        smile: "😊",
        grinning: "😀",
        thumbsup: "👍",
        rocket: "🚀",
        fire: "🔥",
        warning: "⚠️",
        bulb: "💡",
        memo: "📝",
        computer: "💻",
        white_check_mark: "✅",
        x: "❌",
        question: "❓",
        gear: "⚙️",
        star: "⭐",
        sparkles: "✨",
        zap: "⚡",
        tada: "🎉",
        trophy: "🏆",
        heart: "❤️",
        bell: "🔔",
        books: "📚",
        wrench: "🔧",
        mag: "🔍",
        lock: "🔒",
        key: "🔑",
        chart: "📊",
        calendar: "📅",
        clipboard: "📋",
        package: "📦",
        speaker: "🔊",
        idea: "💡",
        important: "❗",
        info: "ℹ️",
        tip: "💁",
        success: "✅",
        error: "❌",
        alert: "🚨",
        // Emojis adicionales
        bookmark: "🔖",
        target: "🎯",
        link: "🔗",
        tool: "🛠️",
        folder: "📁",
        document: "📄",
        code: "👨‍💻",
        database: "🗃️",
        cloud: "☁️",
        time: "⏱️",
        bug: "🐛",
        fix: "🔧"
      };
      return emojiMap[emojiName] || match;
    });
    
    // Añadir emojis en los puntos importantes (títulos, listas, etc.)
    enhancedContent = enhancedContent
      // Títulos con emojis
      .replace(/^(#{1,3})\s+(.+)$/gm, (_, hashes, title) => {
        if (title.includes("importante") || title.includes("atención")) 
          return `${hashes} 🚨 ${title}`;
        if (title.includes("nota") || title.includes("recuerda"))
          return `${hashes} 📝 ${title}`;
        if (title.includes("tip") || title.includes("consejo"))
          return `${hashes} 💡 ${title}`;
        if (title.includes("error") || title.includes("problema"))
          return `${hashes} ⚠️ ${title}`;
        if (title.includes("solución") || title.includes("arreglo"))
          return `${hashes} ✅ ${title}`;
        if (title.includes("pasos") || title.includes("procedimiento"))
          return `${hashes} 📋 ${title}`;
        if (title.includes("paquete") || title.includes("librería"))
          return `${hashes} 📦 ${title}`;
        return `${hashes} ✨ ${title}`;
      })
      // Elementos de lista con emojis
      .replace(/^(\s*[-*+])\s+(.+)$/gm, (_, bullet, item) => {
        if (item.includes("importante") || item.includes("clave"))
          return `${bullet} 🔑 ${item}`;
        if (item.includes("ejemplo") || item.includes("muestra"))
          return `${bullet} 🔍 ${item}`;
        if (item.includes("error") || item.includes("problema"))
          return `${bullet} ⚠️ ${item}`;
        if (item.includes("correcto") || item.includes("éxito"))
          return `${bullet} ✅ ${item}`;
        return `${bullet} • ${item}`;
      })
      // Líneas numeradas con emojis
      .replace(/^(\s*\d+\.)\s+(.+)$/gm, (_, number, item) => {
        if (item.includes("paso") || item.includes("etapa"))
          return `${number} 🔄 ${item}`;
        if (item.includes("primero") || item.includes("inicial"))
          return `${number} 🎬 ${item}`;
        if (item.includes("final") || item.includes("último"))
          return `${number} 🏁 ${item}`;
        return `${number} ▶️ ${item}`;
      });
      
    return enhancedContent;
  };

  // Instalar paquete desde comando con actualización automática
  const installPackageFromCommand = async (packageName: string, isDev: boolean) => {
    setIsInstallingPackage(true);
    try {
      const response = await fetch("/api/packages/install", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageName,
          isDev,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al instalar el paquete");
      }

      const result = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `## ✅ Instalación Exitosa

📦 El paquete **${packageName}** ha sido instalado correctamente.

*Puntos importantes:*
* 🔄 La lista de paquetes se actualiza automáticamente
* 📝 Ya puedes utilizar este paquete en tu proyecto
* 💻 Versión instalada: \`${result.packageDetails?.version || 'latest'}\`
* 🛠️ Tipo: ${isDev ? 'Dependencia de desarrollo' : 'Dependencia de producción'}`,
        },
      ]);
      sounds.play("success");
      
      // Disparar evento personalizado para actualizar la lista de paquetes
      const packageEvent = new CustomEvent('package-installed', { 
        detail: { 
          name: packageName, 
          version: result.packageDetails?.version || 'latest',
          isDev: isDev
        } 
      });
      window.dispatchEvent(packageEvent);
      
      // Actualizar la lista de paquetes después de 1 segundo para dar tiempo a que se actualice package.json
      setTimeout(() => {
        // Buscar y actualizar el explorador de paquetes si existe
        const packageExplorer = document.querySelector('[data-component="package-explorer"]');
        if (packageExplorer) {
          const refreshButton = packageExplorer.querySelector('button[title="Actualizar lista de paquetes"]');
          if (refreshButton) {
            (refreshButton as HTMLButtonElement).click();
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error("Error al instalar:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `## ⚠️ Error de Instalación

❌ Ha ocurrido un problema al instalar **${packageName}**.

*Posibles soluciones:*
* 🔄 Intenta instalar manualmente con \`npm install ${isDev ? '--save-dev ' : ''}${packageName}\`
* 🔍 Verifica que el nombre del paquete sea correcto
* 📦 Comprueba si hay problemas de conectividad con el registro de npm`,
        },
      ]);
      sounds.play("error");
    } finally {
      setIsInstallingPackage(false);
    }
  };

  return (
    <div className="flex h-full border rounded-lg overflow-hidden bg-background">
      {/* Panel lateral de conversaciones (visible/oculto según estado) */}
      {showConversations && (
        <div className="w-64 border-r">
          <ConversationList 
            onSelect={loadConversation} 
            onNew={startNewConversation}
            activeConversationId={currentConversationId}
          />
        </div>
      )}
      
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Barra de herramientas de conversación */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <div className="flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setShowConversations(!showConversations)}
                  >
                    {showConversations ? <PanelLeft className="h-5 w-5" /> : <List className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showConversations ? 'Ocultar conversaciones' : 'Mostrar conversaciones'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="ml-2 text-sm">
              {currentConversationId ? (
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  <span className="truncate max-w-[200px] font-medium">
                    {getConversation(currentConversationId)?.title || 'Conversación actual'}
                  </span>
                </div>
              ) : (
                <span>Nueva conversación</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center">
            {/* Indicador de guardado */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={saveCurrentConversation}
                      disabled={savedStatus === 'saved' || messages.length <= 2}
                    >
                      {savedStatus === 'saving' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : savedStatus === 'saved' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <SaveIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {savedStatus === 'saving' 
                    ? 'Guardando...' 
                    : savedStatus === 'saved' 
                      ? 'Guardado' 
                      : 'Guardar conversación'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={startNewConversation}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Nueva conversación
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                message.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`px-4 py-2 rounded-lg max-w-[80%] ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-blue-900 text-white"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <Badge variant={message.role === "user" ? "outline" : "secondary"}>
                    {message.role === "user" ? "Tú" : "Asistente"}
                  </Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyToClipboard(message.content, index)}
                          className="h-6 w-6"
                        >
                          {hasCopied && copiedIndex === index ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {hasCopied && copiedIndex === index
                          ? "¡Copiado!"
                          : "Copiar mensaje"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {message.role === "assistant" && message.content.includes("```") && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleSaveCode(message.content)}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Guardar código</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{enhanceContentWithEmojis(message.content)}</ReactMarkdown>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      <div className="flex items-center justify-between p-4 border-t">
        <div className="flex items-center space-x-2">
          <Button onClick={toggleSpeechRecognition} size="icon" variant="ghost">
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Textarea
            placeholder="Escribe un mensaje... (Shift+Enter para nueva línea)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-grow min-h-[80px] resize-y"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            style={{ 
              transition: "height 0.2s ease",
              minHeight: "80px",
              height: `${Math.min(25 + input.split('\n').length * 18, 200)}px`
            }}
          />
        </div>
        <div className="flex items-center space-x-2">
          <ModelSelector modelId={modelId} onModelChange={setModelId} />
          <Button onClick={handleSendMessage} disabled={isLoading} className="bg-sky-500 hover:bg-sky-600">
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogHeader>
          <DialogTitle>Paquetes sugeridos</DialogTitle>
          <DialogDescription>
            Se han encontrado los siguientes paquetes que se podrían usar. ¿Quieres instalarlos?
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          <ul className="space-y-2">
            {pendingPackages.map((pkg, index) => (
              <li key={index} className="flex items-center">
                <Badge>{pkg.name}</Badge>
                <span className="ml-2">{pkg.description}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
        <DialogFooter>
          <Button onClick={() => {
            setShowPackageDialog(false);
            setPendingPackages([]);
          }} variant="secondary">
            Cancelar
          </Button>
          <Button onClick={async () => {
            setShowPackageDialog(false);
            setPendingPackages([]);
            await Promise.all(pendingPackages.map(async (pkg) => {
              await installPackageFromCommand(pkg.name, pkg.isDev || false);
            }));
          }} disabled={isInstallingPackage}>
            {isInstallingPackage ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              "Instalar paquetes"
            )}
          </Button>
        </DialogFooter>
      </Dialog>
      </div>
    </div>
  );
};

export default AssistantChat;