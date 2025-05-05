"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import PlanGroup from '@/components/PlanGroup';
import IntakeCard from '@/components/IntakeCard';
import PlanCard from '@/components/PlanCard';
import { getGroups, saveGroups } from '@/lib/groupStorage';
import { usePlanningRoomSync } from '@/hooks/planningRoom/usePlanningRoomSync';
import { useUser } from '@/lib/useUser';

const STORAGE_KEY = 'openhouse-data';

interface Card {
  id: string;
  type: 'what' | 'where';
  content: string;
  notes?: string;
  lat?: number;
  lng?: number;
}

interface Group {
  id: string;
  name: string;
  cards: Card[];
  listings?: {
    id: string;
    address: string;
    cardType: 'what' | 'where';
    groupId: string;
    imageUrl: string;
    sourceUrl: string;
    source: string;
    price: number;
    notes: string;
    createdAt: string;
    updatedAt: string;
    order: number;
    reactions: any[];
    lat?: number;
    lng?: number;
  }[];
}

interface Action {
  type: 'ADD_CARD' | 'REMOVE_CARD' | 'MOVE_CARD' | 'RENAME_GROUP' | 'REORDER_CARDS';
  groupId: string;
  data: any;
  previousState: Card[];
}

const DEFAULT_GROUP: Group = {
  id: '1',
  name: 'To Be Scheduled',
  cards: [],
};

