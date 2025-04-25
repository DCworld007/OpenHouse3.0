'use client';

import { MapPinIcon, DocumentTextIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import IntakeCard from './IntakeCard';

interface PlanCardProps {
  id: string;
  what?: string;
  where?: string;
  notes?: string;
  isDragging?: boolean;
  onAddCard?: () => void;
}

export default function PlanCard({ id, what, where, notes, isDragging = false, onAddCard }: PlanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isOver,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div className="relative">
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`hover:group relative bg-white rounded-lg border px-6 py-5 shadow-sm transition-all duration-300 ease-in-out cursor-move ${
          isDragging ? 'opacity-90 scale-110 shadow-xl border-indigo-500 ring-4 ring-indigo-500 z-50 rotate-1' : ''
        } ${
          isOver ? 'border-indigo-500 ring-2 ring-indigo-500 ring-opacity-50 scale-105 bg-indigo-50 -rotate-1' : 'border-gray-200'
        }`}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-indigo-100 opacity-20 rounded-lg animate-pulse"></div>
        )}
        <div className="space-y-4">
          {what && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">What</div>
              <div className="text-sm text-gray-900">{what}</div>
            </div>
          )}
          {where && (
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Where</div>
              <div className="text-sm text-gray-900">{where}</div>
            </div>
          )}
          {notes && (
            <div className="pt-2 border-t">
              <div className="text-sm text-gray-600 leading-relaxed">{notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Add Card Button - Completely outside of drag context */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onAddCard?.();
        }}
        className="absolute -right-4 top-1/2 -translate-y-1/2 z-[60] transition-all duration-200 rounded-full bg-white border border-gray-200 p-2 hover:bg-indigo-50 hover:border-indigo-200 hover:scale-110 shadow-sm opacity-0 hover:group-hover:opacity-100 cursor-pointer"
      >
        <PlusIcon className="w-5 h-5 text-indigo-600" />
      </button>
    </div>
  );
} 