import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { TrashIcon, ArrowLeftIcon, MapPinIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import React from 'react';
import type { Location } from './Map/index';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface Listing {
  id: string;
  address: string;
  notes?: string;
  cardType: string;
  // Add other listing properties as needed
}

interface Group {
  id: string;
  name: string;
  listings: Listing[];
}

// Create a dynamic Map component with SSR disabled
const ClientMap = dynamic(() => import('./Map/ClientMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  )
});

export default function PlanGroup({ group }: { group: Group }) {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [error, setError] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    // Initialize locations from group listings that have addresses and are 'where' type
    console.log('Group listings:', group.listings);
    const initialLocations = group.listings
      .filter(listing => {
        const hasAddress = Boolean(listing.address);
        const isWhereCard = listing.cardType === 'where';
        if (!hasAddress) {
          console.warn('Listing without address:', listing);
        }
        if (!isWhereCard) {
          console.log('Skipping non-where card:', listing);
        }
        return hasAddress && isWhereCard;
      })
      .map(listing => ({
        address: listing.address,
        lat: 0,
        lng: 0,
        notes: listing.notes
      }));

    console.log('Initial locations before geocoding:', initialLocations);

    // Geocode all addresses
    Promise.all(
      initialLocations.map(async (location) => {
        try {
          console.log('Geocoding address:', location.address);
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location.address)}&limit=1`
          );
          const data = await response.json();
          console.log('Geocoding response:', data);
          
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
          console.error('Error geocoding address:', location.address, error);
          return location;
        }
      })
    ).then((geocodedLocations) => {
      const validLocations = geocodedLocations.filter(loc => loc.lat !== 0 && loc.lng !== 0);
      console.log('Final geocoded locations:', validLocations);
      setLocations(validLocations);
      setIsMapReady(true);
    });
  }, [group]);

  useEffect(() => {
    if (useCurrentLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Current Location',
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setUseCurrentLocation(false);
        }
      );
    } else {
      setCurrentLocation(null);
    }
  }, [useCurrentLocation]);

  const handleAddLocation = async () => {
    if (!newAddress) {
      setError('Please enter a location');
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newAddress)}`
      );
      const data = await response.json();

      if (data && data[0]) {
        const newLocation = {
          address: newAddress,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          notes: newNotes || undefined
        } as Location;
        
        setLocations([...locations, newLocation]);
        setNewAddress('');
        setNewNotes('');
        setIsAddingLocation(false);
        setError('');

        // Add new card to the group
        const newListing: Listing = {
          id: Date.now().toString(), // Generate a temporary ID
          address: newAddress,
          notes: newNotes || undefined,
          cardType: 'where'
        };
        group.listings.push(newListing);

      } else {
        setError('Address not found');
      }
    } catch (error) {
      setError('Error geocoding address');
    }
  };

  const removeLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(locations);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLocations(items);
  };

  if (!isMapReady) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Preparing your route...</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-96 bg-white border-r overflow-y-auto">
          <div className="p-4">
            <label className="flex items-center justify-between p-4 bg-white rounded-lg border hover:bg-gray-50 transition-colors cursor-pointer group">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                  <MapPinIcon className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <span className="font-medium text-gray-900">Start from current location</span>
                  <p className="text-sm text-gray-500">Use your current location as the starting point</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={useCurrentLocation}
                  onChange={(e) => setUseCurrentLocation(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-14 h-7 rounded-full transition-colors duration-200 ease-in-out ${
                    useCurrentLocation ? 'bg-indigo-600' : 'bg-gray-200'
                  } group-hover:${useCurrentLocation ? 'bg-indigo-500' : 'bg-gray-300'}`}
                >
                  <div
                    className={`absolute w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${
                      useCurrentLocation ? 'translate-x-8' : 'translate-x-1'
                    } top-1`}
                  />
                </div>
              </div>
            </label>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Stops</h2>
                <span className="text-sm text-gray-500">{locations.length} locations</span>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="stops">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-3"
                    >
                      {locations.map((location, index) => (
                        <Draggable
                          key={`${location.lat}-${location.lng}-${index}`}
                          draggableId={`${location.lat}-${location.lng}-${index}`}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex items-center space-x-3 p-3 bg-white border rounded-lg shadow-sm 
                                ${snapshot.isDragging ? 'shadow-lg ring-2 ring-indigo-500 ring-opacity-50' : 'hover:shadow-md'} 
                                transition-all relative`}
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="flex-shrink-0 cursor-grab active:cursor-grabbing"
                              >
                                <Bars3Icon className="h-5 w-5 text-gray-400" />
                              </div>
                              <div className="flex-shrink-0 relative">
                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                  <span className="font-medium text-indigo-600">{useCurrentLocation ? index + 2 : index + 1}</span>
                                </div>
                                <div className="absolute -top-2 -right-2">
                                  <MapPinIcon className="h-4 w-4 text-indigo-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="text-gray-700">{location.address}</div>
                                {(location as Location & { notes?: string }).notes && (
                                  <div className="text-sm text-gray-500 mt-1">
                                    {(location as Location & { notes?: string }).notes}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => removeLocation(index)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <button
                onClick={() => {
                  console.log('Add Another Stop button clicked');
                  setIsAddingLocation(true);
                  console.log('isAddingLocation set to true');
                }}
                className="mt-4 w-full bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center font-medium"
              >
                Add Another Stop
              </button>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 p-4">
          <div className="h-full rounded-lg overflow-hidden shadow-lg relative">
            <ClientMap
              locations={locations}
              currentLocation={currentLocation || undefined}
              useCurrentLocation={useCurrentLocation}
              enableClickSelection={true}
              onMapClick={(location) => {
                setLocations([...locations, location]);
              }}
            />
          </div>
        </div>
      </div>

      {/* Add Location Modal */}
      {isAddingLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg shadow-xl w-[480px] overflow-hidden relative">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add New Stop</h3>
            </div>
            
            <div className="p-6 space-y-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="where" className="block text-sm font-medium text-gray-700">
                  Where
                </label>
                <input
                  id="where"
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Enter the location"
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddLocation();
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Add any additional notes"
                  rows={3}
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Adding a stop will create a new card in this group. However, removing a stop from this screen will not remove the card.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsAddingLocation(false);
                  setError('');
                  setNewAddress('');
                  setNewNotes('');
                }}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLocation}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Add Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 