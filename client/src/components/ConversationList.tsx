import { useState } from "react";
import { Conversation } from "@/lib/conversationStorage";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  PanelLeft, 
  PanelRight,
  Search,
  X 
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface ConversationListProps {
  conversations: Array<{id: string; title: string; date: string}>;
  loadConversation: (id: string) => void;
  handleDeleteConversation: (id: string) => void;
  currentConversationId: string | null;
}

export function ConversationList({ 
  conversations, 
  loadConversation, 
  handleDeleteConversation,
  currentConversationId 
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isListVisible, setIsListVisible] = useState(true);

  const filteredConversations = conversations.filter(conv => 
    conv.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`flex flex-col h-full transition-all duration-300 border-r ${!isListVisible ? 'w-[60px]' : 'w-[280px]'}`}>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${!isListVisible ? 'hidden' : ''}`}>Conversaciones</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsListVisible(!isListVisible)}
            className="flex-shrink-0"
            title={isListVisible ? "Ocultar panel" : "Mostrar panel"}
          >
            {isListVisible ? <PanelLeft className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
          </Button>
        </div>
        <div className={`relative ${!isListVisible && 'hidden'}`}>
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-slate-400" />
          <Input
            placeholder="Buscar conversaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {filteredConversations.length > 0 ? (
          <ul className="space-y-1">
            {filteredConversations.map((conv) => (
              <li key={conv.id} className={`flex items-center group ${!isListVisible ? 'justify-center' : 'justify-between'}`}>
                <Button
                  variant={conv.id === currentConversationId ? "secondary" : "ghost"}
                  className={`${isListVisible ? 'w-full justify-start' : 'w-10 h-10'} text-left`}
                  onClick={() => loadConversation(conv.id)}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  {isListVisible && (
                    <span className="ml-2 truncate">{conv.title || 'Nueva conversación'}</span>
                  )}
                </Button>
                {isListVisible && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 h-8 w-8"
                    onClick={() => handleDeleteConversation(conv.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
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
    </div>
  );
}



