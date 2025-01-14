/*
  # Initial Schema for WhatsApp Clone

  1. New Tables
    - `profiles`
      - User profile information including status and avatar
    - `chats`
      - Represents both 1-on-1 and group chats
    - `chat_participants`
      - Links users to chats they're part of
    - `messages`
      - Stores all chat messages
    - `message_status`
      - Tracks message delivery and read status
    - `attachments`
      - Stores media attachment metadata

  2. Security
    - Enable RLS on all tables
    - Add policies for secure access
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  status_message text DEFAULT '',
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chats table
CREATE TABLE chats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type text NOT NULL CHECK (type IN ('direct', 'group')),
  name text, -- NULL for direct chats
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chat participants
CREATE TABLE chat_participants (
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (chat_id, profile_id)
);

-- Messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id),
  content text,
  type text DEFAULT 'text' CHECK (type IN ('text', 'media')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_encrypted boolean DEFAULT true
);

-- Message status
CREATE TABLE message_status (
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (message_id, profile_id)
);

-- Attachments table
CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Chats policies
CREATE POLICY "Users can view their chats"
  ON chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_id = id
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Chat participants policies
CREATE POLICY "Users can view participants of their chats"
  ON chat_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id
      AND cp.profile_id = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in their chats"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_id = messages.chat_id
      AND profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their chats"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_id = messages.chat_id
      AND profile_id = auth.uid()
    )
  );

-- Message status policies
CREATE POLICY "Users can view message status in their chats"
  ON message_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN chat_participants cp ON cp.chat_id = m.chat_id
      WHERE m.id = message_id
      AND cp.profile_id = auth.uid()
    )
  );

-- Attachments policies
CREATE POLICY "Users can view attachments in their chats"
  ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN chat_participants cp ON cp.chat_id = m.chat_id
      WHERE m.id = message_id
      AND cp.profile_id = auth.uid()
    )
  );

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();