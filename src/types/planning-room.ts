import { Message as BaseMessage, Poll } from './message';
import { Listing, ListingGroup } from './listing';

export interface PlanningMessage extends BaseMessage {
  // Any additional fields specific to planning room messages can go here
}

export interface PlanningRoomProps {
  group: ListingGroup;
  onGroupUpdate: (updatedGroup: ListingGroup) => void;
} 