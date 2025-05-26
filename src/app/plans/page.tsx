"use client";

import { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
import React from 'react';

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

// Utility to sync all local groups to D1
async function syncLocalGroupsToD1(groups: Group[]) {
  for (const group of groups) {
    try {
      // First check if the room exists
      const res = await fetch(`/api/planning-room/${group.id}`);
      if (res.status === 404) {
        // Room missing in D1, create it
        console.log(`[Sync] Room not found in D1: ${group.id}. Creating...`);
        
        const createRes = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            id: group.id,
            name: group.name,
            description: 'description' in group ? (group as any).description || '' : '',
          }),
        });
        
        if (!createRes.ok) {
          const errorText = await createRes.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { error: errorText };
          }
          console.error(`[Sync] Failed to create room ${group.id} in D1:`, errorData);
          
          // Retry with a delay if there's a specific error that might be temporary
          if (createRes.status === 400 && errorData.error?.includes('ownerId')) {
            console.log(`[Sync] Retrying room creation after short delay...`);
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const retryRes = await fetch('/api/rooms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                id: group.id,
                name: group.name,
                description: 'description' in group ? (group as any).description || '' : '',
              }),
            });
            
            if (retryRes.ok) {
              console.log(`[Sync] Successfully created room ${group.id} in D1 on retry`);
            } else {
              const retryErrorText = await retryRes.text();
              console.error(`[Sync] Failed to create room ${group.id} in D1 even on retry:`, retryErrorText);
            }
          }
        } else {
          console.log(`[Sync] Successfully created room ${group.id} in D1`);
        }
      } else if (res.ok) {
        console.log(`[Sync] Room ${group.id} already exists in D1`);
      }
    } catch (err) {
      console.error(`[Sync] Error syncing group ${group.id} to D1:`, err);
    }
  }
}

function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-red-50 border border-red-200 rounded">
      <h2 className="text-lg font-bold text-red-700 mb-2">An error occurred</h2>
      <p className="text-red-600 mb-2">{error.message}</p>
      <pre className="text-xs text-red-500 bg-red-100 p-2 rounded overflow-x-auto">{error.stack}</pre>
      <p className="mt-4 text-sm text-gray-500">If this error persists, please contact support or try reloading the page.</p>
    </div>
  );
}

