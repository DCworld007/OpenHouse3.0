import { Listing } from '@/types/listing';
import { format } from 'date-fns';
import { PencilIcon, MapPinIcon, CalendarIcon, ClockIcon, StarIcon } from '@heroicons/react/24/outline';

interface ListingCardProps {
  listing: Listing;
  onEdit: (listing: Listing) => void;
}

export default function ListingCard({ listing, onEdit }: ListingCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="bg-white overflow-hidden shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
      <div className="relative">
        <img
          src={listing.imageUrl}
          alt={listing.address}
          className="h-48 w-full object-cover"
        />
        <div className="absolute top-4 right-4">
          <button
            onClick={() => onEdit(listing)}
            className="rounded-full bg-white p-2 text-gray-600 shadow-sm hover:text-gray-900"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            listing.cardType === 'where' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
          }`}>
            {listing.cardType === 'where' ? 'Where' : 'What'}
          </span>
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