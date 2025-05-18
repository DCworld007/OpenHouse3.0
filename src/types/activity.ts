export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: number;
  userId: string;
  userName?: string;
  userEmail?: string;
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
  timestamp: number;
};