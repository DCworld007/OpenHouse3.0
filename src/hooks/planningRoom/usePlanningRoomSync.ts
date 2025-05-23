import React, { useState, useEffect } from 'react';
import { yDoc } from '../../utils/yDoc';
import { PresentUser } from '../../types/types';

export function usePlanningRoomSync(
  groupId: string,
  currentUserId: string,
  currentUserName?: string,
  currentUserEmail?: string,
  currentUserAvatar?: string
): {
  linkedCards: Listing[];
  cardOrder: string[];
  chatMessages: ChatMessage[];
  reactions: Record<string, Record<string, 'like' | 'dislike' | null>>;
  polls: Poll[];
  activityFeed: any[];
  presentUsers: PresentUser[];
  addCard: (card: Listing, afterCardId?: string) => void;
  addChatMessage: (message: ChatMessageInput) => void;
  addPoll: (poll: Poll) => void;
  addActivity: (activity: Activity) => void;
  ydoc: Y.Doc | null;
} {
  const [docState, setDocState] = useState<PlanningRoomYjsDoc>({
    linkedCards: [],
    cardOrder: [],
    chatMessages: [],
    reactions: {},
    polls: [],
    activityFeed: [],
    presentUsers: [],
  });

  const updateCurrentUserPresence = () => {
    if (!ydoc || !currentUserId) return;
    
    const yPresentUsers = ydoc.getArray<PresentUser>('presentUsers');
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