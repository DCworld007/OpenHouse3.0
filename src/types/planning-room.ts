import { Message as BaseMessage, Poll } from './message';
import { Listing, ListingGroup } from './listing';
import { ChatMessage, Poll as YjsPoll } from './message';

export interface PlanningMessage extends ChatMessage {
  // This can be removed if ChatMessage from message.ts is sufficient
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
  linkedCards: Listing[];
  /**
   * The order of card IDs for display and drag-and-drop.
   */
  cardOrder: string[];
  /**
   * All chat messages in this planning room (real-time, persistent).
   */
  chatMessages: ChatMessage[];
  /**
   * All polls created in this room, with options and votes.
   * (Not yet fully implemented in UI/hooks.)
   */
  polls: YjsPoll[];
  /**
   * Reactions to cards, keyed by cardId and userId.
   * Only one reaction per user per card.
   */
  reactions: Record<string, Record<string, 'like' | 'dislike' | null>>;
  /**
   * Activity feed for this room (card added, poll created, etc.).
   * (Not yet fully implemented in UI/hooks.)
   */
  activityFeed: any[];
} 