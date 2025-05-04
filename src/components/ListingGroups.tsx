import { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { ListingGroup, Listing } from '@/types/listing';
import Card from './Card';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon, PlusIcon, ViewColumnsIcon, TrashIcon, EllipsisVerticalIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ListingGroupsProps {
  groups: ListingGroup[];
  onGroupsUpdate: (groups: ListingGroup[]) => void;
}

export default function ListingGroups({ groups, onGroupsUpdate }: ListingGroupsProps) {
  const router = useRouter();
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isManageMode, setIsManageMode] = useState(false);
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  // Create default group if none exists
  useEffect(() => {
    if (groups.length === 0) {
      const defaultGroup: ListingGroup = {
        id: 'tbd',
        name: 'To Be Scheduled',
        type: 'custom' as const,
        date: new Date().toISOString().split('T')[0],
        order: 0,
        listings: []
      };
      onGroupsUpdate([defaultGroup]);
    }
  }, [groups, onGroupsUpdate]);

  const toggleManageMode = () => {
    setIsManageMode(!isManageMode);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Group reordering
    const groupIds = groups.map(g => g.id);
    const activeGroupIdx = groupIds.indexOf(active.id);
    const overGroupIdx = groupIds.indexOf(over.id);
    if (activeGroupIdx !== -1 && overGroupIdx !== -1) {
      const newGroups = arrayMove(groups, activeGroupIdx, overGroupIdx);
      onGroupsUpdate(newGroups);
      return;
    }

    // Listing reordering within a group
    for (const group of groups) {
      const listingIds = group.listings.map(l => l.id);
      const activeListingIdx = listingIds.indexOf(active.id);
      const overListingIdx = listingIds.indexOf(over.id);
      if (activeListingIdx !== -1 && overListingIdx !== -1) {
        const newListings = arrayMove(group.listings, activeListingIdx, overListingIdx);
        const newGroups = groups.map(g =>
          g.id === group.id ? { ...g, listings: newListings } : g
        );
        onGroupsUpdate(newGroups);
        return;
      }
    }
  };

  const handleEditGroup = (group: ListingGroup) => {
    setEditingGroupId(group.id);
    setEditingName(group.name);
  };

  const handleSaveGroupName = (groupId: string) => {
    const updatedGroups = groups.map(group => 
      group.id === groupId
        ? { ...group, name: editingName }
        : group
    );
    onGroupsUpdate(updatedGroups);
    setEditingGroupId(null);
  };

  const handleCancelEdit = () => {
    setEditingGroupId(null);
    setEditingName('');
  };

  const handleDeleteGroup = (groupId: string) => {
    const updatedGroups = groups.filter(group => group.id !== groupId);
    onGroupsUpdate(updatedGroups);
    setGroupToDelete(null);
  };

  const handlePlanGroup = (group: ListingGroup) => {
    console.log('Plan button clicked!');
    console.log('Group:', group);
    try {
      console.log('Attempting to navigate to:', `/plan/${group.id}`);
      router.push(`/plan/${group.id}`);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const handleAddNewGroup = () => {
    const newGroup: ListingGroup = {
      id: crypto.randomUUID(),
      name: 'New Group',
      type: 'custom' as const,
      date: new Date().toISOString().split('T')[0],
      order: groups.length,
      listings: []
    };
    onGroupsUpdate([...groups, newGroup]);
  };

  const renderGroupHeader = (group: ListingGroup) => (
    <>
      <div 
        className="flex items-center justify-between bg-white p-4 rounded-t-lg shadow-sm relative"
        onMouseEnter={() => setHoveredGroupId(group.id)}
        onMouseLeave={() => setHoveredGroupId(null)}
      >
        <div className="flex items-center gap-2">
          {editingGroupId === group.id ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="px-2 py-1 border rounded-md"
                autoFocus
              />
              <button
                onClick={() => handleSaveGroupName(group.id)}
                className="p-1 text-green-600 hover:text-green-700"
              >
                <CheckIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1 text-red-600 hover:text-red-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900">
                {group.name}
              </h2>
              <span className="text-sm text-gray-500">
                ({group.listings.length} {group.listings.length === 1 ? 'card' : 'cards'})
              </span>
              <button
                onClick={() => handleEditGroup(group)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {group.listings.length > 0 && hoveredGroupId === group.id && (
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100">
              <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
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
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="px-1 py-1">
                  {group.listings.some(listing => listing.cardType === 'where') && (
                    <>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => handlePlanGroup(group)}
                            className={`${
                              active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                          >
                            <CalendarIcon className="mr-2 h-5 w-5" />
                            Plan Route
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => router.push(`/planning-room/${group.id}`)}
                            className={`${
                              active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                          >
                            <ViewColumnsIcon className="mr-2 h-5 w-5" />
                            Planning Room
                          </button>
                        )}
                      </Menu.Item>
                    </>
                  )}
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => setGroupToDelete(group.id)}
                        className={`${
                          active ? 'bg-red-50 text-red-700' : 'text-gray-700'
                        } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                      >
                        <TrashIcon className="mr-2 h-5 w-5" />
                        Delete
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        )}

        {group.listings.length === 0 && (
          <button
            onClick={() => setGroupToDelete(group.id)}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            title="Delete empty group"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </>
  );

  function SortableGroup({ group, index, isManageMode, renderGroupHeader, onGroupsUpdate, groups }: any) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: group.id });
    const style = {
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      transition,
      zIndex: isDragging ? 50 : undefined,
    };
    return (
      <div ref={setNodeRef} style={style} className={`bg-white rounded-lg shadow ${isDragging ? 'ring-2 ring-indigo-500 ring-opacity-50' : ''} w-full`} {...attributes} {...listeners}>
        <div>{renderGroupHeader(group)}</div>
        <SortableContext items={group.listings.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
          <div className={`p-4 bg-gray-50 min-h-[200px] rounded-b-lg ${isDragging ? 'bg-indigo-50' : ''}`}>
            <div className={isManageMode ? 'flex flex-col space-y-4' : 'flex flex-row gap-4 overflow-x-auto'}>
              {group.listings.map((listing: Listing, idx: number) => (
                <SortableListing key={listing.id} listing={listing} index={idx} isManageMode={isManageMode} />
              ))}
            </div>
          </div>
        </SortableContext>
      </div>
    );
  }

  function SortableListing({ listing, index, isManageMode }: any) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: listing.id });
    const style = {
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      transition,
      zIndex: isDragging ? 50 : undefined,
      width: isManageMode ? '100%' : '300px',
    };
    return (
      <div ref={setNodeRef} style={style} className={`${isDragging ? 'opacity-50' : ''} flex-shrink-0`} {...attributes} {...listeners}>
        <Card card={listing} onEdit={() => {}} onReaction={() => {}} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <button
          onClick={toggleManageMode}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          <ViewColumnsIcon className="h-5 w-5 mr-2" />
          Switch to {isManageMode ? 'View' : 'Manage'} Mode
        </button>
      </div>
      <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
        <SortableContext items={groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            <div className="flex flex-col space-y-6">
              {groups.map((group, index) => (
                <SortableGroup
                  key={group.id}
                  group={group}
                  index={index}
                  isManageMode={isManageMode}
                  renderGroupHeader={renderGroupHeader}
                  onGroupsUpdate={onGroupsUpdate}
                  groups={groups}
                />
              ))}
            </div>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
} 