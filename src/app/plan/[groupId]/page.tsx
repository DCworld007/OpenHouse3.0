'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListingGroup } from '@/types/listing';
import PlanGroup from '@/components/PlanGroup';
import 'leaflet/dist/leaflet.css';

const STORAGE_KEY = 'openhouse-data';

export default function PlanPage({ params }: { params: { groupId: string } }) {
  const router = useRouter();
  const [groupData, setGroupData] = useState<ListingGroup | null>(null);

  useEffect(() => {
    // Load group data from localStorage
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const groups: ListingGroup[] = JSON.parse(savedData);
        const foundGroup = groups.find(g => g.id === params.groupId);
        if (foundGroup) {
          setGroupData(foundGroup);
        } else {
          console.error('Group not found');
          router.push('/');
        }
      } catch (error) {
        console.error('Error loading data:', error);
        router.push('/');
      }
    } else {
      console.error('No saved data');
      router.push('/');
    }
  }, [params.groupId, router]);

  if (!groupData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return <PlanGroup group={groupData} />;
} 