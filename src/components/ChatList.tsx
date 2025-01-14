import React, { useEffect } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

export const ChatList = () => {
  const { chats, setChats, setActiveChat, activeChat } = useStore();

  useEffect(() => {
    const fetchChats = async () => {
      const { data } = await supabase
        .from('chats')
        .select(`
          *,
          chat_participants (
            profile_id,
            profiles (
              username,
              avatar_url,
              is_online
            )
          )
        `)
        .order('updated_at', { ascending: false });

      if (data) setChats(data);
    };

    fetchChats();

    const subscription = supabase
      .channel('chat_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, fetchChats)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [setChats]);

  return (
    <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Chats</h2>
        <div className="space-y-2">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`p-3 rounded-lg cursor-pointer hover:bg-gray-100 ${
                activeChat?.id === chat.id ? 'bg-gray-100' : ''
              }`}
              onClick={() => setActiveChat(chat)}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img
                    src={chat.type === 'direct' ? chat.chat_participants[1]?.profiles.avatar_url : '/group.png'}
                    alt=""
                    className="w-12 h-12 rounded-full"
                  />
                  {chat.type === 'direct' && chat.chat_participants[1]?.profiles.is_online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">
                    {chat.type === 'direct'
                      ? chat.chat_participants[1]?.profiles.username
                      : chat.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};