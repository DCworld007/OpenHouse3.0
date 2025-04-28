'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ListingGroup } from '@/types/listing';
import PlanningRoom from '@/components/PlanningRoom';
import { getGroups, saveGroups } from '@/lib/groupStorage';

const STORAGE_KEY = 'openhouse-data';

export const runtime = 'edge';

export default function PlanningRoomPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = (params?.groupId ?? '') as string;
  const [group, setGroup] = useState<ListingGroup | null>(null);

  useEffect(() => {
    const groups = getGroups();
    const foundGroup = groups.find((g: any) => g.id === groupId);
      if (!foundGroup) {
      console.error('Group not found:', groupId);
      router.push('/');
    } else {
      setGroup(foundGroup);
    }
  }, [groupId, router]);

  // Handle group updates
  const handleGroupUpdate = (updatedGroup: ListingGroup) => {
    setGroup(updatedGroup);
    const groups = getGroups();
        const groupIndex = groups.findIndex((g: ListingGroup) => g.id === updatedGroup.id);
        if (groupIndex !== -1) {
      groups[groupIndex] = { ...updatedGroup };
      saveGroups(groups);
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