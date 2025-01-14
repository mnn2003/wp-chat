import React from 'react';
import { ChatList } from '../components/ChatList';
import { ChatWindow } from '../components/ChatWindow';

const Chat = () => {
  return (
    <div className="h-screen flex">
      <ChatList />
      <ChatWindow />
    </div>
  );
};

export default Chat;