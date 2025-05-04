import { Message as BaseMessage, Poll } from './message';
import { Listing, ListingGroup } from './listing';

export interface PlanningMessage extends BaseMessage {
  // Any additional fields specific to planning room messages can go here
}

export interface PlanningRoomProps {
  group: ListingGroup;
  onGroupUpdate: (updatedGroup: ListingGroup) => void;
}

// Yjs document shape for planningRoom:{groupId}
export interface PlanningRoomYjsDoc {
  linkedCards: Array<{
    id: string;
    content: string;
    notes?: string;
    cardType: 'what' | 'where';
    imageUrl?: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    lat?: number;
    lng?: number;
  }>;
  cardOrder: string[];
  chatMessages: Array<{
    id: string;
    userId: string;
    text: string;
    timestamp: number;
  }>;
  polls: Array<{
    id: string;
    question: string;
    options: string[];
    votes: { [userId: string]: string };
    createdAt: string;
    updatedAt: string;
  }>;
  reactions: {
    [cardId: string]: { [userId: string]: 'like' | 'dislike' | null };
  };
  activityFeed: Array<{
    id: string;
    type: 'card_linked' | 'message_sent' | 'vote_cast' | 'poll_created' | 'card_reordered';
    userId: string;
    context?: any;
    timestamp: number;
  }>;
} 