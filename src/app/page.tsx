'use client';

import { useState, useEffect } from 'react';
import { Listing, ImportedListingData, ListingGroup } from '@/types/listing';
import ListingImport from '@/components/ListingImport';
import ListingGroups from '@/components/ListingGroups';
import { format } from 'date-fns';
import { Toaster } from 'react-hot-toast';

const STORAGE_KEY = 'openhouse-data';

export default function Home() {
  const [groups, setGroups] = useState<ListingGroup[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setGroups(parsedData);
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    } else {
      // Initialize with default groups
      setGroups([
        {
          id: 'tbd',
          name: 'To Be Scheduled',
          type: 'custom',
          order: 0,
          listings: []
        }
      ]);
    }
  }, []);

  // Save to localStorage whenever groups change
  useEffect(() => {
    if (groups.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    }
  }, [groups]);

  const handleImport = (data: ImportedListingData) => {
    const newListing: Listing = {
      id: crypto.randomUUID(),
      price: data.price,
      address: data.content,
      imageUrl: data.imageUrl || '/placeholder-house.jpg',
      sourceUrl: '',
      source: 'manual',
      openHouse: data.openHouse,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      groupId: 'tbd',
      order: 0,
      cardType: data.cardType
    };

    let updatedGroups = [...groups];
    
    if (data.openHouse?.date) {
      // Create or find a group for this date
      const dateStr = format(new Date(data.openHouse.date), 'yyyy-MM-dd');
      const existingGroup = groups.find(g => g.type === 'date' && g.date === dateStr);
      
      if (existingGroup) {
        // Add to existing date group
        newListing.groupId = existingGroup.id;
        updatedGroups = groups.map(group =>
          group.id === existingGroup.id
            ? {
                ...group,
                listings: [...group.listings, { ...newListing, order: group.listings.length }]
              }
            : group
        );
      } else {
        // Create new date group
        const newGroup: ListingGroup = {
          id: crypto.randomUUID(),
          name: format(new Date(data.openHouse.date), 'EEEE, MMMM d'),
          type: 'date',
          date: dateStr,
          order: groups.length,
          listings: [{ ...newListing, groupId: newListing.id }]
        };
        updatedGroups.push(newGroup);
      }
    } else {
      // Add to TBD group
      updatedGroups = groups.map(group =>
        group.id === 'tbd'
          ? {
              ...group,
              listings: [
                { ...newListing, order: 0 },
                ...group.listings.map(l => ({ ...l, order: l.order + 1 }))
              ]
            }
          : group
      );
    }

    setGroups(updatedGroups);
  };

  const handleGroupsUpdate = (updatedGroups: ListingGroup[]) => {
    setGroups(updatedGroups);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Open House Planner
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Import and organize your property visits
            </p>
          </div>

          <ListingImport onImport={handleImport} />
          
          <ListingGroups 
            groups={groups} 
            onGroupsUpdate={handleGroupsUpdate}
          />
        </div>
      </div>
    </main>
  );
} 