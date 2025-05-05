import type { NextApiRequest, NextApiResponse } from 'next';

// In-memory store as a stub for D1
const yjsDocStore: Record<string, string> = {};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { groupId } = req.query;
  if (typeof groupId !== 'string') {
    return res.status(400).json({ error: 'Invalid groupId' });
  }

  if (req.method === 'GET') {
    // Return the Yjs doc as a base64 string (or null if not found)
    const doc = yjsDocStore[groupId] || null;
    return res.status(200).json({ doc });
  }

  if (req.method === 'POST') {
    // Save the Yjs doc (base64 string)
    const { doc } = req.body;
    if (typeof doc !== 'string') {
      return res.status(400).json({ error: 'Missing doc' });
    }
    yjsDocStore[groupId] = doc;
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// TODO: Replace in-memory store with D1 database logic for production. 