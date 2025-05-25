import { useCallback, useEffect, useRef, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { PlanningRoomYjsDoc, PresentUser } from '@/types/planning-room';
import { ChatMessage, ChatMessageInput, Poll } from '@/types/message-types';
import { Listing } from '@/types/listing';
import { Activity } from '@/types/activity';

// WebSocket configuration
const Y_WEBSOCKET_URL = 'wss://y-websocket-production-d87f.up.railway.app';
console.log('[Yjs] Using WebSocket URL:', Y_WEBSOCKET_URL);

const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

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

  // Function to update current user's presence
  const updateCurrentUserPresence = useCallback(() => {
    if (!ydocRef.current || !currentUserId) return;
    
    const yPresentUsers = ydocRef.current.getArray<PresentUser>('presentUsers');
    const now = Date.now();
    
    // Remove stale users first
    const currentUsers = yPresentUsers.toArray() as PresentUser[];
    const staleUsers = currentUsers.filter(
      user => (now - user.lastActive) > PRESENCE_TIMEOUT
    );
    
    staleUsers.forEach(user => {
      const idx = yPresentUsers.toArray().findIndex(u => (u as PresentUser).id === user.id);
      if (idx !== -1) yPresentUsers.delete(idx, 1);
    });

    // Update or add current user
    const presenceData: PresentUser = {
      id: currentUserId,
      name: currentUserName,
      email: currentUserEmail,
      avatar: currentUserAvatar,
      lastActive: now,
      joinedAt: joinedAtRef.current
    };

    const currentUserIdx = yPresentUsers.toArray().findIndex(u => (u as PresentUser).id === currentUserId);
    if (currentUserIdx !== -1) {
      yPresentUsers.delete(currentUserIdx, 1);
    }
    yPresentUsers.push([presenceData]);
  }, [currentUserId, currentUserName, currentUserEmail, currentUserAvatar]);

  // Initialize Yjs document and WebSocket provider
  useEffect(() => {
    if (!groupId) return;

    // Create Yjs doc if it doesn't exist
    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
    }

    const ydoc = ydocRef.current;
    if (!ydoc) return;

    // Create WebSocket provider if it doesn't exist
    if (!providerRef.current) {
      try {
        console.log('[Yjs] Creating WebSocket provider with URL:', Y_WEBSOCKET_URL);
        providerRef.current = new WebsocketProvider(Y_WEBSOCKET_URL, `planningRoom:${groupId}`, ydoc, {
          connect: true,
          WebSocketPolyfill: WebSocket
        });
      } catch (error) {
        console.error('[Yjs] Failed to create WebSocket provider:', error);
        return;
      }
    }

    const provider = providerRef.current;
    if (!provider) {
      console.error('[Yjs] No WebSocket provider available');
      return;
    }

    // Set up connection status handlers
    provider.on('status', ({ status }: { status: WebSocketStatus }) => {
      console.log('[Yjs] Connection status:', status);
      setIsConnected(status === 'connected');
    });

    provider.on('connection-error', (error: Error) => {
      console.error('[Yjs] Connection error:', error);
    });

    // Initialize shared data structures
    const yLinkedCards = ydoc.getArray<Listing>('linkedCards');
    const yCardOrder = ydoc.getArray<string>('cardOrder');
    const yChatMessages = ydoc.getArray<ChatMessage>('chatMessages');
    const yReactions = ydoc.getMap<Record<string, string>>('reactions');
    const yPolls = ydoc.getArray<Poll>('polls');
    const yActivityFeed = ydoc.getArray<Activity>('activityFeed');
    const yPresentUsers = ydoc.getArray<PresentUser>('presentUsers');

    // Update state when Y.Doc changes
    const updateState = () => {
      const linkedCards = yLinkedCards.toArray() as Listing[];
      const cardOrder = yCardOrder.toArray() as string[];
      const chatMessages = yChatMessages.toArray() as ChatMessage[];
      const reactions = yReactions.toJSON() as Record<string, Record<string, string>>;
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

    // Observe changes
    yLinkedCards.observe(updateState);
    yCardOrder.observe(updateState);
    yChatMessages.observe(updateState);
    yReactions.observe(updateState);
    yPolls.observe(updateState);
    yActivityFeed.observe(updateState);
    yPresentUsers.observe(updateState);

    // Initial state update
    updateState();

    // Set up presence update interval
    updateCurrentUserPresence();
    const interval = setInterval(updateCurrentUserPresence, PRESENCE_UPDATE_INTERVAL);

    // Cleanup function
    return () => {
      yLinkedCards.unobserve(updateState);
      yCardOrder.unobserve(updateState);
      yChatMessages.unobserve(updateState);
      yReactions.unobserve(updateState);
      yPolls.unobserve(updateState);
      yActivityFeed.unobserve(updateState);
      yPresentUsers.unobserve(updateState);

      clearInterval(interval);

      if (provider) {
        provider.disconnect();
      }
    };
  }, [groupId, updateCurrentUserPresence]);

  const addCard = useCallback((card: Listing, afterCardId?: string) => {
    if (!ydocRef.current) return;
    
    const yLinkedCards = ydocRef.current.getArray<Listing>('linkedCards');
    const yCardOrder = ydocRef.current.getArray<string>('cardOrder');
    
    yLinkedCards.push([card]);
    
    if (afterCardId) {
      const afterIndex = yCardOrder.toArray().indexOf(afterCardId);
      if (afterIndex !== -1) {
        yCardOrder.insert(afterIndex + 1, [card.id]);
      } else {
        yCardOrder.push([card.id]);
      }
    } else {
      yCardOrder.push([card.id]);
    }
  }, []);

  const removeCard = useCallback((cardId: string) => {
    if (!ydocRef.current) return;
    
    const yLinkedCards = ydocRef.current.getArray<Listing>('linkedCards');
    const yCardOrder = ydocRef.current.getArray<string>('cardOrder');
    
    const cardIndex = yLinkedCards.toArray().findIndex(card => (card as Listing).id === cardId);
    if (cardIndex !== -1) {
      yLinkedCards.delete(cardIndex, 1);
    }
    
    const orderIndex = yCardOrder.toArray().indexOf(cardId);
    if (orderIndex !== -1) {
      yCardOrder.delete(orderIndex, 1);
    }
  }, []);

  const addChatMessage = useCallback((message: ChatMessageInput) => {
    if (!ydocRef.current) return;
    
    const yChatMessages = ydocRef.current.getArray<ChatMessage>('chatMessages');
    const chatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    
    yChatMessages.push([chatMessage]);
  }, []);

  const addPoll = useCallback((poll: Poll) => {
    if (!ydocRef.current) return;
    
    const yPolls = ydocRef.current.getArray<Poll>('polls');
    yPolls.push([poll]);
  }, []);

  const addActivity = useCallback((activity: Activity) => {
    if (!ydocRef.current) return;
    
    const yActivityFeed = ydocRef.current.getArray<Activity>('activityFeed');
    yActivityFeed.push([activity]);
  }, []);

  const reorderCards = useCallback((newOrder: string[]) => {
    if (!ydocRef.current) return;
    
    const yCardOrder = ydocRef.current.getArray<string>('cardOrder');
    yCardOrder.delete(0, yCardOrder.length);
    yCardOrder.insert(0, newOrder);
  }, []);

  const addReaction = useCallback((cardId: string, type: 'like' | 'dislike') => {
    if (!ydocRef.current || !currentUserId) return;
    
    const yReactions = ydocRef.current.getMap<Record<string, string>>('reactions');
    const cardReactions = yReactions.get(cardId) || {};
    yReactions.set(cardId, { ...cardReactions, [currentUserId]: type });
  }, [currentUserId]);

  const removeReaction = useCallback((cardId: string) => {
    if (!ydocRef.current || !currentUserId) return;
    
    const yReactions = ydocRef.current.getMap<Record<string, string>>('reactions');
    const cardReactions = yReactions.get(cardId) || {};
    delete cardReactions[currentUserId];
    yReactions.set(cardId, cardReactions);
  }, [currentUserId]);

  return {
    ...docState,
    addCard,
    removeCard,
    addChatMessage,
    addPoll,
    addActivity,
    reorderCards,
    addReaction,
    removeReaction,
    ydoc: ydocRef.current,
  };
}

export default usePlanningRoomSync; 