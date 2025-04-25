'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, PlusIcon, XMarkIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Location } from '@/components/Map/types';
import LocationItem from '@/app/plan/[groupId]/LocationItem';
import { AnimatePresence, motion } from 'framer-motion';

const STORAGE_KEY = 'openhouse-data';

// Dynamically import the map component to avoid SSR issues with Leaflet
const LeafletMap = dynamic(() => import('@/components/Map/LeafletMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  )
});

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

export default function PlanRoutePage({ params }: { params: { groupId: string } }) {
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | undefined>();
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [addAfterIndex, setAddAfterIndex] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Load data from localStorage
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) {
      console.error('No saved data found');
      router.push('/');
      return;
    }

    try {
      const groups = JSON.parse(savedData);
      const foundGroup = groups.find((g: Group) => g.id === params.groupId);
      if (!foundGroup) {
        console.error('Group not found:', params.groupId);
        router.push('/');
        return;
      }

      setGroup(foundGroup);

      // Convert 'where' cards to locations
      const locationCards = foundGroup.cards.filter((card: Card) => card.type === 'where');
      console.log('Found location cards:', locationCards);

      const convertedLocations: Location[] = locationCards.map((card: Card) => ({
        lat: 0,
        lng: 0,
        address: card.content,
        notes: card.notes,
      }));

      // Geocode addresses to get coordinates
      Promise.all(
        convertedLocations.map(async (location) => {
          try {
            console.log('Geocoding address:', location.address);
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?` + 
              `format=json&` +
              `q=${encodeURIComponent(location.address)}&` +
              `limit=1`
            );
            const data = await response.json();
            console.log('Geocoding response for', location.address, ':', data);
            
            if (data && data[0]) {
              return {
                ...location,
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
              };
            }
            console.warn('No geocoding results for:', location.address);
            return location;
          } catch (error) {
            console.error('Error geocoding address:', error);
            return location;
          }
        })
      ).then(geocodedLocations => {
        console.log('Final geocoded locations:', geocodedLocations);
        setLocations(geocodedLocations);
      });
    } catch (error) {
      console.error('Error loading saved data:', error);
      router.push('/');
    }
  }, [params.groupId, router]);

  useEffect(() => {
    if (!useCurrentLocation) {
      setCurrentLocation(undefined);
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            );
            const data = await response.json();
            
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: data.display_name || 'Current Location',
            });
          } catch (error) {
            console.error('Error getting address for current location:', error);
            setCurrentLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              address: 'Current Location',
            });
          }
        },
        (error) => {
          console.error('Error getting current location:', error);
          setUseCurrentLocation(false);
        }
      );
    }
  }, [useCurrentLocation]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setLocations((items) => {
        const oldIndex = items.findIndex((item) => item.address === active.id);
        const newIndex = items.findIndex((item) => item.address === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim()) return;

    try {
      // If we have a selected location, use its coordinates
      if (selectedLocation) {
        const newLocation: Location = {
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          address: newAddress,
          notes: notes,
        };
        console.log('Adding selected location:', newLocation);
        setLocations(prev => {
          const newLocations = [...prev];
          if (addAfterIndex !== null) {
            newLocations.splice(addAfterIndex + 1, 0, newLocation);
            return newLocations;
          }
          return [...prev, newLocation];
        });

        // Update localStorage
        const savedData = localStorage.getItem(STORAGE_KEY);
        console.log('Current localStorage data:', savedData);
        if (savedData) {
          const groups = JSON.parse(savedData);
          const groupIndex = groups.findIndex((g: Group) => g.id === params.groupId);
          console.log('Found group index:', groupIndex);
          if (groupIndex !== -1) {
            // Add new card to the group
            const newCard = {
              id: Math.random().toString(36).substr(2, 9),
              type: 'where' as const,
              content: newAddress,
              notes: notes,
            };
            console.log('Adding new card to group:', newCard);
            groups[groupIndex].cards.push(newCard);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
            console.log('Updated localStorage with new card');
            
            // Also update the group state
            setGroup(groups[groupIndex]);
          }
        }

        setNewAddress('');
        setNotes('');
        setIsAddingStop(false);
        setSelectedLocation(null);
        setAddAfterIndex(null);
        return;
      }

      // Otherwise, geocode the address
      console.log('Geocoding new address:', newAddress);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` + 
        `format=json&` +
        `q=${encodeURIComponent(newAddress)}&` +
        `limit=1`
      );
      const data = await response.json();
      console.log('Geocoding response:', data);
      
      if (data && data[0]) {
        const newLocation: Location = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          address: newAddress,
          notes: notes,
        };
        console.log('Adding geocoded location:', newLocation);
        setLocations(prev => [...prev, newLocation]);

        // Update localStorage
        const savedData = localStorage.getItem(STORAGE_KEY);
        console.log('Current localStorage data:', savedData);
        if (savedData) {
          const groups = JSON.parse(savedData);
          const groupIndex = groups.findIndex((g: Group) => g.id === params.groupId);
          console.log('Found group index:', groupIndex);
          if (groupIndex !== -1) {
            // Add new card to the group
            const newCard = {
              id: Math.random().toString(36).substr(2, 9),
              type: 'where' as const,
              content: newAddress,
              notes: notes,
            };
            console.log('Adding new card to group:', newCard);
            groups[groupIndex].cards.push(newCard);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
            console.log('Updated localStorage with new card');
            
            // Also update the group state
            setGroup(groups[groupIndex]);
          }
        }

        setNewAddress('');
        setNotes('');
        setIsAddingStop(false);
        setSelectedLocation(null);
        setAddAfterIndex(null);
      }
    } catch (error) {
      console.error('Error in handleAddStop:', error);
    }
  };

  const handleLocationClick = (location: Location) => {
    setSelectedLocation(location);
    setNewAddress('');
    setIsAddingStop(true);
  };

  // Update localStorage when locations change due to drag and drop
  useEffect(() => {
    if (!group) return;
    
    console.log('Locations changed, updating localStorage');
    
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const groups = JSON.parse(savedData);
      const groupIndex = groups.findIndex((g: Group) => g.id === params.groupId);
      if (groupIndex !== -1) {
        // Keep all non-'where' cards and update 'where' cards to match current locations
        const nonWhereCards = groups[groupIndex].cards.filter((card: Card) => card.type !== 'where');
        const whereCards: Card[] = locations.map(location => ({
          // Use address as ID to maintain stability
          id: location.address,
          type: 'where' as const,
          content: location.address,
          notes: location.notes,
        }));
        
        // Combine both arrays
        const updatedCards = [...nonWhereCards, ...whereCards];
        
        // Only update if cards have actually changed
        const currentCards = JSON.stringify(groups[groupIndex].cards);
        const newCards = JSON.stringify(updatedCards);
        
        if (currentCards !== newCards) {
          groups[groupIndex].cards = updatedCards;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
          
          // Only update group if necessary
          if (JSON.stringify(group.cards) !== newCards) {
            setGroup(groups[groupIndex]);
          }
        }
      }
    }
  }, [locations, params.groupId]); // Remove group from dependencies

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Loading route planner...</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={() => router.back()}
                  className="mr-4 p-2 rounded-full hover:bg-gray-100"
                >
                  <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900">
                  Plan Route: {group.name}
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push(`/planning-room/${group.id}`)}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                  Planning Room
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="grid grid-cols-3 gap-8 h-full">
            {/* Location List */}
            <div className="col-span-1 bg-white rounded-lg shadow-sm p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Locations</h2>
                <button
                  onClick={() => setUseCurrentLocation(!useCurrentLocation)}
                  className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-2 ${
                    useCurrentLocation
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {useCurrentLocation ? '✓ Using current location' : 'Use my location'}
                </button>
              </div>

              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={locations.map(loc => loc.address)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {locations.map((location, index) => (
                      <LocationItem
                        key={location.address}
                        location={location}
                        index={index + 1}
                        onAddStop={() => {
                          setSelectedLocation(location);
                          setNewAddress('');
                          setIsAddingStop(true);
                          setAddAfterIndex(index);
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* Map */}
            <div className="col-span-2 bg-white rounded-lg shadow-sm overflow-hidden">
              <LeafletMap
                locations={locations}
                currentLocation={currentLocation}
              />
            </div>
          </div>
        </div>

        {/* Floating Action Button */}
        <button
          onClick={() => setIsAddingStop(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Add Stop Modal - Moved outside main layout */}
      {isAddingStop && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-[9999]">
          <div className="fixed inset-0 z-[9999]">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-sm transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:p-6">
                <div className="absolute right-0 top-0 pr-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingStop(false);
                      setNewAddress('');
                      setNotes('');
                    }}
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">
                    Add Location
                  </h3>
                  <div className="mt-4">
                    <form onSubmit={handleAddStop}>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                            Where
                          </label>
                          <input
                            type="text"
                            id="address"
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                            placeholder="Enter location or address"
                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                            Notes (optional)
                          </label>
                          <input
                            type="text"
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add any additional notes here"
                            className="mt-1 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                          />
                        </div>
                      </div>
                      <div className="mt-5 flex flex-row-reverse gap-3">
                        <button
                          type="submit"
                          className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          Add Location
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingStop(false);
                            setNewAddress('');
                            setNotes('');
                          }}
                          className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 