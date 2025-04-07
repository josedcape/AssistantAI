import { localStorageUtils } from './storage';

// Tipos para el almacenamiento de conversaciones
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  modelId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Prefijo para las claves de conversación
const CONVERSATION_PREFIX = 'conversation_';

// Obtener todas las conversaciones guardadas
export const getConversations = (): Conversation[] => {
  try {
    const allKeys = Object.keys(localStorage);
    const conversationKeys = allKeys.filter(key => 
      key.startsWith(localStorageUtils.getFullKey(CONVERSATION_PREFIX))
    );

    const conversations: Conversation[] = [];

    for (const key of conversationKeys) {
      const rawKey = key.replace(localStorageUtils.getFullKey(CONVERSATION_PREFIX), '');
      const conversation = getConversation(rawKey);
      if (conversation) {
        conversations.push(conversation);
      }
    }

    // Ordenar por fecha de actualización (más reciente primero)
    return conversations.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    return [];
  }
};

// Guardar una conversación
export const saveConversation = (conversation: Conversation): boolean => {
  try {
    const { id } = conversation;
    localStorageUtils.saveData(`${CONVERSATION_PREFIX}${id}`, conversation);
    return true;
  } catch (error) {
    console.error('Error al guardar conversación:', error);
    return false;
  }
};

// Obtener una conversación por ID
export const getConversation = (id: string): Conversation | null => {
  try {
    return localStorageUtils.getData(`${CONVERSATION_PREFIX}${id}`, null);
  } catch (error) {
    console.error(`Error al obtener conversación ${id}:`, error);
    return null;
  }
};

// Eliminar una conversación
export const deleteConversation = (id: string): boolean => {
  try {
    localStorageUtils.removeData(`${CONVERSATION_PREFIX}${id}`);
    return true;
  } catch (error) {
    console.error(`Error al eliminar conversación ${id}:`, error);
    return false;
  }
};

// Generar un ID único para la conversación
export const generateConversationId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Generar un título para la conversación basado en el primer mensaje
export const generateConversationTitle = (messages: Message[]): string => {
  // Buscar el primer mensaje del usuario
  const firstUserMessage = messages.find(msg => msg.role === 'user');

  if (firstUserMessage) {
    // Limitar a 30 caracteres y añadir puntos suspensivos si es más largo
    const content = firstUserMessage.content.trim();
    return content.length > 30 ? content.substring(0, 30) + '...' : content;
  }

  return `Conversación ${new Date().toLocaleString()}`;
};

// Obtener la última conversación activa
export const getActiveConversation = (): string | null => {
  try {
    return localStorageUtils.getData('activeConversation', null);
  } catch (error) {
    console.error('Error al obtener conversación activa:', error);
    return null;
  }
};

// Establecer la conversación activa
export const setActiveConversation = (id: string | null): boolean => {
  try {
    if (id) {
      localStorageUtils.saveData('activeConversation', id);
    } else {
      localStorageUtils.removeData('activeConversation');
    }
    return true;
  } catch (error) {
    console.error('Error al establecer conversación activa:', error);
    return false;
  }
};

export {
  getConversation,
  getConversations,
  saveConversation,
  deleteConversation,
  setActiveConversation,
  getActiveConversation,
  generateConversationId,
  generateConversationTitle,
  type Conversation,
  type Message
};