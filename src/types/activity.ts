export type ActivityType = 'card_add' | 'card_edit' | 'card_reorder' | 'poll_create' | 'poll_vote' | 'card_reaction';

export interface ActivityDetails {
  cardId?: string;
  cardTitle?: string;
  reactionType?: 'thumbsUp' | 'thumbsDown';
  action?: 'add' | 'remove';
  pollQuestion?: string;
  pollOption?: string;
  fromIndex?: number;
  toIndex?: number;
}

export interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  timestamp: string;
  groupId: string;
  details: ActivityDetails;
} 