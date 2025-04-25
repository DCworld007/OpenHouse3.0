'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bars3Icon, PlusIcon } from '@heroicons/react/24/outline';
import { Location } from '@/components/Map/types';

interface LocationItemProps {
  location: Location;
  index: number;
  onAddStop?: () => void;
}

export default function LocationItem({ location, index, onAddStop }: LocationItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: location.address });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCurrentLocation = location.address === 'Current Location' || location.address.includes('Current Location');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative"
    >
      <div className={`p-3 rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 group ${
        isCurrentLocation 
          ? 'bg-green-50 border-green-200' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          {/* Reorder handle - isolated from group hover effects */}
          <div 
            {...attributes}
            {...listeners}
            className="flex-shrink-0 cursor-move p-1 -m-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50"
          >
            <Bars3Icon className="h-5 w-5" />
          </div>
          {/* Main content area that triggers hover effects */}
          <div className="group/content flex-1 flex items-center gap-3">
            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-medium ${
              isCurrentLocation ? 'bg-green-600' : 'bg-blue-600'
            }`}>
              {index}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${
                isCurrentLocation ? 'text-green-800' : 'text-gray-900'
              }`}>
                {isCurrentLocation ? 'Current Location' : location.address}
              </div>
              {(location.notes || (isCurrentLocation && location.address !== 'Current Location')) && (
                <div className={`text-sm ${
                  isCurrentLocation ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {isCurrentLocation ? location.address : location.notes}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Plus icon container */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={onAddStop}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Spacer that creates the shift effect */}
      <div className="h-0 group-hover:h-6 transition-all duration-200" />
    </div>
  );
} 