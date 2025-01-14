import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { Send, Paperclip, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useInView } from 'react-intersection-observer';

export const ChatWindow = () => {
  const { activeChat, currentUser, messages, addMessage } = useStore();
  const [newMessage, setNewMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const { ref, inView } = useInView();

  useEffect(() => {
    if (!activeChat) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles(*)')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: false })
        .range(page * 50, (page + 1) * 50 - 1);

      if (data) {
        data.reverse().forEach((message) => addMessage(activeChat.id, message));
      }
    };

    fetchMessages();

    const subscription = supabase
      .channel(`chat:${activeChat.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${activeChat.id}`,
      }, (payload) => {
        addMessage(activeChat.id, payload.new);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeChat, page, addMessage]);

  useEffect(() => {
    if (inView) {
      setPage((p) => p + 1);
    }
  }, [inView]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat || !currentUser) return;

    const message = {
      chat_id: activeChat.id,
      sender_id: currentUser.id,
      content: newMessage,
      type: 'text',
    };

    const { error } = await supabase.from('messages').insert(message);

    if (!error) {
      setNewMessage('');
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Select a chat to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold">
          {activeChat.type === 'direct'
            ? activeChat.chat_participants[1]?.profiles.username
            : activeChat.name}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div ref={ref} className="h-20" />
        {messages[activeChat.id]?.map((message, index) => (
          <div
            key={message.id}
            className={`flex mb-4 ${
              message.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.sender_id === currentUser?.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100'
              }`}
            >
              <p>{message.content}</p>
              <span className="text-xs opacity-75">
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Paperclip className="w-5 h-5 text-gray-500" />
          </button>
          <button
            className="p-2 hover:bg-gray-100 rounded-full"
            onClick={() => setShowEmoji(!showEmoji)}
          >
            <Smile className="w-5 h-5 text-gray-500" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message"
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={sendMessage}
            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {showEmoji && (
          <div className="absolute bottom-20 right-4">
            <EmojiPicker
              onEmojiClick={(emoji) => {
                setNewMessage((prev) => prev + emoji.emoji);
                setShowEmoji(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};