export default function PlansPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [actionHistory, setActionHistory] = useState<{ [groupId: string]: Action[] }>({});
  const [isDragging, setIsDragging] = useState(false);

  const { user } = useUser();
  const userId = user?.id || '';

  // Always call the hook in the same order to avoid React hook order errors
  const firstGroupId = groups.length > 0 ? groups[0].id : '';
  const planningRoom = usePlanningRoomSync(firstGroupId, userId);

  // --- Add planningRoomRefs map ---
  const planningRoomRefs = useRef<{ [groupId: string]: React.MutableRefObject<any> }>({});
  // Create and clean up refs for groups in an effect
  useEffect(() => {
    // Add refs for new groups
    groups.forEach(group => {
      if (!planningRoomRefs.current[group.id]) {
        planningRoomRefs.current[group.id] = { current: null };
      }
    });
    // Remove refs for deleted groups
    Object.keys(planningRoomRefs.current).forEach(id => {
      if (!groups.find(g => g.id === id)) {
        delete planningRoomRefs.current[id];
      }
    });
  }, [groups]);

  // On mount, load groups from storage or create a default group with a unique ID
  useEffect(() => {
    try {
      const savedGroups = getGroups();
      const migratedGroups = savedGroups.map(group => ({
        ...group,
        cards: group.cards.map((card: Card & { cardType?: string }) => ({
          ...card,
          type: card.type || card.cardType || 'what',
        })),
      }));
      if (migratedGroups.length > 0) {
        setGroups(migratedGroups);
      } else {
        const defaultGroup: Group = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          name: 'To Be Scheduled',
          cards: [],
        };
        setGroups([defaultGroup]);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      const defaultGroup: Group = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        name: 'To Be Scheduled',
        cards: [],
      };
      setGroups([defaultGroup]);
    }
  }, []);

  // Re-sync groups from storage on window focus or tab visibility
  useEffect(() => {
    const syncFromStorage = () => setGroups(getGroups());
    window.addEventListener('focus', syncFromStorage);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') syncFromStorage();
    });
    return () => {
      window.removeEventListener('focus', syncFromStorage);
      document.removeEventListener('visibilitychange', syncFromStorage);
    };
  }, []);

  // Combine storage effects into one
  useEffect(() => {
    if (groups.length === 0) return; // Skip empty state
    console.log('[PlansPage] saveGroups', groups);
    const synced = syncGroupsWithListings(groups);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
  }, [groups]);

  // Helper to sync listings with cards for all groups
  const syncGroupsWithListings = (groups: Group[]) => {
    return groups.map(group => ({
      ...group,
      listings: group.cards.map(card => ({
        id: card.id,
        address: card.content,
        cardType: card.type,
        groupId: group.id,
        imageUrl: card.type === 'where' ? '/marker-icon-2x.png' : '/placeholder-activity.jpg',
        sourceUrl: '',
        source: 'manual',
        price: 0,
        notes: card.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: 0,
        reactions: [],
        lat: card.lat,
        lng: card.lng
      }))
    }));
  };

  const addToHistory = (groupId: string, action: Omit<Action, 'groupId'>) => {
    setActionHistory(prev => ({
      ...prev,
      [groupId]: [
        { ...action, groupId },
        ...(prev[groupId] || []).slice(0, 4),
      ],
    }));
  };

  const handleUndo = (groupId: string) => {
    const groupHistory = actionHistory[groupId];
    if (!groupHistory || groupHistory.length === 0) return;

    const lastAction = groupHistory[0];
    setGroups(groups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          cards: lastAction.previousState,
        };
      }
      return group;
    }));

    setActionHistory(prev => ({
      ...prev,
      [groupId]: prev[groupId].slice(1),
    }));
  };

  const geocodeAddress = async (address: string) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'UnifyPlan/1.0 (your@email.com)' } });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  };

  // PATCH: IntakeCard always adds to the first group using Yjs
  const handleAddCard = async (data: { type: 'what' | 'where'; content: string; notes?: string }) => {
    if (!groups.length || !planningRoom) return;
    let newCard: any = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      ...data,
      cardType: data.type,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (data.type === 'where') {
      const geo = await geocodeAddress(data.content);
      if (geo) {
        newCard = { ...newCard, lat: geo.lat, lng: geo.lng };
      }
    }
    planningRoom.addCard(newCard);
    setSelectedGroupId(null);
    toast.success('Card added successfully!');
  };

  const handleCardsChange = (groupId: string, newCards: Card[]) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    addToHistory(groupId, {
      type: 'REORDER_CARDS',
      data: newCards,
      previousState: [...group.cards],
    });
    const newGroups = groups.map(group => 
      group.id === groupId ? { ...group, cards: newCards } : group
    );
    console.log('[PlansPage] setGroups (cards change)', newGroups);
    setGroups(newGroups);
  };

  const handleGroupNameChange = (groupId: string, newName: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    addToHistory(groupId, {
      type: 'RENAME_GROUP',
      data: { oldName: group.name, newName },
      previousState: [...group.cards],
    });
    const newGroups = groups.map(group => 
      group.id === groupId ? { ...group, name: newName } : group
    );
    console.log('[PlansPage] setGroups (group name change)', newGroups);
    setGroups(newGroups);
  };

  const handleAddGroup = (afterGroupId: string) => {
    const newGroup: Group = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      name: 'New Group',
      cards: [],
    };
    const index = groups.findIndex(g => g.id === afterGroupId);
    let newGroups;
    if (index === -1) {
      newGroups = [...groups, newGroup];
    } else {
      newGroups = [...groups];
      newGroups.splice(index + 1, 0, newGroup);
    }
    console.log('[PlansPage] setGroups (add group)', newGroups);
    setGroups(newGroups);
  };

  const handleDeleteGroup = (groupId: string) => {
    const newGroups = groups.filter(g => g.id !== groupId);
    console.log('[PlansPage] setGroups (delete group)', newGroups);
    setGroups(newGroups);
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    // setIsDragging(true);
    // const activeGroup = groups.find(g => g.cards.some(c => c.id === active.id));
    // if (activeGroup) {
    //   const card = activeGroup.cards.find(c => c.id === active.id);
    //   if (card) {
    //     setActiveCard(card);
    //   }
    // }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    console.log('handleDragEnd', { active, over }); // DEBUG LOG
    // setActiveCard(null);
    // setIsDragging(false);

    // if (!over) {
    //   toast.error('Invalid drop location - card returned to original position');
    //   return;
    // }

    // const sourceGroup = groups.find(g => g.cards.some(c => c.id === active.id));
    // if (!sourceGroup) return;
    // const sourcePlanningRoom = planningRoomRefs.current[sourceGroup.id]?.current;
    // if (!sourcePlanningRoom) return;

    // if (over.id === 'trash-zone') {
    //   sourcePlanningRoom.removeCard(active.id);
    //   toast.success('Card deleted');
    //   return;
    // }

    // if (over.id.startsWith('group-')) {
    //   const targetGroupId = over.id.replace('group-', '');
    //   const targetGroup = groups.find(g => g.id === targetGroupId);
    //   if (!targetGroup) {
    //     toast.error('Invalid drop location - card returned to original position');
    //     return;
    //   }
    //   if (targetGroup.id === sourceGroup.id) return;
    //   const targetPlanningRoom = planningRoomRefs.current[targetGroup.id]?.current;
    //   if (!targetPlanningRoom) return;
    //   // Find the card in source group
    //   const movedCard = sourcePlanningRoom.linkedCards.find((c: any) => c.id === active.id);
    //   if (!movedCard) return;
    //   // Remove from source, add to target
    //   sourcePlanningRoom.removeCard(active.id);
    //   targetPlanningRoom.addCard(movedCard);
    //   toast.success('Card moved to group');
    //   return;
    // }

    // const targetGroup = groups.find(g => g.cards.some(c => c.id === over.id));
    // if (!targetGroup) {
    //   toast.error('Invalid drop location - card returned to original position');
    //   return;
    // }
    // const targetPlanningRoom = planningRoomRefs.current[targetGroup.id]?.current;
    // if (!targetPlanningRoom) return;

    // if (sourceGroup.id !== targetGroup.id) {
    //   // Cross-group move to specific position
    //   const movedCard = sourcePlanningRoom.linkedCards.find((c: any) => c.id === active.id);
    //   if (!movedCard) return;
    //   sourcePlanningRoom.removeCard(active.id);
    //   // Insert at the position of over.id in target group
    //   const overIdx = targetPlanningRoom.cardOrder.findIndex((id: string) => id === over.id);
    //   targetPlanningRoom.addCard(movedCard, over.id);
    //   toast.success('Card moved to group');
    // } else {
    //   // Reorder within the same group
    //   const oldIndex = targetPlanningRoom.cardOrder.findIndex((id: string) => id === active.id);
    //   const newIndex = targetPlanningRoom.cardOrder.findIndex((id: string) => id === over.id);
    //   if (oldIndex !== -1 && newIndex !== -1) {
    //     const newOrder = Array.from(targetPlanningRoom.cardOrder);
    //     const [moved] = newOrder.splice(oldIndex, 1);
    //     newOrder.splice(newIndex, 0, moved);
    //     targetPlanningRoom.reorderCards(newOrder);
    //   }
    // }
  };

  const TrashZone = () => {
    const [{ isOver }, drop] = useDrop({
      accept: 'CARD',
      drop: () => {
        // Handle drop to trash
        console.log('Card dropped to trash');
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    });

    if (!isDragging) return null;

    return (
      <div
        ref={drop}
        className={`fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
          isOver 
            ? 'bg-red-100 border-2 border-red-500 scale-125' 
            : 'bg-gray-100 border-2 border-gray-300'
        }`}
      >
        <TrashIcon 
          className={`h-6 w-6 ${
            isOver ? 'text-red-500' : 'text-gray-400'
          }`} 
        />
      </div>
    );
  };

  // Consistency checker: warn if cards and listings are out of sync
  useEffect(() => {
    groups.forEach(group => {
      if (group.cards && group.listings) {
        const cardsStr = JSON.stringify(group.cards);
        const listingsStr = JSON.stringify(
          group.listings.map(l => ({
            id: l.id,
            type: l.cardType,
            content: l.address,
            notes: l.notes,
            lat: l.lat,
            lng: l.lng
          }))
        );
        if (cardsStr !== listingsStr) {
          console.warn(`Group '${group.name}' is out of sync!`, {
            cards: group.cards,
            listings: group.listings
          });
        }
      }
    });
  }, [groups]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Debug: Dump State Button (removed for production) */}
      {/*
      <button
        className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm font-mono"
        onClick={() => {
          console.log('Current groups state:', groups);
          console.log('localStorage[openhouse-data]:', localStorage.getItem(STORAGE_KEY));
        }}
      >
        Dump State to Console
      </button>
      */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Your Plans
          </h2>
        </div>
      </div>

      <div className="mt-6">
        <IntakeCard
          onSubmit={handleAddCard}
          onCancel={() => setSelectedGroupId(null)}
        />
      </div>

      <DndProvider backend={HTML5Backend}>
        <div className="mt-6 space-y-4">
          {groups.map((group, index) => {
            const ref = planningRoomRefs.current[group.id];
            return (
              <div key={group.id} className="relative group pb-4">
                <PlanGroup
                  id={group.id}
                  name={group.name}
                  userId={userId}
                  onNameChange={handleGroupNameChange}
                  onCardsChange={handleCardsChange}
                  onDelete={handleDeleteGroup}
                  onUndo={() => handleUndo(group.id)}
                  canUndo={!!(actionHistory[group.id]?.length)}
                  isFirstGroup={index === 0}
                  totalGroups={groups.length}
                  onAddGroup={handleAddGroup}
                  legacyCards={group.cards}
                  planningRoomRef={ref}
                />
              </div>
            );
          })}
        </div>

        <TrashZone />

        <div className="mt-6 space-y-4">
          {groups.map((group, index) => {
            const ref = planningRoomRefs.current[group.id];
            return (
              <div key={group.id} className="relative group pb-4">
                {group.cards.map((card, cardIndex) => (
                  <div
                    key={card.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center">
                        {/* Placeholder for card icon */}
                      </div>
                      <div className="ml-4">
                        {card.content}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <button
                        className="text-red-500 hover:text-red-700 mr-2"
                        onClick={() => {
                          // Handle remove card
                          console.log('Removing card:', card.id);
                        }}
                      >
                        Remove
                      </button>
                      <button
                        className="text-blue-500 hover:text-blue-700"
                        onClick={() => {
                          // Handle edit card
                          console.log('Editing card:', card.id);
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </DndProvider>
    </div>
  );
} 