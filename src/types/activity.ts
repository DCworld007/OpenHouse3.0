export type ActivityType = 
  | 'card_add'
  | 'card_remove'
  | 'card_update'
  | 'card_reaction'
  | 'card_reorder'
  | 'card_linked'
  | 'poll_create'
  | 'poll_vote'
  | 'user_join'
  | 'user_leave';

export interface ActivityDetails {
  cardId?: string;
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