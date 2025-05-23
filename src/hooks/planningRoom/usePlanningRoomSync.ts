import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { PlanningRoomYjsDoc, PresentUser } from '@/types/planning-room';
import { ChatMessage, ChatMessageInput, Poll } from '@/types/message-types';
import { Listing } from '@/types/listing';
import { Activity } from '@/types/activity';

const Y_WEBSOCKET_URL = process.env.NEXT_PUBLIC_Y_WEBSOCKET_URL || 'wss://y-websocket-production-d87f.up.railway.app';
const PRESENCE_TIMEOUT = 5 * 60 * 1000;
const PRESENCE_UPDATE_INTERVAL = 30 * 1000;

// Persistent Y.Doc/Provider per groupId
const yDocMap: Map<string, Y.Doc> = new Map();
const providerMap: Map<string, WebsocketProvider> = new Map();

interface PlanningRoomSync extends PlanningRoomYjsDoc {
  addCard: (card: Listing, afterCardId?: string) => void;
  addChatMessage: (message: ChatMessageInput) => void;
  addPoll: (poll: Poll) => void;
  addActivity: (activity: Activity) => void;
  ydoc: Y.Doc | null;
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
  const joinedAtRef = useRef<number>(Date.now());

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

  // Start presence updates
  useEffect(() => {
    updateCurrentUserPresence();
    const interval = setInterval(updateCurrentUserPresence, PRESENCE_UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, [currentUserId, currentUserName, currentUserEmail, currentUserAvatar]);

  return {
    ...docState,
    addCard,
    addChatMessage,
    addPoll,
    addActivity,
    ydoc: ydocRef.current,
  };
}

export default usePlanningRoomSync; 