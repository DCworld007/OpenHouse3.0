'use client';

import { useEffect, useState } from 'react';
import { Location } from '../../../components/Map/types';
import Link from 'next/link';
import { getGroups, saveGroups } from '@/lib/groupStorage';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import LocationItem from './LocationItem';
import { Switch } from '@headlessui/react';
import IntakeCard from '@/components/IntakeCard';
import SimpleMap from '@/components/Map/SimpleMap';

interface PlanRouteClientProps {
  groupId: string;
}

export default function PlanRouteClient({ groupId }: PlanRouteClientProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [showIntakeCard, setShowIntakeCard] = useState(false);
  const [addAfterIndex, setAddAfterIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    })
  );

  useEffect(() => {
    setLoading(true);
    const groups = getGroups();
    const foundGroup = groups.find((g: any) => g.id === groupId);
    if (foundGroup) {
      const cards = foundGroup.cards || [];
      const whereLocations = cards
        .filter((card: any) => card.type === 'where' && card.content && card.lat && card.lng)
        .map((card: any) => ({
          lat: card.lat,
          lng: card.lng,
          address: card.content,
          notes: card.notes || ''
        }));
      setLocations(whereLocations);
    } else {
      setLocations([]);
    }
    setLoading(false);
  }, [groupId]);

  // Handle current location
  useEffect(() => {
    if (useCurrentLocation) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
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

    const oldIndex = locations.findIndex((loc) => loc.address === active.id);
    const newIndex = locations.findIndex((loc) => loc.address === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newLocations = arrayMove(locations, oldIndex, newIndex);
      setLocations(newLocations);
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
          const newLocation: Location = {
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon),
            address: data.content,
            notes: data.notes || ''
          };

          // Insert the new location after the specified index
          const newLocations = [...locations];
          newLocations.splice(addAfterIndex + 1, 0, newLocation);
          setLocations(newLocations);

          // Update the group in storage
          const groups = getGroups();
          const foundGroup = groups.find((g: any) => g.id === groupId);
          if (foundGroup) {
            const newCard = {
              type: 'where',
              content: data.content,
              notes: data.notes,
              lat: newLocation.lat,
              lng: newLocation.lng
            };
            foundGroup.cards = foundGroup.cards || [];
            foundGroup.cards.splice(addAfterIndex + 1, 0, newCard);
            saveGroups(groups);
          }
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

  if (loading) {
    return <div className="text-center py-16">Loading route...</div>;
  }

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
            <SortableContext items={locations.map(loc => loc.address)} strategy={verticalListSortingStrategy}>
              <ol className="space-y-2">
                {locations.map((loc, idx) => (
                  <LocationItem
                    key={loc.address}
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
          <SimpleMap locations={locations} currentLocation={currentLocation || undefined} />
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