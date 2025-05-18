export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
  type: MessageType;
  reactions: { [key: string]: string[] }; // emoji: userIds[]
  poll?: Poll;
}

export type MessageType = 'text' | 'poll';

export interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: { [key: string]: string[] }; // optionIndex: userIds[]
}

export const EMOJI_REACTIONS = ['👍', '❤️', '😊', '🎉', '👏', '🤔'] as const; 