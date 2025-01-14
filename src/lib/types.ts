export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  status_message: string;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  chat_participants: {
    profile_id: string;
    profiles: {
      username: string;
      avatar_url: string | null;
      is_online: boolean;
    };
  }[];
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'media';
  created_at: string;
  updated_at: string;
  is_encrypted: boolean;
  sender?: Profile;
}