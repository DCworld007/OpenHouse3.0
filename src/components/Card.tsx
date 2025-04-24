import { Listing } from '@/types/listing';
import { format } from 'date-fns';
import { PencilIcon, MapPinIcon, CalendarIcon, ClockIcon, StarIcon, HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as HandThumbUpSolidIcon, HandThumbDownIcon as HandThumbDownSolidIcon } from '@heroicons/react/24/solid';
import { useState } from 'react';

interface CardProps {
  listing: Listing;
  onEdit: () => void;
  onReaction: (cardId: string, type: 'thumbsUp' | 'thumbsDown', action: 'add' | 'remove') => void;
  currentUserId?: string; // TODO: Replace with actual user ID when auth is implemented
}

interface Reaction {
  type: 'thumbsUp' | 'thumbsDown';
  userId: string;
}

export default function Card({ listing, onEdit, onReaction, currentUserId = 'temp-user-id' }: CardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>(listing.reactions || []);

  const userReaction = reactions.find(r => r.userId === currentUserId)?.type;
  const thumbsUpCount = reactions.filter(r => r.type === 'thumbsUp').length;
  const thumbsDownCount = reactions.filter(r => r.type === 'thumbsDown').length;

  const handleReaction = (type: 'thumbsUp' | 'thumbsDown') => {
    const hasReacted = reactions.find(r => r.userId === currentUserId && r.type === type);
    onReaction(listing.id, type, hasReacted ? 'remove' : 'add');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div 
      className="bg-white overflow-hidden shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <img
          src={listing.imageUrl}
          alt={listing.address}
          className="h-48 w-full object-cover"
        />
        {isHovered && (
          <button
            onClick={onEdit}
            className="absolute top-4 right-4 rounded-full bg-white p-2 text-gray-600 shadow-sm hover:text-gray-900 transition-opacity opacity-0 group-hover:opacity-100"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            listing.cardType === 'where' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
          }`}>
            {listing.cardType === 'where' ? 'Where' : 'What'}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleReaction('thumbsUp')}
              className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${
                userReaction === 'thumbsUp' 
                  ? 'bg-green-100 text-green-700' 
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              {userReaction === 'thumbsUp' ? (
                <HandThumbUpSolidIcon className="h-4 w-4" />
              ) : (
                <HandThumbUpIcon className="h-4 w-4" />
              )}
              <span className="text-xs">{thumbsUpCount}</span>
            </button>
            <button
              onClick={() => handleReaction('thumbsDown')}
              className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${
                userReaction === 'thumbsDown' 
                  ? 'bg-red-100 text-red-700' 
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              {userReaction === 'thumbsDown' ? (
                <HandThumbDownSolidIcon className="h-4 w-4" />
              ) : (
                <HandThumbDownIcon className="h-4 w-4" />
              )}
              <span className="text-xs">{thumbsDownCount}</span>
            </button>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-start">
            {listing.cardType === 'where' ? (
              <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
            ) : (
              <StarIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
            )}
            <p className="ml-2 text-sm text-gray-600">{listing.address}</p>
          </div>
          {listing.visitDate && (
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <p className="ml-2 text-sm text-gray-600">
                Visit on {format(new Date(listing.visitDate), 'EEEE, MMMM d')}
              </p>
            </div>
          )}
          {listing.openHouse && (
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <p className="ml-2 text-sm text-gray-600">
                Open House: {listing.openHouse.startTime} - {listing.openHouse.endTime}
              </p>
            </div>
          )}
        </div>
        {listing.notes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">{listing.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
} 