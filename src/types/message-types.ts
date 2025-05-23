export type MessageType = 'text' | 'poll' | 'system';

export interface BaseMessage {
  id: string;
  timestamp: number;
  userId: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

export interface ChatMessageInput {
  userId: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  text?: string;
  pollId?: string;
  type: MessageType;
}

export interface ChatMessage extends ChatMessageInput {
  id: string;
  timestamp: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // Array of user IDs who voted for this option
}

export interface Poll {
  id: string;
  timestamp: number;
  userId: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  question: string;
  options: PollOption[];
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface Message extends BaseMessage {
  text?: string;
  pollId?: string;
  type: MessageType;
} 