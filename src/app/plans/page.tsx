'use client';

import { useState, useEffect } from 'react';
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

const STORAGE_KEY = 'openhouse-data';

interface Card {
  id: string;
  type: 'what' | 'where';
  content: string;
  notes?: string;
}

interface Group {
  id: string;
  name: string;
  cards: Card[];
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
  const [groups, setGroups] = useState<Group[]>([DEFAULT_GROUP]);
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

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // Ensure each group has a cards array
        const validatedGroups = parsedData.map((group: any) => ({
          ...group,
          cards: Array.isArray(group.cards) ? group.cards : [],
        }));
        setGroups(validatedGroups);
      } catch (error) {
        console.error('Error loading saved data:', error);
        // Keep the default group if loading fails
      }
    }
    // If no saved data, we'll keep the default group from initial state
  }, []);

  // Save to localStorage whenever groups change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  }, [groups]);

  // Function to add an action to history
  const addToHistory = (groupId: string, action: Omit<Action, 'groupId'>) => {
    setActionHistory(prev => ({
      ...prev,
      [groupId]: [
        { ...action, groupId },
        ...(prev[groupId] || []).slice(0, 4), // Keep last 5 actions
      ],
    }));
  };

  // Function to undo last action for a group
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

    // Remove the undone action from history
    setActionHistory(prev => ({
      ...prev,
      [groupId]: prev[groupId].slice(1),
    }));
  };

  const handleAddCard = (data: { type: 'what' | 'where'; content: string; notes?: string }) => {
    const newCard = {
      id: Date.now().toString(),
      ...data,
    };

    // If no groups exist, create a default group
    if (groups.length === 0) {
      const defaultGroup: Group = {
        id: Date.now().toString(),
        name: 'New Group',
        cards: [newCard],
      };
      setGroups([defaultGroup]);
      toast.success('Card added to new group');
      return;
    }

    const targetGroupId = selectedGroupId || groups[0].id;
    const targetGroup = groups.find(g => g.id === targetGroupId);
    if (!targetGroup) return;

    // Save current state before modification
    addToHistory(targetGroupId, {
      type: 'ADD_CARD',
      data: newCard,
      previousState: [...targetGroup.cards],
    });

    setGroups(groups.map(group => {
      if (group.id === targetGroupId) {
        return {
          ...group,
          cards: [...group.cards, newCard],
        };
      }
      return group;
    }));
    
    setSelectedGroupId(null);
    toast.success('Card added successfully!');
  };

  const handleCardsChange = (groupId: string, newCards: Card[]) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    // Save current state before modification
    addToHistory(groupId, {
      type: 'REORDER_CARDS',
      data: newCards,
      previousState: [...group.cards],
    });

    setGroups(groups.map(group => 
      group.id === groupId ? { ...group, cards: newCards } : group
    ));
  };

  const handleGroupNameChange = (groupId: string, newName: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    // Save current state before modification
    addToHistory(groupId, {
      type: 'RENAME_GROUP',
      data: { oldName: group.name, newName },
      previousState: [...group.cards],
    });

    setGroups(groups.map(group => 
      group.id === groupId ? { ...group, name: newName } : group
    ));
  };

  const handleAddGroup = (afterGroupId: string) => {
    const newGroup: Group = {
      id: Date.now().toString(),
      name: 'New Group',
      cards: [],
    };

    const index = groups.findIndex(g => g.id === afterGroupId);
    if (index === -1) {
      setGroups([...groups, newGroup]);
    } else {
      const newGroups = [...groups];
      newGroups.splice(index + 1, 0, newGroup);
      setGroups(newGroups);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(groups.filter(g => g.id !== groupId));
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    console.log('Drag Start:', { 
      activeId: active.id,
      activeRect: active.rect,
      event 
    });
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
    console.log('Drag End:', { 
      activeId: active.id,
      overId: over?.id,
      activeRect: active.rect,
      overRect: over?.rect,
      event 
    });
    setActiveCard(null);
    setIsDragging(false);

    // If no over target, return card to original position
    if (!over) {
      toast.error('Invalid drop location - card returned to original position');
      return;
    }

    // Find the source group that has the active card
    const sourceGroup = groups.find(g => g.cards.some(c => c.id === active.id));
    if (!sourceGroup) return;

    // Handle dropping in trash zone
    if (over.id === 'trash-zone') {
      // Save current state before deletion
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

    // Handle dropping on a group container
    if (over.id.startsWith('group-')) {
      const targetGroupId = over.id.replace('group-', '');
      const targetGroup = groups.find(g => g.id === targetGroupId);
      
      if (!targetGroup) {
        toast.error('Invalid drop location - card returned to original position');
        return;
      }

      // If dropping in same group, do nothing (since it would go to the end anyway)
      if (targetGroup.id === sourceGroup.id) return;

      // Save current state before moving
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

      // Move card to target group
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

    // Handle reordering within the same group or moving to another group via card
    const targetGroup = groups.find(g => g.cards.some(c => c.id === over.id));
    if (!targetGroup) {
      toast.error('Invalid drop location - card returned to original position');
      return;
    }

    // Save current state before moving
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
        // Reordering within the same group
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                cards={group.cards}
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