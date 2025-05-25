import { useCallback, useEffect, useRef, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { PlanningRoomYjsDoc, PresentUser } from '@/types/planning-room';
import { ChatMessage, ChatMessageInput, Poll } from '@/types/message-types';
import { Listing } from '@/types/listing';
import { Activity } from '@/types/activity';

// WebSocket configuration
const WS_URL = 'wss://y-websocket-production-d87f.up.railway.app';
const PRESENCE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const PRESENCE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds
const RECONNECT_TIMEOUT = 3000; // 3 seconds
const SYNC_DEBOUNCE_DELAY = 1000; // 1 second

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
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timeoutId: NodeJS.Timeout;
  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Function to sync Yjs state to backend
async function syncToBackend(groupId: string, ydoc: Y.Doc) {
  try {
    const yLinkedCards = ydoc.getArray('linkedCards');
    const yCardOrder = ydoc.getArray('cardOrder');
    
    const state = {
      linkedCards: yLinkedCards.toArray(),
      cardOrder: yCardOrder.toArray()
    };
    
    const response = await fetch(`/api/planning-room/${groupId}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ doc: state })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to sync state: ${response.status}`);
    }
  } catch (error) {
    console.error('[Yjs] Failed to sync state to backend:', error);
  }
}

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
  const hasLoadedFromD1 = useRef(false);
  const presenceUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    const wsUrl = WS_URL;
    
    // Create WebSocket provider if it doesn't exist
    if (!providerRef.current) {
      try {
        providerRef.current = new WebsocketProvider(wsUrl, `planningRoom:${groupId}`, ydoc, {
          connect: true,
          WebSocketPolyfill: WebSocket // Ensure we use the native WebSocket
        });

        console.log('[Yjs] Setting up WebSocket provider with URL:', wsUrl);
      } catch (error) {
        console.error('[Yjs] Failed to create WebSocket provider:', error);
      }
    }

    const provider = providerRef.current;
    if (!provider) {
      console.error('[Yjs] No WebSocket provider available');
      return;
    }

    // Set up connection status handlers with retry logic
    provider.on('status', ({ status }: { status: string }) => {
      console.log('[Yjs] Connection status:', status);
      setIsConnected(status === 'connected');
      
      if (status === 'disconnected') {
        // Try to reconnect after a delay
        setTimeout(() => {
          console.log('[Yjs] Attempting to reconnect...');
          provider.connect();
        }, 3000);
      }
    });

    provider.on('connection-error', (error: Error) => {
      console.error('[Yjs] Connection error:', error);
    });

    // Initialize Yjs arrays and maps if they don't exist
    const yLinkedCards = ydoc.getArray('linkedCards');
    const yCardOrder = ydoc.getArray('cardOrder');
    const yChatMessages = ydoc.getArray('chatMessages');
    const yReactions = ydoc.getMap('reactions');
    const yPolls = ydoc.getArray('polls');
    const yActivityFeed = ydoc.getArray('activityFeed');
    const yPresentUsers = ydoc.getArray('presentUsers');

    // Load initial state from backend
    async function loadInitialState() {
      try {
        const response = await fetch(`/api/planning-room/${groupId}/cards`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.doc) {
            const state = data.doc;
            if (state.linkedCards?.length > 0) {
              yLinkedCards.delete(0, yLinkedCards.length);
              yLinkedCards.insert(0, state.linkedCards);
            }
            if (state.cardOrder?.length > 0) {
              yCardOrder.delete(0, yCardOrder.length);
              yCardOrder.insert(0, state.cardOrder);
            }
          }
        }
      } catch (error) {
        console.error('[Yjs] Failed to load initial state:', error);
      }
    }

    // Load initial state if not already loaded
    if (!hasLoadedFromD1.current) {
      loadInitialState();
      hasLoadedFromD1.current = true;
    }

    // Create debounced sync function
    const debouncedSync = debounce((doc: Y.Doc) => {
      syncToBackend(groupId, doc);
    }, SYNC_DEBOUNCE_DELAY);

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

      // Sync changes to backend
      debouncedSync(ydoc);
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
      if (!ydocRef.current || !currentUserId) return;
      
      const yPresentUsers = ydocRef.current.getArray<PresentUser>('presentUsers');
      const now = Date.now();
      
      // Remove stale users first
      const currentUsers = yPresentUsers.toArray();
      const staleUsers = currentUsers.filter(
        user => (now - user.lastActive) > PRESENCE_TIMEOUT
      );
      
      staleUsers.forEach(user => {
        const idx = yPresentUsers.toArray().findIndex(u => u.id === user.id);
        if (idx !== -1) yPresentUsers.delete(idx, 1);
      });

      // Update or add current user
      const currentUserIdx = currentUsers.findIndex(u => u.id === currentUserId);
      const presenceData: PresentUser = {
        id: currentUserId,
        name: currentUserName,
        email: currentUserEmail,
        avatar: currentUserAvatar,
        lastActive: now,
        joinedAt: joinedAtRef.current
      };

      if (currentUserIdx !== -1) {
        yPresentUsers.delete(currentUserIdx, 1);
      }
      yPresentUsers.push([presenceData]);
    };

    // Set up presence update interval
    updateCurrentUserPresence();
    if (presenceUpdateIntervalRef.current) {
      clearInterval(presenceUpdateIntervalRef.current);
    }
    presenceUpdateIntervalRef.current = setInterval(updateCurrentUserPresence, PRESENCE_UPDATE_INTERVAL);

    // Cleanup function
    return () => {
      yLinkedCards.unobserve(updateState);
      yCardOrder.unobserve(updateState);
      yChatMessages.unobserve(updateState);
      yReactions.unobserve(updateState);
      yPolls.unobserve(updateState);
      yActivityFeed.unobserve(updateState);
      yPresentUsers.unobserve(updateState);

      if (presenceUpdateIntervalRef.current) {
        clearInterval(presenceUpdateIntervalRef.current);
      }

      // Remove user from presence
      if (ydocRef.current && currentUserId) {
        const yPresent = ydocRef.current.getArray<PresentUser>('presentUsers');
        const userIdx = yPresent.toArray().findIndex(u => u.id === currentUserId);
        if (userIdx !== -1) {
          yPresent.delete(userIdx, 1);
        }
      }

      // Cleanup provider
      if (providerRef.current) {
        providerRef.current.disconnect();
      }
    };
  }, [groupId, currentUserId, currentUserName, currentUserEmail, currentUserAvatar]);

  // Start presence updates
  useEffect(() => {
    updateCurrentUserPresence();
    const interval = setInterval(updateCurrentUserPresence, PRESENCE_UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, [currentUserId, currentUserName, currentUserEmail, currentUserAvatar]);

  const addCard = useCallback((card: Listing, afterCardId?: string) => {
    if (!ydocRef.current) return;
    
    const yLinkedCards = ydocRef.current.getArray<Listing>('linkedCards');
    const yCardOrder = ydocRef.current.getArray<string>('cardOrder');
    
    // Add card to linkedCards array
    yLinkedCards.push([card]);
    
    // Add card ID to cardOrder array
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
    
    // Remove from linkedCards
    const cardIndex = yLinkedCards.toArray().findIndex(card => card.id === cardId);
    if (cardIndex !== -1) {
      yLinkedCards.delete(cardIndex, 1);
    }
    
    // Remove from cardOrder
    const orderIndex = yCardOrder.toArray().indexOf(cardId);
    if (orderIndex !== -1) {
      yCardOrder.delete(orderIndex, 1);
    }
  }, []);

  const addChatMessage = useCallback((message: ChatMessageInput) => {
    if (!ydocRef.current) return;
    
    const yChatMessages = ydocRef.current.getArray<ChatMessage>('chatMessages');
    const chatMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      reactions: {}
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