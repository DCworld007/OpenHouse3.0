"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState, use } from 'react';
import { Location } from '../../../components/Map/types';
import Link from 'next/link';
import { getGroups, saveGroups } from '@/lib/groupStorage';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import LocationItem from './LocationItem';
import { Switch } from '@headlessui/react';
import IntakeCard from '@/components/IntakeCard';
import { useRouter, usePathname } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { usePlanningRoomSync } from '@/hooks/planningRoom/usePlanningRoomSync';
import { useUser } from '@/lib/useUser';

const STORAGE_KEY = 'openhouse-data';

const MapWithNoSSR = dynamic(() => import('../../../components/Map/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full bg-gray-100 rounded-lg">
      <p className="text-gray-600">Loading map...</p>
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  )
});

export default function PlanRoutePage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const { user } = useUser();
  const userId = user?.id || '';
  const {
    linkedCards,
    cardOrder,
    addCard,
    reorderCards,
    removeCard
  } = usePlanningRoomSync(groupId, userId);

  // Add debugging to see what cards are available
  useEffect(() => {
    console.log('[PlanRoute] groupId:', groupId);
    console.log('[PlanRoute] linkedCards:', linkedCards);
    console.log('[PlanRoute] cardOrder:', cardOrder);
    console.log('[PlanRoute] userId:', userId);
  }, [groupId, linkedCards, cardOrder, userId]);

  const locations: Location[] = cardOrder
    .map(id => {
      const card = linkedCards.find(card => card.id === id);
      if (!card) {
        console.log(`[PlanRoute] Card with id ${id} not found in linkedCards`);
      } else if (card.cardType !== 'where') {
        console.log(`[PlanRoute] Card with id ${id} is not a 'where' card: ${card.cardType}`);
      } else if (typeof card.lat !== 'number' || typeof card.lng !== 'number') {
        console.log(`[PlanRoute] Card with id ${id} missing valid coordinates:`, card.lat, card.lng);
      }
      return card;
    })
    .filter(card => card && card.cardType === 'where' && typeof card.lat === 'number' && typeof card.lng === 'number')
    .map(card => ({
      id: card!.id,
      lat: card!.lat as number,
      lng: card!.lng as number,
      address: card!.content,
      notes: card!.notes || ''
    }));

  // Log the resulting locations array
  useEffect(() => {
    console.log('[PlanRoute] Final locations array:', locations);
  }, [locations]);

  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [showIntakeCard, setShowIntakeCard] = useState(false);
  const [addAfterIndex, setAddAfterIndex] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    })
  );

  // Handle current location
  useEffect(() => {
    if (useCurrentLocation) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              id: 'current-location',
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: 'Current Location'
            });
          },
          (error) => {
            console.error('Error getting location:', error);
            setUseCurrentLocation(false);
          }
        );
      } else {
        console.error('Geolocation is not supported by this browser.');
        setUseCurrentLocation(false);
      }
    } else {
      setCurrentLocation(null);
    }
  }, [useCurrentLocation]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = locations.findIndex((loc) => loc.id === active.id);
    const newIndex = locations.findIndex((loc) => loc.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(locations, oldIndex, newIndex).map(l => l.id);
      reorderCards(newOrder);
    }
  };

  const handleAddStop = (afterIndex: number) => {
    setAddAfterIndex(afterIndex);
    setShowIntakeCard(true);
  };

  const handleIntakeSubmit = async (data: { type: 'what' | 'where', content: string, notes?: string }) => {
    if (data.type === 'where' && addAfterIndex !== null) {
      try {
        // Validate and geocode the location
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.content)}`);
        const results = await response.json();
        if (results && results.length > 0) {
          const newLocation = {
            id: uuidv4(),
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon),
            content: data.content,
            notes: data.notes || '',
            cardType: 'where' as 'where',
            userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          // Insert the new card after the specified index
          const newOrder = [...cardOrder];
          newOrder.splice(addAfterIndex + 1, 0, newLocation.id);
          addCard(newLocation);
          reorderCards(newOrder);
        }
      } catch (error) {
        console.error('Error adding location:', error);
      }
    }
    setShowIntakeCard(false);
    setAddAfterIndex(null);
  };

  const handleIntakeCancel = () => {
    setShowIntakeCard(false);
    setAddAfterIndex(null);
  };

  return (
    <div className="w-full">
      {/* Header Bar */}
      <div className="flex items-center gap-4 bg-white shadow-sm rounded-b-lg px-6 py-5 mb-8" style={{ minHeight: '64px' }}>
        <Link href="/plans" className="text-indigo-600 hover:text-indigo-800 font-bold text-xl mr-2">
          &larr;
        </Link>
        <span className="inline-block bg-indigo-100 text-indigo-700 text-sm font-semibold px-3 py-1 rounded-full ml-2">Plan Route</span>
        
        {/* Current Location Toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <Switch
            checked={useCurrentLocation}
            onChange={setUseCurrentLocation}
            className={`${
              useCurrentLocation ? 'bg-indigo-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
          >
            <span className="sr-only">Use current location</span>
            <span
              className={`${
                useCurrentLocation ? 'translate-x-6' : 'translate-x-1'
              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
            />
          </Switch>
          <span className="text-sm text-gray-600">Start from current location</span>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-6 h-[80vh] w-full">
        <div className="md:w-1/3 w-full bg-white rounded-lg shadow p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">Route Stops</h2>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={locations.map(loc => loc.id)} strategy={verticalListSortingStrategy}>
              <ol className="space-y-2">
                {locations.map((loc, idx) => (
                  <LocationItem
                    key={loc.id}
                    location={loc}
                    index={idx + 1}
                    onAddStop={() => handleAddStop(idx)}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </div>
        <div className="flex-1 h-full relative">
          <MapWithNoSSR locations={locations} currentLocation={currentLocation || undefined} />
        </div>
      </div>

      {/* IntakeCard Modal - Moved outside the flex container */}
      {showIntakeCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 relative z-[10000]">
            <IntakeCard
              onSubmit={handleIntakeSubmit}
              onCancel={handleIntakeCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export const runtime = 'edge'; 