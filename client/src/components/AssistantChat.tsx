import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { io } from "socket.io-client";
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
  MessageSquare, PanelLeft, Save as SaveIcon, Upload,
  Menu, X, Package, Share2, Plus, Trash2, Info, Terminal
} from "lucide-react";
import ModelSelector from "./ModelSelector";
import * as sounds from "@/lib/sounds";
import { ConversationList } from "./ConversationList";
import { useToast } from "@/hooks/use-toast";
import {
  saveConversation,
  getConversation,
  setActiveConversation,
  getActiveConversation,
  getConversations,
  deleteConversation,
} from "@/lib/conversationStorage";
import { Input } from "@/components/ui/input";
import CodeBlock from './CodeBlock';

// Message and Package interfaces
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Package {
  name: string;
  isDev: boolean;
  description: string;
}

const AssistantChat: React.FC = () => {
  // Initialize hooks
  const { toast } = useToast();
  const socket = io();

  // UI state
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scrollToBottom, setScrollToBottom] = useState(true);

  // Chat state
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
  const [modelId, setModelId] = useState("gpt-4o");

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Package management state
  const [pendingPackages, setPendingPackages] = useState<Package[]>([]);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [detectedPackages, setDetectedPackages] = useState<string[]>([]);
  const [packageInstalling, setPackageInstalling] = useState(false);
  const [installPackageInput, setInstallPackageInput] = useState("");

  // File upload state
  const [fileUploadModalOpen, setFileUploadModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Conversation management state
  const [conversations, setConversations] = useState<Array<{id: string; title: string; date: string}>>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<'saved' | 'saving' | 'unsaved'>('unsaved');
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [showConversationDialog, setShowConversationDialog] = useState(false);

  // Initialize speech recognition
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
          console.error(`No se pudo activar el micrófono: ${event.error}`);
        }
      };
    }

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

  // Load conversations and active conversation on init
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

  // Update conversation list when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const conversations = getConversations();
      conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setConversations(conversations);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    if (currentConversationId && messages.length > 2) {
      setSavedStatus('unsaved');
    }
  }, [messages]);

  // Auto-save changes
  useEffect(() => {
    if (savedStatus === 'unsaved' && currentConversationId) {
      const saveTimer = setTimeout(() => {
        saveCurrentConversation();
      }, 2000);

      return () => clearTimeout(saveTimer);
    }
  }, [messages, savedStatus, currentConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, scrollToBottom]);

  // Toggle speech recognition
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

  // Start new conversation
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

    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  // Save current conversation
  const saveCurrentConversation = (title?: string) => {
    try {
      setSavedStatus('saving');

      const conversationId = currentConversationId || `conv_${Date.now()}`;
      const conversationTitle = title ||
        (messages.length > 0 ?
          messages[0].content.slice(0, 30) + (messages[0].content.length > 30 ? '...' : '') :
          `Conversación ${new Date().toLocaleString()}`);

      localStorage.setItem(`messages_${conversationId}`, JSON.stringify(messages));

      const updatedConversations = [...conversations.filter(c => c.id !== conversationId), {
        id: conversationId,
        title: conversationTitle,
        date: new Date().toISOString()
      }];

      setConversations(updatedConversations);
      localStorage.setItem('conversations', JSON.stringify(updatedConversations));
      setCurrentConversationId(conversationId);
      setSavedStatus('saved');

      return conversationId;
    } catch (error) {
      console.error('Error al guardar conversación:', error);
      setSavedStatus('unsaved');
      return null;
    }
  };

  // Load a saved conversation
  const loadConversation = (conversationId: string) => {
    try {
      const savedMessages = localStorage.getItem(`messages_${conversationId}`);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
        setCurrentConversationId(conversationId);
        setSavedStatus('saved');
        setActiveConversation(conversationId);
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error('Error al cargar conversación:', error);
    }
  };

  // Delete conversation
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

  // Detect packages mentioned in message
  const detectPackages = (content: string) => {
    const detectedPackageNames = new Set<string>();
    const suggestedPackages: { name: string; isDev: boolean; description: string }[] = [];

    try {
      // Detect installation commands in code blocks
      const installCommandRegex = /```(?:bash|shell|sh)?\s*((?:npm|yarn|pnpm)(?:\s+add|\s+install)\s+[^`]+)```/g;
      let match;

      const contentStr = String(content);
      while ((match = installCommandRegex.exec(contentStr)) !== null) {
        const installCommand = match[1].trim();

        if (installCommand.includes('npm install') || installCommand.includes('npm add') ||
            installCommand.includes('yarn add') || installCommand.includes('pnpm add')) {
          const parts = installCommand.split(/\s+/);
          const devFlag = parts.includes('--save-dev') || parts.includes('-D');

          for (let i = 2; i < parts.length; i++) {
            const part = parts[i];
            if (!part.startsWith('-') && part !== 'install' && part !== 'add' &&
                part !== '--save-dev' && part !== '-D' && part !== '--dev') {
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

      // Look for textual package recommendations
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
          const packageName = packageMatch[1].trim().split('@')[0];

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

      // Look for packages in special tags
      const packageTagRegex = /<package\s+name=['"](.*?)['"]\s+(?:is_dev=['"](.*?)['"]\s+)?(?:description=['"](.*?)['"])?.*?\/>/g;
      let packageTagMatch;

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
      console.error("Error al detectar paquetes:", error);
    }

    setDetectedPackages(Array.from(detectedPackageNames));
    return suggestedPackages;
  };

  // Extract code from message
  const extractCodeFromMessage = (content: string): Array<{ language: string, code: string, fileName?: string }> => {
    const codeBlockRegex = /```(\w+)?\s*(?:\/\/|#)?\s*(?:file:\s*([^\n]+))?\n([\s\S]*?)\n```/g;

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

  // Get default filename based on language
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

  // Save code from a message
  const handleSaveCode = async (content: string): Promise<void> => {
    const codeBlockRegex = /```(?:(\w+))?\s*\n([\s\S]*?)\n```/g;
    let match;
    let savedCount = 0;
    let firstSavedFilePath = "";
    let savedFiles: {name: string, content: string, extension: string}[] = [];

    // Extract all code blocks
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

    // Prepare to save files
    try {
      for (const [index, codeBlock] of codeBlocks.entries()) {
        // Determine file extension based on language
        let fileExtension = ".js"; // Default to JavaScript

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

        // Generate unique filename based on content or code type
        let fileName = `generated_code_${index + 1}${fileExtension}`;

        // Try to detect a better name based on patterns in the code
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

        // Send request to create the file
        const response = await fetch("/api/files/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName,
            content: codeBlock.code,
            path: "", // Save to current path
          }),
        });

        if (!response.ok) {
          throw new Error(`Error al guardar el archivo ${fileName}`);
        }

        savedCount++;
        if (savedCount === 1) {
          firstSavedFilePath = fileName;
        }

        // Save file information for the send to explorer button
        savedFiles.push({
          name: fileName,
          content: codeBlock.code,
          extension: fileExtension.substring(1) // Without the dot
        });
      }

      sounds.play("save");

      // Success message with information about saved files
      let successMessage = "";
      if (savedCount === 1) {
        successMessage = `## ✅ Código guardado exitosamente\n\n📝 Se ha creado el archivo **${firstSavedFilePath}** con el código proporcionado.\n\n🔄 El explorador de archivos se actualizará automáticamente para mostrar el nuevo archivo.`;
      } else {
        successMessage = `## ✅ Código guardado exitosamente\n\n📝 Se han creado **${savedCount} archivos** con el código proporcionado.\n\n🔄 El explorador de archivos se actualizará automáticamente para mostrar los nuevos archivos.`;
      }

      // Add button to send to explorer/resources
      successMessage += `\n\n<div class="flex gap-2 mt-3">
        <button id="send-to-explorer" data-files='${JSON.stringify(savedFiles)}' style="padding: 8px 16px; background-color: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; font-size: 14px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Enviar al explorador
        </button>

        <button id="send-to-generator" data-files='${JSON.stringify(savedFiles)}' style="padding: 8px 16px; background-color: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; display: flex; align-items: center; font-size: 14px;">
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

      // Trigger event to update file explorer
      const fileEvent = new CustomEvent('files-updated', {
        detail: { forceRefresh: true }
      });
      window.dispatchEvent(fileEvent);

      // Look for and update file explorer if it exists
      setTimeout(() => {
        const fileExplorer = document.querySelector('[data-component="file-explorer"]');
        if (fileExplorer) {
          const refreshButton = fileExplorer.querySelector('button[title="Actualizar"]');
          if (refreshButton) {
            (refreshButton as HTMLButtonElement).click();
          } else {
            // Alternative to find refresh button
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

        // Force reload of file list directly
        const refreshEvent = new CustomEvent('refresh-files', {
          detail: { force: true }
        });
        window.dispatchEvent(refreshEvent);

        // Add listener for send to explorer button
        setTimeout(() => {
          const sendToExplorerButton = document.getElementById('send-to-explorer');
          if (sendToExplorerButton) {
            sendToExplorerButton.addEventListener('click', () => {
              try {
                const filesData = JSON.parse(sendToExplorerButton.getAttribute('data-files') || '[]');
                if (filesData && filesData.length > 0) {
                  // Emit event to be captured by file explorer
                  const sendToExplorerEvent = new CustomEvent('send-files-to-explorer', {
                    detail: { files: filesData }
                  });
                  window.dispatchEvent(sendToExplorerEvent);

                  // Show success message
                  toast({
                    title: "Archivos enviados",
                    description: `Se han enviado ${filesData.length} archivo(s) al explorador`,
                    duration: 3000
                  });
                  sounds.play("success", 0.3);

                  // Automatically switch to files tab
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

          // New event listener for generator button
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
        }, 500);
      }, 500);
    } catch (error) {
      console.error("Error al guardar código:", error);
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
        duration: 3000
      });
      sounds.play("error");
    }
  };

  // Process uploaded image file
  const processImageFile = (file: File, fileName: string) => {
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

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `He cargado una imagen llamada "${fileName}" para análisis.`
      }
    ]);

    // Function to compress image
    const compressImage = (imgBase64: string, maxWidth = 1200): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = imgBase64;

        img.onload = () => {
          // Calculate new dimensions maintaining ratio
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = maxWidth;
            height = height * ratio;
          }

          // Create canvas for compression
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          // Draw resized image on canvas
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("No se pudo crear el contexto del canvas"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Get compressed image (adjust quality as needed)
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };

        img.onerror = () => {
          reject(new Error("Error al cargar la imagen para compresión"));
        };
      });
    };

    // Send image for analysis (base64)
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Image = e.target?.result as string;
        if (!base64Image) {
          throw new Error("No se pudo leer la imagen");
        }

        // Compress image if large (>1MB)
        let processedImage = base64Image;
        if (file.size > 1024 * 1024) {
          toast({
            title: "Procesando imagen",
            description: "Comprimiendo imagen para análisis...",
            duration: 3000
          });
          processedImage = await compressImage(base64Image);
        }

        // Get only the base64 part without the prefix
        const base64Data = processedImage.split(',')[1];

        // Send image to server for analysis
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
              content: `## ⚠️ Error al procesar la imagen\n\n❌ No se pudo analizar la imagen debido a un error:\n\`\`\`\n${error}\n\`\`\``
            }
          ]);
        }
          {message.content.includes("```") ? (
            <>
              {message.content.split(/```[\s\S]*?```/g).map((part, index) => {
                if (part.startsWith('```') && part.endsWith('```')) {
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
        {/* Input area */}
        <div className="border-t p-2 sm:p-4 sticky bottom-0 bg-background mobile-safe-bottom">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex space-x-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={toggleSpeechRecognition} size="icon" variant="ghost">
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

                          if (isImage) {
                            toast({
                              title: "Procesando imagen",
                              description: `Preparando ${file.name} para análisis...`,
                              duration: 3000,
                            });

                            processImageFile(file, file.name);
                            return;
                          }

                          if (fileExtension === 'doc' || fileExtension === 'docx') {
                            toast({
                              title: "Procesando documento",
                              description: `Preparando ${file.name} para análisis...`,
                              duration: 3000,
                            });

                            const formData = new FormData();
                            formData.append("file", file);

                            fetch("/api/documents/extract-text", {
                              method: "POST",
                              body: formData,
                            })
                              .then((response) => {
                                if (!response.ok) {
                                  throw new Error(`Error al procesar el documento: ${response.statusText}`);
                                }
                                return response.json();
                              })
                              .then((data) => {
                                const content = data.text || "No se pudo extraer contenido del documento.";
                                const messagePrefix = `He cargado el archivo "${file.name}" para análisis:\n\n\`\`\`${fileExtension}\n`;
                                const maxLength = 10000;
                                const truncatedContent =
                                  content.length > maxLength
                                    ? content.substring(0, maxLength) + "\n\n[Contenido truncado debido al tamaño...]"
                                    : content;

                                const finalMessage = messagePrefix + truncatedContent + "\n```\n\nPor favor analiza este contenido.";
                                setInput(finalMessage);

                                toast({
                                  title: "Documento procesado",
                                  description: `${file.name} ha sido cargado (${(file.size / 1024).toFixed(2)} KB)`,
                                  duration: 3000,
                                });
                              })
                              .catch((error) => {
                                console.error("Error procesando documento:", error);
                                toast({
                                  title: "Error al procesar documento",
                                  description: "No se pudo extraer el contenido del archivo. Intenta con un formato diferente (.txt, .md).",
                                  variant: "destructive",
                                  duration: 5000,
                                });
                              });
                          } else {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const content = event.target?.result as string;
                              if (content) {
                                const messagePrefix = `He cargado el archivo "${file.name}" para análisis:\n\n\`\`\`${fileExtension}\n`;
                                const maxLength = 10000;
                                const truncatedContent =
                                  content.length > maxLength
                                    ? content.substring(0, maxLength) + "\n\n[Contenido truncado debido al tamaño...]"
                                    : content;

                                const finalMessage = messagePrefix + truncatedContent + "\n```\n\nPor favor analiza este contenido.";
                                setInput(finalMessage);

                                toast({
                                  title: "Archivo cargado",
                                  description: `${file.name} ha sido cargado (${(file.size / 1024).toFixed(2)} KB)`,
                                  duration: 3000,
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

          <form onSubmit={handleSubmit} className="relative overflow-hidden">
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
              type="submit"
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
          </form>
        </div>

        {/* Confirmation dialog for delete */}
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

        {/* Dialog to save conversation */}
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
              <Button
                onClick={() => {
                  if (newConversationTitle.trim()) {
                    saveCurrentConversation(newConversationTitle.trim());
                    setNewConversationTitle("");
                    setShowConversationDialog(false);
                  }
                }}
              >
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Dialog to install packages */}
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

      {/* Mobile overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain p-4 mobile-scroll">
        <ScrollArea className="h-full min-h-[calc(100vh-16rem)]">
          <div className="space-y-4 pb-20">
            {isChatVisible && messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'} rounded-lg p-4 max-w-3xl relative group`}>
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default AssistantChat;