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
      const foundGroup = groups.find((g: ListingGroup) => g.id === params.groupId);
      if (!foundGroup) {
        console.error('Group not found:', params.groupId);
        router.push('/');
      } else {
        setGroup(foundGroup);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
      router.push('/');
    }
  }, [params.groupId, router]);

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Loading planning room...</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return <PlanningRoom group={group} />;
} 