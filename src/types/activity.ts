export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: number;
  userId: string;
  details: ActivityDetails;
}

export type ActivityType = 'message' | 'reaction' | 'poll' | 'vote' | 'card';

export type ActivityDetails = 
  | MessageActivity 
  | ReactionActivity 
  | PollActivity 
  | VoteActivity 
  | CardActivity;

interface MessageActivity {
  type: 'message';
  messageId: string;
  text: string;
}

interface ReactionActivity {
  type: 'reaction';
  messageId: string;
  emoji: string;
}

interface PollActivity {
  type: 'poll';
  messageId: string;
  question: string;
}

interface VoteActivity {
  type: 'vote';
  messageId: string;
  option: string;
}

interface CardActivity {
  type: 'card';
  cardId: string;
  action: 'create' | 'move' | 'delete';
  details?: string;
} 