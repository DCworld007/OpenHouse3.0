export type ActivityType = 
  | 'card_add'
  | 'card_edit'
  | 'card_reaction'
  | 'card_reorder'
  | 'poll_create'
  | 'poll_vote';

export interface ActivityDetails {
  cardId?: string;
  cardTitle?: string;
  pollId?: string;
  pollQuestion?: string;
  pollOptionId?: string;
  optionText?: string;
  reactionType?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  context?: {
    cardType?: 'what' | 'where';
    content?: string;
    type?: string;
    fromIndex?: number;
    toIndex?: number;
  };
}

export interface Activity {
  id: string;
  type: ActivityType;
  details: ActivityDetails;
  timestamp: number;
}