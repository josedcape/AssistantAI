
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { MessageSquare, Edit, Trash2, Search, Plus, Save } from "lucide-react";
import { 
  getConversations, 
  getConversation, 
  deleteConversation,
  saveConversation,
  Conversation
} from '@/lib/conversationStorage';

interface ConversationListProps {
  onSelect: (conversation: Conversation) => void;
  onNew: () => void;
  activeConversationId: string | null;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  onSelect,
  onNew,
  activeConversationId
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTitle, setEditingTitle] = useState<{id: string, title: string} | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);

  // Cargar conversaciones
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = () => {
    const loadedConversations = getConversations();
    setConversations(loadedConversations);
  };

  // Filtrar conversaciones según búsqueda
  const filteredConversations = conversations.filter(conv => 
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Editar título de conversación
  const handleEditTitle = (id: string, newTitle: string) => {
    const conversation = getConversation(id);
    if (conversation) {
      conversation.title = newTitle;
      conversation.updatedAt = new Date();
      saveConversation(conversation);
      setEditingTitle(null);
      loadConversations();
    }
  };

  // Eliminar conversación
  const handleDeleteConversation = (id: string) => {
    deleteConversation(id);
    setShowDeleteDialog(null);
    loadConversations();
  };

  // Formatear fecha para mostrar
  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div className="flex flex-col h-full">
      {/* Cabecera */}
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-medium">Conversaciones</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onNew}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Nueva conversación
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Buscador */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversación"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      
      {/* Lista de conversaciones */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <div 
                key={conv.id} 
                className={`p-2 rounded-md cursor-pointer hover:bg-accent flex justify-between items-start ${activeConversationId === conv.id ? 'bg-accent' : ''}`}
              >
                <div className="flex-1" onClick={() => onSelect(conv)}>
                  {editingTitle && editingTitle.id === conv.id ? (
                    <Input
                      value={editingTitle.title}
                      onChange={(e) => setEditingTitle({...editingTitle, title: e.target.value})}
                      onBlur={() => handleEditTitle(conv.id, editingTitle.title)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditTitle(conv.id, editingTitle.title);
                        if (e.key === 'Escape') setEditingTitle(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <div className="font-medium truncate">{conv.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {conv.messages.length} mensajes · {formatDate(conv.updatedAt)}
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex space-x-1 ml-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => setEditingTitle({id: conv.id, title: conv.title})}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Editar título
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7"
                          onClick={() => setShowDeleteDialog(conv.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Eliminar conversación
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              {searchTerm ? 'No se encontraron resultados' : 'No hay conversaciones guardadas'}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={showDeleteDialog !== null} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar conversación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => showDeleteDialog && handleDeleteConversation(showDeleteDialog)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
