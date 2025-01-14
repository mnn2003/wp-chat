import { create } from 'zustand';
import { Profile, Chat, Message } from './types';

interface AppState {
  currentUser: Profile | null;
  chats: Chat[];
  activeChat: Chat | null;
  messages: Record<string, Message[]>;
  setCurrentUser: (user: Profile | null) => void;
  setChats: (chats: Chat[]) => void;
  setActiveChat: (chat: Chat | null) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessageStatus: (chatId: string, messageId: string, status: string) => void;
}

export const useStore = create<AppState>((set) => ({
  currentUser: null,
  chats: [],
  activeChat: null,
  messages: {},
  setCurrentUser: (user) => set({ currentUser: user }),
  setChats: (chats) => set({ chats }),
  setActiveChat: (chat) => set({ activeChat: chat }),
  addMessage: (chatId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [...(state.messages[chatId] || []), message],
      },
    })),
  updateMessageStatus: (chatId, messageId, status) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: state.messages[chatId]?.map((msg) =>
          msg.id === messageId ? { ...msg, status } : msg
        ) || [],
      },
    })),
}));