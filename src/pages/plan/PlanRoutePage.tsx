import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Location } from '../../components/Map/types';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bars3Icon } from '@heroicons/react/24/outline';

const STORAGE_KEY = 'openhouse-data';

const MapWithNoSSR = dynamic(() => import('../../components/Map/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full bg-gray-100 rounded-lg">
      <p className="text-gray-600">Loading map...</p>
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  )
});

function SortableStop({ loc, idx, id }: { loc: Location; idx: number; id: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    background: isDragging ? '#f3f4f6' : undefined,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-grab">
      <button
        {...attributes}
        {...listeners}
        className="mr-2 p-1 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing"
        tabIndex={0}
        aria-label="Drag to reorder"
        type="button"
      >
        <Bars3Icon className="h-5 w-5 text-gray-600" />
      </button>
      <span className="font-bold text-indigo-600">{idx + 1}.</span>
      <span>{loc.address}</span>
    </li>
  );
}

function PlanRoutePage({ groupId }: { groupId: string }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Load group from localStorage
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const groups = JSON.parse(savedData);
        const foundGroup = groups.find((g: any) => g.id === groupId);
        if (foundGroup && foundGroup.listings) {
          // Only use 'where' cards with lat/lng
          const whereLocations = foundGroup.listings
            .filter((card: any) => card.cardType === 'where' && card.address && card.lat && card.lng)
            .map((card: any) => ({
              lat: card.lat,
              lng: card.lng,
              address: card.address,
              notes: card.notes || ''
            }));
          setLocations(whereLocations);
        } else {
          setLocations([]);
        }
      } catch (error) {
        setLocations([]);
      }
    } else {
      setLocations([]);
    }
    setLoading(false);
  }, [groupId]);

  // DnD-kit setup
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = locations.findIndex((loc) => loc.address + loc.lat + loc.lng === active.id);
    const newIndex = locations.findIndex((loc) => loc.address + loc.lat + loc.lng === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newLocations = arrayMove(locations, oldIndex, newIndex);
    setLocations(newLocations);
    // Persist new order to localStorage
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const groups = JSON.parse(savedData);
        const foundGroup = groups.find((g: any) => g.id === groupId);
        if (foundGroup) {
          foundGroup.listings = foundGroup.listings.sort((a: any, b: any) => {
            const aIdx = newLocations.findIndex((loc) => loc.address === a.address && loc.lat === a.lat && loc.lng === a.lng);
            const bIdx = newLocations.findIndex((loc) => loc.address === b.address && loc.lat === b.lat && loc.lng === b.lng);
            return aIdx - bIdx;
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
        }
      } catch {}
    }
  };

  if (loading) {
    return <div className="text-center py-16">Loading route...</div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[80vh] w-full">
      <div className="md:w-1/3 w-full bg-white rounded-lg shadow p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Route Stops</h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={locations.map((loc) => loc.address + loc.lat + loc.lng)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-2">
              {locations.map((loc, idx) => (
                <SortableStop key={loc.address + loc.lat + loc.lng} loc={loc} idx={idx} id={loc.address + loc.lat + loc.lng} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </div>
      <div className="flex-1 h-full">
        <MapWithNoSSR locations={locations} />
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(PlanRoutePage), { ssr: false }); 