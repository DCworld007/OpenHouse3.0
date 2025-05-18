"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/useUser';

export default function AdminDatabasePage() {
  const { user } = useUser();
  const [planningRooms, setPlanningRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [newRoomId, setNewRoomId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [fixingRoom, setFixingRoom] = useState(false);

  useEffect(() => {
    fetchPlanningRooms();
  }, []);

  const fetchPlanningRooms = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/planning-rooms');
      if (!response.ok) {
        throw new Error('Failed to fetch planning rooms');
      }
      const data = await response.json();
      setPlanningRooms(data.rooms || []);
      setMessage(`Found ${data.rooms?.length || 0} planning rooms in database`);
    } catch (error: any) {
      console.error('Error fetching planning rooms:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fixSpecificRoom = async () => {
    setFixingRoom(true);
    setMessage('');
    try {
      const id = '96013c1e-9aaa-469b-9d8c-c4f08fe2adaa';
      const name = 'New Group';

      // Create room via admin API
      const response = await fetch('/api/admin/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          name,
          userId: user?.id || user?.sub
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(`Successfully fixed room: ${id}. Response: ${JSON.stringify(data)}`);
        // Refresh the list
        fetchPlanningRooms();
      } else {
        setMessage(`Error fixing room: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Error fixing room:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setFixingRoom(false);
    }
  };

  const createCustomRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomId || !newRoomName) {
      setMessage('Room ID and name are required');
      return;
    }

    setFixingRoom(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/create-room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: newRoomId,
          name: newRoomName,
          userId: user?.id || user?.sub
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessage(`Successfully created room: ${newRoomId}. Response: ${JSON.stringify(data)}`);
        setNewRoomId('');
        setNewRoomName('');
        // Refresh the list
        fetchPlanningRooms();
      } else {
        setMessage(`Error creating room: ${data.error}`);
      }
    } catch (error: any) {
      console.error('Error creating room:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setFixingRoom(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold mb-4">Admin - Database Management</h1>
        <p className="text-red-500">You must be logged in to access this page.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Admin - Database Management</h1>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-medium mb-4">Fix Known Issue</h2>
        <p className="mb-4">This will create the planning room with ID <code className="bg-gray-100 px-1 py-0.5 rounded">96013c1e-9aaa-469b-9d8c-c4f08fe2adaa</code> in the D1 database.</p>
        <button 
          className={`px-4 py-2 ${fixingRoom ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded`}
          onClick={fixSpecificRoom}
          disabled={fixingRoom}
        >
          {fixingRoom ? 'Fixing...' : 'Fix Missing Room'}
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-medium mb-4">Create Custom Room</h2>
        <form onSubmit={createCustomRoom} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room ID</label>
            <input 
              type="text" 
              value={newRoomId} 
              onChange={(e) => setNewRoomId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md" 
              placeholder="Enter room ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
            <input 
              type="text" 
              value={newRoomName} 
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md" 
              placeholder="Enter room name"
            />
          </div>
          <button 
            type="submit" 
            className={`px-4 py-2 ${fixingRoom ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'} text-white rounded`}
            disabled={fixingRoom}
          >
            {fixingRoom ? 'Creating...' : 'Create Room'}
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-medium">Planning Rooms in Database</h2>
          <button 
            className={`px-3 py-1.5 ${loading ? 'bg-gray-400' : 'bg-gray-200 hover:bg-gray-300'} rounded text-sm`}
            onClick={fetchPlanningRooms}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        {message && (
          <div className={`p-3 rounded mb-4 ${message.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            {message}
          </div>
        )}
        
        <div className="border rounded overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {planningRooms.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    {loading ? 'Loading rooms...' : 'No planning rooms found.'}
                  </td>
                </tr>
              ) : (
                planningRooms.map((room) => (
                  <tr key={room.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{room.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{room.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{room.ownerId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(room.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 