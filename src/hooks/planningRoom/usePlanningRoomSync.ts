import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
// @ts-ignore
import { WebsocketProvider } from 'y-websocket';
import { PlanningRoomYjsDoc } from '@/types/planning-room';

// Replace with your actual y-websocket server URL (from Railway)
const Y_WEBSOCKET_URL = process.env.NEXT_PUBLIC_Y_WEBSOCKET_URL || 'wss://y-websocket-production-d87f.up.railway.app';

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
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const provider = new WebsocketProvider(
      Y_WEBSOCKET_URL,
      `planningRoom:${groupId}`,
      ydoc
    );
    providerRef.current = provider;

    // Get or create Yjs arrays
    const yLinkedCards = ydoc.getArray('linkedCards');
    const yCardOrder = ydoc.getArray('cardOrder');

    // Observe changes and update React state
    const updateState = () => {
      setDocState({
        linkedCards: yLinkedCards.toArray() as PlanningRoomYjsDoc['linkedCards'],
        cardOrder: yCardOrder.toArray() as PlanningRoomYjsDoc['cardOrder'],
      });
    };
    yLinkedCards.observe(updateState);
    yCardOrder.observe(updateState);
    updateState();

    // Cleanup
    return () => {
      yLinkedCards.unobserve(updateState);
      yCardOrder.unobserve(updateState);
      provider.destroy();
      ydoc.destroy();
    };
  }, [groupId]);

  // Add card (optimistic)
  const addCard = useCallback((card: PlanningRoomYjsDoc['linkedCards'][0]) => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const yLinkedCards = ydoc.getArray('linkedCards');
    const yCardOrder = ydoc.getArray('cardOrder');
    yLinkedCards.push([card]);
    yCardOrder.push([card.id]);
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