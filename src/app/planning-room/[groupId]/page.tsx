'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListingGroup } from '@/types/listing';
import PlanningRoom from '@/components/PlanningRoom';

const STORAGE_KEY = 'openhouse-data';

export default function PlanningRoomPage({ params }: { params: { groupId: string } }) {
  const router = useRouter();
  const [group, setGroup] = useState<ListingGroup | null>(null);

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
      const foundGroup = groups.find((g: any) => g.id === params.groupId);
      if (!foundGroup) {
        console.error('Group not found:', params.groupId);
        router.push('/');
      } else {
        // Convert old format to new format if necessary
        const convertedGroup: ListingGroup = {
          id: foundGroup.id,
          name: foundGroup.name,
          type: (foundGroup.type === 'date' ? 'date' : 'custom') as 'date' | 'custom',
          date: foundGroup.date || new Date().toISOString().split('T')[0],
          order: typeof foundGroup.order === 'number' ? foundGroup.order : 0,
          listings: foundGroup.listings || foundGroup.cards?.map((card: any) => ({
            id: card.id,
            address: card.content,
            cardType: card.type,
            groupId: foundGroup.id,
            imageUrl: card.type === 'where' ? '/marker-icon-2x.png' : '/placeholder-activity.jpg',
            sourceUrl: '',
            source: 'manual',
            price: 0,
            notes: card.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            order: 0,
            reactions: []
          })) || []
        };
        setGroup(convertedGroup);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
      router.push('/');
    }
  }, [params.groupId, router]);

  // Handle group updates
  const handleGroupUpdate = (updatedGroup: ListingGroup) => {
    // Update local state
    setGroup(updatedGroup);

    // Update localStorage
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const groups = JSON.parse(savedData);
        const groupIndex = groups.findIndex((g: ListingGroup) => g.id === updatedGroup.id);
        if (groupIndex !== -1) {
          // Convert listings back to cards format
          const cards = updatedGroup.listings.map(listing => ({
            id: listing.id,
            type: listing.cardType,
            content: listing.address,
            notes: listing.notes
          }));

          // Update both listings and cards in the group, ensuring type is defined
          groups[groupIndex] = {
            ...updatedGroup,
            type: (updatedGroup.type === 'date' ? 'date' : 'custom') as 'date' | 'custom',
            date: updatedGroup.date || new Date().toISOString().split('T')[0],
            order: typeof updatedGroup.order === 'number' ? updatedGroup.order : 0,
            cards
          };
          
          localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
        }
      } catch (error) {
        console.error('Error updating localStorage:', error);
      }
    }
  };

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PlanningRoom group={group} onGroupUpdate={handleGroupUpdate} />
    </div>
  );
} 