import { Listing, ListingGroup } from './listing';
import { ChatMessage, Poll } from './message-types';

export interface PlanningMessage extends ChatMessage {
  // This can be removed if ChatMessage from message.ts is sufficient
}

export interface PlanningRoomProps {
  group: ListingGroup;
  onGroupUpdate: (updatedGroup: ListingGroup) => void;
}

export interface PresentUser {
  id: string;          // User ID
  name?: string;       // User's display name
  email?: string;      // User's email (useful for debugging/display)
  avatar?: string;     // User's avatar URL
  lastActive: number;  // Timestamp of last activity or when they joined/refreshed
  joinedAt: number;    // Timestamp when they initially joined this session
  status: 'online' | 'offline' | 'away';  // User's connection status
  inviteStatus?: {
    isInvited: boolean;
    invitedBy?: string;
    invitedAt?: number;
    acceptedAt?: number;
  };
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
  polls: Poll[];
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
  /**
   * Array of users currently present in the room
   */
  presentUsers: PresentUser[];
} 