import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
// @ts-ignore
import { WebsocketProvider } from 'y-websocket';
import { PlanningRoomYjsDoc, PresentUser } from '@/types/planning-room';
import { ChatMessage, MessageType, ChatMessageInput } from '@/types/message';
import { Listing } from '@/types/listing';

// Replace with your actual y-websocket server URL (from Railway)
const Y_WEBSOCKET_URL = process.env.NEXT_PUBLIC_Y_WEBSOCKET_URL || 'wss://y-websocket-production-d87f.up.railway.app';

// --- PATCH: Persistent Y.Doc/Provider per groupId ---
const yDocMap: Map<string, Y.Doc> = new Map();
const providerMap: Map<string, any> = new Map();

// Debounce helper
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
const PRESENCE_TIMEOUT = 5 * 60 * 1000; 
const PRESENCE_UPDATE_INTERVAL = 60 * 1000;
export function usePlanningRoomSync(
  groupId: string,
  currentUserId: string,
  currentUserName?: string,
  currentUserEmail?: string,
  currentUserAvatar?: string
) {
  const [docState, setDocState] = useState<Pick<PlanningRoomYjsDoc, 'linkedCards' | 'cardOrder' | 'chatMessages' | 'reactions' | 'polls' | 'activityFeed' | 'presentUsers'>>({
    linkedCards: [],
    cardOrder: [],
    chatMessages: [] as ChatMessage[],
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

  // NEW: Sync with linked groups - fetch linked groups and add their cards to this group
  useEffect(() => {
    let cancelled = false;
    async function syncLinkedGroups() {
      if (!groupId) return;
      
      // Development mode check
      const isDev = process.env.NODE_ENV === 'development';
      const mockSuccessInDev = true; // Set to true to mock successful API calls in dev
      
      try {
        // Fetch current group's linked groups
        console.log('[LinkedGroups Sync] Fetching linked groups for', groupId);
        
        // Get all available groups from localStorage to send to the API
        const allGroups = window.localStorage ? JSON.parse(window.localStorage.getItem('openhouse-data') || '[]') : [];
        const groupsParam = encodeURIComponent(JSON.stringify(allGroups));
        
        try {
          const res = await fetch(`/api/planning-room/${groupId}/linked-groups?groups=${groupsParam}`);
          if (!res.ok) {
            console.error(`[LinkedGroups Sync] HTTP error: ${res.status}`);
            
            if (isDev && mockSuccessInDev) {
            console.log('[LinkedGroups Sync] Development mode: Using empty linked groups mock');
              // Continue with empty linked groups in dev
            processLinkedGroups({ linkedGroups: [] });
            }
            return;
          }
          
          // Check if response is JSON before trying to parse
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('[LinkedGroups Sync] Received non-JSON response:', await res.text());
            
            if (isDev && mockSuccessInDev) {
              console.log('[LinkedGroups Sync] Development mode: Using empty linked groups mock');
              // Continue with empty linked groups in dev
              processLinkedGroups({ linkedGroups: [] });
            }
            return;
          }
          
          const data = await res.json();
          processLinkedGroups(data);
        } catch (error) {
          console.error('[LinkedGroups Sync] Error:', error);
          
          if (isDev && mockSuccessInDev) {
          console.log('[LinkedGroups Sync] Development mode: Using empty linked groups mock');
            // Continue with empty linked groups in dev
          processLinkedGroups({ linkedGroups: [] });
          }
        }
      } catch (e) {
        console.error('[LinkedGroups Sync] Error:', e);
      }
    }
    
    // Helper to process linked groups data
    function processLinkedGroups(data: { linkedGroups: any[] }) {
      if (!data.linkedGroups || !Array.isArray(data.linkedGroups)) return;
      
      console.log('[LinkedGroups Sync] Processing linked groups:', data.linkedGroups.length);
      
      // Get reference to the Yjs doc and arrays
      const ydoc = ydocRef.current;
      if (!ydoc) return;
      
      const yLinkedCards = ydoc.getArray('linkedCards');
      const yCardOrder = ydoc.getArray('cardOrder');
      
      // For each linked group that has cards, add their cards to this group's Yjs doc
      let cardsAdded = 0;
      
      for (const linkedGroup of data.linkedGroups) {
        if (!linkedGroup.cards || !Array.isArray(linkedGroup.cards) || linkedGroup.cards.length === 0) {
          continue;
        }
        
        console.log(`[LinkedGroups Sync] Processing ${linkedGroup.cards.length} cards from linked group ${linkedGroup.group.id}`);
        
        // Check which cards are not already in this group
        const existingCardIds = new Set(yLinkedCards.toArray().map((card: any) => card.id));
        const newCards = linkedGroup.cards.filter((card: any) => 
          !existingCardIds.has(card.id) && 
          (card.address || card.notes) // Check card.address or card.notes
        );
        
        if (newCards.length === 0) {
          console.log(`[LinkedGroups Sync] No new cards to add from group ${linkedGroup.group.id}`);
          continue;
        }
        
        console.log(`[LinkedGroups Sync] Adding ${newCards.length} cards from group ${linkedGroup.group.id}`);
        
        // Prepare cards for adding to Yjs doc
        const cardsToAdd = newCards.map((card: any) => ({
          id: card.id,
          content: card.content || card.address,
          notes: card.notes || '',
          cardType: card.cardType || 'what',
          userId: card.userId || 'unknown',
          createdAt: card.createdAt || new Date().toISOString(),
          updatedAt: card.updatedAt || new Date().toISOString(),
          // Add metadata about the linked group
          linkedFrom: linkedGroup.group.id,
          linkedFromName: linkedGroup.group.name
        }));
        
        // Add cards to Yjs arrays
        if (cardsToAdd.length > 0) {
          // Add to linkedCards array
          yLinkedCards.push(cardsToAdd);
          
          // Add to cardOrder array
          yCardOrder.push(cardsToAdd.map((c: any) => c.id));
          
          cardsAdded += cardsToAdd.length;
        }
      }
      
      console.log(`[LinkedGroups Sync] Added a total of ${cardsAdded} cards from linked groups`);
    }
    
    // Run on first mount and then every minute
    syncLinkedGroups();
    const interval = setInterval(syncLinkedGroups, 60000);
    
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [groupId]);

  // Load initial state from D1 (Phase 1)
  useEffect(() => {
    let cancelled = false;
    async function loadFromD1() {
      if (!groupId) return;
      
      // Development mode check
      const isDev = process.env.NODE_ENV === 'development';
      const mockSuccessInDev = true; // Set to true to mock successful API calls in dev
      
      try {
        try {
          const res = await fetch(`/api/planning-room/${groupId}/cards`);
          if (!res.ok) {
            console.error(`[Yjs] Failed to load from D1: HTTP ${res.status}`);
            
            // Create room if it doesn't exist
            if (res.status === 404) {
              try {
                console.log('[Yjs] Creating missing room in D1:', groupId);
                const createRes = await fetch('/api/rooms', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: groupId,
                    name: 'To Be Scheduled',
                    description: '',
                  }),
                });
                if (!createRes.ok) {
                  console.error(`[Yjs] Failed to create room: HTTP ${createRes.status}`);
                  
                  if (isDev && mockSuccessInDev) {
                    console.log('[Yjs] Development mode: Continuing as if room was created');
                  }
                } else {
                  console.log('[Yjs] Successfully created room in D1');
                }
              } catch (createErr) {
                console.error('[Yjs] Error creating room:', createErr);
                
                if (isDev && mockSuccessInDev) {
                  console.log('[Yjs] Development mode: Continuing as if room was created');
                }
              }
            }
            
            if (isDev && mockSuccessInDev) {
              console.log('[Yjs] Development mode: Using empty doc mock');
              // Continue with an empty document in dev
              return;
            }
            return;
          }
          
          // Check if response is JSON before trying to parse
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.error('[Yjs] Received non-JSON response:', await res.text());
            
            if (isDev && mockSuccessInDev) {
              console.log('[Yjs] Development mode: Using empty doc mock');
              // Continue with an empty document in dev
              return;
            }
            return;
          }
          
          const data = await res.json();
          if (data.doc) {
            const ydoc = yDocMap.get(groupId) || new Y.Doc();
            // Use atob to decode base64 to binary string, then to Uint8Array
            const binary = atob(data.doc);
            const update = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              update[i] = binary.charCodeAt(i);
            }
            Y.applyUpdate(ydoc, update);
            yDocMap.set(groupId, ydoc);
            hasLoadedFromD1.current = true;
          }
        } catch (fetchError) {
          console.error('[Yjs] Failed to load from D1:', fetchError);
          
          if (isDev && mockSuccessInDev) {
            console.log('[Yjs] Development mode: Continuing with empty doc');
          }
        }
      } catch (e) {
        console.error('[Yjs] Failed to load from D1:', e);
      }
    }
    loadFromD1();
    return () => { cancelled = true; };
  }, [groupId]);

  useEffect(() => {
    // --- PATCH: Use persistent Y.Doc and provider for this groupId ---
    let ydoc = yDocMap.get(groupId);
    let provider = providerMap.get(groupId);
    let isNew = false;
    if (!ydoc) {
      ydoc = new Y.Doc();
      yDocMap.set(groupId, ydoc);
      isNew = true;
    }
    ydocRef.current = ydoc;
    // Always get arrays/maps from the persistent doc
    const yLinkedCards = ydoc.getArray('linkedCards');
    const yCardOrder = ydoc.getArray('cardOrder');
    const yChatMessages = ydoc.getArray<ChatMessage>('chatMessages');
    const yReactions = ydoc.getMap('reactions');
    const yPolls = ydoc.getArray('polls');
    const yActivityFeed = ydoc.getArray('activityFeed');
    const yPresentUsers = ydoc.getArray<PresentUser>('presentUsers');
    if (!provider) {
      console.log('[Yjs] Creating new WebSocket provider with URL:', Y_WEBSOCKET_URL);
      provider = new WebsocketProvider(
        Y_WEBSOCKET_URL,
        `planningRoom:${groupId}`,
        ydoc,
        { connect: true }
      );
      providerMap.set(groupId, provider);
      isNew = true;
    }
    providerRef.current = provider;
    if (isNew) {
      console.log('[Yjs PATCH] Created new Y.Doc and/or provider for groupId:', groupId);
    } else {
      console.log('[Yjs PATCH] Reusing persistent Y.Doc and provider for groupId:', groupId);
    }

    // Enhanced WebSocket connection monitoring
    provider.on('status', (event: { status: 'connected' | 'disconnected' }) => {
      console.log('[Yjs] WebsocketProvider status:', event.status);
      setIsConnected(event.status === 'connected');
      if (event.status === 'disconnected') {
        console.error('[Yjs] WebSocket disconnected - messages may not sync in real-time');
        // Try to reconnect
        setTimeout(() => {
          if (provider && !provider.shouldConnect) {
            console.log('[Yjs] Attempting to reconnect...');
            provider.connect();
          }
        }, 1000);
      }
    });

    provider.on('sync', (isSynced: boolean) => {
      console.log('[Yjs] WebsocketProvider sync:', isSynced);
      if (!isSynced) {
        console.error('[Yjs] Failed to sync with WebSocket server - messages may not sync in real-time');
      }
    });

    provider.on('connection-error', (error: Error) => {
      console.error('[Yjs] WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Force initial connection
    if (!provider.connected) {
      provider.connect();
    }

    // Observe changes and update React state
    const updateState = () => {
      console.log('[Yjs] updateState called');
      console.log('[Yjs] yLinkedCards:', yLinkedCards.toArray());
      console.log('[Yjs] yCardOrder:', yCardOrder.toArray());
      console.log('[Yjs] yChatMessages:', yChatMessages.toArray());
      
      // Convert Y.Map to plain JS object
      const reactionsObj: Record<string, Record<string, 'like' | 'dislike' | null>> = {};
      yReactions.forEach((userMap, cardId) => {
        if (userMap instanceof Y.Map) {
          reactionsObj[cardId] = {};
          userMap.forEach((reaction, userIdKey) => {
            reactionsObj[cardId][userIdKey] = reaction;
          });
        }
      });
      
      // Fix any duplicate cardIds in the cardOrder array
      const cardOrderArray = yCardOrder.toArray() as string[];
      const uniqueCardOrder = Array.from(new Set(cardOrderArray));
      
      // Check for duplicate cards in linkedCards array
      const cardsArray = yLinkedCards.toArray() as PlanningRoomYjsDoc['linkedCards'];
      const seenCardIds = new Set<string>();
      const uniqueLinkedCards: PlanningRoomYjsDoc['linkedCards'] = [];
      let hasDuplicateCards = false;
      
      // Find only unique cards (by ID)
      for (const card of cardsArray) {
        if (!seenCardIds.has(card.id)) {
          seenCardIds.add(card.id);
          uniqueLinkedCards.push(card);
        } else {
          hasDuplicateCards = true;
          console.log(`[Yjs] Found duplicate card with ID ${card.id}, removing duplicate`);
        }
      }
      
      // Fix both arrays if we found duplicates
      if (uniqueCardOrder.length !== cardOrderArray.length || hasDuplicateCards) {
        console.log('[Yjs] Fixing duplicate entries in Yjs arrays');
        
        // Fix linkedCards array if needed
        if (hasDuplicateCards) {
          yLinkedCards.delete(0, yLinkedCards.length);
          yLinkedCards.push(uniqueLinkedCards);
        }
        
        // Fix cardOrder array if needed
        if (uniqueCardOrder.length !== cardOrderArray.length) {
          yCardOrder.delete(0, yCardOrder.length);
          yCardOrder.push(uniqueCardOrder);
        }
      }
      
      setDocState({
        linkedCards: uniqueLinkedCards,
        cardOrder: uniqueCardOrder as PlanningRoomYjsDoc['cardOrder'],
        chatMessages: yChatMessages.toArray(),
        reactions: reactionsObj,
        polls: yPolls.toArray() as PlanningRoomYjsDoc['polls'],
        activityFeed: yActivityFeed.toArray() as PlanningRoomYjsDoc['activityFeed'],
        presentUsers: yPresentUsers.toArray().filter(user => (Date.now() - user.lastActive) < PRESENCE_TIMEOUT),
      });
      
      // Debounced persist to D1 on every change
      debouncedPersistToD1();
    };
    yLinkedCards.observe(updateState);
    yCardOrder.observe(updateState);
    yChatMessages.observe(updateState);
    yReactions.observeDeep(updateState);
    yPolls.observe(updateState);
    yActivityFeed.observe(updateState);
    yPresentUsers.observe(updateState);
    updateState();

    // Function to update or add current user's presence
    const updateCurrentUserPresence = () => {
      if (!ydocRef.current || !currentUserId) return;
      const yPresent = ydocRef.current.getArray<PresentUser>('presentUsers');
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
        // Smart update: only update if necessary to reduce Yjs traffic
        const existing = yPresent.get(existingUserIndex);
        if (existing.name !== currentUserData.name || 
            existing.avatar !== currentUserData.avatar || 
            existing.email !== currentUserData.email ||
            (now - existing.lastActive) > (PRESENCE_UPDATE_INTERVAL / 2)) { // Update if lastActive is a bit old
             // Create a new object to ensure Yjs detects a change if only sub-properties of an object change.
            const updatedUser = { ...existing, ...currentUserData, lastActive: now };
            yPresent.delete(existingUserIndex, 1);
            yPresent.insert(existingUserIndex, [updatedUser]);
        } else if (existing.lastActive !== now) { // just update lastActive if it's the only change
            const updatedUser = { ...existing, lastActive: now };
            yPresent.delete(existingUserIndex, 1);
            yPresent.insert(existingUserIndex, [updatedUser]);
        }
      } else {
        yPresent.push([currentUserData]);
        joinedAtRef.current = now; // Update joinedAt if newly added
      }
      // Clean up stale users from other sessions that might not have cleaned up
      const allUsers = yPresent.toArray();
      for (let i = allUsers.length - 1; i >= 0; i--) {
        if ((now - allUsers[i].lastActive) > PRESENCE_TIMEOUT && allUsers[i].id !== currentUserId) {
          yPresent.delete(i, 1);
        }
      }
    };

    updateCurrentUserPresence(); // Initial presence update
    if (presenceUpdateIntervalRef.current) clearInterval(presenceUpdateIntervalRef.current);
    presenceUpdateIntervalRef.current = setInterval(updateCurrentUserPresence, PRESENCE_UPDATE_INTERVAL);

    // Cleanup
    return () => {
      yLinkedCards.unobserve(updateState);
      yCardOrder.unobserve(updateState);
      yChatMessages.unobserve(updateState);
      yReactions.unobserveDeep(updateState);
      yPolls.unobserve(updateState);
      yActivityFeed.unobserve(updateState);
      yPresentUsers.unobserve(updateState); // Unobserve presentUsers
      if (presenceUpdateIntervalRef.current) {
        clearInterval(presenceUpdateIntervalRef.current);
      }
      // Attempt to remove user from presence on unmount/disconnect
      // This is best-effort as browser might close before this runs reliably.
      // Stale entries are handled by the timeout logic anyway.
      if (ydocRef.current && currentUserId) {
        const yPresent = ydocRef.current.getArray<PresentUser>('presentUsers');
        const userIdx = yPresent.toArray().findIndex(u => u.id === currentUserId);
        if (userIdx !== -1) {
          yPresent.delete(userIdx, 1);
        }
      }
    };
  }, [groupId, currentUserId, currentUserName, currentUserEmail, currentUserAvatar]);

  // Debounced persist function
  const persistToD1 = useCallback(() => {
    const ydoc = ydocRef.current;
    if (!ydoc || !groupId) return;
    const update = Y.encodeStateAsUpdate(ydoc);
    let binary = '';
    for (let i = 0; i < update.length; i++) {
      binary += String.fromCharCode(update[i]);
    }
    // Base64 encode the binary string
    const base64 = btoa(binary);
    // Persist to D1
    fetch(`/api/planning-room/${groupId}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ doc: base64 }),
    }).catch(e => {
      console.error('[Yjs] Failed to persist to D1:', e);
    });
  }, [groupId]);
  const debouncedPersistToD1 = useCallback(debounce(persistToD1, 1000), [persistToD1]);

  // PATCH: Support inserting after a specific card
  const addCard = useCallback((card: PlanningRoomYjsDoc['linkedCards'][0], afterCardId?: string) => {
    console.log('[Yjs] addCard called', card, 'after', afterCardId);
    const ydoc = ydocRef.current;
    if (!ydoc) {
      console.error('[Yjs] No ydoc!');
      return;
    }
    const yLinkedCards = ydoc.getArray('linkedCards');
    const yCardOrder = ydoc.getArray('cardOrder');
    const cards = yLinkedCards.toArray() as PlanningRoomYjsDoc['linkedCards'];
    const order = yCardOrder.toArray() as string[];

    // Check if card with this ID already exists to prevent duplicates
    const existingCardIndex = cards.findIndex(c => c.id === card.id);
    if (existingCardIndex !== -1) {
      console.log(`[Yjs] Card with id ${card.id} already exists, skipping insert`);
      return;
    }
    
    // Check if card ID already exists in order to prevent duplicates
    if (order.includes(card.id)) {
      console.log(`[Yjs] Card ID ${card.id} already exists in order, skipping insert`);
      return;
    }

    let insertIdx = cards.length;
    let orderIdx = order.length;
    if (afterCardId) {
      const idx = cards.findIndex(c => c.id === afterCardId);
      if (idx !== -1) insertIdx = idx + 1;
      const oidx = order.indexOf(afterCardId);
      if (oidx !== -1) orderIdx = oidx + 1;
    }
    
    try {
        yLinkedCards.insert(insertIdx, [card]);
        yCardOrder.insert(orderIdx, [card.id]);
      console.log('[Yjs] After insert, yLinkedCards:', yLinkedCards.toArray());
      console.log('[Yjs] After insert, yCardOrder:', yCardOrder.toArray());
      
      // Force a state update even if observers don't trigger
      setDocState({
        linkedCards: yLinkedCards.toArray() as PlanningRoomYjsDoc['linkedCards'],
        cardOrder: yCardOrder.toArray() as PlanningRoomYjsDoc['cardOrder'],
        chatMessages: ydoc.getArray('chatMessages').toArray() as PlanningRoomYjsDoc['chatMessages'],
        reactions: docState.reactions, // Reuse existing reactions
        polls: ydoc.getArray('polls').toArray() as PlanningRoomYjsDoc['polls'],
        activityFeed: ydoc.getArray('activityFeed').toArray() as PlanningRoomYjsDoc['activityFeed'],
      });
      
      // Also update localStorage for additional redundancy
        try {
          const storedData = localStorage.getItem('openhouse-data');
          if (storedData) {
            const groups = JSON.parse(storedData);
            const groupIndex = groups.findIndex((g: any) => g.id === groupId);
            if (groupIndex >= 0) {
              const cardData = {
                id: card.id,
                type: card.cardType,
                content: card.address || card.notes || card.id,
                notes: card.notes,
                lat: card.lat,
                lng: card.lng
              };
              
            // Add to cards array only if it doesn't already exist
              if (!groups[groupIndex].cards) {
                groups[groupIndex].cards = [];
              }
              
            // Check if card already exists in local storage to prevent duplicates
            const existingCardIndexInStorage = groups[groupIndex].cards.findIndex((c: any) => c.id === card.id);
            if (existingCardIndexInStorage === -1) {
              groups[groupIndex].cards.push(cardData);
              localStorage.setItem('openhouse-data', JSON.stringify(groups));
                console.log('[Yjs] Updated localStorage with new card');
            } else {
              console.log(`[Yjs] Card ${card.id} already exists in localStorage, not adding duplicate`);
            }
          }
        }
      } catch (e) {
        console.error('[Yjs] Failed to update localStorage:', e);
      }
      
      // Attempt to persist to D1 but don't block on it
      persistToD1();
    } catch (error) {
      console.error('[Yjs] Error adding card:', error);
    }
  }, [groupId, docState.reactions, persistToD1]);

  // Reorder cards (optimistic)
  const reorderCards = useCallback((newOrder: string[]) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const yCardOrder = ydoc.getArray('cardOrder');
    
    try {
        yCardOrder.delete(0, yCardOrder.length);
        yCardOrder.push(newOrder);
      
      // Force a state update even if observers don't trigger
      setDocState(current => ({
        ...current,
        cardOrder: newOrder,
      }));
      
      // Also update localStorage for additional redundancy
        try {
          const storedData = localStorage.getItem('openhouse-data');
          if (storedData) {
            const groups = JSON.parse(storedData);
            const groupIndex = groups.findIndex((g: any) => g.id === groupId);
            if (groupIndex >= 0 && groups[groupIndex].cards) {
              // Create a map of id to card
              const cardMap = new Map(groups[groupIndex].cards.map((c: any) => [c.id, c]));
            // Reorder cards based on new order
              groups[groupIndex].cards = newOrder
                .filter(id => cardMap.has(id))
                .map(id => cardMap.get(id));
              localStorage.setItem('openhouse-data', JSON.stringify(groups));
                console.log('[Yjs] Updated localStorage after card reordering');
            }
          }
        } catch (e) {
          console.error('[Yjs] Failed to update localStorage:', e);
      }
      
      // Attempt to persist to D1 but don't block on it
      persistToD1();
    } catch (error) {
      console.error('[Yjs] Error reordering cards:', error);
    }
  }, [groupId, persistToD1]);

  // Remove card (optimistic)
  const removeCard = useCallback((cardId: string) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const yLinkedCards = ydoc.getArray('linkedCards');
    const yCardOrder = ydoc.getArray('cardOrder');
    const cards = yLinkedCards.toArray() as PlanningRoomYjsDoc['linkedCards'];
    const idx = cards.findIndex(c => c.id === cardId);
    
    try {
      if (idx !== -1) yLinkedCards.delete(idx, 1);
    const order = yCardOrder.toArray() as string[];
    const orderIdx = order.indexOf(cardId);
      if (orderIdx !== -1) yCardOrder.delete(orderIdx, 1);
      
      // Force a state update even if observers don't trigger
      setDocState({
        linkedCards: yLinkedCards.toArray() as PlanningRoomYjsDoc['linkedCards'],
        cardOrder: yCardOrder.toArray() as PlanningRoomYjsDoc['cardOrder'],
        chatMessages: ydoc.getArray('chatMessages').toArray() as PlanningRoomYjsDoc['chatMessages'],
        reactions: docState.reactions, // Reuse existing reactions
        polls: ydoc.getArray('polls').toArray() as PlanningRoomYjsDoc['polls'],
        activityFeed: ydoc.getArray('activityFeed').toArray() as PlanningRoomYjsDoc['activityFeed'],
      });
      
      // Also update localStorage for additional redundancy
        try {
          const storedData = localStorage.getItem('openhouse-data');
          if (storedData) {
            const groups = JSON.parse(storedData);
            const groupIndex = groups.findIndex((g: any) => g.id === groupId);
            if (groupIndex >= 0 && groups[groupIndex].cards) {
              groups[groupIndex].cards = groups[groupIndex].cards.filter((c: any) => c.id !== cardId);
              localStorage.setItem('openhouse-data', JSON.stringify(groups));
                console.log('[Yjs] Updated localStorage after card removal');
            }
          }
        } catch (e) {
          console.error('[Yjs] Failed to update localStorage:', e);
      }
      
      // Attempt to persist to D1 but don't block on it
      persistToD1();
    } catch (error) {
      console.error('[Yjs] Error removing card:', error);
    }
  }, [groupId, docState.reactions, persistToD1]);

  // Add chat message (Yjs-powered)
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

  // Load messages from localStorage on initial mount
  useEffect(() => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const yChatMessages = ydoc.getArray<ChatMessage>('chatMessages');

    try {
      const key = `planningRoom:${groupId}:messages`;
      const storedMessages = JSON.parse(localStorage.getItem(key) || '[]');
      
      // Only add messages that aren't already in Yjs
      const existingIds = new Set(yChatMessages.toArray().map(m => m.id));
      const newMessages = storedMessages.filter((m: ChatMessage) => !existingIds.has(m.id));
      
      if (newMessages.length > 0) {
        console.log('[Yjs] Adding stored messages from localStorage:', newMessages.length);
        yChatMessages.push(newMessages);
      }
    } catch (e) {
      console.error('[Yjs] Failed to load messages from localStorage:', e);
    }
  }, [groupId]);

  // Add or update a reaction for a card
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

  // Remove a reaction for a card
  const removeReaction = useCallback((cardId: string) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const yReactions = ydoc.getMap('reactions');
    let userMap = yReactions.get(cardId) as Y.Map<any> | undefined;
    if (userMap instanceof Y.Map) {
      userMap.delete(currentUserId);
    }
  }, [currentUserId]);

  /**
   * Add a poll to the planning room (Yjs-powered)
   */
  const addPoll = useCallback((poll: PlanningRoomYjsDoc['polls'][0]) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const yPolls = ydoc.getArray('polls');
    yPolls.push([poll]);
  }, []);

  /**
   * Add an activity to the planning room activity feed (Yjs-powered)
   */
  const addActivity = useCallback((activity: PlanningRoomYjsDoc['activityFeed'][0]) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const yActivityFeed = ydoc.getArray('activityFeed');
    yActivityFeed.push([activity]);
  }, []);

  // Fix duplicate cards in localStorage
  useEffect(() => {
    if (!groupId) return;
    
    try {
      // Check if we've already run this migration for this group
      const migrationKey = `yjs-migrated-${groupId}`;
      if (localStorage.getItem(migrationKey)) {
        return; // Already migrated
      }
      
      const storedData = localStorage.getItem('openhouse-data');
      if (storedData) {
        const groups = JSON.parse(storedData);
        const groupIndex = groups.findIndex((g: any) => g.id === groupId);
        if (groupIndex >= 0 && groups[groupIndex].cards && Array.isArray(groups[groupIndex].cards)) {
          // Find duplicate cards
          const cards = groups[groupIndex].cards;
          const seenIds = new Set<string>();
          const uniqueCards: any[] = [];
          let hasDuplicates = false;
          
          for (const card of cards) {
            if (!seenIds.has(card.id)) {
              seenIds.add(card.id);
              uniqueCards.push(card);
            } else {
              hasDuplicates = true;
              console.log(`[Yjs Migration] Found duplicate card with id ${card.id} in localStorage, removing`);
            }
          }
          
          // If we found duplicates, update localStorage
          if (hasDuplicates) {
            console.log(`[Yjs Migration] Fixing ${cards.length - uniqueCards.length} duplicate cards in localStorage`);
            groups[groupIndex].cards = uniqueCards;
            localStorage.setItem('openhouse-data', JSON.stringify(groups));
          }
          
          // Mark migration as complete
          localStorage.setItem(migrationKey, 'true');
        }
      }
    } catch (e) {
      console.error('[Yjs Migration] Error cleaning up localStorage:', e);
    }
  }, [groupId]);

  // Add geocoding migration to ensure all 'where' cards have coordinates
  useEffect(() => {
    const geocodeMissingLocations = async () => {
      if (!groupId || !ydocRef.current) return;
      
      const geocodeKey = `geocode-migrated-${groupId}`