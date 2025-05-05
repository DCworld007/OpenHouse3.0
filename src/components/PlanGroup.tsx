'use client';

import { useState, Fragment, ReactNode, useEffect } from 'react';
import { 
  PencilIcon, 
  MapIcon, 
  EllipsisHorizontalIcon, 
  TrashIcon,
  ArrowUturnLeftIcon,
  PlusIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { Menu, Transition } from '@headlessui/react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import PlanCard from './PlanCard';
import IntakeCard from './IntakeCard';
import { useDroppable } from '@dnd-kit/core';
import { usePlanningRoomSync } from '@/hooks/planningRoom/usePlanningRoomSync';
import toast from 'react-hot-toast';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext } from '@dnd-kit/core';

interface Card {
  id: string;
  type: 'what' | 'where';
  content: string;
  notes?: string;
}

interface PlanGroupProps {
  id: string;
  name: string;
  userId: string;
  onNameChange: (id: string, newName: string) => void;
  onCardsChange: (id: string, newCards: Card[]) => void;
  onDelete: (id: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  isFirstGroup: boolean;
  totalGroups: number;
  onAddGroup: (id: string) => void;
  legacyCards?: Card[];
  children?: ReactNode | ((planningRoom: any) => ReactNode);
}

interface PlanCardProps {
  id: string;
  what?: string;
  where?: string;
  notes?: string;
  isDragging?: boolean;
  onAddCard?: (afterCardId?: string) => void;
}

export default function PlanGroup({ 
  id, 
  name, 
  userId,
  onNameChange, 
  onCardsChange,
  onDelete,
  onUndo,
  canUndo,
  isFirstGroup,
  totalGroups,
  onAddGroup,
  legacyCards = [],
  children,
}: PlanGroupProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const { setNodeRef, isOver } = useDroppable({ 
    id: `group-${id}`,
  });
  const planningRoom = usePlanningRoomSync(id, userId);
  const cards = planningRoom.cardOrder
    .map((cardId: string) => planningRoom.linkedCards.find((card: any) => card.id === cardId))
    .filter((card: any) => Boolean(card))
    .map((card: any) => ({ ...card, type: card.cardType })) as Card[];

  // Track if any card is being dragged in this group
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const isAnyDragging = !!draggedCardId;

  // Migration: On mount, if Yjs doc is empty and there are legacy cards, migrate them (only once per group)
  useEffect(() => {
    const migrationKey = `yjs-migrated-${id}`;
    if (
      planningRoom.linkedCards.length === 0 &&
      legacyCards.length > 0 &&
      !localStorage.getItem(migrationKey)
    ) {
      legacyCards.forEach(card => {
        const yjsCard = {
          ...card,
          cardType: card.type,
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        planningRoom.addCard(yjsCard);
      });
      localStorage.setItem(migrationKey, 'true');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveName = () => {
    if (editedName.trim()) {
      onNameChange(id, editedName);
      setIsEditing(false);
    }
  };

  const hasLocations = cards.some(card => card.type === 'where');
  const isEmpty = cards.length === 0;

  // Geocode helper
  const geocodeAddress = async (address: string) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'UnifyPlan/1.0 (your@email.com)' } });
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  };

  // Add card logic
  const handleAddCard = async (
    data: { type: 'what' | 'where'; content: string; notes?: string },
    afterCardId?: string | null
  ) => {
    console.log('[PlanGroup] handleAddCard', data, 'after', afterCardId);
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
    // Insert after the specified card in cardOrder
    if (afterCardId) {
      planningRoom.addCard(newCard, afterCardId);
    } else {
      planningRoom.addCard(newCard);
    }
    console.log('[PlanGroup] After addCard, cardOrder:', planningRoom.cardOrder);
    console.log('[PlanGroup] After addCard, linkedCards:', planningRoom.linkedCards);
    toast.success('Card added successfully!');
  };

  // PlanSortableCard: wraps PlanCard with useSortable and drag styles
  function PlanSortableCard({ card, onAddCard }: { card: Card; onAddCard: (afterCardId?: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition: transition || 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: isDragging ? 50 : undefined,
    };
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="flex-shrink-0 w-[300px]"
      >
        <PlanCard
          id={card.id}
          what={card.type === 'what' ? card.content : ''}
          where={card.type === 'where' ? card.content : ''}
          notes={card.notes}
          isDragging={isDragging}
          onAddCard={() => onAddCard(card.id)}
        />
      </div>
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        className={`bg-white rounded-lg border border-gray-200 relative transition-all duration-300 ease-in-out ${
          isOver ? 'ring-2 ring-indigo-500 ring-opacity-70 scale-[1.02] shadow-lg bg-indigo-50' : ''
        }`}
      >
        {isOver && (
          <div className="absolute inset-0 bg-indigo-100 opacity-20 rounded-lg animate-pulse"></div>
        )}
        <div className="border-b border-gray-200">
          <div className="flex items-center gap-2 py-4 group">
            <div className="px-4 flex-1 flex items-center gap-2">
              {isEditing ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                  className="text-lg font-semibold text-gray-900 border-b border-gray-300 focus:border-indigo-500 focus:outline-none"
                  autoFocus
                />
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-gray-900">{name}</h2>
                  {/* Clear All Cards Button */}
                  <button
                    className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                    onClick={() => {
                      planningRoom.cardOrder.forEach((id: string) => planningRoom.removeCard(id));
                      localStorage.removeItem(`yjs-migrated-${id}`);
                      // PATCH: Also update localStorage for this group to have empty cards
                      const groupsRaw = localStorage.getItem('openhouse-data');
                      if (groupsRaw) {
                        try {
                          const groups = JSON.parse(groupsRaw);
                          const updatedGroups = Array.isArray(groups)
                            ? groups.map((g) => g.id === id ? { ...g, cards: [] } : g)
                            : groups;
                          localStorage.setItem('openhouse-data', JSON.stringify(updatedGroups));
                        } catch (e) {
                          console.error('Failed to update localStorage after clearing cards:', e);
                        }
                      }
                    }}
                  >
                    Clear All Cards
                  </button>
                  {children && typeof children === 'function' ? (children as (planningRoom: any) => ReactNode)(planningRoom) : children}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-500 ml-2">{cards.length} cards</span>
                  <div className="flex-1" />
                  {isEmpty ? (
                    !isFirstGroup && (
                      <button
                        onClick={() => onDelete(id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                        title="Delete empty group"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )
                  ) : (
                    <Menu as="div" className="relative">
                      <Menu.Button className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50">
                        <EllipsisHorizontalIcon className="h-5 w-5" />
                      </Menu.Button>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                          <div className="py-1">
                            {canUndo && (
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={onUndo}
                                    className={`${
                                      active ? 'bg-gray-100' : ''
                                    } flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                                  >
                                    <ArrowUturnLeftIcon className="h-4 w-4 mr-2" />
                                    Undo Last Action
                                  </button>
                                )}
                              </Menu.Item>
                            )}
                            {hasLocations && (
                              <>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => router.push(`/plan/${id}`)}
                                      className={`${
                                        active ? 'bg-gray-100' : ''
                                      } flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                                    >
                                      <MapIcon className="h-4 w-4 mr-2" />
                                      Plan Route
                                    </button>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => router.push(`/planning-room/${id}`)}
                                      className={`${
                                        active ? 'bg-gray-100' : ''
                                      } flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                                    >
                                      <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                                      Planning Room
                                    </button>
                                  )}
                                </Menu.Item>
                              </>
                            )}
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 overflow-hidden group/scroll">
          <DndContext
            onDragStart={event => {
              setDraggedCardId(event.active.id as string);
            }}
            onDragEnd={() => {
              setDraggedCardId(null);
            }}
          >
            <SortableContext items={cards.map(card => card.id)} strategy={horizontalListSortingStrategy}>
              <div className="relative">
                <div
                  className={`flex gap-6 ${isAnyDragging ? 'overflow-visible' : 'overflow-x-auto'} ${
                    isEmpty ? 'min-h-[200px]' : ''
                  } ${
                    cards.length > 3 ? 'hide-scrollbar group-hover/scroll:custom-scrollbar' : ''
                  }`}
                  style={{
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  <div className="flex gap-6 pr-16">
                    {cards.map((card) => (
                      <PlanSortableCard
                        key={card.id}
                        card={card}
                        onAddCard={(afterCardId?: string) => {
                          setActiveCardId(afterCardId || null);
                          setShowIntakeModal(true);
                        }}
                      />
                    ))}
                    {/* PATCH: Always show Add Card button at the end of the card list */}
                    <button
                      onClick={() => {
                        setActiveCardId(null);
                        setShowIntakeModal(true);
                      }}
                      className="rounded-full bg-gray-100 p-3 transition-colors hover:bg-gray-200"
                      style={{ minWidth: 48, minHeight: 48 }}
                      title="Add Card"
                    >
                      <PlusIcon className="w-6 h-6 text-gray-400" />
                    </button>
                  </div>
                  {isEmpty && (
                    <div className="absolute inset-0 flex items-center">
                      {isOver ? (
                        <>
                          <div className="absolute inset-0 bg-indigo-50 bg-opacity-50 rounded-lg border-2 border-dashed border-indigo-500" />
                          <span className="text-indigo-500 z-10">Drop here</span>
                        </>
                      ) : (
                        <div className="pl-20 w-[300px] h-[160px] flex items-center">
                          <button
                            onClick={() => {
                              setActiveCardId(null);
                              setShowIntakeModal(true);
                            }}
                            className="rounded-full bg-gray-100 p-3 transition-colors hover:bg-gray-200"
                          >
                            <PlusIcon className="w-6 h-6 text-gray-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {!isEmpty && cards.length > 3 && (
                  <div className="absolute right-0 top-0 bottom-0 w-16 pointer-events-none bg-gradient-to-l from-white to-transparent group-hover/scroll:opacity-0 transition-opacity" />
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Add Group Button - Keeping the overflow behavior */}
        <button
          onClick={() => onAddGroup(id)}
          className={`absolute -bottom-3 left-1/2 transform -translate-x-1/2 
            ${isFirstGroup && totalGroups < 3 ? 'opacity-100 animate-subtle-pulse bg-indigo-50' : 'opacity-0 group-hover:opacity-100 bg-white'} 
            transition-all duration-200 rounded-full shadow-lg p-2 border border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50`}
        >
          <PlusIcon className="h-5 w-5 text-indigo-500 hover:text-indigo-600" />
        </button>
      </div>

      {/* Intake Card Modal */}
      {showIntakeModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50">
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    onClick={() => setShowIntakeModal(false)}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="mt-3 sm:mt-0">
                  <IntakeCard
                    onSubmit={async (data) => {
                      await handleAddCard(data, activeCardId);
                      setShowIntakeModal(false);
                      setActiveCardId(null);
                    }}
                    onCancel={() => setShowIntakeModal(false)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 