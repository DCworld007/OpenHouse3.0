"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { ListingGroup } from '@/types/listing';
import PlanningRoom from '@/components/PlanningRoom';
import { getGroups, saveGroups } from '@/lib/groupStorage';
import dynamic from 'next/dynamic';

// Use dynamic import for PlanningRoom component to avoid 'self is not defined' errors
const DynamicPlanningRoom = dynamic(() => import('@/components/PlanningRoom'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-screen">Loading...</div>
});

const STORAGE_KEY = 'openhouse-data';

export const runtime = 'edge';

export default function PlanningRoomPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const groupId = params?.groupId ? (Array.isArray(params.groupId) ? params.groupId[0] : params.groupId) : '';
  const [group, setGroup] = useState<ListingGroup | null>(null);

  useEffect(() => {
    if (!groupId) {
      router.push('/plans');
      return;
    }

    // Load group data
    const groups = getGroups();
    const foundGroup = groups.find((g: any) => g.id === groupId);
    
    if (!foundGroup) {
      console.error(`Group not found: ${groupId}`);
      router.push('/plans');
      return;
    }
    
    setGroup(foundGroup);
  }, [groupId, router, pathname]);

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

  // Add loading state
  if (!group) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <>
      {group && <DynamicPlanningRoom group={group} onGroupUpdate={handleGroupUpdate} />}
    </>
  );
} Sun May  4 16:28:33 EDT 2025
