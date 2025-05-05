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
  const [docState, setDocState] = useState<Pick<PlanningRoomYjsDoc, 'linkedCards' | 'cardOrder' | 'chatMessages'>>({
    linkedCards: [],
    cardOrder: [],
    chatMessages: [],
  });
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const hasLoadedFromD1 = useRef(false);

  // Load initial state from D1 (Phase 1)
  useEffect(() => {
    let cancelled = false;
    async function loadFromD1() {
      if (!groupId) return;
      try {
        const res = await fetch(`/api/planning-room/${groupId}/cards`);
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
    // Always get arrays from the persistent doc
    const yLinkedCards = ydoc.getArray('linkedCards');
    const yCardOrder = ydoc.getArray('cardOrder');
    const yChatMessages = ydoc.getArray('chatMessages');
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
      setDocState({
        linkedCards: yLinkedCards.toArray() as PlanningRoomYjsDoc['linkedCards'],
        cardOrder: yCardOrder.toArray() as PlanningRoomYjsDoc['cardOrder'],
        chatMessages: yChatMessages.toArray() as PlanningRoomYjsDoc['chatMessages'],
      });
      // Debounced persist to D1 on every change
      debouncedPersistToD1();
    };
    yLinkedCards.observe(updateState);
    yCardOrder.observe(updateState);
    yChatMessages.observe(updateState);
    updateState();
    // Cleanup: only remove observers, do NOT destroy doc/provider (persist for group lifetime)
    return () => {
      yLinkedCards.unobserve(updateState);
      yCardOrder.unobserve(updateState);
      yChatMessages.unobserve(updateState);
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
    const base64 = btoa(binary);
    fetch(`/api/planning-room/${groupId}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc: base64 }),
    }).catch(e => console.error('[Yjs] Failed to persist to D1:', e));
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
    let insertIdx = cards.length;
    let orderIdx = order.length;
    if (afterCardId) {
      const idx = cards.findIndex(c => c.id === afterCardId);
      if (idx !== -1) insertIdx = idx + 1;
      const oidx = order.indexOf(afterCardId);
      if (oidx !== -1) orderIdx = oidx + 1;
    }
    yLinkedCards.insert(insertIdx, [card]);
    yCardOrder.insert(orderIdx, [card.id]);
    console.log('[Yjs] After insert, yLinkedCards:', yLinkedCards.toArray());
    console.log('[Yjs] After insert, yCardOrder:', yCardOrder.toArray());
    // TODO: Persist to D1 in background
    // TODO: Track userId for analytics
  }, []);

  // Reorder cards (optimistic)
  const reorderCards = useCallback((newOrder: string[]) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const yCardOrder = ydoc.getArray('cardOrder');
    yCardOrder.delete(0, yCardOrder.length);
    yCardOrder.push(newOrder);
    // TODO: Persist to D1 in background
    // TODO: Track userId for analytics
  }, []);

  // Remove card (optimistic)
  const removeCard = useCallback((cardId: string) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const yLinkedCards = ydoc.getArray('linkedCards');
    const yCardOrder = ydoc.getArray('cardOrder');
    const cards = yLinkedCards.toArray() as PlanningRoomYjsDoc['linkedCards'];
    const idx = cards.findIndex(c => c.id === cardId);
    if (idx !== -1) yLinkedCards.delete(idx, 1);
    const order = yCardOrder.toArray() as string[];
    const orderIdx = order.indexOf(cardId);
    if (orderIdx !== -1) yCardOrder.delete(orderIdx, 1);
    // TODO: Persist to D1 in background
    // TODO: Track userId for analytics
  }, []);

  // Add chat message (Yjs-powered)
  const addChatMessage = useCallback((msg: PlanningRoomYjsDoc['chatMessages'][0]) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const yChatMessages = ydoc.getArray('chatMessages');
    yChatMessages.push([msg]);
  }, []);

  return {
    linkedCards: docState.linkedCards,
    cardOrder: docState.cardOrder,
    chatMessages: docState.chatMessages,
    addChatMessage,
    addCard,
    reorderCards,
    removeCard,
    // Expose Yjs doc and provider for advanced use if needed
    ydoc: ydocRef.current,
    provider: providerRef.current,
  };
} 