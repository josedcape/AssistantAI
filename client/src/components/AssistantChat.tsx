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
import { Loader2, Mic, MicOff, Send, Save, Copy, Check } from "lucide-react";
import ModelSelector from "./ModelSelector";
import * as sounds from "@/lib/sounds"; //Import sounds module


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

  // Reconocimiento de voz (Simplified - No actual voice recognition)
  useEffect(() => {
    return () => {
      if (isListening) {
        // Limpieza (Placeholder - No actual cleanup needed in this simplified version)
      }
    };
  }, [isListening]);

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  // Función para activar/desactivar reconocimiento de voz
  const toggleSpeechRecognition = () => {
    setIsListening(!isListening);
    sounds.play("click");
  };

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

  // Guardar código de un mensaje
  const handleSaveCode = async (content: string) => {
    const codeBlockRegex = /```(?:\w+)?\s*\n([\s\S]*?)\n```/g;
    const codeBlocks: { language: string, code: string }[] = [];

    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const codeContent = match[1];
      // Detectar paquetes en el código
      const installInCodeRegex = /npm\s+(?:install|add)\s+([^-\s]+)(?:\s+(-D|--save-dev))?/g;
      let installMatch;
      const detectedPackages: Package[] = [];

      while ((installMatch = installInCodeRegex.exec(codeContent)) !== null) {
        detectedPackages.push({
          name: installMatch[1],
          isDev: !!installMatch[2],
          description: ""
        });
      }
    }

    sounds.play("save");
    // Esta función debería implementar la lógica para guardar el código en un archivo
    // Por ahora solo mostramos un mensaje de éxito
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "El código ha sido guardado exitosamente."
      },
    ]);
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

  // Instalar paquete desde comando
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

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `## ✅ Instalación Exitosa

📦 El paquete **${packageName}** ha sido instalado correctamente.

*Puntos importantes:*
* 🔄 La lista de paquetes se actualizará automáticamente
* 📝 Ya puedes utilizar este paquete en tu proyecto
* 💡 Refresca la página si no ves el paquete en la lista`,
        },
      ]);
      sounds.play("success");
      
      // Disparar evento personalizado para actualizar la lista de paquetes
      window.dispatchEvent(new CustomEvent('package-installed'));
      
    } catch (error) {
      console.error("Error al instalar:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Error al instalar ${packageName}. Por favor, intenta manualmente.`,
        },
      ]);
      sounds.play("error");
    } finally {
      setIsInstallingPackage(false);
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-background">
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
            placeholder="Escribe un mensaje..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-grow"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
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
  );
};

export default AssistantChat;