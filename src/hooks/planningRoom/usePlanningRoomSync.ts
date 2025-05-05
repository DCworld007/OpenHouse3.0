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

export function usePlanningRoomSync(groupId: string, userId: string) {
  const [docState, setDocState] = useState<Pick<PlanningRoomYjsDoc, 'linkedCards' | 'cardOrder'>>({
    linkedCards: [],
    cardOrder: [],
  });
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  // Load initial state from D1 (stub)
  useEffect(() => {
    // TODO: Fetch initial state from D1 via API and apply to Yjs doc
    // Example: fetch(`/api/planning-room/${groupId}/cards`)
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
      setDocState({
        linkedCards: yLinkedCards.toArray() as PlanningRoomYjsDoc['linkedCards'],
        cardOrder: yCardOrder.toArray() as PlanningRoomYjsDoc['cardOrder'],
      });
    };
    yLinkedCards.observe(updateState);
    yCardOrder.observe(updateState);
    updateState();
    // Cleanup: only remove observers, do NOT destroy doc/provider (persist for group lifetime)
    return () => {
      yLinkedCards.unobserve(updateState);
      yCardOrder.unobserve(updateState);
      // Do not destroy provider or doc here!
    };
  }, [groupId]);

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

  return {
    linkedCards: docState.linkedCards,
    cardOrder: docState.cardOrder,
    addCard,
    reorderCards,
    removeCard,
    // Expose Yjs doc and provider for advanced use if needed
    ydoc: ydocRef.current,
    provider: providerRef.current,
  };
} 