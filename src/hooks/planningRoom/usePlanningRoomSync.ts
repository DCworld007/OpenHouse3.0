import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
// @ts-ignore
import { WebsocketProvider } from 'y-websocket';
import { PlanningRoomYjsDoc } from '@/types/planning-room';

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

export function usePlanningRoomSync(groupId: string, userId: string) {
  const [docState, setDocState] = useState<Pick<PlanningRoomYjsDoc, 'linkedCards' | 'cardOrder' | 'chatMessages' | 'reactions' | 'polls' | 'activityFeed'>>({
    linkedCards: [],
    cardOrder: [],
    chatMessages: [],
    reactions: {},
    polls: [],
    activityFeed: [],
  });
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const hasLoadedFromD1 = useRef(false);

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
          card.content // Only add cards with content
        );
        
        if (newCards.length === 0) {
          console.log(`[LinkedGroups Sync] No new cards to add from group ${linkedGroup.group.id}`);
          continue;
        }
        
        console.log(`[LinkedGroups Sync] Adding ${newCards.length} cards from group ${linkedGroup.group.id}`);
        
        // Prepare cards for adding to Yjs doc
        const cardsToAdd = newCards.map((card: any) => ({
          id: card.id,
          content: card.content,
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
    const yChatMessages = ydoc.getArray('chatMessages');
    const yReactions = ydoc.getMap('reactions');
    const yPolls = ydoc.getArray('polls');
    const yActivityFeed = ydoc.getArray('activityFeed');
    if (!provider) {
      provider = new WebsocketProvider(
        Y_WEBSOCKET_URL,
        `planningRoom:${groupId}`,
        ydoc
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
    provider.on('status', (event: any) => {
      console.log('[Yjs] WebsocketProvider status:', event.status);
    });
    provider.on('sync', (isSynced: boolean) => {
      console.log('[Yjs] WebsocketProvider sync:', isSynced);
    });
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
          userMap.forEach((reaction, userId) => {
            reactionsObj[cardId][userId] = reaction;
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
        chatMessages: yChatMessages.toArray() as PlanningRoomYjsDoc['chatMessages'],
        reactions: reactionsObj,
        polls: yPolls.toArray() as PlanningRoomYjsDoc['polls'],
        activityFeed: yActivityFeed.toArray() as PlanningRoomYjsDoc['activityFeed'],
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
    updateState();
    // Cleanup: only remove observers, do NOT destroy doc/provider (persist for group lifetime)
    return () => {
      yLinkedCards.unobserve(updateState);
      yCardOrder.unobserve(updateState);
      yChatMessages.unobserve(updateState);
      yReactions.unobserveDeep(updateState);
      yPolls.unobserve(updateState);
      yActivityFeed.unobserve(updateState);
      // Do not destroy provider or doc here!
    };
  }, [groupId]);

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
                content: card.content,
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
  const addChatMessage = useCallback((msg: PlanningRoomYjsDoc['chatMessages'][0]) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const yChatMessages = ydoc.getArray('chatMessages');
    yChatMessages.push([msg]);
  }, []);

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
    (userMap as Y.Map<any>).set(userId, reaction);
  }, [userId]);

  // Remove a reaction for a card
  const removeReaction = useCallback((cardId: string) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const yReactions = ydoc.getMap('reactions');
    let userMap = yReactions.get(cardId) as Y.Map<any> | undefined;
    if (userMap instanceof Y.Map) {
      userMap.delete(userId);
    }
  }, [userId]);

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
      
      const geocodeKey = `geocode-migrated-${groupId}`;
      if (localStorage.getItem(geocodeKey)) {
        return; // Already ran geocoding migration
      }
      
      // Get all cards
      const yLinkedCards = ydocRef.current.getArray('linkedCards');
      const cards = yLinkedCards.toArray() as PlanningRoomYjsDoc['linkedCards'];
      
      // Find 'where' cards missing coordinates
      const cardsNeedingGeocode = cards.filter(card => 
        card.cardType === 'where' && 
        (typeof card.lat !== 'number' || typeof card.lng !== 'number') &&
        card.content
      );
      
      if (cardsNeedingGeocode.length === 0) {
        // No cards need geocoding, mark migration as complete
        localStorage.setItem(geocodeKey, 'true');
        return;
      }
      
      console.log(`[Geocode Migration] Found ${cardsNeedingGeocode.length} cards needing geocoding`);
      
      // Geocode each card
      for (const card of cardsNeedingGeocode) {
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(card.content)}`;
          const res = await fetch(url, { headers: { 'User-Agent': 'UnifyPlan/1.0' } });
          const data = await res.json();
          
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            
            if (!isNaN(lat) && !isNaN(lng)) {
              console.log(`[Geocode Migration] Successfully geocoded "${card.content}" to: ${lat}, ${lng}`);
              
              // Update card with coordinates
              const cardIndex = cards.findIndex(c => c.id === card.id);
              if (cardIndex !== -1) {
                const updatedCard = { ...card, lat, lng, updatedAt: new Date().toISOString() };
                yLinkedCards.delete(cardIndex, 1);
                yLinkedCards.insert(cardIndex, [updatedCard]);
                
                // Also update localStorage
                const storedData = localStorage.getItem('openhouse-data');
                if (storedData) {
                  const groups = JSON.parse(storedData);
                  const groupIndex = groups.findIndex((g: any) => g.id === groupId);
                  if (groupIndex >= 0 && groups[groupIndex].cards) {
                    const cardIndex = groups[groupIndex].cards.findIndex((c: any) => c.id === card.id);
                    if (cardIndex !== -1) {
                      groups[groupIndex].cards[cardIndex].lat = lat;
                      groups[groupIndex].cards[cardIndex].lng = lng;
                      localStorage.setItem('openhouse-data', JSON.stringify(groups));
                    }
                  }
                }
              }
            }
          }
          
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`[Geocode Migration] Error geocoding "${card.content}":`, error);
        }
      }
      
      // Mark migration as complete
      localStorage.setItem(geocodeKey, 'true');
    };
    
    geocodeMissingLocations();
  }, [groupId]);

  return {
    linkedCards: docState.linkedCards,
    cardOrder: docState.cardOrder,
    chatMessages: docState.chatMessages,
    reactions: docState.reactions,
    polls: docState.polls,
    activityFeed: docState.activityFeed,
    addChatMessage,
    addCard,
    reorderCards,
    removeCard,
    addReaction,
    removeReaction,
    addPoll,
    addActivity,
    // Expose Yjs doc and provider for advanced use if needed
    ydoc: ydocRef.current,
    provider: providerRef.current,
  };
} 