export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: number;
  userId: string;
  details: ActivityDetails;
}

export type ActivityType = 'card_reaction' | 'card_reorder' | 'poll_vote' | 'card_add' | 'card_edit' | 'poll_create';

export type ActivityDetails = {
  cardTitle?: string;
  reactionType?: 'thumbsUp' | 'thumbsDown';
  fromIndex?: number;
  toIndex?: number;
  pollOption?: string;
  pollQuestion?: string;
};

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