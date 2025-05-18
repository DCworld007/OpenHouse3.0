interface KVOptions {
  expirationTtl?: number;
}

export async function setKVData(key: string, data: any, options: KVOptions = {}) {
  try {
    const response = await fetch('/api/kv/set', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        value: data,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to set KV data');
    }

    return true;
  } catch (error) {
    console.error('Error setting KV data:', error);
    return false;
  }
}

export async function getKVData<T>(key: string): Promise<T | null> {
  try {
    const response = await fetch(`/api/kv/get?key=${encodeURIComponent(key)}`);
    
    if (!response.ok) {
      throw new Error('Failed to get KV data');
    }

    const data = await response.json();
    return data.value as T;
  } catch (error) {
    console.error('Error getting KV data:', error);
    return null;
  }
}

export async function deleteKVData(key: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/kv/delete?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete KV data');
    }

    return true;
  } catch (error) {
    console.error('Error deleting KV data:', error);
    return false;
  }
}

// Helper function to generate user-specific keys
export function getUserKey(userId: string, key: string): string {
  return `user:${userId}:${key}`;
} 