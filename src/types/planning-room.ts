import { Message as BaseMessage, Poll } from './message';
import { Listing } from './listing';

export interface PlanningMessage extends BaseMessage {
  // Any additional fields specific to planning room messages can go here
}

export interface ListingGroup {
  id: string;
  name: string;
  type: 'date' | 'custom';
  date: string;
  order: number;
  listings: Listing[];
}

export interface PlanningRoomProps {
  group: ListingGroup;
  onGroupUpdate: (updatedGroup: ListingGroup) => void;
} 