export interface User {
  email: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
  lastSeen: number;
  bio?: string;
  phone?: string;
  username?: string;
  typingState?: 'typing' | 'recording_voice' | null;
  typingTarget?: string;
  role?: 'admin' | 'user';
  avatarUrl?: string;
}

export interface CallSession {
  id: string;
  caller: string;
  callee: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended';
  offer?: any;
  answer?: any;
  callerCandidates: any[];
  calleeCandidates: any[];
  createdAt: number;
}

export interface CallLog {
  id: string;
  caller: string;
  callerName: string;
  callee: string;
  calleeName: string;
  type: 'audio' | 'video';
  status: 'missed' | 'completed' | 'rejected';
  timestamp: number;
  duration?: number;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // List of emails who reacted
}

export interface Message {
  id: string;
  sender: string;
  receiver: string;
  text: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'voice' | 'image' | 'video' | 'file';
  mediaUrl?: string; // Base64 or mock binary URL
  mediaName?: string;
  mediaSize?: string;
  mediaDuration?: number; // Voice or Video duration
  replyToId?: string;
  replyToText?: string;
  replyToSender?: string;
  isEdited?: boolean;
  isPinned?: boolean;
  reactions?: MessageReaction[];
}

export interface Story {
  id: string;
  email: string;
  name: string;
  mediaUrl: string;
  text?: string;
  timestamp: number;
  viewers: string[];
}

export type AppScreen = 'splash' | 'login' | 'home' | 'call' | 'admin_login' | 'admin_dashboard';
