'use client';

import { useState, Fragment, ReactNode, useEffect, useRef } from 'react';
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
import PlanCard from './PlanCard';
import IntakeCard from './IntakeCard';
import { usePlanningRoomSync } from '@/hooks/planningRoom/usePlanningRoomSync';
import toast from 'react-hot-toast';
import { useDrag, useDrop } from 'react-dnd';

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
  planningRoomRef?: React.MutableRefObject<any>;
}

interface PlanCardProps {
  id: string;
  what?: string;
  where?: string;
  notes?: string;
  isDragging?: boolean;
  onAddCard?: (afterCardId?: string) => void;
}

const DND_ITEM_TYPE = 'CARD';

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
  planningRoomRef,
}: PlanGroupProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const planningRoom = usePlanningRoomSync(id, userId);
  // Only set the ref in an effect to avoid infinite render loops
  useEffect(() => {
    if (planningRoomRef) {
      planningRoomRef.current = planningRoom;
    }
  }, [planningRoom, planningRoomRef]);
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

  // --- DnD logic ---
  // Drop target for the group (for dropping at end or into empty group)
  const [, dropGroup] = useDrop({
    accept: DND_ITEM_TYPE,
    drop: (item: any, monitor) => {
      if (!monitor.didDrop()) {
        // Only handle if not already handled by a card
        if (item.groupId !== id) {
          // Move card from another group to end of this group
          const sourcePlanningRoom = item.planningRoom;
          const movedCard = sourcePlanningRoom.linkedCards.find((c: any) => c.id === item.cardId);
          if (movedCard) {
            sourcePlanningRoom.removeCard(item.cardId);
            planningRoom.addCard(movedCard);
          }
        }
      }
    },
    canDrop: (item: any) => item.groupId !== id || isEmpty,
    collect: monitor => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  });

  // --- Card DnD logic ---
  function DraggablePlanCard({ card, index }: { card: Card; index: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const [{ isDragging }, drag] = useDrag({
      type: DND_ITEM_TYPE,
      item: { type: DND_ITEM_TYPE, cardId: card.id, groupId: id, planningRoom, index },
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    });

    // Track the intended drop index and swap state
    const [dropPosition, setDropPosition] = useState<number | null>(null);
    const [isSwap, setIsSwap] = useState(false);

    const [{ isOver }, drop] = useDrop({
      accept: DND_ITEM_TYPE,
      hover: (item: any, monitor) => {
        if (!ref.current) return;
        if (item.cardId === card.id) return;
        const hoverBoundingRect = ref.current.getBoundingClientRect();
        const clientOffset = monitor.getClientOffset();
        if (!clientOffset) return;
        const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
        const hoverClientX = clientOffset.x - hoverBoundingRect.left;
        // If pointer is centered on card (within 40% of center), treat as swap
        const centerThreshold = hoverMiddleX * 0.6;
        if (hoverClientX > 0 && hoverClientX < hoverBoundingRect.right - hoverBoundingRect.left && Math.abs(hoverClientX - hoverMiddleX) < centerThreshold) {
          setIsSwap(true);
          setDropPosition(null);
        } else {
          setIsSwap(false);
          setDropPosition(hoverClientX < hoverMiddleX ? index : index + 1);
        }
      },
      drop: (item: any, monitor) => {
        setIsSwap(false);
        if (!ref.current) return;
        if (item.cardId === card.id) {
          setDropPosition(null);
          return;
        }
        const hoverBoundingRect = ref.current.getBoundingClientRect();
        const clientOffset = monitor.getClientOffset();
        if (!clientOffset) return;
        const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;
        const hoverClientX = clientOffset.x - hoverBoundingRect.left;
        const dragIndex = planningRoom.cardOrder.findIndex((cid: string) => cid === item.cardId);
        const hoverIndex = planningRoom.cardOrder.findIndex((cid: string) => cid === card.id);
        // Inter-group drop
        if (item.groupId !== id) {
          const sourcePlanningRoom = item.planningRoom;
          const movedCard = sourcePlanningRoom.linkedCards.find((c: any) => c.id === item.cardId);
          if (!movedCard) return;
          // Remove from source group
          sourcePlanningRoom.removeCard(item.cardId);
          // Swap if pointer is centered on card
          const centerThreshold = hoverMiddleX * 0.6;
          if (hoverClientX > 0 && hoverClientX < hoverBoundingRect.right - hoverBoundingRect.left && Math.abs(hoverClientX - hoverMiddleX) < centerThreshold) {
            // Swap: remove target card, add movedCard at target's position, add target card to source group
            const targetCard = planningRoom.linkedCards.find((c: any) => c.id === card.id);
            if (targetCard) {
              planningRoom.removeCard(card.id);
              planningRoom.addCard(movedCard);
              sourcePlanningRoom.addCard(targetCard);
            }
            setDropPosition(null);
            return;
          }
          // Otherwise, insert at gap
          let insertIndex = hoverClientX < hoverMiddleX ? hoverIndex : hoverIndex + 1;
          const newOrder = Array.from(planningRoom.cardOrder);
          newOrder.splice(insertIndex, 0, item.cardId);
          planningRoom.addCard(movedCard);
          planningRoom.reorderCards(newOrder);
          setDropPosition(null);
          return;
        }
        // Intra-group drop
        if (dragIndex === -1 || hoverIndex === -1) return;
        if (hoverClientX > 0 && hoverClientX < hoverBoundingRect.right - hoverBoundingRect.left) {
          // If pointer is centered on card (within 40% of center), treat as swap
          const centerThreshold = hoverMiddleX * 0.6;
          if (Math.abs(hoverClientX - hoverMiddleX) < centerThreshold) {
            // Swap
            const newOrder = Array.from(planningRoom.cardOrder);
            [newOrder[dragIndex], newOrder[hoverIndex]] = [newOrder[hoverIndex], newOrder[dragIndex]];
            planningRoom.reorderCards(newOrder);
            setDropPosition(null);
            return;
          }
        }
        // Otherwise, treat as insert at gap
        let insertIndex = hoverClientX < hoverMiddleX ? hoverIndex : hoverIndex + 1;
        if (dragIndex < insertIndex) insertIndex--;
        const newOrder = Array.from(planningRoom.cardOrder);
        newOrder.splice(dragIndex, 1);
        newOrder.splice(insertIndex, 0, item.cardId);
        planningRoom.reorderCards(newOrder);
        setDropPosition(null);
      },
      collect: monitor => ({
        isOver: monitor.isOver({ shallow: true }),
      }),
    });

    drag(drop(ref));

    return (
      <div
        ref={ref}
        style={{
          opacity: isDragging ? 0.5 : 1,
          transform: isSwap && isOver ? 'scale(1.06)' : undefined,
          boxShadow: isSwap && isOver ? '0 0 0 4px #2563eb, 0 4px 16px rgba(37,99,235,0.18)' : undefined,
          border: isSwap && isOver ? '3px solid #2563eb' : undefined,
          background: isSwap && isOver ? 'rgba(37,99,235,0.08)' : undefined,
          transition: 'box-shadow 0.15s, transform 0.15s, border 0.15s, background 0.15s',
        }}
        className="flex-shrink-0 w-[300px] relative"
      >
        {/* Gap indicator (left/right/top/bottom) - only show if not swap and isOver */}
        {dropPosition === index && isOver && !isSwap && (
          <>
            <div className="absolute -left-3 top-2 bottom-2 w-2 rounded bg-blue-600 shadow-xl animate-pulse z-30" style={{boxShadow: '0 0 12px 2px #2563eb88'}} />
            <div className="absolute left-2 -top-3 right-2 h-2 rounded bg-blue-600 shadow-xl animate-pulse z-30" style={{boxShadow: '0 0 12px 2px #2563eb88'}} />
            <div className="absolute left-2 -bottom-3 right-2 h-2 rounded bg-blue-600 shadow-xl animate-pulse z-30" style={{boxShadow: '0 0 12px 2px #2563eb88'}} />
          </>
        )}
        <PlanCard
          id={card.id}
          what={card.type === 'what' ? card.content : ''}
          where={card.type === 'where' ? card.content : ''}
          notes={card.notes}
          isDragging={isDragging}
          onAddCard={() => {
            setActiveCardId(card.id);
            setShowIntakeModal(true);
          }}
        />
        {/* Gap indicator (right/top/bottom) - only show if not swap and isOver */}
        {dropPosition === index + 1 && isOver && !isSwap && (
          <>
            <div className="absolute -right-3 top-2 bottom-2 w-2 rounded bg-blue-600 shadow-xl animate-pulse z-30" style={{boxShadow: '0 0 12px 2px #2563eb88'}} />
            <div className="absolute left-2 -top-3 right-2 h-2 rounded bg-blue-600 shadow-xl animate-pulse z-30" style={{boxShadow: '0 0 12px 2px #2563eb88'}} />
            <div className="absolute left-2 -bottom-3 right-2 h-2 rounded bg-blue-600 shadow-xl animate-pulse z-30" style={{boxShadow: '0 0 12px 2px #2563eb88'}} />
          </>
        )}
        {/* Swap indicator (all four sides) - only show if swap and isOver */}
        {isSwap && isOver && (
          <>
            <div className="absolute -left-3 top-2 bottom-2 w-2 rounded bg-blue-600 shadow-xl animate-pulse z-40" style={{boxShadow: '0 0 12px 2px #2563eb88'}} />
            <div className="absolute -right-3 top-2 bottom-2 w-2 rounded bg-blue-600 shadow-xl animate-pulse z-40" style={{boxShadow: '0 0 12px 2px #2563eb88'}} />
            <div className="absolute left-2 -top-3 right-2 h-2 rounded bg-blue-600 shadow-xl animate-pulse z-40" style={{boxShadow: '0 0 12px 2px #2563eb88'}} />
            <div className="absolute left-2 -bottom-3 right-2 h-2 rounded bg-blue-600 shadow-xl animate-pulse z-40" style={{boxShadow: '0 0 12px 2px #2563eb88'}} />
          </>
        )}
      </div>
    );
  }

  // Ref for the scrollable card container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic during drag
  useEffect(() => {
    if (!isAnyDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scrollThreshold = 60; // px from edge to start scrolling
      const scrollAmount = 20; // px per event
      if (e.clientX - rect.left < scrollThreshold) {
        // Near left edge
        container.scrollLeft -= scrollAmount;
      } else if (rect.right - e.clientX < scrollThreshold) {
        // Near right edge
        container.scrollLeft += scrollAmount;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isAnyDragging]);

  return (
    <>
      <div
        ref={dropGroup}
        className={`bg-white rounded-lg border border-gray-200 relative transition-all duration-300 ease-in-out ${
          isAnyDragging ? 'ring-2 ring-indigo-500 ring-opacity-70 scale-[1.02] shadow-lg bg-indigo-50' : ''
        }`}
      >
        {isAnyDragging && (
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
          <div className="relative">
            <div
              ref={scrollContainerRef}
              className={`flex gap-6 ${isAnyDragging ? 'overflow-visible' : 'overflow-x-auto'} ${
                isEmpty ? 'min-h-[200px]' : ''
              } ${
                cards.length > 3 ? 'hide-scrollbar group-hover/scroll:custom-scrollbar' : ''
              }`}
            >
              <div className="flex gap-6 pr-16">
                {cards.map((card, idx) => (
                  <DraggablePlanCard key={card.id} card={card} index={idx} />
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
                  {isAnyDragging ? (
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