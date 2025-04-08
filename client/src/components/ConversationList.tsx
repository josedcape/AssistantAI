import { useState, useEffect } from "react";
import { Conversation, getConversations, deleteConversation } from "@/lib/conversationStorage";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Search, Trash2, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import * as sounds from "@/lib/sounds";

interface ConversationListProps {
  onSelect: (conversation: Conversation) => void;
  onNew: () => void;
  activeConversationId?: string | null;
}

export function ConversationList({ onSelect, onNew, activeConversationId }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [isListVisible, setIsListVisible] = useState(true);
  const isMobile = useIsMobile();

  const handleDelete = (id: string) => {
    setConversationToDelete(id);
  };

  useEffect(() => {
    const loadConversations = () => {
      const convs = getConversations();
      // Ordenar por fecha más reciente
      convs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setConversations(convs);
    };

    loadConversations();

    // Actualizar la lista cuando cambia el almacenamiento
    const handleStorageChange = () => {
      loadConversations();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const filteredConversations = conversations.filter(conv => 
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteConversation = (id: string) => {
    deleteConversation(id);

    // Eliminar también del localStorage para mayor consistencia
    try {
      localStorage.removeItem(`conversation-${id}`);
    } catch (e) {
      console.warn("No se pudo eliminar de localStorage:", e);
    }

    // Actualizar la lista de conversaciones
    setConversations(prevConversations => 
      prevConversations.filter(conv => conv.id !== id)
    );

    // Reproducir sonido
    sounds.play("click");

    // Cerrar el diálogo
    setConversationToDelete(null);

    // Si la conversación activa es la que se elimina, crear una nueva
    if (activeConversationId === id) {
      onNew();
    }
  };

  return (
    <div className={`flex flex-col h-full transition-all duration-300 ${!isListVisible && 'w-[60px]'}`}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${!isListVisible && 'hidden'}`}>Conversaciones</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsListVisible(!isListVisible)}
            className={`${isMobile ? 'hidden' : ''}`}
          >
            {isListVisible ? <PanelLeft className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
          </Button>
        </div>
        <Button 
          onClick={onNew} 
          className={`${isListVisible ? 'w-full' : 'w-10'} mb-2 transition-all`}
          variant="outline"
          title="Nueva conversación"
        >
          <Plus className="h-4 w-4" />
          {isListVisible && <span className="ml-2">Nueva conversación</span>}
        </Button>
        <div className={`relative ${!isListVisible && 'hidden'}`}>
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-slate-400" />
          <Input
            placeholder="Buscar conversaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {filteredConversations.length > 0 ? (
          <ul className="space-y-1">
            {filteredConversations.map((conv) => (
              <li key={conv.id} className={`flex items-center group ${!isListVisible ? 'justify-center' : ''}`}>
                <Button
                  variant={conv.id === activeConversationId ? "secondary" : "ghost"}
                  className={`${isListVisible ? 'w-full justify-start' : 'w-10'} text-left h-auto py-2 px-3`}
                  onClick={() => onSelect(conv)}
                  title={!isListVisible ? conv.title : undefined}
                >
                  <MessageSquare className={`h-4 w-4 ${isListVisible ? 'mr-2' : ''} flex-shrink-0`} />
                  {isListVisible && (
                    <div className="truncate flex-grow">
                      <p className="truncate font-medium">{conv.title}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(conv.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(conv.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      className="text-red-500 focus:text-red-500" 
                      onClick={() => setConversationToDelete(conv.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4">
            <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-center text-sm">
              {searchTerm ? "No se encontraron conversaciones" : "No hay conversaciones guardadas"}
            </p>
          </div>
        )}
      </div>

      {/* Diálogo de confirmación para eliminar conversación */}
      <AlertDialog open={!!conversationToDelete} onOpenChange={(open) => !open && setConversationToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esta conversación se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => conversationToDelete && handleDeleteConversation(conversationToDelete)}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}