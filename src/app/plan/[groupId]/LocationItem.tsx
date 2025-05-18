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
    isDragging,
  } = useSortable({ id: location.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div className="relative group">
      <li
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-2 p-2 bg-gray-50 rounded transition-colors ${
          isDragging ? 'bg-gray-100 shadow-lg' : ''
        }`}
      >
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:bg-gray-200 cursor-grab active:cursor-grabbing"
          tabIndex={0}
          aria-label="Drag to reorder"
          type="button"
        >
          <Bars3Icon className="h-5 w-5 text-gray-400" />
        </button>
        <span className="font-bold text-indigo-600">{index}.</span>
        <span className="flex-1">{location.address}</span>
      </li>

      {/* Plus button - appears on hover */}
      {onAddStop && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-[25%] opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={onAddStop}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors hover:bg-gray-50"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Spacer for hover effect */}
      <div className="h-0 group-hover:h-4 transition-all duration-200" />
    </div>
  );
} 