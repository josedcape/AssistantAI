
import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ModelSelector } from "./ModelSelector";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  fileChanges?: {
    file: string;
    content: string;
  }[];
}

interface AssistantChatProps {
  projectId: number | null;
  onApplyChanges?: (fileUpdates: {name: string, content: string}[]) => void;
}

const AssistantChat: React.FC<AssistantChatProps> = ({ projectId, onApplyChanges }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "system",
      content: "¡Hola! Soy tu asistente de código. Puedes pedirme que haga cambios en tu código o crear nuevos archivos. ¿En qué puedo ayudarte hoy?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [modelId, setModelId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Cargar el modelo activo al inicio
  useEffect(() => {
    const fetchActiveModel = async () => {
      try {
        const response = await apiRequest("GET", "/api/models");
        if (response.ok) {
          const data = await response.json();
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
  }, []);

  // Autoscroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    try {
      // Agregar mensaje de espera mientras se procesa
      const loadingId = generateId();
      setMessages(prev => [...prev, {
        id: loadingId,
        role: "assistant",
        content: "Pensando...",
        timestamp: new Date()
      }]);

      // Hacer la petición al servidor
      const response = await apiRequest("POST", "/api/assistant-chat", {
        message: input,
        projectId,
        modelId: modelId, // Incluir el modelo seleccionado
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
      });
      
      const result = await response.json();
      
      // Reemplazar el mensaje de carga con la respuesta real
      setMessages(prev => prev.map(m => 
        m.id === loadingId ? {
          id: generateId(),
          role: "assistant",
          content: result.message,
          timestamp: new Date(),
          fileChanges: result.fileChanges || []
        } : m
      ));
      
      // Si hay cambios de archivos, mostrar botón para aplicarlos
      if (result.fileChanges && result.fileChanges.length > 0 && onApplyChanges) {
        setTimeout(() => {
          if (confirm("¿Deseas aplicar los cambios propuestos a los archivos?")) {
            onApplyChanges(result.fileChanges);
            toast({
              title: "Cambios aplicados",
              description: `Se aplicaron cambios a ${result.fileChanges.length} archivo(s)`,
            });
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error al comunicarse con el asistente:", error);
      toast({
        title: "Error",
        description: "No se pudo procesar tu solicitud. Inténtalo de nuevo.",
        variant: "destructive"
      });
      
      // Eliminar mensaje de carga y mostrar error
      setMessages(prev => [...prev.filter(m => m.content !== "Pensando..."), {
        id: generateId(),
        role: "assistant",
        content: "Lo siento, ocurrió un error al procesar tu solicitud. Por favor, inténtalo de nuevo.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para aplicar syntax highlighting a un bloque de código
  const applySyntaxHighlighting = (code: string, language: string) => {
    // Definir patrones para diferentes elementos de la sintaxis
    const keywords = /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|try|catch|async|await|new|this|extends|implements|interface|type|public|private|protected|static|get|set|super|null|undefined|true|false)\b/g;
    const types = /\b(string|number|boolean|any|void|never|object|symbol|bigint|null|undefined|Array|Promise|Map|Set|Record|Partial|Required|Pick|Omit|Exclude|Extract|ReturnType)\b/g;
    const strings = /(["'`])(.*?)\1/g;
    const comments = /(\/\/.*?$)|(\/\*[\s\S]*?\*\/)/gm;
    const htmlTags = /(&lt;[^&]*&gt;)|(<[^>]*>)/g;
    const jsxAttrs = /\b([a-zA-Z][-a-zA-Z0-9]*)(=["'].*?["'])/g;
    const numbers = /\b(\d+(\.\d+)?)\b/g;
    const functions = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\(/g;
    const brackets = /(\{|\}|\(|\)|\[|\])/g;
    const components = /(<)([A-Z][a-zA-Z0-9]*)(\s|>|\/>)/g;
    
    // Escapar caracteres HTML
    let highlightedCode = code.replace(/&/g, "&amp;")
                             .replace(/</g, "&lt;")
                             .replace(/>/g, "&gt;");
    
    // Aplicar resaltado según el lenguaje
    if (language === 'js' || language === 'javascript' || language === 'ts' || language === 'typescript' || language === 'jsx' || language === 'tsx') {
      // Aplicar resaltado para JavaScript/TypeScript/JSX/TSX
      highlightedCode = highlightedCode
        .replace(comments, '<span class="text-slate-500">$&</span>')
        .replace(strings, '<span class="text-amber-300">$&</span>')
        .replace(keywords, '<span class="text-purple-400">$&</span>')
        .replace(types, '<span class="text-cyan-300">$&</span>')
        .replace(numbers, '<span class="text-orange-300">$&</span>')
        .replace(functions, '<span class="text-blue-400">$1</span>(')
        .replace(brackets, '<span class="text-slate-400">$&</span>');
        
      if (language === 'jsx' || language === 'tsx') {
        highlightedCode = highlightedCode
          .replace(components, '$1<span class="text-green-400">$2</span>$3')
          .replace(jsxAttrs, '<span class="text-yellow-300">$1</span><span class="text-slate-300">$2</span>');
      }
    } else if (language === 'html' || language === 'xml') {
      // Aplicar resaltado para HTML
      highlightedCode = highlightedCode
        .replace(/(<!DOCTYPE[^>]*>)/g, '<span class="text-slate-500">$1</span>')
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="text-slate-500">$1</span>')
        .replace(/(&lt;\/?)([-a-zA-Z0-9]+)/g, '$1<span class="text-orange-400">$2</span>')
        .replace(/\s([-a-zA-Z0-9:]+)=(&quot;|')(.*?)(\2)/g, ' <span class="text-yellow-300">$1</span>=<span class="text-green-300">$2$3$4</span>');
    } else if (language === 'css') {
      // Aplicar resaltado para CSS
      highlightedCode = highlightedCode
        .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-slate-500">$1</span>')
        .replace(/([a-zA-Z-]+):/g, '<span class="text-cyan-300">$1</span>:')
        .replace(/(#[a-fA-F0-9]{3,6})/g, '<span class="text-orange-300">$1</span>')
        .replace(/(\.[a-zA-Z-_]+)/g, '<span class="text-yellow-300">$1</span>')
        .replace(/@([a-zA-Z-]+)/g, '@<span class="text-pink-400">$1</span>');
    } else if (language === 'python' || language === 'py') {
      // Aplicar resaltado para Python
      highlightedCode = highlightedCode
        .replace(/(#.*?$)/gm, '<span class="text-slate-500">$1</span>')
        .replace(/\b(def|class|import|from|as|if|elif|else|for|while|try|except|finally|with|return|yield|raise|break|continue|pass|True|False|None|lambda|global|nonlocal|in|is|not|and|or)\b/g, '<span class="text-purple-400">$1</span>')
        .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\(/g, '<span class="text-blue-400">$1</span>(')
        .replace(/(".*?"|'.*?')/g, '<span class="text-amber-300">$1</span>')
        .replace(/\b(\d+(\.\d+)?)\b/g, '<span class="text-orange-300">$1</span>');
    }

    return highlightedCode;
  };

  // Función para renderizar mensajes con formato code
  const renderMessageContent = (content: string) => {
    // Buscar bloques de código usando regex
    const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Añadir texto antes del bloque de código
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
            {content.substring(lastIndex, match.index)}
          </span>
        );
      }

      const language = match[1] || 'text';
      const code = match[2];

      // Aplicar syntax highlighting
      const highlightedCode = applySyntaxHighlighting(code, language);

      // Añadir bloque de código con mejor styling
      parts.push(
        <div key={`code-${match.index}`} className="my-3 rounded-md overflow-hidden border border-slate-700 bg-slate-900 shadow-lg">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700">
            <div className="flex items-center">
              {language && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                  {language}
                </span>
              )}
            </div>
            <div className="flex space-x-1">
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-xs h-6 px-2 hover:bg-slate-700"
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  toast({ title: "Copiado", description: "Código copiado al portapapeles" });
                }}
              >
                <i className="ri-clipboard-line mr-1"></i>
                Copiar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-6 px-2 hover:bg-slate-700"
                onClick={() => {
                  // Implementación futura: podría abrir el código en el editor
                  toast({ title: "Acción", description: "Función para abrir en editor" });
                }}
              >
                <i className="ri-code-line mr-1"></i>
                Editar
              </Button>
            </div>
          </div>
          <div className="p-3 overflow-x-auto bg-[#1e1e2e]">
            <pre className="text-sm font-mono leading-relaxed">
              <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
            </pre>
          </div>
          <div className="border-t border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-400">
            <p>Código {language} - {code.split('\n').length} líneas</p>
          </div>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    // Añadir texto restante después del último bloque de código
    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className="whitespace-pre-wrap">
          {content.substring(lastIndex)}
        </span>
      );
    }

    return parts.length > 0 ? parts : <span className="whitespace-pre-wrap">{content}</span>;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 border rounded-lg">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-medium flex items-center">
          <i className="ri-robot-line mr-2 text-blue-500"></i>
          Asistente de Código
        </h3>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => window.history.back()}
            title="Volver al área de desarrollo"
          >
            <i className="ri-arrow-left-line mr-1"></i>
            Volver
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setMessages([
              {
                id: "welcome",
                role: "system",
                content: "¡Hola! Soy tu asistente de código. Puedes pedirme que haga cambios en tu código o crear nuevos archivos. ¿En qué puedo ayudarte hoy?",
                timestamp: new Date()
              }
            ])}
          >
            <i className="ri-refresh-line mr-1"></i>
            Nueva conversación
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-3/4 rounded-lg p-3 relative ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : message.role === "system"
                    ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border"
                }`}
              >
                {message.role !== "user" && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="absolute top-2 right-2 h-6 w-6 p-0"
                    onClick={() => {
                      navigator.clipboard.writeText(message.content);
                      toast({ title: "Copiado", description: "Mensaje copiado al portapapeles" });
                    }}
                    title="Copiar mensaje"
                  >
                    <i className="ri-clipboard-line"></i>
                  </Button>
                )}
                
                {renderMessageContent(message.content)}
                
                {message.fileChanges && message.fileChanges.length > 0 && (
                  <div className="mt-3 border-t pt-2">
                    <p className="text-sm font-medium mb-2">Cambios propuestos:</p>
                    <div className="space-y-2">
                      {message.fileChanges.map((change, idx) => (
                        <div key={idx} className="text-sm bg-slate-200 dark:bg-slate-800 p-2 rounded">
                          <div className="font-mono">{change.file}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="sm"
                        onClick={() => onApplyChanges && onApplyChanges(message.fileChanges || [])}
                      >
                        Aplicar cambios
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => window.history.back()}
                      >
                        Volver al editor
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="text-xs opacity-70 mt-1 text-right">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t">
        <div className="flex">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
            className="flex-1 resize-none"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="ml-2 self-end"
          >
            {isLoading ? (
              <i className="ri-loader-4-line animate-spin"></i>
            ) : (
              <i className="ri-send-plane-fill"></i>
            )}
          </Button>
        </div>
      {/* Selector de modelo */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">Modelo de IA:</div>
          <ModelSelector 
            onModelChange={(newModelId) => setModelId(newModelId)} 
          />
        </div>
      </div>
    </div>
    </div>
  );
};

export default AssistantChat;
