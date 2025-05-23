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

    async function loadGroupData() {
      try {
        // First try to get from backend
        const response = await fetch(`/api/rooms/${groupId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setGroup({
            id: data.id,
            name: data.name,
            type: 'custom',
            date: new Date().toISOString().split('T')[0],
            order: 0,
            listings: []
          });
          return;
        }

        // Fallback to localStorage if backend fails
        const groups = getGroups();
        const foundGroup = groups.find((g: any) => g.id === groupId);
        
        if (!foundGroup) {
          console.error(`Group not found: ${groupId}`);
          router.push('/plans');
          return;
        }
        
        setGroup(foundGroup);
      } catch (error) {
        console.error('Error loading group data:', error);
        // Fallback to localStorage
        const groups = getGroups();
        const foundGroup = groups.find((g: any) => g.id === groupId);
        
        if (!foundGroup) {
          console.error(`Group not found: ${groupId}`);
          router.push('/plans');
          return;
        }
        
        setGroup(foundGroup);
      }
    }

    loadGroupData();
  }, [groupId, router, pathname]);

  // Handle group updates
  const handleGroupUpdate = async (updatedGroup: ListingGroup) => {
    setGroup(updatedGroup);

    try {
      // Update backend first
      const response = await fetch(`/api/rooms/${updatedGroup.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: updatedGroup.name,
        }),
      });

      if (!response.ok) {
        console.error('Failed to update group in backend:', await response.text());
      }

      // Then update localStorage
      const groups = getGroups();
      const groupIndex = groups.findIndex((g: ListingGroup) => g.id === updatedGroup.id);
      if (groupIndex !== -1) {
        groups[groupIndex] = { ...updatedGroup };
        saveGroups(groups);
      }
    } catch (error) {
      console.error('Error updating group:', error);
      // Still update localStorage even if backend fails
      const groups = getGroups();
      const groupIndex = groups.findIndex((g: ListingGroup) => g.id === updatedGroup.id);
      if (groupIndex !== -1) {
        groups[groupIndex] = { ...updatedGroup };
        saveGroups(groups);
      }
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
}
// Trivial redeploy trigger
