"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
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
  const [groups, setGroups] = useState<Group[]>(() => {
    try {
      const savedGroups = getGroups();
      // MIGRATION: Ensure all cards have 'type' property (migrate from 'cardType' if needed)
      const migratedGroups = savedGroups.map(group => ({
        ...group,
        cards: group.cards.map((card: Card & { cardType?: string }) => ({
          ...card,
          type: card.type || card.cardType || 'what',
        })),
      }));
      return migratedGroups.length > 0 ? migratedGroups : [DEFAULT_GROUP];
    } catch (error) {
      console.error('Error loading groups:', error);
      return [DEFAULT_GROUP];
    }
  });
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [actionHistory, setActionHistory] = useState<{ [groupId: string]: Action[] }>({});
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { user } = useUser();
  const userId = user?.id || '';

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

  const handleAddCard = async (data: { type: 'what' | 'where'; content: string; notes?: string }) => {
    let newCard: any = {
      id: Date.now().toString(),
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
    const targetGroupId = selectedGroupId || groups[0].id;
    const groupIndex = groups.findIndex(g => g.id === targetGroupId);
    if (groupIndex !== -1) {
      planningRoomHooks[groupIndex].addCard(newCard);
    }
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
      id: Date.now().toString(),
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
    setIsDragging(true);
    const activeGroup = groups.find(g => g.cards.some(c => c.id === active.id));
    if (activeGroup) {
      const card = activeGroup.cards.find(c => c.id === active.id);
      if (card) {
        setActiveCard(card);
      }
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveCard(null);
    setIsDragging(false);

    if (!over) {
      toast.error('Invalid drop location - card returned to original position');
      return;
    }

    const sourceGroup = groups.find(g => g.cards.some(c => c.id === active.id));
    if (!sourceGroup) return;

    if (over.id === 'trash-zone') {
      const card = sourceGroup.cards.find(c => c.id === active.id);
      if (card) {
        addToHistory(sourceGroup.id, {
          type: 'REMOVE_CARD',
          data: card,
          previousState: [...sourceGroup.cards],
        });
      }

      setGroups(groups.map(group => {
        if (group.id === sourceGroup.id) {
          return {
            ...group,
            cards: group.cards.filter(c => c.id !== active.id),
          };
        }
        return group;
      }));
      toast.success('Card deleted');
      return;
    }

    if (over.id.startsWith('group-')) {
      const targetGroupId = over.id.replace('group-', '');
      const targetGroup = groups.find(g => g.id === targetGroupId);
      if (!targetGroup) {
        toast.error('Invalid drop location - card returned to original position');
        return;
      }
      if (targetGroup.id === sourceGroup.id) return;

      addToHistory(sourceGroup.id, {
        type: 'MOVE_CARD',
        data: { targetGroupId: targetGroup.id },
        previousState: [...sourceGroup.cards],
      });
      addToHistory(targetGroup.id, {
        type: 'MOVE_CARD',
        data: { sourceGroupId: sourceGroup.id },
        previousState: [...targetGroup.cards],
      });

      const movedCard = sourceGroup.cards.find(c => c.id === active.id);
      if (!movedCard) return;

      setGroups(groups.map(group => {
        if (group.id === sourceGroup.id) {
          return {
            ...group,
            cards: group.cards.filter(c => c.id !== active.id),
          };
        }
        if (group.id === targetGroup.id) {
          return {
            ...group,
            cards: [...group.cards, movedCard],
          };
        }
        return group;
      }));
      toast.success('Card moved to group');
      return;
    }

    const targetGroup = groups.find(g => g.cards.some(c => c.id === over.id));
    if (!targetGroup) {
      toast.error('Invalid drop location - card returned to original position');
      return;
    }

    if (sourceGroup.id !== targetGroup.id) {
      addToHistory(sourceGroup.id, {
        type: 'MOVE_CARD',
        data: { targetGroupId: targetGroup.id },
        previousState: [...sourceGroup.cards],
      });
      addToHistory(targetGroup.id, {
        type: 'MOVE_CARD',
        data: { sourceGroupId: sourceGroup.id },
        previousState: [...targetGroup.cards],
      });
    } else {
      addToHistory(sourceGroup.id, {
        type: 'REORDER_CARDS',
        data: null,
        previousState: [...sourceGroup.cards],
      });
    }

    setGroups(groups.map(group => {
      if (group.id === sourceGroup.id && group.id === targetGroup.id) {
        const oldIndex = group.cards.findIndex(c => c.id === active.id);
        const newIndex = group.cards.findIndex(c => c.id === over.id);
        const newCards = [...group.cards];
        const [movedCard] = newCards.splice(oldIndex, 1);
        newCards.splice(newIndex, 0, movedCard);
        return {
          ...group,
          cards: newCards,
        };
      }
      if (group.id === sourceGroup.id) {
        return {
          ...group,
          cards: group.cards.filter(c => c.id !== active.id),
        };
      }
      if (group.id === targetGroup.id) {
        const overCardIndex = group.cards.findIndex(c => c.id === over.id);
        const newCards = [...group.cards];
        const movedCard = sourceGroup.cards.find(c => c.id === active.id);
        if (movedCard) {
          newCards.splice(overCardIndex, 0, movedCard);
        }
        return {
          ...group,
          cards: newCards,
        };
      }
      return group;
    }));
  };

  const TrashZone = () => {
    const { setNodeRef, isOver } = useDroppable({
      id: 'trash-zone',
    });

    if (!isDragging) return null;

    return (
      <div
        ref={setNodeRef}
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

  // For each group, set up usePlanningRoomSync and render cards from Yjs doc
  const planningRoomHooks = groups.map(group => usePlanningRoomSync(group.id, userId));

  // Migration step: on first load, if Yjs doc is empty, migrate legacy cards
  useEffect(() => {
    planningRoomHooks.forEach((hook, index) => {
      if (hook.linkedCards.length === 0 && groups[index].cards.length > 0) {
        groups[index].cards.forEach(card => {
          const yjsCard = {
            ...card,
            cardType: card.type,
            userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          hook.addCard(yjsCard);
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planningRoomHooks.length]);

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="mt-6 space-y-4">
          {groups.map((group, index) => (
            <div key={group.id} className="relative group pb-4">
              <PlanGroup
                id={group.id}
                name={group.name}
                cards={planningRoomHooks[index].cardOrder
                  .map(id => planningRoomHooks[index].linkedCards.find(card => card.id === id))
                  .filter(Boolean)
                  .map(card => ({ ...card!, type: card!.cardType })) as Card[]}
                onNameChange={handleGroupNameChange}
                onCardsChange={handleCardsChange}
                onDelete={handleDeleteGroup}
                onUndo={() => handleUndo(group.id)}
                canUndo={!!(actionHistory[group.id]?.length)}
                isFirstGroup={index === 0}
                totalGroups={groups.length}
                onAddGroup={handleAddGroup}
              />
            </div>
          ))}
        </div>

        <TrashZone />

        <DragOverlay>
          {activeCard && (
            <PlanCard
              id={activeCard.id}
              what={activeCard.type === 'what' ? activeCard.content : ''}
              where={activeCard.type === 'where' ? activeCard.content : ''}
              notes={activeCard.notes}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
} 