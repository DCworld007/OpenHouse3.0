import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
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
        type: 'custom',
        order: 0,
        listings: []
      };
      onGroupsUpdate([defaultGroup]);
    }
  }, [groups, onGroupsUpdate]);

  const toggleManageMode = () => {
    setIsManageMode(!isManageMode);
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, type, draggableId } = result;
    console.log('Drag end:', { source, destination, type, draggableId });

    if (!destination) return;

    // Handle group reordering (only in manage mode)
    if (type === 'group') {
      if (!isManageMode) return;
      const newGroups = [...groups];
      const [movedGroup] = newGroups.splice(source.index, 1);
      newGroups.splice(destination.index, 0, movedGroup);
      onGroupsUpdate(newGroups);
      return;
    }

    // Handle new group creation
    if (destination.droppableId === 'new-group') {
      console.log('Creating new group');
      const sourceGroup = groups.find(g => g.id === source.droppableId);
      
      if (!sourceGroup) {
        console.error('Source group not found:', source.droppableId);
        return;
      }

      // Find the listing being moved
      const movedListing = sourceGroup.listings[source.index];
      if (!movedListing) {
        console.error('Listing not found at index:', source.index);
        return;
      }

      // Create new group
      const newGroupId = crypto.randomUUID();
      const newGroup: ListingGroup = {
        id: newGroupId,
        name: 'New Group',
        type: 'custom',
        order: groups.length,
        listings: [{ ...movedListing, groupId: newGroupId }]
      };

      // Remove listing from source group and add new group
      const updatedGroups = groups.map(group => 
        group.id === source.droppableId
          ? { ...group, listings: group.listings.filter((_, idx) => idx !== source.index) }
          : group
      );

      onGroupsUpdate([...updatedGroups, newGroup]);
      setEditingGroupId(newGroupId);
      setEditingName('New Group');
      return;
    }

    // Moving within the same group
    if (source.droppableId === destination.droppableId) {
      const groupIndex = groups.findIndex(g => g.id === source.droppableId);
      if (groupIndex === -1) return;
      
      const items = [...groups[groupIndex].listings];
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);

      const updatedGroups = [...groups];
      updatedGroups[groupIndex] = {
        ...groups[groupIndex],
        listings: items
      };
      onGroupsUpdate(updatedGroups);
      return;
    }

    // Moving between groups
    const sourceGroupIndex = groups.findIndex(g => g.id === source.droppableId);
    const destGroupIndex = groups.findIndex(g => g.id === destination.droppableId);
    
    if (sourceGroupIndex === -1 || destGroupIndex === -1) return;
    
    const updatedGroups = [...groups];
    const sourceItems = [...groups[sourceGroupIndex].listings];
    const destItems = [...groups[destGroupIndex].listings];
    
    const [movedItem] = sourceItems.splice(source.index, 1);
    destItems.splice(destination.index, 0, {
      ...movedItem,
      groupId: destination.droppableId
    });

    updatedGroups[sourceGroupIndex] = {
      ...groups[sourceGroupIndex],
      listings: sourceItems
    };
    updatedGroups[destGroupIndex] = {
      ...groups[destGroupIndex],
      listings: destItems
    };

    onGroupsUpdate(updatedGroups);
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
      type: 'custom',
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

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-6">
          <div className="flex flex-col space-y-6">
            <Droppable
              droppableId="groups"
              type="group"
              direction="vertical"
            >
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex flex-col space-y-6"
                >
                  {groups.map((group, index) => (
                    <Draggable
                      key={group.id}
                      draggableId={group.id}
                      index={index}
                      isDragDisabled={!isManageMode}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-white rounded-lg shadow ${
                            snapshot.isDragging ? 'ring-2 ring-indigo-500 ring-opacity-50' : ''
                          } w-full`}
                        >
                          <div {...provided.dragHandleProps}>
                            {renderGroupHeader(group)}
                          </div>
                          <Droppable
                            droppableId={group.id}
                            type="listing"
                            direction={isManageMode ? "vertical" : "horizontal"}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`p-4 bg-gray-50 min-h-[200px] rounded-b-lg ${
                                  snapshot.isDraggingOver ? 'bg-indigo-50' : ''
                                }`}
                              >
                                <div className={`${
                                  isManageMode
                                    ? 'flex flex-col space-y-4'
                                    : 'flex flex-row gap-4 overflow-x-auto'
                                }`}>
                                  {group.listings.map((listing, index) => (
                                    <Draggable
                                      key={listing.id}
                                      draggableId={listing.id}
                                      index={index}
                                      isDragDisabled={false}
                                    >
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          style={{
                                            ...provided.draggableProps.style,
                                            width: isManageMode ? '100%' : '300px'
                                          }}
                                          className={`${snapshot.isDragging ? 'opacity-50' : ''} flex-shrink-0`}
                                        >
                                          <Card
                                            card={listing}
                                            onEdit={() => {}}
                                            onReaction={() => {}}
                                          />
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                  <button
                                    onClick={handleAddNewGroup}
                                    className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 z-10
                                      transition-all duration-200 rounded-full shadow-lg p-2 border border-indigo-200 
                                      hover:border-indigo-500 hover:bg-indigo-50 bg-white opacity-0 group-hover:opacity-100"
                                  >
                                    <PlusIcon className="h-5 w-5 text-indigo-500 hover:text-indigo-600" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>

            {/* New Group Drop Zone */}
            <Droppable droppableId="new-group" type="listing">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`border-2 border-dashed rounded-lg p-4 flex items-center justify-center min-h-[200px] relative ${
                    snapshot.isDraggingOver
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <button
                      onClick={handleAddNewGroup}
                      className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 z-10
                        transition-all duration-200 rounded-full shadow-lg p-2 border border-indigo-200 
                        hover:border-indigo-500 hover:bg-indigo-50 bg-white"
                    >
                      <PlusIcon className="h-5 w-5 text-indigo-500 hover:text-indigo-600" />
                    </button>
                    <p className="mt-2 text-sm text-gray-500">
                      Drag a card here to create a new group
                    </p>
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
} 