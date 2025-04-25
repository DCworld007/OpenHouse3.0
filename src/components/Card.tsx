'use client';

import { useState } from 'react';
import { Card as CardType } from '@prisma/client';
import { Listing } from '@/types/listing';
import { EllipsisVerticalIcon, MapPinIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface CardProps {
  card?: CardType | Listing;
  onEdit?: () => void;
  onDelete?: () => void;
  onReaction?: (type: string) => void;
  showActions?: boolean;
  isLinked?: boolean;
}

export default function Card({
  card,
  onEdit,
  onDelete,
  onReaction,
  showActions = true,
  isLinked = false,
}: CardProps) {
  const [isLiked, setIsLiked] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    onReaction?.('like');
  };

  if (!card) {
    return null;
  }

  // Get the content based on the type of card
  const content = 'content' in card ? card.content : card.address;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {card.imageUrl && (
        <div className="relative h-48 w-full">
        <img
            src={card.imageUrl}
            alt={content}
            className="object-cover w-full h-full"
          />
          {card.cardType === 'where' && (
            <div className="absolute top-2 left-2 bg-white/90 rounded-full p-1">
              <MapPinIcon className="h-5 w-5 text-indigo-600" />
            </div>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-medium text-gray-900 flex-1">
            {content}
          </h3>
          {showActions && (
            <Menu as="div" className="relative inline-block text-left">
              <Menu.Button className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100">
                <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="px-1 py-1">
                    {onEdit && (
                      <Menu.Item>
                        {({ active }) => (
          <button
            onClick={onEdit}
                            className={`${
                              active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                          >
                            Edit
                          </button>
                        )}
                      </Menu.Item>
                    )}
                    {onDelete && (
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={onDelete}
                            className={`${
                              active ? 'bg-red-50 text-red-700' : 'text-gray-700'
                            } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                          >
                            Delete
          </button>
                        )}
                      </Menu.Item>
                    )}
        </div>
                </Menu.Items>
              </Transition>
            </Menu>
          )}
        </div>
        {card.notes && (
          <p className="mt-2 text-sm text-gray-500">{card.notes}</p>
        )}
        <div className="mt-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleLike}
              className="flex items-center space-x-1 text-gray-500 hover:text-indigo-600"
            >
              {isLiked ? (
                <HeartIconSolid className="h-5 w-5 text-indigo-600" />
              ) : (
                <HeartIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          {isLinked && (
            <span className="text-xs text-gray-500">Linked Card</span>
          )}
        </div>
      </div>
    </div>
  );
} 