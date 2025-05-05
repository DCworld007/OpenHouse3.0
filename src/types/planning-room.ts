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
/**
 * The collaborative Yjs document structure for a Planning Room.
 * Each field is a top-level Yjs Array or Map, allowing modular real-time sync and extensibility.
 *
 * - Add new fields here for future features (e.g., polls, activity feed, etc.)
 * - Keep field names stable for backward compatibility.
 */
export interface PlanningRoomYjsDoc {
  /**
   * All cards linked to this planning room (order is defined by cardOrder).
   * Each card contains metadata and user attribution.
   */
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
  /**
   * The order of card IDs for display and drag-and-drop.
   */
  cardOrder: string[];
  /**
   * All chat messages in this planning room (real-time, persistent).
   */
  chatMessages: Array<{
    id: string;
    userId: string;
    text: string;
    timestamp: number;
  }>;
  /**
   * All polls created in this room, with options and votes.
   * (Not yet fully implemented in UI/hooks.)
   */
  polls: Array<{
    id: string;
    question: string;
    options: string[];
    votes: { [userId: string]: string };
    createdAt: string;
    updatedAt: string;
  }>;
  /**
   * Reactions to cards, keyed by cardId and userId.
   * Only one reaction per user per card.
   */
  reactions: {
    [cardId: string]: { [userId: string]: 'like' | 'dislike' | null };
  };
  /**
   * Activity feed for this room (card added, poll created, etc.).
   * (Not yet fully implemented in UI/hooks.)
   */
  activityFeed: Array<{
    id: string;
    type: 'card_linked' | 'message_sent' | 'vote_cast' | 'poll_created' | 'card_reordered';
    userId: string;
    context?: any;
    timestamp: number;
  }>;
} 