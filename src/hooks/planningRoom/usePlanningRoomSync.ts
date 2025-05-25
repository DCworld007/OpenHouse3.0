import { useCallback, useEffect, useRef, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { PlanningRoomYjsDoc, PresentUser } from '@/types/planning-room';
import { ChatMessage, ChatMessageInput } from '@/types/message-types';

const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timeoutId: NodeJS.Timeout;
  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function usePlanningRoomSync(
  groupId: string,
  currentUserId: string,
  currentUserName?: string,
  currentUserEmail?: string,
  currentUserAvatar?: string
) {
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
  const hasLoadedFromD1 = useRef(false);
  const presenceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const joinedAtRef = useRef<number>(Date.now());
  const [isConnected, setIsConnected] = useState(false);

  // Initialize Yjs document and WebSocket provider
  useEffect(() => {
    if (!groupId) return;

    // Create Yjs doc if it doesn't exist
    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc();
    }

    const ydoc = ydocRef.current;
    const wsUrl = process.env.NEXT_PUBLIC_YJS_WS_URL || 'wss://yjs.unifyplan.vercel.app';
    
    // Create WebSocket provider if it doesn't exist
    if (!providerRef.current) {
      providerRef.current = new WebsocketProvider(wsUrl, `planningRoom:${groupId}`, ydoc, {
        connect: true,
      });
    }

    const provider = providerRef.current;

    // Set up connection status handlers
    provider.on('status', ({ status }: { status: string }) => {
      console.log('[Yjs] Connection status:', status);
      setIsConnected(status === 'connected');
    });

    // Initialize Yjs arrays and maps if they don't exist
    const yLinkedCards = ydoc.getArray('linkedCards');
    const yCardOrder = ydoc.getArray('cardOrder');
    const yChatMessages = ydoc.getArray('chatMessages');
    const yReactions = ydoc.getMap('reactions');
    const yPolls = ydoc.getArray('polls');
    const yActivityFeed = ydoc.getArray('activityFeed');
    const yPresentUsers = ydoc.getArray('presentUsers');

    // Update state when Yjs data changes
    const updateState = () => {
      setDocState({
        linkedCards: yLinkedCards.toArray(),
        cardOrder: yCardOrder.toArray(),
        chatMessages: yChatMessages.toArray(),
        reactions: Object.fromEntries(
          Array.from(yReactions.entries()).map(([cardId, userMap]) => [
            cardId,
            Object.fromEntries(Array.from((userMap as Y.Map<any>).entries())),
          ])
        ),
        polls: yPolls.toArray(),
        activityFeed: yActivityFeed.toArray(),
        presentUsers: yPresentUsers.toArray(),
      });
    };

    // Observe Yjs changes
    yLinkedCards.observe(updateState);
    yCardOrder.observe(updateState);
    yChatMessages.observe(updateState);
    yReactions.observeDeep(updateState);
    yPolls.observe(updateState);
    yActivityFeed.observe(updateState);
    yPresentUsers.observe(updateState);

    // Function to update current user's presence
    const updateCurrentUserPresence = () => {
      if (!ydoc || !currentUserId) return;
      const yPresent = ydoc.getArray<PresentUser>('presentUsers');
      const now = Date.now();
      const existingUserIndex = yPresent.toArray().findIndex(u => u.id === currentUserId);

      const currentUserData: PresentUser = {
        id: currentUserId,
        name: currentUserName,
        email: currentUserEmail,
        avatar: currentUserAvatar,
        lastActive: now,
        joinedAt: existingUserIndex !== -1 ? yPresent.get(existingUserIndex).joinedAt : joinedAtRef.current,
      };

      if (existingUserIndex !== -1) {
        const existing = yPresent.get(existingUserIndex);
        if (existing.name !== currentUserData.name || 
            existing.avatar !== currentUserData.avatar || 
            existing.email !== currentUserData.email ||
            (now - existing.lastActive) > (PRESENCE_UPDATE_INTERVAL / 2)) {
          const updatedUser = { ...existing, ...currentUserData };
          yPresent.delete(existingUserIndex, 1);
          yPresent.insert(existingUserIndex, [updatedUser]);
        }
      } else {
        yPresent.push([currentUserData]);
        joinedAtRef.current = now;
      }

      // Clean up stale users
      const allUsers = yPresent.toArray();
      for (let i = allUsers.length - 1; i >= 0; i--) {
        if ((now - allUsers[i].lastActive) > PRESENCE_TIMEOUT && allUsers[i].id !== currentUserId) {
          yPresent.delete(i, 1);
        }
      }
    };

    // Set up presence update interval
    updateCurrentUserPresence();
    if (presenceUpdateIntervalRef.current) {
      clearInterval(presenceUpdateIntervalRef.current);
    }
    presenceUpdateIntervalRef.current = setInterval(updateCurrentUserPresence, PRESENCE_UPDATE_INTERVAL);

    // Initial state update
    updateState();

    // Cleanup function
    return () => {
      yLinkedCards.unobserve(updateState);
      yCardOrder.unobserve(updateState);
      yChatMessages.unobserve(updateState);
      yReactions.unobserveDeep(updateState);
      yPolls.unobserve(updateState);
      yActivityFeed.unobserve(updateState);
      yPresentUsers.unobserve(updateState);

      if (presenceUpdateIntervalRef.current) {
        clearInterval(presenceUpdateIntervalRef.current);
      }

      // Remove user from presence
      if (ydoc && currentUserId) {
        const yPresent = ydoc.getArray<PresentUser>('presentUsers');
        const userIdx = yPresent.toArray().findIndex(u => u.id === currentUserId);
        if (userIdx !== -1) {
          yPresent.delete(userIdx, 1);
        }
      }

      // Cleanup provider
      if (provider) {
        provider.disconnect();
      }
    };
  }, [groupId, currentUserId, currentUserName, currentUserEmail, currentUserAvatar]);

  // Add card
  const addCard = useCallback((card: PlanningRoomYjsDoc['linkedCards'][0], afterCardId?: string) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;

    const yLinkedCards = ydoc.getArray('linkedCards');
    const yCardOrder = ydoc.getArray('cardOrder');
    
    yLinkedCards.push([card]);
    
    if (afterCardId) {
      const order = yCardOrder.toArray() as string[];
      const idx = order.indexOf(afterCardId);
      if (idx !== -1) {
        yCardOrder.insert(idx + 1, [card.id]);
      } else {
        yCardOrder.push([card.id]);
      }
    } else {
      yCardOrder.push([card.id]);
    }
  }, []);

  // Reorder cards
  const reorderCards = useCallback((newOrder: string[]) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    
    const yCardOrder = ydoc.getArray('cardOrder');
    yCardOrder.delete(0, yCardOrder.length);
    yCardOrder.insert(0, newOrder);
  }, []);

  // Remove card
  const removeCard = useCallback((cardId: string) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;

    const yLinkedCards = ydoc.getArray('linkedCards');
    const yCardOrder = ydoc.getArray('cardOrder');
    const cards = yLinkedCards.toArray() as PlanningRoomYjsDoc['linkedCards'];
    const idx = cards.findIndex(c => c.id === cardId);
    
    if (idx !== -1) {
      yLinkedCards.delete(idx, 1);
    }

    const order = yCardOrder.toArray() as string[];
    const orderIdx = order.indexOf(cardId);
    if (orderIdx !== -1) {
      yCardOrder.delete(orderIdx, 1);
    }
  }, []);

  // Add chat message
  const addChatMessage = useCallback((messageInput: ChatMessageInput) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;

    const yChatMessages = ydoc.getArray<ChatMessage>('chatMessages');
    const newMessage: ChatMessage = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      userId: messageInput.userId,
      userName: messageInput.userName,
      userEmail: messageInput.userEmail,
      userAvatar: messageInput.userAvatar,
      text: messageInput.text,
      pollId: messageInput.pollId,
      type: messageInput.type,
    };
    yChatMessages.push([newMessage]);
  }, []);

  // Add reaction
  const addReaction = useCallback((cardId: string, reaction: 'like' | 'dislike' | null) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;

    const yReactions = ydoc.getMap('reactions');
    let userMap = yReactions.get(cardId) as Y.Map<any> | undefined;
    if (!(userMap instanceof Y.Map)) {
      userMap = new Y.Map();
      yReactions.set(cardId, userMap);
    }
    (userMap as Y.Map<any>).set(currentUserId, reaction);
  }, [currentUserId]);

  // Remove reaction
  const removeReaction = useCallback((cardId: string) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;

    const yReactions = ydoc.getMap('reactions');
    let userMap = yReactions.get(cardId) as Y.Map<any> | undefined;
    if (userMap instanceof Y.Map) {
      userMap.delete(currentUserId);
    }
  }, [currentUserId]);

  // Add poll
  const addPoll = useCallback((poll: PlanningRoomYjsDoc['polls'][0]) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;

    const yPolls = ydoc.getArray('polls');
    yPolls.push([poll]);
  }, []);

  // Add activity
  const addActivity = useCallback((activity: PlanningRoomYjsDoc['activityFeed'][0]) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;

    const yActivityFeed = ydoc.getArray('activityFeed');
    yActivityFeed.push([activity]);
  }, []);

  return {
    ...docState,
    ydoc: ydocRef.current,
    addCard,
    removeCard,
    reorderCards,
    addChatMessage,
    addReaction,
    removeReaction,
    addPoll,
    addActivity,
  };
} 