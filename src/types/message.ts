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
}

export type MessageType = 'text' | 'poll';

// Main interface for chat messages in Yjs
export interface ChatMessage {
  id: string;
  userId: string;       // ID of the user who sent/triggered this message
  userName?: string;    // Display name of that user
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
  id: string;
  content: string;
  sender: string; // Potentially user ID or name - was ambiguous
  timestamp: number;
  type: MessageType; // This was 'text' | 'poll' already
  reactions: { [key: string]: string[] }; // emoji: userIds[]
  poll?: Poll; // This Poll type might need to align with Yjs Poll structure if different
  // Potentially add userId, userName, userAvatar if this old type is still used
}

// EMOJI_REACTIONS can remain as is if used for a different reaction system
export const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']; 