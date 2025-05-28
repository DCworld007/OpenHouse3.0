import { useCallback, useEffect, useRef, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { PlanningRoomYjsDoc, PresentUser } from '@/types/planning-room';
import { ChatMessage, ChatMessageInput, Poll } from '@/types/message-types';
import { Listing } from '@/types/listing';
import { Activity } from '@/types/activity';
import { Y_WEBSOCKET_URL } from '@/config';

const PRESENCE_TIMEOUT = 2 * 60 * 1000; // 2 minutes
const PRESENCE_UPDATE_INTERVAL = 15 * 1000; // 15 seconds

// Persistent Y.Doc/Provider per groupId
const yDocMap: Map<string, Y.Doc> = new Map();
const providerMap: Map<string, WebsocketProvider> = new Map();

interface PlanningRoomSync extends PlanningRoomYjsDoc {
  addCard: (card: Listing, afterCardId?: string) => void;
  addChatMessage: (message: ChatMessageInput) => void;
  addPoll: (poll: Poll) => void;
  addActivity: (activity: Activity) => void;
  reorderCards: (newOrder: string[]) => void;
  removeCard: (cardId: string) => void;
  addReaction: (cardId: string, type: 'like' | 'dislike') => void;
  removeReaction: (cardId: string) => void;
  ydoc: Y.Doc | null;
  addUserInvite: (userId: string, invitedBy: string) => void;
  acceptInvite: (userId: string) => void;
}

type WebSocketStatus = 'connected' | 'disconnected' | 'connecting';

export function usePlanningRoomSync(
  groupId: string,
  currentUserId: string,
  currentUserName?: string,
  currentUserEmail?: string,
  currentUserAvatar?: string
): PlanningRoomSync {
  const [docState, setDocState] = useState<PlanningRoomYjsDoc>({
    linkedCards: [],
    cardOrder: [],
    chatMessages: [],
    reactions: {},
    polls: [],
    activityFeed: [],
    presentUsers: [],
  });

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const joinedAtRef = useRef<number>(Date.now());

  const updateCurrentUserPresence = useCallback(() => {
    if (!ydocRef.current || !currentUserId) return;
    
    console.log('[Yjs Presence] updateCurrentUserPresence CALLED. Hook inputs:', 
      { currentUserId, currentUserName, currentUserEmail, currentUserAvatar, joinedAt: joinedAtRef.current }
    );

    const yPresentUsers = ydocRef.current.getArray<PresentUser>('presentUsers');
    const now = Date.now();
    
    // First remove any existing entries for current user
    const currentUserIdxs: number[] = [];
    yPresentUsers.toArray().forEach((u, idx) => {
      if ((u as PresentUser).id === currentUserId) {
        currentUserIdxs.push(idx);
      }
    });
    
    currentUserIdxs.sort((a, b) => b - a).forEach(idx => {
      yPresentUsers.delete(idx, 1);
    });
    
    const currentRemoteUsers = yPresentUsers.toArray() as PresentUser[];
    const validUsers = currentRemoteUsers.filter(user => {
      const timeSinceActive = now - user.lastActive;
      if (timeSinceActive > PRESENCE_TIMEOUT) {
        return false;
      }
      // Update user status based on activity
      if (timeSinceActive > 30000) { // 30 seconds
        user.status = 'away';
      } else {
        user.status = 'online';
      }
      return true;
    });
    
    yPresentUsers.delete(0, yPresentUsers.length);
    if (validUsers.length > 0) {
      yPresentUsers.push(validUsers);
    }
    
    const presenceData: PresentUser = {
      id: currentUserId,
      name: currentUserName,
      email: currentUserEmail,
      avatar: currentUserAvatar,
      lastActive: now,
      joinedAt: joinedAtRef.current,
      status: 'online'
    };
    
    yPresentUsers.push([presenceData]);
    
    console.log('[Yjs Presence] Final yPresentUsers in YDoc AFTER update:', JSON.parse(JSON.stringify(yPresentUsers.toArray())));
  }, [currentUserId, currentUserName, currentUserEmail, currentUserAvatar]);

  // Add a function to handle invites
  const addUserInvite = useCallback((userId: string, invitedBy: string) => {
    if (!ydocRef.current) return;
    
    const yPresentUsers = ydocRef.current.getArray<PresentUser>('presentUsers');
    const now = Date.now();
    
    // Find the user if they already exist
    const existingUsers = yPresentUsers.toArray() as PresentUser[];
    const userIndex = existingUsers.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      // Update existing user
      const user = existingUsers[userIndex];
      yPresentUsers.delete(userIndex, 1);
      yPresentUsers.insert(userIndex, [{
        ...user,
        inviteStatus: {
          isInvited: true,
          invitedBy,
          invitedAt: now
        }
      }]);
    } else {
      // Add new invited user
      yPresentUsers.push([{
        id: userId,
        lastActive: now,
        joinedAt: now,
        status: 'offline',
        inviteStatus: {
          isInvited: true,
          invitedBy,
          invitedAt: now
        }
      }]);
    }
  }, []);

  // Add a function to accept an invite
  const acceptInvite = useCallback((userId: string) => {
    if (!ydocRef.current) return;
    
    const yPresentUsers = ydocRef.current.getArray<PresentUser>('presentUsers');
    const now = Date.now();
    
    // Find the user
    const existingUsers = yPresentUsers.toArray() as PresentUser[];
    const userIndex = existingUsers.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      const user = existingUsers[userIndex];
      if (user.inviteStatus?.isInvited) {
        yPresentUsers.delete(userIndex, 1);
        yPresentUsers.insert(userIndex, [{
          ...user,
          status: 'online',
          lastActive: now,
          inviteStatus: {
            ...user.inviteStatus,
            acceptedAt: now
          }
        }]);
      }
    }
  }, []);

  // Moved statusHandler and errorHandler outside of useEffect
  const statusHandler = useCallback(({ status }: { status: WebSocketStatus }) => {
    console.log('[Y.js] Connection status:', status);
    setIsConnected(status === 'connected');
    if (status === 'connected' && providerRef.current?.wsconnected) {
      updateCurrentUserPresence();
    }
  }, [updateCurrentUserPresence]);

  const errorHandler = useCallback((error: Event | { event: Event }) => {
    const actualError = (error as any).event || error;
    console.error(`[Yjs] Connection error for ${groupId}:`, actualError);
    setIsConnected(false);
  }, [groupId]);

  useEffect(() => {
    if (!groupId) {
      console.warn('[Yjs] No groupId provided');
      return;
    }
          
    const ydoc = new Y.Doc();
    const roomName = `planning-room:${groupId}`;
    console.log('[Yjs] Using WebSocket URL:', Y_WEBSOCKET_URL);
    
    const provider = new WebsocketProvider(Y_WEBSOCKET_URL, roomName, ydoc);
    
    // Store provider reference
    providerRef.current = provider;
    // Store ydoc reference
    ydocRef.current = ydoc;

    provider.on('status', statusHandler);
    provider.on('connection-error', errorHandler);

    const yLinkedCards = ydoc.getArray<Listing>('linkedCards');
    const yCardOrder = ydoc.getArray<string>('cardOrder');
    const yChatMessages = ydoc.getArray<ChatMessage>('chatMessages');
    const yReactions = ydoc.getMap<Record<string, 'like' | 'dislike' | null>>('reactions');
    const yPolls = ydoc.getArray<Poll>('polls');
    const yActivityFeed = ydoc.getArray<Activity>('activityFeed');
    const yPresentUsers = ydoc.getArray<PresentUser>('presentUsers');

    const updateState = () => {
      const linkedCards = yLinkedCards.toArray() as Listing[];
      const cardOrder = yCardOrder.toArray() as string[];
      const chatMessages = yChatMessages.toArray() as ChatMessage[];
      const reactions = yReactions.toJSON() as Record<string, Record<string, 'like' | 'dislike' | null>>;
      const polls = yPolls.toArray() as Poll[];
      const activityFeed = yActivityFeed.toArray() as Activity[];
      const presentUsers = yPresentUsers.toArray() as PresentUser[];
      
      setDocState({
        linkedCards,
        cardOrder,
        chatMessages,
        reactions,
        polls,
        activityFeed,
        presentUsers,
      });
    };

    yLinkedCards.observe(updateState);
    yCardOrder.observe(updateState);
    yChatMessages.observe(updateState);
    yReactions.observe(updateState);
    yPolls.observe(updateState);
    yActivityFeed.observe(updateState);
    yPresentUsers.observe(updateState);

    updateState();

    updateCurrentUserPresence(); 
    const presenceInterval = setInterval(updateCurrentUserPresence, PRESENCE_UPDATE_INTERVAL);

    return () => {
      console.log(`[Yjs] Cleanup effect for groupId: ${groupId}. Provider connected: ${provider?.wsconnected}`);
      
      provider?.off('status', statusHandler);
      provider?.off('connection-error', errorHandler);

      clearInterval(presenceInterval);

      if (provider) {
         console.log(`[Yjs] Disconnecting provider in cleanup for room: ${provider.roomname}`);
         provider.disconnect();
      }
      
      if (providerRef.current && providerRef.current.roomname === `planningRoom:${groupId}`) {
        providerRef.current = null; 
      }
    };
  }, [groupId, currentUserId, currentUserName, currentUserEmail, currentUserAvatar, updateCurrentUserPresence, statusHandler, errorHandler]);

  const addCard = (card: Listing, afterCardId?: string) => {
    if (!ydocRef.current) return;
    const yLinkedCards = ydocRef.current.getArray<Listing>('linkedCards');
    const yCardOrder = ydocRef.current.getArray<string>('cardOrder');
    
    yLinkedCards.push([card]);
    
    if (afterCardId) {
      const afterIndex = yCardOrder.toArray().indexOf(afterCardId);
      yCardOrder.insert(afterIndex + 1, [card.id]);
    } else {
      yCardOrder.push([card.id]);
    }
  };

  const removeCard = (cardId: string) => {
    if (!ydocRef.current) return;
    const yLinkedCards = ydocRef.current.getArray<Listing>('linkedCards');
    const yCardOrder = ydocRef.current.getArray<string>('cardOrder');
    
    const cardIndex = yLinkedCards.toArray().findIndex(c => (c as Listing).id === cardId);
    if (cardIndex !== -1) {
      yLinkedCards.delete(cardIndex, 1);
    }
    
    const orderIndex = yCardOrder.toArray().indexOf(cardId);
    if (orderIndex !== -1) {
      yCardOrder.delete(orderIndex, 1);
    }
  };

  const reorderCards = (newOrder: string[]) => {
    if (!ydocRef.current) return;
    const yCardOrder = ydocRef.current.getArray<string>('cardOrder');
        yCardOrder.delete(0, yCardOrder.length);
        yCardOrder.push(newOrder);
  };

  const addChatMessage = (message: ChatMessageInput) => {
    if (!ydocRef.current) return;
    
    const yChatMessages = ydocRef.current.getArray<ChatMessage>('chatMessages');
    const chatMessage = {
      ...message,
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      timestamp: Date.now()
    };
    
    yChatMessages.push([chatMessage]);
  };

  const addPoll = (poll: Poll) => {
    if (!ydocRef.current) return;
    const yPolls = ydocRef.current.getArray<Poll>('polls');
    const existingPollIndex = yPolls.toArray().findIndex(p => p.id === poll.id);
    if (existingPollIndex !== -1) {
      yPolls.delete(existingPollIndex, 1);
      yPolls.insert(existingPollIndex, [poll]);
    } else {
      yPolls.push([poll]);
    }
  };

  const addReaction = (cardId: string, type: 'like' | 'dislike') => {
    if (!ydocRef.current || !currentUserId) return;
    
    const yReactions = ydocRef.current.getMap<Record<string, 'like' | 'dislike' | null>>('reactions');
    const cardReactions = yReactions.get(cardId) || {};
    yReactions.set(cardId, { ...cardReactions, [currentUserId]: type });
  };

  const removeReaction = (cardId: string) => {
    if (!ydocRef.current || !currentUserId) return;
    
    const yReactions = ydocRef.current.getMap<Record<string, 'like' | 'dislike' | null>>('reactions');
    const cardReactions = yReactions.get(cardId) || {};
    delete cardReactions[currentUserId];
    yReactions.set(cardId, cardReactions);
  };

  const addActivity = (activity: Activity) => {
    if (!ydocRef.current) return;
    const yActivityFeed = ydocRef.current.getArray<Activity>('activityFeed');
    yActivityFeed.push([activity]);
  };

  return {
    ...docState,
    addCard,
    addChatMessage,
    addPoll,
    addActivity,
    reorderCards,
    removeCard,
    addReaction,
    removeReaction,
    ydoc: ydocRef.current,
    addUserInvite,
    acceptInvite
  };
}

export default usePlanningRoomSync; 