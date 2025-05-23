export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // Array of user IDs who voted for this option
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string; // User ID of the creator
  createdAt: number;
  updatedAt?: number;
  userAvatar?: string;
  userName?: string;
  userEmail?: string;
}

export type MessageType = 'text' | 'poll';

// Main interface for chat messages in Yjs
export interface ChatMessage {
  id: string;
  userId: string;       // ID of the user who sent/triggered this message
  userName?: string;    // Display name of that user
  userEmail?: string;   // Email of that user
  userAvatar?: string;  // Avatar URL of that user
  text?: string;         // Message content (for text messages)
  timestamp: number;
  pollId?: string;      // If the message represents a poll, ID of the poll in the Yjs polls array
  type: MessageType; // Type of message: 'text' or 'poll'
}

/**
 * @deprecated Use ChatMessage instead for Yjs synchronized messages.
 * The old Message interface can be phased out or kept if used distinctly elsewhere.
 */
export interface Message {
  id?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userAvatar?: string;
  text?: string;
  pollId?: string;
  type: MessageType;
  timestamp?: number;
}

// EMOJI_REACTIONS can remain as is if used for a different reaction system
export const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']; 