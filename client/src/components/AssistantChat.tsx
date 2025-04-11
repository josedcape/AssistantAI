import React, { useState, useRef, useEffect, useCallback } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Loader2, Mic, MicOff, Send, Save, Copy, Check,
  MessageSquare, PanelLeft, Save as SaveIcon, FileText, List, Upload,
  Menu, X, Package, Code, Share2, Download, History, Plus, Trash2, Info, Terminal
} from "lucide-react";
import ModelSelector from "./ModelSelector";
import * as sounds from "@/lib/sounds"; //Import sounds module
import { ConversationList } from "./ConversationList";
import { useToast } from "@/hooks/use-toast";
import {
  saveConversation,
  getConversation,
  setActiveConversation,
  getActiveConversation,
  generateConversationId,
  generateConversationTitle,
  getConversations,
  deleteConversation,
  Conversation,
  Message as ConversationMessage
} from "@/lib/conversationStorage";
import { Input } from "@/components/ui/input";
import TerminalComponent from './Terminal'; // Added import for Terminal component
import CodeBlock from './CodeBlock'; // Added import for CodeBlock component


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
const AssistantChat: React.FC = () => {
  // Inicializar toast
  const { toast } = useToast();

  // Estado para chat visible/oculto
  const [isChatVisible, setIsChatVisible] = useState(true);

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
  const [modelId, setModelId] = useState("gpt-4o");
  const [isListening, setIsListening] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pendingPackages, setPendingPackages] = useState<Package[]>([]);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [isInstallingPackage, setIsInstallingPackage] = useState(false);
  const [detectedPackages, setDetectedPackages] = useState<string[]>([]);
  const [scrollToBottom, setScrollToBottom] = useState(true);
  const [fileUploadModalOpen, setFileUploadModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);


  // Estados para gestión de conversaciones
  const [conversations, setConversations] = useState<Array<{id: string; title: string; date: string}>>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<'saved' | 'saving' | 'unsaved'>('unsaved');
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [showConversationDialog, setShowConversationDialog] = useState(false);

  // Estado para gestión de paquetes
  const [packageInstalling, setPackageInstalling] = useState(false);
  const [installPackageInput, setInstallPackageInput] = useState("");


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

  // Cargar conversaciones y conversación activa al iniciar
  useEffect(() => {
    const loadConversations = () => {
      try {
        const savedConversations = localStorage.getItem('conversations');
        if (savedConversations) {
          setConversations(JSON.parse(savedConversations));
        }
      } catch (error) {
        console.error('Error al cargar conversaciones:', error);
      }
    };
    loadConversations();

    const activeConversationId = getActiveConversation();
    if (activeConversationId) {
      // Intentar primero cargar desde localStorage para mejor persistencia
      const localStorageConversation = localStorage.getItem(`conversation-${activeConversationId}`);
      if (localStorageConversation) {
        try {
          const parsedConversation = JSON.parse(localStorageConversation);
          setMessages(parsedConversation.messages as Message[]);
          setModelId(parsedConversation.modelId || modelId);
          setCurrentConversationId(activeConversationId);
          setSavedStatus('saved');
          console.log("Conversación cargada desde localStorage");
          return;
        } catch (e) {
          console.error("Error al cargar conversación desde localStorage:", e);
        }
      }

      // Si no está en localStorage, intentar desde el almacenamiento normal
      const conversation = getConversation(activeConversationId);
      if (conversation) {
        setMessages(conversation.messages as Message[]);
        setModelId(conversation.modelId || "gpt-4o");
        setCurrentConversationId(activeConversationId);
        setSavedStatus('saved');
      } else {
        startNewConversation();
      }
    } else {
      startNewConversation();
    }
  }, []);

  // Actualizar la lista de conversaciones cuando cambia el almacenamiento
  useEffect(() => {
    const handleStorageChange = () => {
      const conversations = getConversations();
      conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setAllConversations(conversations);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
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

    // Si el panel lateral estaba abierto, cerrarlo
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  // Guardar la conversación actual
  const saveCurrentConversation = (title?: string) => {
    try {
      setSavedStatus('saving');

      // Generar ID si es nueva conversación
      const conversationId = currentConversationId || `conv_${Date.now()}`;

      // Usar título proporcionado o generar uno basado en el primer mensaje
      const conversationTitle = title ||
        (messages.length > 0 ?
          messages[0].content.slice(0, 30) + (messages[0].content.length > 30 ? '...' : '') :
          `Conversación ${new Date().toLocaleString()}`);

      // Guardar mensajes de la conversación actual
      localStorage.setItem(`messages_${conversationId}`, JSON.stringify(messages));

      // Actualizar lista de conversaciones
      const updatedConversations = [...conversations.filter(c => c.id !== conversationId), {
        id: conversationId,
        title: conversationTitle,
        date: new Date().toISOString()
      }];

      setConversations(updatedConversations);
      localStorage.setItem('conversations', JSON.stringify(updatedConversations));

      // Actualizar ID de conversación actual
      setCurrentConversationId(conversationId);
      setSavedStatus('saved');

      return conversationId;
    } catch (error) {
      console.error('Error al guardar conversación:', error);
      setSavedStatus('unsaved');
      return null;
    }
  };

  // Cargar una conversación guardada
  const loadConversation = (conversationId: string) => {
    try {
      const savedMessages = localStorage.getItem(`messages_${conversationId}`);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
        setCurrentConversationId(conversationId);
        setSavedStatus('saved');
        setActiveConversation(conversationId); // Asegura que se guarde la conversación activa
        setSidebarOpen(false); // Cierra el sidebar en móviles después de seleccionar
      }
    } catch (error) {
      console.error('Error al cargar conversación:', error);
    }
  };

  // Eliminar una conversación
  const handleDeleteConversation = (id: string) => {
    setConfirmDelete(id);
  };

  const confirmDeleteConversation = async () => {
    if (!confirmDelete) return;

    try {
      deleteConversation(confirmDelete);
      localStorage.removeItem(`messages_${confirmDelete}`);

      const updatedConversations = conversations.filter((conv) => conv.id !== confirmDelete);
      setConversations(updatedConversations);
      localStorage.setItem('conversations', JSON.stringify(updatedConversations));

      if (currentConversationId === confirmDelete) {
        startNewConversation();
      }

      sounds.play("click");
      toast({
        title: "Conversación eliminada",
        description: "La conversación ha sido eliminada correctamente",
        duration: 2000
      });

      // Cerrar el diálogo y limpiar el estado
      setConfirmDelete(null);
      if (conversations.length === 1) {
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error("Error al eliminar conversación:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar la conversación",
        variant: "destructive",
        duration: 3000
      });
    }
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

        // Agregar un indicador visual en la interfaz
        setTimeout(() => {
          const packageIndicator = document.getElementById('package-indicator');
          if (packageIndicator) {
            packageIndicator.className = 'animate-pulse';
            setTimeout(() => {
              packageIndicator.className = '';
            }, 3000);
          }
        }, 500);
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

  // Manejar cambio de modelo
  const handleModelChange = (newModelId: string) => {
    setModelId(newModelId);
    // Guardar la preferencia del usuario
    try {
      localStorage.setItem('preferred-model', newModelId);
      console.log(`Modelo cambiado a: ${newModelId}`);

      // Añadir mensaje informativo
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `## 🔄 Modelo de lenguaje actualizado\n\nAhora estás usando el modelo **${newModelId}**. Las nuevas respuestas utilizarán este modelo.`
        }
      ]);

      // Actualizar el estado de guardado
      setSavedStatus('unsaved');

    } catch (error) {
      console.error("Error al guardar preferencia de modelo:", error);
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
    // Lista de paquetes detectados para no duplicar
    const detectedPackageNames = new Set<string>();
    const suggestedPackages: { name: string; isDev: boolean; description: string }[] = [];

    // 1. Detectar comandos de instalación en bloques de código
    try {
      // Expresión regular para detectar comandos de instalación en bloques de código
      const installCommandRegex = /```(?:bash|shell|sh)?\s*((?:npm|yarn|pnpm)(?:\s+add|\s+install)\s+[^`]+)```/g;
      let match;

      const contentStr = String(content); // Asegurar que es string
      while ((match = installCommandRegex.exec(contentStr)) !== null) {
        const installCommand = match[1].trim();

        // Extraer paquetes del comando
        if (installCommand.includes('npm install') || installCommand.includes('npm add') ||
            installCommand.includes('yarn add') || installCommand.includes('pnpm add')) {
          const parts = installCommand.split(/\s+/);
          const devFlag = parts.includes('--save-dev') || parts.includes('-D');

          // Obtener nombres de paquetes
          for (let i = 2; i < parts.length; i++) {
            const part = parts[i];
            if (!part.startsWith('-') && part !== 'install' && part !== 'add' &&
                part !== '--save-dev' && part !== '-D' && part !== '--dev') {
              // Normalizar nombre del paquete (quitar versiones @x.x.x si existen)
              const packageName = part.split('@')[0];

              if (!detectedPackageNames.has(packageName)) {
                detectedPackageNames.add(packageName);
                suggestedPackages.push({
                  name: packageName,
                  isDev: devFlag,
                  description: 'Detectado en comando de instalación'
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error al detectar comandos de instalación:", error);
    }

    // 2. Buscar recomendaciones textuales de paquetes
    try {
      // Expresiones para detectar recomendaciones textuales
      const packagePatterns = [
        /debes?\s+instalar\s+(?:el\s+paquete\s+|la\s+biblioteca\s+)?[`"']([^`"']+)[`"']/gi,
        /puedes?\s+usar\s+(?:el\s+paquete\s+|la\s+biblioteca\s+)?[`"']([^`"']+)[`"']/gi,
        /instala\s+(?:el\s+paquete\s+|la\s+biblioteca\s+)?[`"']([^`"']+)[`"']/gi,
        /recomiendo\s+(?:usar|instalar)\s+[`"']([^`"']+)[`"']/gi,
        /necesitas\s+(?:el\s+paquete\s+|la\s+biblioteca\s+)?[`"']([^`"']+)[`"']/gi
      ];

      for (const pattern of packagePatterns) {
        let packageMatch;
        const contentStr = String(content);
        while ((packageMatch = pattern.exec(contentStr)) !== null) {
          const packageName = packageMatch[1].trim().split('@')[0]; // Normalizar

          if (!detectedPackageNames.has(packageName)) {
            detectedPackageNames.add(packageName);
            suggestedPackages.push({
              name: packageName,
              isDev: false,
              description: 'Recomendado en la respuesta'
            });
          }
        }
      }
    } catch (error) {
      console.error("Error al detectar menciones de paquetes:", error);
    }

    // 3. Buscar paquetes en etiquetas especiales (para procesamiento futuro)
    try {
      const packageTagRegex = /<package\s+name=['"](.*?)['"]\s+(?:is_dev=['"](.*?)['"]\s+)?(?:description=['"](.*?)['"])?.*?\/>/g;
      let packageTagMatch;

      const contentStr = String(content);
      while ((packageTagMatch = packageTagRegex.exec(contentStr)) !== null) {
        const packageName = packageTagMatch[1].trim().split('@')[0];
        const isDev = packageTagMatch[2]?.toLowerCase() === 'true';
        const description = packageTagMatch[3] || 'Paquete indicado específicamente';

        if (!detectedPackageNames.has(packageName)) {
          detectedPackageNames.add(packageName);
          suggestedPackages.push({
            name: packageName,
            isDev: isDev,
            description: description
          });
        }
      }
    } catch (error) {
      console.error("Error al detectar etiquetas de paquetes:", error);
    }

    // Actualizar la lista de paquetes detectados para mostrar en la interfaz
    setDetectedPackages(Array.from(detectedPackageNames));

    return suggestedPackages;
  };

  // Guardar código de un mensaje y crear archivo automáticamente
  const handleSaveCode = async (content: string): Promise<void> => {
    const codeBlockRegex = /```(?:(\w+))?\s*\n([\s\S]*?)\n```/g;
    let match;
    let savedCount = 0;
    let firstSavedFilePath = "";
    let savedFiles: {name: string, content: string, extension: string}[] = [];
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
        }

        // Generar nombre de archivo único basado en el contenido o tipo de código
        let fileName = `generated_code_${index + 1}${fileExtension}`;

        // Intentar detectar un mejor nombre basado en patrones en el código
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

        // Guardar información del archivo para el botón de enviar a explorador
        savedFiles.push({
          name: fileName,
          content: codeBlock.code,
          extension: fileExtension.substring(1) // Sin el punto
        });
      }

      sounds.play("save");

      // Mensaje de éxito con información sobre los archivos guardados
      let successMessage = "";
      if (savedCount === 1) {
        successMessage = `## ✅ Código guardado exitosamente\n\n📝 Se ha creado el archivo **${firstSavedFilePath}** con el código proporcionado.\n\n🔄 El explorador de archivos se actualizará automáticamente para mostrar el nuevo archivo.`;
      } else {
        successMessage = `## ✅ Código guardado exitosamente\n\n📝 Se han creado **${savedCount} archivos** con el código proporcionado.\n\n🔄 El explorador de archivos se actualizará automáticamente para mostrar los nuevos archivos.`;
      }

      // Agregar botón para enviar al explorador/recursos
      successMessage += `\n\n<div class="flex gap-2 mt-3">
        <button id="send-to-explorer" data-files='\${JSON.stringify(savedFiles)}' style="padding: 8px 16px; background-color: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; font-size: 14px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Enviar al explorador
        </button>

        <button id="send-to-generator" data-files='\${JSON.stringify(savedFiles)}' style="padding: 8px 16px; background-color: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; font-size: 14px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          Enviar al generador
        </button>
      </div>`;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: successMessage
        },
      ]);

      // Disparar evento para actualizar el explorador de archivos
      const fileEvent = new CustomEvent('files-updated', {
        detail: { forceRefresh: true }
      });
      window.dispatchEvent(fileEvent);
      // Buscar y actualizar el explorador de archivos si existe
      setTimeout(() => {
        const fileExplorer = document.querySelector('[data-component="file-explorer"]');
        if (fileExplorer) {
          const refreshButton = fileExplorer.querySelector('button[title="Actualizar"]');
          if (refreshButton) {
            (refreshButton as HTMLButtonElement).click();
          } else {
            // Alternativa para encontrar el botón de refrescar
            const allButtons = fileExplorer.querySelectorAll('button');
            for (const button of allButtons) {
              if (button.innerHTML.includes('RefreshCw') ||
                  button.title.toLowerCase().includes('refrescar') ||
                  button.title.toLowerCase().includes('actualizar')) {
                (button as HTMLButtonElement).click();
                break;
              }
            }
          }
        }

        // Forzar recarga de la lista de archivos directamente
        const refreshEvent = new CustomEvent('refresh-files', {
          detail: { force: true }
        });
        window.dispatchEvent(refreshEvent);
        // Agregar listener para el botón de enviar al explorador
        setTimeout(() => {
          const sendToExplorerButton = document.getElementById('send-to-explorer');
          if (sendToExplorerButton) {
            sendToExplorerButton.addEventListener('click', () => {
              try {
                const filesData = JSON.parse(sendToExplorerButton.getAttribute('data-files') || '[]');
                if (filesData && filesData.length > 0) {
                  // Emitir evento para que lo capture el explorador de archivos
                  const sendToExplorerEvent = new CustomEvent('send-files-to-explorer', {
                    detail: { files: filesData }
                  });
                  window.dispatchEvent(sendToExplorerEvent);

                  // Mostrar mensaje de éxito
                  toast({
                    title: "Archivos enviados",
                    description: `Se han enviado ${filesData.length} archivo(s) al explorador`,
                    duration: 3000
                  });
                  sounds.play("success", 0.3);

                  // Cambiar automáticamente a la pestaña de archivos
                  const filesTabEvent = new CustomEvent('activate-files-tab');
                  window.dispatchEvent(filesTabEvent);
                }
              } catch (e) {
                console.error("Error al procesar los archivos:", e);
                toast({
                  title: "Error",
                  description: "No se pudieron enviar los archivos al explorador",
                  variant: "destructive",
                  duration: 3000
                });
                sounds.play("error", 0.3);
              }
            });
          }

          // Nuevo event listener para el botón del generador
          const sendToGeneratorButton = document.getElementById('send-to-generator');
          if (sendToGeneratorButton) {
            sendToGeneratorButton.addEventListener('click', () => {
              try {
                const filesData = JSON.parse(sendToGeneratorButton.getAttribute('data-files') || '[]');
                if (filesData && filesData.length > 0) {
                  handleSendToGenerator(filesData);
                }
              } catch (e) {
                console.error("Error al procesar los archivos:", e);
                toast({
                  title: "Error",
                  description: "No se pudieron enviar los archivos al generador",
                  variant: "destructive",
                  duration: 3000
                });
                sounds.play("error", 0.3);
              }
            });
          }
        }
      } catch (error) {
        console.error("Error al procesar código:", error);
      }
    }, 500);
  });

  // Extraer código del mensaje
  const extractCodeFromMessage = (content: string): Array<{language: string, code: string, fileName?: string}> => {
    const codeBlockRegex = /```([a-zA-Z0-9_]+)?(?:\s*(?:\/\/|#)?\s*(?:file:\s*([^\n]+))?)?\n([\s\S]*?)\n```/g;
    let match;
    const codes: { language: string; code: string; fileName?: string }[] = [];

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || "plaintext";
      const fileName = match[2] || getDefaultFileName(language);
      const code = match[3].trim();

      codes.push({
        language,
        code,
        fileName
      });
    }

    return codes;
  };

  const getDefaultFileName = (language: string): string => {
    const extensionMap: Record<string, string> = {
      javascript: 'script.js',
      typescript: 'script.ts',
      python: 'script.py',
      html: 'index.html',
      css: 'styles.css',
      jsx: 'component.jsx',
      tsx: 'component.tsx',
      json: 'data.json',
      php: 'script.php',
      java: 'Main.java',
      cpp: 'main.cpp',
      c: 'main.c',
      go: 'main.go',
      rust: 'main.rs',
      ruby: 'script.rb',
      sql: 'query.sql',
      plaintext: 'file.txt'
    };

    return extensionMap[language.toLowerCase()] || 'code.txt';
  };

  // Función para procesar imágenes cargadas
  const processImageFile = (file: File, fileName: string) => {
    // Comprobar que sea un archivo de imagen
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error de formato",
        description: "El archivo no es una imagen válida",
        variant: "destructive",
        duration: 3000
      });
      return;
    }

    setIsLoading(true);

    // Preparar mensaje para mostrar al usuario
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `He cargado una imagen llamada "${fileName}" para análisis.`
      }
    ]);

    // Función para comprimir imagen
    const compressImage = (imgBase64: string, maxWidth = 1200): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imgBase64;

        img.onload = () => {
          // Calcular nuevas dimensiones manteniendo proporción
          let width = img.width;
let height = img.height;

          if (width >maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = height* ratio;
          }

          // Crear canvaspara la compresión
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          // Dibujar imagen redimensionada en el canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("No se pudo crear el contexto del canvas"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Obtener imagen comprimida (ajustar calidad según necesidad)
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };

        img.onerror = () => {
          reject(new Error("Error al cargar la imagen para compresión"));
        };
      });
    };
    // Enviar la imagen para análisis (base64)
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Image = e.target?.result as string;
        if (!base64Image) {
          throw new Error("No se pudo leer la imagen");
        }

        // Comprimir imagen si es grande (>1MB)
        let processedImage = base64Image;
        if (file.size > 1024 * 1024) {
          toast({
            title: "Procesando imagen",
            description: "Comprimiendo imagen para análisis...",
            duration: 3000
          });
          processedImage = await compressImage(base64Image);
        }

        // Obtener solo la parte base64 sin el prefijo
        const base64Data = processedImage.split(',')[1];

        // Enviar la imagen al servidor para análisis
        const response = await fetch("/api/assistant-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Analiza esta imagen: ${fileName}`,
            modelId: modelId,
            history: messages,
            image: base64Data,
            projectId: null
          }),
        });

        if (!response.ok) {
          throw new Error(`Error al analizar la imagen: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message || "No pude analizar la imagen correctamente."
          }
        ]);
        sounds.play("notification");

      } catch (error) {
        console.error("Error al procesar la imagen:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `## ⚠️ Error al procesar la imagen\n\n❌ No se pudo analizar la imagen debido a un error:\n\`\`\`\n${error instanceof Error ? error.message : "Error desconocido"}\n\`\`\`\n\n*Por favor, intenta con otra imagen de menor tamaño o con un formato diferente.*`
          }
        ]);
        sounds.play("error");
      } finally {
        setIsLoading(false);
      }
    };

    // Leer la imagen como base64
    reader.readAsDataURL(file);
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
      .replace(/^(#{1,3})\s+(.+)\\$/gm, (_, hashes, title) => {
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
      .replace(/^(\s*[-*+])\s+(.+)\\$/gm, (_, bullet, item) => {
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
      .replace(/^(\s*\d+\.)\s+(.+)\\$/gm, (_, number, item) => {
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
  const handlePackageInstall = async () => {
    if (!installPackageInput.trim()) return;

    setPackageInstalling(true);
    try {
      const response = await fetch('/api/packages/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageName: installPackageInput.trim()
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Agregar mensaje de éxito a la conversación
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            role: "assistant",
            content: `El paquete "${result.packageName}" se instaló correctamente.`
          }
        ]);
        // Actualizar la lista de paquetes instalados (si es necesario)
        setDetectedPackages((prevPackages) => [...prevPackages, result.packageName]);
        // Ocultar el diálogo
        setShowPackageDialog(false);
        // Restablecer el campo de entrada
        setInstallPackageInput("");
      } else {
        // Agregar mensaje de error a la conversación
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            role: "assistant",
            content: `Hubo un error al instalar el paquete "${result.packageName}": ${result.error}`
          }
        ]);
      }
    } catch (error) {
      console.error("Error al instalar el paquete:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `## ⚠️ Error al instalar el paquete\n\n❌ No se pudo instalar el paquete "${installPackageInput}" debido a un error:\n\`\`\`\n${error instanceof Error ? error.message : "Error desconocido"}\n\`\`\`\n\n*Por favor, intenta nuevamente o instala el paquete manualmente.*`
        },
      ]);
      sounds.play("error");
    } finally {
      setPackageInstalling(false);
    }
  };

  useEffect(() => {
    if (scrollToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, scrollToBottom]);

  // Actualizar estado cuando se modifican los mensajes
  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      setSavedStatus('unsaved');
    }
  }, [messages]);

  const executeInTerminal = (command: string) => {
    // Aquí se implementaría la lógica para ejecutar el comando en la terminal
    // Por ahora, se simula la ejecución mostrando un mensaje:
    console.log(`Ejecutando comando en terminal: ${command}`);
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: "assistant",
        content: `Ejecutando comando en terminal: \`${command}\``
      },
      {
        role: "assistant",
        content: `Salida de terminal: (Simulación) Comando ejecutado exitosamente.` // Reemplazar con la salida real
      }
    ]);
  };

  // Agregar esta función para manejar el envío al generador
  const handleSendToGenerator = (files: Array<{name: string, content: string, extension: string}>) => {
    console.log("Enviando archivos al generador:", files); // Agregar log para debug

    try {
      const sendToGeneratorEvent = new CustomEvent('send-files-to-generator', {
        detail: { 
          files: files.map(file => ({
            name: file.name,
            content: file.content,
            extension: file.extension || file.type || 'txt'
          }))
        }
      });

      window.dispatchEvent(sendToGeneratorEvent);

      // Forzar la actualización del panel de archivos generados
      const refreshEvent = new CustomEvent('refresh-generated-files');
      window.dispatchEvent(refreshEvent);

      toast({
        title: "Archivos enviados",
        description: `Se han enviado ${files.length} archivo(s) al generador`,
        duration: 3000
      });
      sounds.play("success", 0.3);
    } catch (e) {
      console.error("Error al enviar archivos al generador:", e);
      toast({
        title: "Error",
        description: "No se pudieron enviar los archivos al generador",
        variant: "destructive"
      });
      sounds.play("error", 0.3);
    }
  };

  const socket = io();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    if (input.startsWith('/')) {
      socket.emit('chat-command', input.slice(1));
      return;
    }

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

        // Agregar un indicador visual en la interfaz
        setTimeout(() => {
          const packageIndicator = document.getElementById('package-indicator');
          if (packageIndicator) {
            packageIndicator.className = 'animate-pulse';
            setTimeout(() => {
              packageIndicator.className = '';
            }, 3000);
          }
        }, 500);
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


  return (
    <div className="flex h-full">
      {/* Panel lateral de conversaciones */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:relative ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Conversaciones
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="md:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={startNewConversation}
              className="w-full mb-4 mt-2"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva conversación
            </Button>
            <div className="relative">
              {/* Search input removed for brevity */}
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <ConversationList
              conversations={conversations}
              loadConversation={loadConversation}
              handleDeleteConversation={handleDeleteConversation}
              currentConversationId={currentConversationId}
            />
          </div>
          <div className="p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                {currentConversationId ? (
                  <span>
                    {savedStatus === 'saved' && (
                      <span className="flex items-center">
                        <Check className="h-3 w-3 mr-1 text-green-500" />
                        Guardado
                      </span>
                    )}
                    {savedStatus === 'saving' && (
                      <span className="flex items-center">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Guardando...
                      </span>
                    )}
                    {savedStatus === 'unsaved' && (
                      <span className="flex items-center">
                        <Save className="h-3 w-3 mr-1 text-amber-500" />
                        Sin guardar
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Info className="h-3 w-3 mr-1" />
                    Nueva conversación
                  </span>
                )}
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowConversationDialog(true)}
                disabled={savedStatus === 'saved' || messages.length <= 2}
              >
                <SaveIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col h-full">
        {/* Barra superior */}
        <div className="border-b p-2 flex items-center justify-between sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <PanelLeft className={`h-5 w-5 transform transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
            </Button>

            <div className="flex items-center space-x-2">
              <ModelSelector
                modelId={modelId}
                onModelChange={handleModelChange}
              />

              <Badge
                variant="outline"
                className="hidden md:flex px-2 py-0 h-7 items-center"
              >
                {currentConversationId ? (
                  <span className="flex items-center">
                    {savedStatus === 'saved' && (
                      <>
                        <Check className="h-3 w-3 mr-1 text-green-500" />
                        Guardado
                      </>
                    )}
                    {savedStatus === 'saving' && (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Guardando...
                      </>
                    )}
                    {savedStatus === 'unsaved' && (
                      <>
                        <SaveIcon className="h-3 w-3 mr-1 text-amber-500" />
                        Sin guardar
                      </>
                    )}
                  </span>
                ) : (
                  <>Nueva conversación</>
                )}
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsChatVisible(!isChatVisible)}
                  >
                    {isChatVisible ? (
                      <MessageSquare className="h-5 w-5" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-gray-400" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isChatVisible ? 'Ocultar chat' : 'Mostrar chat'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {detectedPackages.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      id="package-indicator"
                      onClick={() => setShowPackageDialog(true)}
                    >
                      <Package className="h-5 w-5 text-blue-500" />
                      <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-500"></span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Paquetes detectados: {detectedPackages.join(', ')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={startNewConversation}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Nueva conversación</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto overscroll-y-contain p-4 mobile-scroll">
          <ScrollArea className="h-full min-h-[calc(100vh-16rem)]">
            <div className="space-y-4 pb-20">
              {isChatVisible && messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'} rounded-lg p-4 max-w-3xl relative group`}>
                    {message.role === 'user' && (
  message.content.match(/^(cd|mkdir|npm|install|ls|git|node|rm|cp|mv)\s/) && (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-12 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => executeInTerminal(message.content)}
          >
            <Terminal className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ejecutar en terminal</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
)}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        navigator.clipboard.writeText(message.content);
                        toast({
                          title: "Copiado",
                          description: "Mensaje copiado al portapapeles",
                          duration: 2000
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={message.role === 'user' ? 'primary' : 'secondary'}>
                        {message.role === 'user' ? 'Usuario' : message.role === 'assistant' ? 'Asistente' : 'Sistema'}
                      </Badge>
                      {message.role === 'user' && message.content.startsWith('npm ') && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => executeInTerminal(message.content)}
                              >
                                <Terminal className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ejecutar en terminal</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {message.role === 'assistant' && extractCodeFromMessage(message.content).length > 0 && (
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
                    <div className="prose dark:prose-invert max-w-none message-content">
                      {message.role === 'assistant' ? (
                        <>
                          {message.content.split(/(```[\s\S]*?```)/g).map((part, index) => {
                            if (part.startsWith('```') && part.endsWith('```') {
                              const codes = extractCodeFromMessage(part);
                              return codes.map((codeBlock, codeIndex) => (
                                <div key={`code-${index}-${codeIndex}`} className="my-4 code-block">
                                  <div className="code-actions">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleSaveCode(codeBlock.code)}
                                    >
                                      <Save className="h-4 w-4 mr-1" />
                                      Guardar
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => {
                                        navigator.clipboard.writeText(codeBlock.code);
                                        toast({
                                          title: "Copiado",
                                          description: "Código copiado al portapapeles",
                                          duration: 2000
                                        });
                                      }}
                                    >
                                      <Copy className="h-4 w-4 mr-1" />
                                      Copiar
                                    </Button>
                                  </div>
                                  <CodeBlock
                                    code={codeBlock.code}
                                    language={codeBlock.language}
                                    fileName={codeBlock.fileName}
                                    showLineNumbers={true}
                                  />
                                </div>
                              ));
                            }
                            return (
                              <ReactMarkdown key={`text-${index}`} remarkPlugins={[remarkGfm]}>
                                {enhanceContentWithEmojis(part)}
                              </ReactMarkdown>
                            );
                          })}

                        </>
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {enhanceContentWithEmojis(message.content)}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* Área de entrada */}
        <div className="border-t p-2 sm:p-4 sticky bottom-0 bg-background mobile-safe-bottom">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex space-x-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={toggleSpeechRecognition}
                      size="icon"
                      variant="ghost"
                    >
                      {isListening ? <MicOff className="w-5 h-5 text-red-500" /> : <Mic className="w-5 h-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isListening ? "Detener micrófono" : "Usar micrófono"}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700">
                        <Upload className="w-5 h-5" />
                      </div>
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept=".txt,.pdf,.doc,.docx,.md,.jpg,.jpeg,.png,.gif,.webp,.bmp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const fileExtension = file.name.split('.').pop()?.toLowerCase();
                          const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension || '');

                          // Procesamiento especial para imágenes
                          if (isImage) {
                            toast({
                              title: "Procesando imagen",
                              description: `Preparando ${file.name} para análisis...`,
                              duration: 3000
                            });

                            // Usar la función para procesar imágenes
                            processImageFile(file, file.name);
                            return;
                          }

                          // Procesamiento especial para DOC/DOCX
                          if (fileExtension === 'doc' || fileExtension === 'docx') {
                            // Para archivos DOC/DOCX, enviarlos al servidor para procesamiento
                            toast({
                              title: "Procesando documento",
                              description: `Preparando ${file.name} para análisis...`,
                              duration: 3000
                            });

                            const formData = new FormData();
                            formData.append("file", file);

                            fetch("/api/documents/extract-text", {
                              method: "POST",
                              body: formData
                            })
                              .then(response => {
                                if (!response.ok) {
                                  throw new Error(`Error al procesar el documento: ${response.statusText}`);
                                }
                                return response.json();
                              })
                              .then(data => {
                                const content = data.text || "No se pudo extraer contenido del documento.";

                                // Preparar mensaje con el contenido del archivo
                                const messagePrefix = `He cargado el archivo "${file.name}" para análisis:\n\n\`\`\`\${fileExtension}\n`;

                                // Limitar el contenido si es muy grande
                                const maxLength = 10000;
                                const truncatedContent = content.length > maxLength
                                  ? content.substring(0, maxLength) + "\n\n[Contenido truncado debido al tamaño...]"
                                  : content;

                                const finalMessage = messagePrefix + truncatedContent + "\n\`\`\`\n\nPor favor analiza este contenido.";
                                setInput(finalMessage);

                                toast({
                                  title: "Documento procesado",
                                  description: `${file.name} ha sido cargado (${(file.size / 1024).toFixed(2)} KB)`,
                                  duration: 3000
                                });
                              })
                              .catch(error => {
                                console.error("Error procesando documento:", error);
                                toast({
                                  title: "Error al procesar documento",
                                  description: "No se pudo extraer el contenido del archivo. Intente con un formato diferente (.txt, .md).",
                                  variant: "destructive",
                                  duration: 5000
                                });
                              });
                          } else {
                            // Para otros formatos, usar el método existente
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const content = event.target?.result as string;
                              if (content) {
                                // Preparar mensaje con el contenido del archivo
                                const messagePrefix = `He cargado el archivo "${file.name}" para análisis:\n\n\`\`\`\${fileExtension}\n`;

                                // Limitar el contenido si es muy grande
                                const maxLength = 10000;
                                const truncatedContent = content.length > maxLength
                                  ? content.substring(0, maxLength) + "\n\n[Contenido truncado debido al tamaño...]"
                                  : content;

                                const finalMessage = messagePrefix + truncatedContent + "\n\`\`\`\n\nPor favor analiza este contenido.";
                                setInput(finalMessage);

                                toast({
                                  title: "Archivo cargado",
                                  description: `${file.name} ha sido cargado (${(file.size / 1024).toFixed(2)} KB)`,
                                  duration: 3000
                                });
                              }
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>
                  </TooltipTrigger>
                  <TooltipContent>Subir archivo</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="relative overflow-hidden">
            <Textarea
              placeholder="Escribe un mensaje..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="w-full p-4 pr-12 border rounded-lg resize-none min-h-[100px] overflow-auto"
              rows={3}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 bottom-2"
              size="icon"
              variant="default"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La conversación se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteConversation} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo para guardar conversación */}
      <Dialog open={showConversationDialog} onOpenChange={setShowConversationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar conversación</DialogTitle>
            <DialogDescription>
              Introduce un título para guardar esta conversación
            </DialogDescription>
          </DialogHeader>

          <Input
            value={newConversationTitle}
            onChange={(e) => setNewConversationTitle(e.target.value)}
            placeholder="Título de la conversación"
            className="mt-4"
          />

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowConversationDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              if (newConversationTitle.trim()) {
                saveCurrentConversation(newConversationTitle.trim());
                setNewConversationTitle("");
                setShowConversationDialog(false);
              }
            }}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para instalar paquetes */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Instalar paquete</DialogTitle>
            <DialogDescription>
              Introduce el nombre del paquete de npm que deseas instalar
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center space-x-2 mt-4">
            <Input
              value={installPackageInput}
              onChange={(e) => setInstallPackageInput(e.target.value)}
              placeholder="Nombre del paquete (ej: axios)"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !packageInstalling) {
                  handlePackageInstall();
                }
              }}
            />

            <Button
              onClick={handlePackageInstall}
              disabled={packageInstalling || !installPackageInput.trim()}
              className="flex-shrink-0"
            >
              {packageInstalling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Package className="h-4 w-4 mr-2" />}
              {packageInstalling ? 'Instalando...' : 'Instalar'}
            </Button>
          </div>

          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
            <h4 className="text-sm font-medium mb-2">Paquetes populares:</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm">
                <p className="font-semibold mb-1 text-primary">UI/Componentes</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li><span className="font-mono">react</span></li>
                  <li><span className="font-mono">tailwindcss</span></li>
                  <li><span className="font-mono">react-router-dom</span></li>
                </ul>
              </div>
              <div className="text-sm">
                <p className="font-semibold mb-1 text-primary">Backend/API</p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  <li><span className="font-mono">express</span></li>
                  <li><span className="font-mono">mongoose</span></li>
                  <li><span className="font-mono">axios</span></li>
                </ul>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Haz clic en el botón <Package className="inline h-3 w-3" /> del encabezado para acceder al explorador de paquetes.
            </div>
          </div>

          {pendingPackages.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Paquetes detectados:</h4>
              <div className="flex flex-wrap gap-2">
                {pendingPackages.map((pkg, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    <div>{pkg.name}</div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4 p-0"
                      onClick={() => {
                        setInstallPackageInput(pkg.name);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Overlay para móviles cuando el sidebar está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AssistantChat;