function PlansPageContent() {
  // 1. All hooks that don't depend on other hooks
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user: meApiResponse, isLoading: isUserLoading } = useUser();
  
  // 2. Derived state from hooks above
  const roomParam = searchParams?.get('room');
  const actualUser = meApiResponse?.user;
  const isAuthenticated = meApiResponse?.authenticated;
  const userId = actualUser?.id || '';

  // 3. All useState hooks
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [actionHistory, setActionHistory] = useState<{ [groupId: string]: Action[] }>({});
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 4. All useRef hooks
  const planningRoomRefs = useRef<{ [groupId: string]: React.MutableRefObject<any> }>({});

  // 5. All useMemo hooks
  const firstGroupId = useMemo(() => groups.length > 0 ? groups[0].id : '', [groups]);

  // 6. All custom hooks that depend on state
  const planningRoom = usePlanningRoomSync(
    firstGroupId,
    userId,
    actualUser?.name || userId,
    actualUser?.email,
    actualUser?.picture
  );

  // 7. All useEffect hooks
  useEffect(() => {
    if (roomParam && !isLoading && groups.length > 0) {
      const roomExists = groups.some(group => group.id === roomParam);
      if (roomExists) {
        router.push(`/planning-room/${roomParam}`);
      }
    }
  }, [roomParam, isLoading, groups, router]);

  useEffect(() => {
    groups.forEach(group => {
      if (!planningRoomRefs.current[group.id]) {
        planningRoomRefs.current[group.id] = { current: null };
      }
    });
    Object.keys(planningRoomRefs.current).forEach(id => {
      if (!groups.find(g => g.id === id)) {
        delete planningRoomRefs.current[id];
      }
    });
  }, [groups]);

  useEffect(() => {
    async function loadInitialGroups() {
      if (isUserLoading) return;
      
      try {
        if (!isAuthenticated || !actualUser?.id) {
          console.log('[PlansPage] User not authenticated, redirecting to login...');
          router.push('/auth/login');
          return;
        }

        console.log('[PlansPage] User authenticated, fetching groups from server...');
        const response = await fetch('/api/rooms', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch groups: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[PlansPage] Groups fetched from server:', data);

        // Transform server data to match local format
        const transformedGroups = data.map((group: any) => ({
          id: group.id,
          name: group.name,
          type: 'custom',
          date: new Date().toISOString().split('T')[0],
          order: group.order || 0,
          cards: group.cards?.map((cardLink: any) => ({
            id: cardLink.card.id,
            type: cardLink.card.type,
            content: cardLink.card.content,
            notes: cardLink.card.notes,
            lat: cardLink.card.lat,
            lng: cardLink.card.lng,
            userId: cardLink.card.userId,
            createdAt: cardLink.card.createdAt,
            updatedAt: cardLink.card.updatedAt
          })) || [],
          listings: []
        }));

        // If no groups exist, create a default one
        if (transformedGroups.length === 0) {
          const defaultGroup = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            name: 'To Be Scheduled',
            type: 'custom',
            date: new Date().toISOString().split('T')[0],
            order: 0,
            cards: [],
            listings: []
          };
          transformedGroups.push(defaultGroup);
        }

        setGroups(transformedGroups);
        saveGroups(transformedGroups);
      } catch (error) {
        console.error('Error loading initial groups:', error);
        setError(error instanceof Error ? error : new Error('Failed to load groups'));
        const defaultGroup = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          name: 'To Be Scheduled',
          type: 'custom',
          date: new Date().toISOString().split('T')[0],
          order: 0,
          cards: [],
          listings: []
        };
        setGroups([defaultGroup]);
        saveGroups([defaultGroup]);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialGroups();
  }, [isUserLoading, isAuthenticated, actualUser, router]);

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

  useEffect(() => {
    if (groups.length === 0) return;
    console.log('[PlansPage] saveGroups', groups);
    const synced = syncGroupsWithListings(groups);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
  }, [groups]);

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

  // Early returns for loading and auth states
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Rest of the component implementation...
  // ... (keep all the existing functions and JSX)

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
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'UnifyPlan/1.0' } });
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          console.log(`[Geocode] Successfully geocoded "${address}" to: ${lat}, ${lng}`);
          return { lat, lng };
        }
      }
      console.warn(`[Geocode] Failed to geocode address: "${address}"`);
      return null;
    } catch (error) {
      console.error('[Geocode] Error during geocoding:', error);
      return null;
    }
  };

  // PATCH: IntakeCard always adds to the first group using Yjs
  const handleAddCard = async (data: { type: 'what' | 'where'; content: string; notes?: string }) => {
    if (!groups.length || !planningRoom) return;
    
    try {
      let newCard: any = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        ...data,
        cardType: data.type,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // For 'where' cards, always attempt to geocode to get coordinates
      if (data.type === 'where') {
        console.log(`[AddCard] Geocoding address: "${data.content}"`);
        const geo = await geocodeAddress(data.content);
        if (geo) {
          console.log(`[AddCard] Adding coordinates to card:`, geo);
          newCard = { 
            ...newCard, 
            lat: geo.lat, 
            lng: geo.lng 
          };
        } else {
          console.warn(`[AddCard] Could not geocode address: "${data.content}". Card may not appear in route planning.`);
        }
      }
      
      console.log('[AddCard] Adding new card:', newCard);
      planningRoom.addCard(newCard);
      setSelectedGroupId(null);
      toast.success('Card added successfully!');
    } catch (error) {
      console.error('[AddCard] Error adding card:', error);
      toast.error('Failed to add card. Please try again.');
    }
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

  const handleGroupNameChange = async (groupId: string, newName: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    try {
      // Update backend first
      const response = await fetch(`/api/rooms/${groupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newName,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PlansPage] Failed to update group name in backend:', errorText);
        toast.error('Failed to save group name to server');
        return;
      }

      // Add to history after successful backend update
      addToHistory(groupId, {
        type: 'RENAME_GROUP',
        data: { oldName: group.name, newName },
        previousState: [...group.cards],
      });

      // Update local state
      const newGroups = groups.map(g => 
        g.id === groupId ? { ...g, name: newName } : g
      );
      
      // Update both state and localStorage atomically
      setGroups(newGroups);
      saveGroups(newGroups);

      // Force sync with localStorage and verify
      const savedData = localStorage.getItem(STORAGE_KEY);
      const savedGroups = savedData ? JSON.parse(savedData) : [];
      const savedGroup = savedGroups.find((g: Group) => g.id === groupId);
      
      if (!savedGroup || savedGroup.name !== newName) {
        console.warn('[PlansPage] Group name sync mismatch, forcing update');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newGroups));
      }

    } catch (error) {
      console.error('[PlansPage] Error updating group name:', error);
      toast.error('Failed to save group name. Please try again.');
    }
  };

  const handleAddGroup = (afterGroupId: string) => {
    const newGroupId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Date.now().toString();
      
    const newGroup: Group = {
      id: newGroupId,
      name: 'New Group',
      cards: [],
    };
    
    // Find the index of the group after which to add the new group
    const index = groups.findIndex(group => group.id === afterGroupId);
    const newGroups = [
      ...groups.slice(0, index + 1),
      newGroup,
      ...groups.slice(index + 1),
    ];
    
    setGroups(newGroups);
    setSelectedGroupId(newGroup.id);
    
    // Persist the new group to D1
    ensureGroupExistsInD1(newGroup, actualUser?.id).catch(error => {
      console.error('Failed to persist new group to D1:', error);
      toast.error('Group created locally but failed to sync to server');
    });
    
    // Delayed transition to focus on group name
    setTimeout(() => {
      const groupElement = document.getElementById(`group-name-${newGroup.id}`);
      if (groupElement) {
        groupElement.focus();
      }
    }, 100);
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

  // Helper function to ensure a group exists in D1 database
  const ensureGroupExistsInD1 = async (group: Group, currentUserId?: string) => {
    const effectiveUserId = currentUserId || actualUser?.id; // Use actualUser here too
    // Skip if no userId (user not logged in or not available yet)
    if (!effectiveUserId) {
      console.warn('Cannot persist group to D1: No user ID available yet.');
      return;
    }
    
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: group.id,
          name: group.name,
          description: 'description' in group ? (group as any).description || '' : '',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // If error is "Room already exists" that's fine - it means it's already in D1
        if (errorData.error && !errorData.error.includes('already exists')) {
          throw new Error(errorData.error || 'Failed to persist room to D1');
        }
      }
      
      console.log(`Group ${group.id} synced to D1 database`);
    } catch (error) {
      console.error('Error persisting group to D1:', error);
      throw error;
    }
  };

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

  // Wrap the main logic in a try/catch to catch and log errors
  try {
    if (isLoading || isUserLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="ml-4 text-gray-700 text-lg">Loading your plans...</p>
        </div>
      );
    }

    if (error && !(error instanceof Error && error.message.includes("Cannot read properties of undefined (reading 'id')"))) {
      return <ErrorBoundary error={error} />;
    }

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
        </DndProvider>
      </div>
    );
  } catch (err) {
    // Log error to console and set error state
    console.error('[PlansPage] Unhandled error:', err);
    if (!error && err instanceof Error) setError(err);
    return error ? <ErrorBoundary error={error} /> : null;
  }
}

export default function PlansPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p className="ml-4 text-gray-700 text-lg">Loading your plans...</p>
      </div>
    }>
      <PlansPageContent />
    </Suspense>
  );
} 